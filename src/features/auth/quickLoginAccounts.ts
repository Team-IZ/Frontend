/*
  dev 전용 역할 전환 계정 — 로그인 화면과 헤더 드롭다운이 쓴다.

  역할 선택 UI는 정책상 화면에 없다(LoginScreen 주석). 이건 **폼을 우회하는 지름길**일 뿐,
  서버가 역할을 판정하는 로그인 흐름 자체는 그대로 재사용한다.

  ## 세 갈래로 들어온다

  | | 어디서 | 무엇 |
  |---|---|---|
  | **역할 버튼** | `.env.local`의 `VITE_DEV_ACCOUNTS` | 역할별 대표 계정 몇 개(담당자 구분 없음) |
  | **상태별 목록** | `dev-accounts.json` | 교육생 상태별 테스트 계정 수십 개 |
  | **담당자별 목록** | `dev-team-accounts.json` | 매니저·오퍼레이터를 팀원별로 나눈 계정 |

  나눈 이유는 **수와 수명이 다르다.** 역할 버튼은 손으로 관리하는 소수이고, 상태별
  목록은 백엔드가 준 엑셀에서 스크립트로 만든 것이라(`scripts/dev-accounts.mjs`) 엑셀이
  갱신되면 통째로 다시 만든다. 담당자별 목록도 손으로 관리하지만 상태별 목록과 같은
  파일에 두면 스크립트가 재생성할 때 같이 날아가므로 파일을 분리했다(자세한 이유는
  `readTeamData` 주석). 셋 다 같은 담당자 필터 UI(`CaseAccountPicker`)를 함께 쓴다 —
  상태별·담당자별 목록은 형태가 같아서(`CaseData`) 그룹만 합친다.

  ## 자격 증명을 저장소에 두지 않는다

  셋 다 gitignore 대상이다. **없으면 UI가 아예 안 나온다** — 기능이 조용히 반쯤
  동작하는 것보다 없는 편이 낫다.

  화면 노출은 이 파일이 아니라 호출부가 막는다(`import.meta.env.DEV || __GIT_BRANCH__`).
  즉 **값이 있어도 main 배포에는 안 나온다** — 두 겹이다.
*/
export type QuickLoginAccount = { label: string; email: string; password: string }

/**
 * 역할 넷 — **이 순서가 화면 순서다.**
 *
 * 로그인 화면의 역할 버튼과 계정 고르개의 탭이 같은 배열을 읽는다. 둘이 각자 순서를
 * 들고 있으면 한쪽만 고쳤을 때 나란히 놓인 두 줄이 다른 순서로 보인다.
 *
 * 컴포넌트 파일이 아니라 여기 두는 이유는 Fast Refresh다 — 컴포넌트 파일이 상수를
 * 함께 export하면 그 파일의 상태 보존 핫리로드가 꺼진다(react/only-export-components).
 */
export const ROLES = ['매니저', '오퍼레이터', '교육생', '슈퍼 어드민'] as const
export type Role = (typeof ROLES)[number]

/**
 * 케이스 계정 하나. 교육생은 어느 반·팀 누구인지까지 보여줘야 고를 수 있고,
 * 매니저·오퍼레이터처럼 반·팀이 없는 역할은 `className`·`teamName`을 빈 문자열로 둔다
 * (표시부는 빈 값을 알아서 건너뛴다).
 */
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
  /**
   * **누가 쓰기로 한 계정인가.** 엑셀의 `담당` 열이다.
   *
   * 여섯이 함께 테스트하는데 계정이 소모되므로, 남이 쓴 것을 또 열면 이미 끝난 상태를
   * 보게 된다. 배정은 **엑셀이 정본이고 화면은 거르기만 한다** — 화면이 다시 나누면
   * 엑셀과 두 벌이 되어 "누가 뭘 썼나"를 또 맞춰야 한다.
   */
  owner: string | null
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

