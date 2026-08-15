/*
  서버 오류를 화면이 분기할 수 있는 한 가지 모양으로 정규화한다.

  백엔드가 모든 4xx·5xx를 `ErrorResponse` 하나로 통일해 줬으므로(1차 요청 반영), 이 파일은
  그 타입을 **생성물에서 그대로 읽어** 쓴다 — 여기서 필드를 다시 적으면 백엔드가 바꿀 때
  한쪽만 낡는다.

  ⚠️ 화면이 `code`만 믿고 분기하면 안 된다.
  에러 응답이 있는 오퍼레이션 37개 중 24개가 아직 **HTTP 상태를 옮긴 일반 코드뿐**이다
  (`BAD_REQUEST`·`CONFLICT`…). 2차 요청서로 개선을 요청했지만 그전까지는 `code`가 일반
  코드면 `status`로 떨어지는 2단 분기여야 한다 — `isGenericCode`가 그 판정을 준다.
*/
import type { components } from '@/api/schema'
import type { ApiErrorCode } from '@/api/errorCodes'

type ErrorBody = components['schemas']['ErrorResponse']

/*
  스펙에서 뽑은 코드로 **자동완성은 되되, 모르는 코드도 받는다.**

  `ApiErrorCode`로만 좁히면 스펙에 아직 없는 코드가 실제로 왔을 때 **타입이 그것을 부정**한다.
  `(string & {})`를 더하면 실질 타입은 `string`이면서 편집기가 유니온을 후보로 띄운다.
  화면이 특정 오퍼레이션의 코드만 다룰 때는 `{operationId}_Errors`를 쓰는 편이 낫다 —
  그쪽은 좁은 유니온이라 `switch`가 exhaustive해진다.
*/
export type ErrorCode = ApiErrorCode | (string & {})

export type FieldError = NonNullable<ErrorBody['fieldErrors']>[number]

/*
  HTTP 상태 이름을 그대로 옮긴 코드. 상태코드에 이미 있는 정보라 케이스를 가르지 못한다.

  **이 목록은 생성물이 아니다.** 스펙에서 유도되는 값이 아니라 "무엇을 분기에 쓸 수 없다고
  볼 것인가"라는 우리 정책이다. 생성물에 넣으면 스펙에서 나온 값처럼 보여서 거짓말이 된다.
*/
const GENERIC_CODES = new Set([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'CONFLICT',
  'FORBIDDEN',
  'NOT_FOUND',
  'GONE',
  'UNAUTHORIZED',
  'UNAUTHENTICATED',
  'INTERNAL_SERVER_ERROR',
  'BAD_GATEWAY',
  'UNPROCESSABLE_ENTITY',
  'ACCESS_DENIED',
])

/** 화면 분기는 `code`로 먼저 갈라 보고, 여기 걸리면 `status`로 떨어져야 한다 */
export const isGenericCode = (code: ErrorCode) => GENERIC_CODES.has(code)

/** 서버에 닿지 못했을 때. 서버가 준 코드가 아니라 **우리가 만든 값**이라 여기 적어 둔다 */
export const NETWORK_ERROR_CODE = 'NETWORK'

/*
  **닿기는 했는데 답이 안 온 것.** 연결은 됐고(TCP 0.05초) 응답만 오지 않는다 — 실측으로
  이 백엔드에서 가장 흔한 실패 모양이다(18차 R1·R7, 21차, 25차 R4가 전부 같은 증상).

  `NETWORK`와 갈라야 하는 이유는 **화면이 하는 말이 달라지기 때문**이다. 오프라인이면
  "인터넷 연결을 확인해 주세요"가 맞지만, 서버가 안 답한 것에 그 말을 하면 **사용자가
  멀쩡한 자기 와이파이를 고치러 간다.**
*/
export const TIMEOUT_ERROR_CODE = 'TIMEOUT'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fieldErrors?: FieldError[]
  /** 재시도까지 남은 초. 429(일시 차단)에서만 온다 — 화면이 카운트다운에 쓴다 */
  readonly retryAfter?: number

  constructor(init: {
    message: string
    status: number
    code: ErrorCode
    fieldErrors?: FieldError[]
    retryAfter?: number
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors
    this.retryAfter = init.retryAfter
  }

  /** 서버에 닿지 못한 것인가 (오프라인·CORS·타임아웃). 재시도 안내가 붙는 자리 */
  get isNetwork() {
    return this.status === 0
  }

  /**
   * 예산 시간 안에 응답이 없어 우리가 끊은 것인가.
   *
   * **재시도 정책이 이 값으로 갈린다.** 예산이 90초라 한 번 더 보내면 사용자가 3분을
   * 기다린다 — 오프라인(즉시 실패)과 같은 재시도 규칙을 쓸 수 없다(`main.tsx`).
   */
  get isTimeout() {
    return this.code === TIMEOUT_ERROR_CODE
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/** 응답 본문이 `ErrorResponse` 모양인지 — 아니어도 던질 수 있어야 하므로 판정만 한다 */
function asErrorBody(body: unknown): Partial<ErrorBody> {
  return body && typeof body === 'object' ? (body as Partial<ErrorBody>) : {}
}

export function toApiError(body: unknown, response: Response): ApiError {
  const e = asErrorBody(body)
  return new ApiError({
    // 문구는 폴백용이다. 화면 문구는 code를 보고 **프론트가 정한다**(백엔드도 그렇게 명시했다)
    message: e.message ?? `요청에 실패했습니다 (HTTP ${response.status})`,
    status: e.status ?? response.status,
    code: e.code ?? String(response.status),
    fieldErrors: e.fieldErrors ?? undefined,
    // 본문에 없으면 헤더에서 — 표준 Retry-After를 서버가 같이 보낸다
    retryAfter: (e.retryAfter ?? Number(response.headers.get('Retry-After'))) || undefined,
  })
}

export function toNetworkError(cause: unknown): ApiError {
  /*
    `AbortSignal.timeout()`이 끊으면 `TimeoutError`, 사용자가·React Query가 끊으면
    `AbortError`다. 둘을 같은 것으로 묶으면 **화면 이동으로 취소된 요청이 「서버가
    응답하지 않습니다」로 뜬다.**
  */
  const timedOut = cause instanceof DOMException && cause.name === 'TimeoutError'
  return new ApiError({
    message: timedOut
      ? '서버가 시간 안에 응답하지 않았습니다'
      : cause instanceof Error
        ? cause.message
        : '서버에 연결하지 못했습니다',
    status: 0,
    code: timedOut ? TIMEOUT_ERROR_CODE : NETWORK_ERROR_CODE,
  })
}
