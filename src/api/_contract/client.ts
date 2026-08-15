/*
  모든 서버 요청이 지나는 단 하나의 관문.

  경로·파라미터·바디·응답 타입이 전부 `generated/schema`에서 온다 — 오타 난 경로나 빠뜨린
  path 파라미터가 **컴파일에서 걸린다**. 우리 화면 15개가 목록↔상세를 왕복하므로 경로 실수가
  가장 흔한 사고고, 그걸 타입으로 막는 것이 openapi-fetch를 고른 이유다(api-codegen.md B1).

  ## credentials: 'include'가 필수다
  리프레시 토큰이 httpOnly 쿠키로만 온다(백엔드 스펙 명시). 이걸 안 켜면 쿠키가 실리지 않아
  **재발급이 통째로 동작하지 않는다.** 배포 도메인이 백엔드 CORS 허용 목록에 없으면 같은
  증상이 나므로, 배포 전에 오리진 등록을 확인한다.

  ## 401을 만났을 때
  ```
  토큰을 실제로 보냈나? ─ 아니오 → 그대로 던진다 (로그인 안 한 상태이거나 잘못된 경로)
                        └ 예   → refresh 1회 (동시 요청은 한 번만) → 성공하면 그 요청만 재시도
                                 실패하면 onSessionExpired()
  ```
  **토큰을 보냈을 때만 갱신을 시도하는 것이 핵심이다.** 이 백엔드는 매핑되지 않은 경로에도
  401을 주기 때문에(실측), 무조건 갱신하면 *경로 오타가 강제 로그아웃*이 된다.
*/
import createClient, { type Middleware } from 'openapi-fetch'

import { authBridge, warnIfDisconnected, type RefreshResult } from './authBridge'
import { toApiError, toNetworkError } from './errors'
import type { paths } from '@/api/schema'

/** 재발급 자체가 낸 401로 또 재발급하면 무한 루프가 된다 */
const REFRESH_PATH = '/api/v0/auth/refresh'

/*
  ## 응답이 안 오면 영원히 기다린다 — 그래서 예산을 둔다

  `fetch`에는 **기본 타임아웃이 없다.** 브라우저는 서버가 답할 때까지 안 끊는다.
  이 백엔드는 「없는 것」을 물으면 404가 아니라 **무응답**이고(18차 R1·R7 · 21차 · 25차 R4)
  실측으로도 로그인 진입에서 60초 넘게 아무 응답이 없었다 — 그동안 조회는 `isPending`에
  머물고, 그것을 그리는 화면은 **끝나지 않는다.**

  ### 값의 근거는 콜드스타트다 — "빨리 끊기"가 목적이 아니다
  App Runner가 잠들어 있으면 깨어나는 데 **최대 76초**가 걸린다
  (`components/common/Loading.tsx`가 "끊지 않는 이유"로 적어 둔 값). 30초에 끊으면
  **정상적으로 깨어나는 중인 요청을 죽인다** — 실제로 오늘 재 보니 스펙 문서가 13.5초에
  200을 줬는데, 그 앞의 여러 요청이 서버를 깨우는 데 쓰였다.

  그래서 90초다. 목적은 대기를 짧게 만드는 것이 아니라 **끝나기는 하게** 만드는 것이다.
  기다리는 동안 무엇을 그릴지는 화면이 정한다(`Loading`이 12초에 "서버가 깨어나는 중"을
  띄운다).
*/
const REQUEST_BUDGET_MS = 90_000

/** 파일은 서버가 받아서 파싱까지 한다 — 조회와 같은 예산이면 멀쩡한 업로드가 죽는다 */
const UPLOAD_BUDGET_MS = 180_000

/*
  `FormData`를 본문으로 넘기면 `Request` 생성자가 `multipart/form-data; boundary=…`를
  **직접 붙인다**(uploads.ts가 헤더를 안 주는 이유이기도 하다). 그래서 업로드 여부를
  호출부에서 따로 알려줄 필요가 없다 — 본문이 파일이면 예산이 저절로 길어진다.
*/
const budgetFor = (request: Request) =>
  request.headers.get('content-type')?.startsWith('multipart/')
    ? UPLOAD_BUDGET_MS
    : REQUEST_BUDGET_MS

/**
 * 예산이 붙은 `fetch`. **왕복 한 번에 하나씩** 걸린다 — 401 재시도는 자기 예산을 새로 받는다.
 *
 * `AbortSignal.any`로 원래 신호를 살려 둔다. 예산 신호만 넘기면 **화면을 떠나 React Query가
 * 취소한 요청이 계속 살아 있게 된다.**
 */
function fetchWithBudget(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(budgetFor(request))])
  return fetch(request, { signal })
}

/** 이 요청에 토큰을 실었는가 — 미들웨어가 표시하고 응답에서 읽는다 */
const sentToken = new WeakMap<Request, boolean>()
/** 재시도는 1회. 두 번째 401은 그대로 던진다 */
const retried = new WeakSet<Request>()