/*
  **배열도 받고 `{ groups: [{ accounts: [...] }] }`도 받는다.**

  🔴 Vercel이 자격 증명처럼 보이는 값을 `VITE_`(브라우저 노출) 변수로 저장하지 못하게
  막는다 — **저장 버튼이 아예 안 먹었다**(실측). 값을 넣을 수 없으면 배포본에서 기능이
  통째로 사라지므로, 이미 통과한 적이 있는 모양(`dev-team-accounts.env`의 봉투)을
  그대로 쓴다.

  값을 가리는 것이 아니다 — 어차피 번들에 들어가고 그것이 의도다(위 주석). 노출 범위는
  여전히 **어디에 넣느냐**로 정한다(운영 환경에는 넣지 않는다).
*/
function parseAccounts(raw: string | undefined): QuickLoginAccount[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown[] | { groups?: { accounts?: unknown[] }[] }
    const list = Array.isArray(parsed)
      ? parsed
      : (parsed.groups ?? []).flatMap((g) => g?.accounts ?? [])
    if (!Array.isArray(list)) throw new Error('배열이 아닙니다')
    return (list as Partial<QuickLoginAccount>[]).filter(
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
  ## 두 곳에서 읽는다 — 파일이 먼저, 없으면 환경변수

  ```
  로컬     dev-accounts.json          스크립트를 돌리면 생긴다
  배포     VITE_CASE_ACCOUNTS         Vercel 환경변수에 넣는다
  ```

  **파일 하나로는 배포본에서 목록이 영영 안 나온다.** 자격 증명이라 저장소에 못 넣는데
  저장소에 없으면 번들에도 없기 때문이다 — 실제로 develop 배포에서 고르개가 통째로
  사라졌다. 그런데 테스트하는 팀원 다섯은 로컬이 아니라 배포 주소로 들어온다.

  그래서 역할 버튼(`VITE_DEV_ACCOUNTS`)이 쓰던 길을 그대로 쓴다. 파일을 먼저 보는 이유는
  로컬에서 엑셀을 다시 돌렸을 때 **환경변수에 박힌 낡은 목록이 이기면 안 되기** 때문이다.

  ⚠️ **이 값은 번들에 들어간다.** 배포 번들을 받으면 계정과 비밀번호를 볼 수 있다는 뜻이다.
  노출을 줄이는 것은 이 파일이 아니라 **어디에 값을 넣느냐**다 — 운영 환경에는 넣지 않는다.
*/
const caseModules = import.meta.glob<CaseData>('/dev-accounts.json', { eager: true })

type CaseData = { measuredAt?: string; owners?: string[]; groups?: CaseGroup[] }

function readCaseData(): CaseData {
  const fromFile = Object.values(caseModules)[0]
  if (Array.isArray(fromFile?.groups)) return fromFile

  const raw = import.meta.env.VITE_CASE_ACCOUNTS
  if (!raw) return {}
  try {
    return JSON.parse(raw) as CaseData
  } catch (e) {
    // 조용히 빈 목록이 되면 "왜 목록이 없지"로 시간을 쓴다
    console.warn('[dev] VITE_CASE_ACCOUNTS를 읽지 못했습니다 — scripts/dev-accounts.mjs 출력', e)
    return {}
  }
}

const caseData = readCaseData()

/*
  매니저·오퍼레이터 담당자별 계정 — **스크립트가 안 건드리는** 별도 소스.
  위 `dev-accounts.json`은 교육생 엑셀을 다시 돌릴 때마다 통째로 새로 써진다(스크립트
  자체 동작). 매니저/오퍼레이터를 그 파일 안에 손으로 끼워 넣으면 다음 재생성 때
  조용히 사라진다 — 그래서 파일을 분리한다. 같은 `CaseData` 모양이라 그룹만 합친다.
*/
const teamModules = import.meta.glob<CaseData>('/dev-team-accounts.json', { eager: true })

function readTeamData(): CaseData {
  const fromFile = Object.values(teamModules)[0]
  if (Array.isArray(fromFile?.groups)) return fromFile

  const raw = import.meta.env.VITE_TEAM_ACCOUNTS
  if (!raw) return {}
  try {
    return JSON.parse(raw) as CaseData
  } catch (e) {
    console.warn('[dev] VITE_TEAM_ACCOUNTS를 읽지 못했습니다', e)
    return {}
  }
}

const teamData = readTeamData()

function readGroups(data: CaseData): CaseGroup[] {
  const groups = data.groups
  if (!Array.isArray(groups)) return []
  return groups.filter(
    (g): g is CaseGroup =>
      typeof g?.label === 'string' && Array.isArray(g?.accounts) && g.accounts.length > 0,
  )
}

export const CASE_ACCOUNT_GROUPS = [...readGroups(caseData), ...readGroups(teamData)]

/**
 * 이 목록의 상태를 **언제 쟀나**.
 *
 * 상태에는 유효기간이 있다 — 개인 응시 창은 분석 완료 뒤 24시간이라 `응시 가능`으로
 * 적힌 계정이 하루 뒤에는 전부 `창 닫힘`이 된다(실측으로 확인). 라벨만 보여주면
 * 눌러 보고 나서야 알게 되므로 잰 날짜를 함께 말한다.
 */
export const CASE_ACCOUNT_MEASURED_AT = caseData.measuredAt ?? null

/**
 * 담당자 목록. 비어 있으면 화면이 담당자 줄을 안 그린다 — 배정이 없는 엑셀도 있다.
 *
 * 계정을 훑어 모으지 않고 스크립트가 낸 값을 그대로 쓴다. 렌더마다 194개를 도는 것도
 * 아깝고, **순서가 화면마다 흔들리면** 어제 눌렀던 자리에 다른 이름이 온다.
 */
export const CASE_ACCOUNT_OWNERS = [
  ...new Set([...(caseData.owners ?? []), ...(teamData.owners ?? [])]),
]

/*
  헤더 역할 전환 전용 목록 — **로그인 화면의 역할 버튼과 다른 값이다.**

  로그인 화면은 아직 아무도 아닌 상태라 «역할»을 고르지만, 헤더는 이미 누군가로 들어와
  있는 상태에서 **다른 사람으로 갈아타는** 자리다. 시연에서 그 갈아타기는 대개
  «같은 반의 매니저 ↔ 그 반 학생»이라, 역할 이름보다 **누구인지**가 필요하다.

  그래서 목록을 따로 둔다. 값이 없으면 `QUICK_LOGIN_ACCOUNTS`로 물러서므로(호출부)
  env를 안 넣은 환경도 종전과 똑같이 동작한다.

  ⚠️ **넷을 넘기지 않는다.** 드롭다운은 훑는 자리가 아니라 집는 자리다 — 한 반을
  통째로 올렸다가 26줄이 되어 도로 뺐다. 많은 계정이 필요하면 로그인 화면의 고르개를
  쓴다(`CaseAccountPicker`).

  ⚠️ 값이 번들에 들어간다 — 운영 환경에는 넣지 않는다(위 `VITE_DEV_ACCOUNTS`와 같다).
*/
export const HEADER_ACCOUNTS = parseAccounts(import.meta.env.VITE_HEADER_ACCOUNTS)
