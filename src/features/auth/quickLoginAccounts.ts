/*
  dev 전용 역할 전환 계정 — 로그인 화면과 헤더 드롭다운이 쓴다.

  역할 선택 UI는 정책상 화면에 없다(LoginScreen 주석). 이건 **폼을 우회하는 지름길**일 뿐,
  서버가 역할을 판정하는 로그인 흐름 자체는 그대로 재사용한다.

  ## 두 갈래로 들어온다

  | | 어디서 | 무엇 |
  |---|---|---|
  | **역할 버튼** | `.env.local`의 `VITE_DEV_ACCOUNTS` | 역할별 대표 계정 몇 개 |
  | **상태별 목록** | `dev-accounts.json` | 교육생 상태별 테스트 계정 수십 개 |

  나눈 이유는 **수와 수명이 다르다.** 앞은 손으로 관리하는 소수이고, 뒤는 백엔드가 준
  엑셀에서 스크립트로 만든 것이라(`scripts/dev-accounts.mjs`) 엑셀이 갱신되면 통째로
  다시 만든다. 한 곳에 섞으면 손으로 넣은 것이 재생성 때 날아간다.

  ## 자격 증명을 저장소에 두지 않는다

  둘 다 gitignore 대상이다. **없으면 UI가 아예 안 나온다** — 기능이 조용히 반쯤
  동작하는 것보다 없는 편이 낫다.

  화면 노출은 이 파일이 아니라 호출부가 막는다(`import.meta.env.DEV || __GIT_BRANCH__`).
  즉 **값이 있어도 main 배포에는 안 나온다** — 두 겹이다.
*/
export type QuickLoginAccount = { label: string; email: string; password: string }

/** 교육생 테스트 계정 하나 — 어느 반·팀 누구인지까지 보여줘야 고를 수 있다 */
export type CaseAccount = {
  email: string
  password: string
  name: string
  className: string
  teamName: string
  /**
   * **같은 케이스 안에서 이 계정만 다른 점**(`문제 2개` · `RESUME_ASSESSMENT · PAUSED`).
   * 전원 같은 케이스면 `null`이다 — 다 같은 값을 열 줄 적어 봐야 읽는 데 방해만 된다.
   */
  note: string | null
}

/**
 * 한 테스트 케이스에 속한 계정들.
 *
 * `total`은 **고른 수가 아니라 실제 수**다. `hint`는 백엔드가 요약 시트에 적어 준
 * *"이 계정들로 무엇을 보나"* 로, 계정만 있고 무엇을 볼지 모르면 고를 수가 없다.
 */
export type CaseGroup = {
  label: string
  hint: string | null
  total: number
  accounts: CaseAccount[]
}

function parseAccounts(raw: string | undefined): QuickLoginAccount[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('배열이 아닙니다')
    return parsed.filter(
      (a): a is QuickLoginAccount =>
        typeof a?.label === 'string' &&
        typeof a?.email === 'string' &&
        typeof a?.password === 'string',
    )
  } catch (e) {
    // 조용히 빈 배열로 떨어뜨리면 "왜 버튼이 없지"로 시간을 쓴다
    console.warn('[dev] VITE_DEV_ACCOUNTS를 읽지 못했습니다 — .env.example 형식 참고', e)
    return []
  }
}

export const QUICK_LOGIN_ACCOUNTS = parseAccounts(import.meta.env.VITE_DEV_ACCOUNTS)

/*
  `dev-accounts.json`은 **없을 수 있다**(gitignore 대상이고 스크립트를 돌려야 생긴다).
  Vite는 없는 모듈을 정적 import하면 빌드를 실패시키므로 glob으로 읽는다 —
  `eager: true`라 번들 시점에 값이 박히고, 파일이 없으면 빈 객체가 된다.

  ⚠️ 이 값은 **번들에 들어간다.** 그래서 노출을 막는 것은 호출부의 `SHOW_DEV_UI`가
  아니라 파일이 없다는 사실이다 — 배포 환경에는 이 파일을 두지 않는다.
*/
const caseModules = import.meta.glob<{ measuredAt?: string; groups?: CaseGroup[] }>(
  '/dev-accounts.json',
  { eager: true },
)

function readCaseGroups(): CaseGroup[] {
  const mod = Object.values(caseModules)[0]
  const groups = mod?.groups
  if (!Array.isArray(groups)) return []
  return groups.filter(
    (g): g is CaseGroup =>
      typeof g?.label === 'string' && Array.isArray(g?.accounts) && g.accounts.length > 0,
  )
}

export const CASE_ACCOUNT_GROUPS = readCaseGroups()

/**
 * 이 목록의 상태를 **언제 쟀나**.
 *
 * 상태에는 유효기간이 있다 — 개인 응시 창은 분석 완료 뒤 24시간이라 `응시 가능`으로
 * 적힌 계정이 하루 뒤에는 전부 `창 닫힘`이 된다(실측으로 확인). 라벨만 보여주면
 * 눌러 보고 나서야 알게 되므로 잰 날짜를 함께 말한다.
 */
export const CASE_ACCOUNT_MEASURED_AT = Object.values(caseModules)[0]?.measuredAt ?? null

/** 고른 계정 총수 — 토글 라벨이 "N개"를 말하려면 필요하다 */
export const CASE_ACCOUNT_TOTAL = CASE_ACCOUNT_GROUPS.reduce((n, g) => n + g.accounts.length, 0)