/*
  **재시도용 복제본은 보내기 전에 떠 둔다.**

  `Request`의 본문은 한 번만 쓸 수 있고, `fetch`가 쓰고 나면 `bodyUsed`가 true가 된다.
  그 뒤에 `clone()`을 부르면 **`TypeError: unusable`이 난다**(실측). 즉 응답을 받고 나서
  복제하는 코드는 **본문 있는 요청에서만 터진다** — GET은 본문이 없어 멀쩡하고 POST·PUT·PATCH만
  깨지므로, 조회로 확인하면 통과한 것처럼 보인다.

  본문이 없으면 복제해 둘 이유가 없다(재시도 때 원본을 그대로 다시 보내면 된다).
*/
const retryClone = new WeakMap<Request, Request>()

/*
  **부팅 직후엔 토큰이 없다.** 메모리에만 두기 때문에 새로고침하면 사라지고, 쿠키로만
  되살릴 수 있다. 그런데 "토큰을 보냈을 때만 갱신한다"는 규칙만 두면 그 첫 요청이
  갱신을 못 걸어 **세션 복원이 통째로 안 된다**(실제로 그렇게 만들었다가 화면에서 잡혔다).

  그래서 **토큰 없는 401에도 딱 한 번은 기회를 준다.** 그 한 번이 지나면 규칙이 원래대로
  돌아가, 로그인 안 한 사용자의 401이 매번 재발급을 부르지 않는다.
*/
let bootRefreshTried = false

/** 동시에 여러 요청이 401을 맞아도 재발급은 한 번만 돈다 (single-flight) */
let refreshing: Promise<RefreshResult> | null = null

function refreshOnce() {
  refreshing ??= authBridge.refresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    warnIfDisconnected()
    const token = authBridge.getToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    sentToken.set(request, Boolean(token))
    // 401 재시도에 쓸 복제본 — 보내고 나면 못 뜬다(위 주석)
    if (request.body) retryClone.set(request, request.clone())
    return request
  },

  async onResponse({ request, response }) {
    const hadToken = sentToken.get(request)
    sentToken.delete(request)
    const clone = retryClone.get(request)
    retryClone.delete(request)

    const shouldRefresh =
      response.status === 401 &&
      !retried.has(request) &&
      !request.url.includes(REFRESH_PATH) &&
      // 토큰을 보냈으면 만료다. 안 보냈어도 **부팅 첫 한 번**은 쿠키로 되살릴 기회를 준다
      (hadToken === true || !bootRefreshTried)

    if (!shouldRefresh) return response

    const result = await refreshOnce()
    /*
      **재발급이 끝난 뒤에** 세운다. 부팅 시 여러 요청이 동시에 401을 맞는데(예: /me·목록·집계),
      먼저 세우면 나머지가 문을 못 지나 401 그대로 남는다 — 실제로 그렇게 만들었다가
      목록만 뜨고 집계 카드가 비는 것으로 드러났다.
      동시 요청은 `refreshOnce()`가 하나로 묶어 주므로 재발급은 어차피 한 번만 돈다.
    */
    if (!hadToken) bootRefreshTried = true
    if (!result.ok) {
      // 왜 끝났는지를 그대로 넘긴다 — 화면이 "조용히 보낼지 사유를 띄울지"를 정한다
      authBridge.onSessionExpired(result.reason)
      return response
    }

    // 원요청을 새 토큰으로 한 번 더. 본문이 있었으면 보내기 전에 떠 둔 복제본을 쓴다
    const retry = clone ?? request
    retry.headers.set('Authorization', `Bearer ${result.token}`)
    retried.add(retry)
    return fetchWithBudget(retry)
  },
}

/**
 * 테스트·스토리북이 자기 인스턴스를 만들 수 있게 팩토리를 연다.
 * 서버가 하나뿐이라 앱은 아래 `izClient` 하나만 쓴다 — 팩토리는 "문"이지 사용 패턴이 아니다.
 */
export function createIzClient(options: { baseUrl: string }) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    credentials: 'include', // 리프레시 쿠키
    fetch: fetchWithBudget, // 응답이 안 와도 끝난다
  })
  client.use(authMiddleware)
  return client
}

export const izClient = createIzClient({
  baseUrl: import.meta.env?.VITE_API_BASE ?? '',
})

/**
 * openapi-fetch의 `{ data, error, response }`를 **성공값 또는 throw**로 바꾼다.
 *
 * 왜 throw인가: React Query도 화면의 try/catch도 예외 기반이라 그쪽에 맞추는 편이 분기가 준다.
 * 생성될 호출 함수들이 전부 이 함수를 통과한다.
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result
  try {
    result = await call
  } catch (cause) {
    // 서버에 닿지도 못한 것 (오프라인·CORS·타임아웃) — response 자체가 없다
    throw toNetworkError(cause)
  }

  const { data, error, response } = result
  if (error !== undefined || !response.ok) throw toApiError(error, response)
  return data as T
}
