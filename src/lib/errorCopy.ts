/*
  ⚠ 이 두 줄만 `@/` 별칭이 아니라 **상대 경로 + 확장자**다. `npm run check:error-copy`가
  node로 이 파일을 직접 읽는데(번들러를 안 거친다) node는 별칭도 확장자 생략도 모른다.
  Vite는 둘 다 그대로 처리하므로 앱 쪽에는 아무 차이가 없다.
*/
import { isApiError, isGenericCode } from '../api/_contract/errors.ts'
import { withParticle } from './format.ts'

/*
  실패했을 때 **무슨 말을 할지**를 정하는 유일한 자리.

  ▸ **화면은 "어디에 그리나"만 정한다.** 여기가 없으면 화면 6개가 각자 `status`를 분기해
    같은 상황에 서로 다른 말을 하게 된다 — 실제로 그렇게 되고 있었다(async-states §7).
  ▸ **`retry`가 이 파일의 존재 이유다.** 권한 없음·아직 없음처럼 **같은 요청을 다시 보내도
    같은 결과**인 것에 「다시 시도」를 붙이면 거짓말이다. 판정을 여기 모으면 화면이
    **누를 수 없는 버튼을 그릴 방법 자체가 없어진다**(async-states §3-2).
  ▸ **`tone`으로 「없는 것」 3종과 이어진다.** 실패가 늘 유형 3인 것은 아니다 — 리포트가
    아직 발행되지 않은 것은 404로 오지만 **유형 1 `아직`** 이다. 실선+danger로 그리면
    화면이 "고장났다"고 잘못 말한다.

  분기 순서는 계약이 정해 놨다(`api/_contract/errors.ts`) — **도메인 코드로 먼저 갈라 보고,
  일반 코드면 `status`로 떨어진다.** 지금 스펙의 37개 오퍼레이션 중 24개가 HTTP 상태를 옮긴
  일반 코드뿐이라 두 단계가 다 필요하다.
*/

export type ErrorTone = 'failed' | 'pending'

export type ErrorCopy = {
  title: string
  description: string
  /** 다시 시도가 **결과를 바꾸는가.** false면 그 버튼을 그리지 않는다 */
  retry: boolean
  /** `failed` — 유형 3(실선+danger) · `pending` — 유형 1(점선, 기다리면 채워진다) */
  tone: ErrorTone
}

/** 문구가 대상 이름을 받아 쓴다 — `회차를 불러오지 못했습니다` */
type Ctx = {
  /** 조회 대상. 조사는 받침에 맞춰 붙는다 */
  subject: string
  /**
   * **쓰기 화면이 쓰는 동사 어간**(`추가` · `수정` · `삭제`). 생략하면 조회로 본다.
   *
   * ⚠ 이 함수는 원래 **조회 전용**이었다. 반 추가 실패에 그대로 썼더니 화면이
   * *"반을 **불러오지** 못했습니다"* 라고 말했다 — 사용자는 추가를 눌렀는데 읽기가
   * 실패했다고 읽는다. 코드별 문구(`BY_CODE`)는 그대로 쓰이고, **동사가 나오는
   * 일반 분기에서만** 이 값이 갈린다.
   */
  action?: string
}

const obj = (s: string) => withParticle(s, '을', '를')
const sub = (s: string) => withParticle(s, '이', '가')

/*
  **코드가 그 자체로 케이스를 가르는 것만 적는다.** 일반 코드(`NOT_FOUND` 같은 HTTP 이름)는
  여기 두지 않는다 — 상태코드에 이미 있는 정보라 케이스를 못 가른다.

  이 표는 짧을수록 좋다. 여기 한 줄을 더하는 것은 *"이 상황은 status만으로는 틀린 말을
  하게 된다"* 는 판단이다.
*/
const BY_CODE: Record<string, (ctx: Ctx) => ErrorCopy> = {
  /*
    리포트가 아직 안 만들어졌다 — 404로 오지만 **실패가 아니다.** 회차가 더 돌면 생기므로
    「다시 시도」는 눌러도 아무것도 바꾸지 못한다(async-states §3-1).
  */
  COHORT_REPORT_NOT_FOUND: () => ({
    title: '아직 발행된 리포트가 없습니다',
    description: '미니프로젝트가 모두 끝나고 진단이 확정되면 여기에 리포트가 생깁니다.',
    retry: false,
    tone: 'pending',
  }),
  /*
    교안 분석이 아직 안 끝났다 — **실패가 아니라 「아직」이다.**

    한때 이 코드가 **503**이라 전역 재시도(5xx 3회)에 걸렸고, 그 재시도가 동시에 나가
    프록시 결함(15차 R3)을 밟아 `net::ERR_FAILED`가 됐다. 화면에는 **응답이 아예 없는 것**
    처럼 보였다 — 「무응답」이라고 요청서를 썼는데 실제로는 즉시 오는 503이었다(18차 R1).
    409로 내려와서 이제 여기서 판정한다.

    화면은 분석 안 된 교안을 애초에 못 고르게 막지만(`rules.curriculumBlockedReason`),
    고른 뒤 분석이 만료되거나 다른 사람이 지운 경우가 남는다.
  */
  /*
    같은 기수 안에서 반 이름은 겹칠 수 없다.

    ⚠ **한때 화면이 이것을 추측했다.** 반 추가·수정 다이얼로그가 `catch {}`로 실패를
    묶고 *"같은 이름의 반이 있는지 확인해 주세요"* 를 고정으로 띄웠다 — 인증이 끊겼거나
    네트워크가 죽어도 같은 말을 했다. **화면이 원인을 지어내는 자리**였다.

    ⚠ **생성 쪽 스펙에는 이 코드가 없다**(수정에만 있다 — 25차 R3으로 요청했다).
    서버가 실제로 무엇을 주든 여기서 판정하고, 모르는 코드는 아래 상태 기반 분기로
    내려가 「반을 추가하지 못했습니다」가 된다 — 추측하지 않는다.
  */
  /*
    초대 대기·이미 비활성인 계정은 상태를 직접 못 바꾼다.

    **기다려도 안 되는 것이라 재시도 버튼을 안 준다.** 한때 이 실패에
    *"잠시 후 다시 시도해 주세요"* 라고 했는데, 몇 번을 눌러도 같은 409다.
    화면은 애초에 활성인 행에만 버튼을 그리지만(`RosterTab`), 목록을 띄워 둔 사이
    누가 상태를 바꾸면 여기로 온다.
  */
  /*
    이미 분석이 돌고 있는 교안에 다시 요청했다.

    **재시도를 주지 않는다** — 같은 요청을 다시 보내면 또 409다. 기다리는 것이 답이고,
    오래 멈춰 있으면 화면이 **처음부터 다시 돌리는 출구**를 따로 준다(`ReanalyzeDialog`).
    그건 다른 요청(`?force=true`)이라 여기서 말할 것이 아니다.
  */
  /*
    쓰는 프로젝트가 있는 교안은 못 지운다 — 그 회차의 문항이 근거로 삼는 교안이
    목록에서 사라지면 안 되기 때문이다(판정 기준은 `usedProjectCount`).

    **재시도를 주지 않는다.** 다시 눌러도 같은 실패다 — 연결을 먼저 끊어야 한다.
    화면은 연결이 0일 때만 버튼을 그리지만(`CurriculumDetailScreen`), 목록을 띄워 둔
    사이 누가 그 교안을 회차에 붙이면 여기로 온다.
  */
  CURRICULUM_MATERIAL_IN_USE: () => ({
    title: '이 교안을 쓰는 프로젝트가 있습니다',
    description: '연결을 먼저 끊어야 지울 수 있습니다 — 연결된 프로젝트 탭에서 확인하세요.',
    retry: false,
    tone: 'failed',
  }),

  CURRICULUM_ANALYSIS_IN_PROGRESS: () => ({
    title: '이 교안은 이미 분석 중입니다',
    description: '끝날 때까지 기다려 주세요.',
    retry: false,
    tone: 'pending',
  }),

  /*
    같은 기관에 같은 제목의 교안이 이미 있다(22차 R2).

    ⚠ **지운 교안도 제목을 계속 점유한다.** 유니크 인덱스가 부분 인덱스가 아니라
    전역이라(스펙 명시), 논리 삭제한 것과도 부딪힌다 — *"아까 지웠는데 왜"* 가 나온다.
    그래서 **고칠 곳을 제목이라고 못 박는다.**

    **재시도를 주지 않는다** — 같은 제목으로 다시 눌러도 같은 실패다.
  */
  CURRICULUM_TITLE_DUPLICATED: () => ({
    title: '같은 제목의 교안이 이미 있습니다',
    description: '교안명을 바꿔 주세요 — 지운 교안도 제목을 계속 차지합니다.',
    retry: false,
    tone: 'failed',
  }),

  /*
    서버가 파일을 저장할 자리가 없다 — 경로가 읽기 전용이거나 가득 찼다(22차 R2).

    **우리가 고칠 수 있는 것이 없고, 잠시 뒤에 될 수도 있다** — 그래서 재시도를 준다.
    파일을 의심하게 만들면 안 된다: 파일은 멀쩡하다.
  */
  CURRICULUM_FILE_STORE_FAILED: () => ({
    title: '서버가 파일을 저장하지 못했습니다',
    description: '파일 문제가 아닙니다 — 잠시 후 다시 시도해 주세요.',
    retry: true,
    tone: 'failed',
  }),

  /*
    고른 매니저가 없다. 반 생성·담당 변경에 검증이 붙으면서 나온다.

    **목록을 띄워 둔 사이 그 사람이 빠진 것**이다 — 다른 기수로 옮겼거나 정지됐거나.
    다시 눌러도 같은 실패라 목록을 새로 고쳐 고르게 한다.
  */
  MANAGER_NOT_FOUND: () => ({
    title: '고른 매니저를 찾을 수 없습니다',
    description: '그 사이 담당에서 빠졌을 수 있습니다 — 목록을 새로 고친 뒤 다시 골라 주세요.',
    retry: false,
    tone: 'failed',
  }),

  TRAINEE_STATUS_NOT_MUTABLE: () => ({
    title: '이 계정은 상태를 바꿀 수 없습니다',
    description: '초대 대기이거나 이미 비활성입니다 — 초대 대기는 초대를 취소해야 합니다.',
    retry: false,
    tone: 'failed',
  }),

  /*
    기수에 속하지 않은 교육생을 반에 넣으려 했다.

    **비활성 교육생이 이 코드로 온다**(실측 — `강은우`를 비활성으로 두고 배정하면
    `400 TRAINEE_NOT_IN_COHORT`). 다시 눌러도 같은 실패라 재시도를 안 준다.
  */
  /*
    DB 제약 위반이 그대로 새어 나온 것이다 — 도메인 코드가 아니다.

    **반 이동에서 났었다**(25차 R7 · 원인은 DB CHECK에 없는 해제 사유 값이었고 고쳐졌다).
    지금은 이동이 한 번에 되지만, 이 코드 자체는 다른 제약에서도 샐 수 있어 남긴다 —
    **다시 눌러도 같은 실패**라 재시도를 주지 않는다.
  */
  DATA_INTEGRITY_VIOLATION: () => ({
    title: '이미 반에 들어가 있는 사람이 섞여 있습니다',
    description: '목록을 새로 고친 뒤 다시 골라 주세요 — 옮기려면 먼저 지금 반에서 빼야 합니다.',
    retry: false,
    tone: 'failed',
  }),

  TRAINEE_NOT_IN_COHORT: () => ({
    title: '기수에 없는 교육생이 섞여 있습니다',
    description: '비활성이거나 다른 기수의 계정입니다 — 목록을 새로 고친 뒤 다시 골라 주세요.',
    retry: false,
    tone: 'failed',
  }),

  CLASSROOM_NAME_TAKEN: () => ({
    title: '같은 이름의 반이 이미 있습니다',
    description: '같은 기수 안에서 반 이름은 겹칠 수 없습니다 — 다른 이름을 지어 주세요.',
    retry: false,
    tone: 'failed',
  }),

  CURRICULUM_ANALYSIS_NOT_COMPLETED: () => ({
    title: '교안 분석이 아직 끝나지 않았습니다',
    description: '분석이 끝나면 그 교안에서 검증 개념을 고를 수 있습니다.',
    retry: false,
    tone: 'pending',
  }),

  /*
    CSV 파일 자체가 스펙에 안 맞는다 — 한 번에 최대 1000명 제한(8/13 실측, 5000명 업로드가
    이 코드로 거절됨) 초과나 행 형식·인코딩 문제. **서버가 어느 행이 왜 틀렸는지를
    `message`에 담아 준다**(스펙 명시) — `AddRosterDialog`가 `error.message`를 그대로
    보여주고, 여기 `description`은 message가 없을 때만 쓰는 fallback이다.
  */
  /**
   * 담당 밖 프로젝트·자원을 가리켰다(32차 R3). 한때 이 자리가 **200 + 빈 목록**이라
   * 화면이 「대상이 없습니다」라고 말했다 — 권한이 없는 것과 정말 없는 것이 같아 보였다.
   * 재시도해도 같으니 주지 않는다.
   */
  MANAGER_SCOPE_NOT_FOUND: () => ({
    title: '담당 범위 밖입니다',
    description: '담당하지 않는 반·프로젝트입니다 — 주소가 맞는지 확인해 주세요.',
    retry: false,
    tone: 'failed',
  }),

  /**
   * 제출이 들어온 팀은 해체할 수 없다(32차 R14①) — 해체하면 그 제출이 팀 없이 뜬다.
   * 되돌릴 방법이 화면에 없으므로 재시도를 주지 않는다.
   */
  TEAM_SUBMISSION_LOCKED: () => ({
    title: '제출이 있는 팀은 해체할 수 없습니다',
    description: '이미 코드를 낸 팀입니다 — 해체하면 그 제출이 어느 팀에도 속하지 않게 됩니다.',
    retry: false,
    tone: 'failed',
  }),

  /*
    ── 팀 편성(MG-08) ───────────────────────────────────────────
    여덟 코드가 전부 「잠시 후 다시 시도해 주세요」로 뭉쳐 있었다(MG-08 하드닝
    실측). **다시 눌러도 안 되는 것들이라** 그 말은 사용자를 헛돌게 한다 —
    무엇을 해야 풀리는지가 코드마다 다르다.
  */

  /** 확정할 팀이 하나도 없다 — 먼저 만들어야 한다 */
  NO_TEAMS_TO_CONFIRM: () => ({
    title: '확정할 팀이 없습니다',
    description: '팀을 먼저 만들거나 자동 배분을 실행한 뒤에 확정할 수 있습니다.',
    retry: false,
    tone: 'failed',
  }),

  /** 미배정이 남았거나 팀이 비어 있다 */
  TEAMS_NOT_READY: () => ({
    title: '아직 확정할 수 없습니다',
    description:
      '미배정 인원이 남아 있거나 비어 있는 팀이 있습니다 — 편성을 마친 뒤 다시 확정해 주세요.',
    retry: false,
    tone: 'failed',
  }),

  /**
   * 담당 반이 둘 이상이라 서버가 어느 반에 배분할지 정할 수 없다.
   * 재시도가 아니라 **반을 하나로 좁혀야** 풀린다.
   */
  MANAGER_CLASSROOM_AMBIGUOUS: () => ({
    title: '담당 반이 여럿이라 자동으로 정할 수 없습니다',
    description: '반마다 팀을 직접 추가해 편성해 주세요.',
    retry: false,
    tone: 'failed',
  }),

  NO_MEMBERS_TO_ASSIGN: () => ({
    title: '배분할 인원이 없습니다',
    description: '미배정 인원이 없어 자동 배분이 할 일이 없습니다.',
    retry: false,
    tone: 'failed',
  }),

  AUTO_ASSIGN_NOT_ALLOWED: () => ({
    title: '지금은 자동 배분을 쓸 수 없습니다',
    description:
      '이미 편성이 확정됐거나 종료된 프로젝트입니다 — 편성을 다시 열어야 바꿀 수 있습니다.',
    retry: false,
    tone: 'failed',
  }),

  /*
    아래 셋은 **누가 화면을 열어 둔 사이에 사라진 것**이다. 다시 눌러도 같은 결과라
    새로 고쳐서 지금 상태를 보게 한다.
  */
  TEAM_NOT_FOUND: () => ({
    title: '그 팀을 찾을 수 없습니다',
    description: '다른 곳에서 지워졌을 수 있습니다 — 새로 고친 뒤 다시 시도해 주세요.',
    retry: false,
    tone: 'failed',
  }),

  /*
    프로젝트 목록 조회에 스코프(`cohort`·`classId`)를 안 보냈거나 둘 다 보냈다 — **화면
    버그**다. 다시 눌러도 같은 요청이 나가므로 재시도를 주지 않는다(MG-07 하드닝).
  */
  PROJECT_LIST_SCOPE_AMBIGUOUS: () => ({
    title: '프로젝트 목록을 불러오지 못했습니다',
    description: '조회 범위가 정해지지 않았습니다 — 새로 고쳐도 같으면 알려 주세요.',
    retry: false,
    tone: 'failed',
  }),

  PROJECT_MEMBERSHIP_NOT_FOUND: () => ({
    title: '그 교육생을 이 프로젝트에서 찾을 수 없습니다',
    description: '명단에서 빠졌을 수 있습니다 — 새로 고친 뒤 다시 시도해 주세요.',
    retry: false,
    tone: 'failed',
  }),

  TEAM_MEMBERSHIP_NOT_FOUND: () => ({
    title: '이미 그 팀에서 빠져 있습니다',
    description: '다른 곳에서 먼저 처리됐습니다 — 새로 고치면 지금 상태가 보입니다.',
    retry: false,
    tone: 'failed',
  }),

  CSV_FORMAT_INVALID: () => ({
    title: 'CSV 파일 형식이 올바르지 않습니다',
    description: '한 번에 최대 1000명까지 등록할 수 있습니다 — 파일 형식을 확인해 주세요.',
    retry: false,
    tone: 'failed',
  }),
}

export function errorCopy(error: unknown, ctx: Ctx): ErrorCopy {
  const { subject, action } = ctx
  /** `반을 추가하지 못했습니다` · 조회면 `반을 불러오지 못했습니다` */
  const failedLine = `${obj(subject)} ${action ? `${action}하지` : '불러오지'} 못했습니다`

  if (isApiError(error)) {
    if (!isGenericCode(error.code)) {
      const byCode = BY_CODE[error.code]
      if (byCode) return byCode(ctx)
    }

    switch (true) {
      /*
        **닿기는 했는데 답이 안 와서 우리가 끊었다.** 아래 `status === 0`과 상태가 같아
        그냥 두면 *"인터넷 연결을 확인해 주세요"* 가 나가는데, 그건 **거짓말이다** —
        사용자의 연결은 멀쩡하고 안 답한 것은 서버다. 그 말을 들은 사용자는 자기 와이파이를
        고치러 간다(4-3 — 확인 못 한 것을 단정하지 않는다).

        재시도는 준다. 서버가 깨어나는 중이면 **다음 번에는 실제로 온다.**
      */
      case error.isTimeout:
        return {
          title: `${obj(subject)} 불러오지 못했습니다`,
          description: '서버가 시간 안에 응답하지 않았습니다 — 잠시 후 다시 시도해 주세요.',
          retry: true,
          tone: 'failed',
        }

      // 서버에 닿지도 못했다 — 서버 탓으로 쓰면 사용자가 엉뚱한 곳을 기다린다
      case error.status === 0:
        return {
          title: failedLine,
          description: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
          retry: true,
          tone: 'failed',
        }

      /*
        세션이 끝난 것은 클라이언트가 이미 로그인 화면으로 보낸다(`authBridge`).
        여기까지 온 401은 그 처리가 못 잡은 경우라 **재시도가 답이 아니다.**
      */
      case error.status === 401:
        return {
          title: '다시 로그인해 주세요',
          description: '로그인이 만료됐습니다.',
          retry: false,
          tone: 'failed',
        }

      // 권한은 다시 눌러도 안 생긴다 — 무엇을 해야 하는지를 쓴다
      case error.status === 403:
        return {
          title: action
            ? `${obj(subject)} ${action}할 권한이 없습니다`
            : `${obj(subject)} 볼 수 있는 권한이 없습니다`,
          description: '필요하다면 담당자에게 권한을 요청하세요.',
          retry: false,
          tone: 'failed',
        }

      case error.status === 404:
        return {
          title: `${obj(subject)} 찾을 수 없습니다`,
          description: '지워졌거나 주소가 잘못됐을 수 있습니다.',
          retry: false,
          tone: 'failed',
        }

      // 429는 **얼마나 기다려야 하는지**를 서버가 알려준다 — 그 값이 있으면 쓴다
      case error.status === 429:
        return {
          title: '요청이 많아 잠시 막혔습니다',
          description: error.retryAfter
            ? `${error.retryAfter}초 뒤에 다시 시도해 주세요.`
            : '잠시 후 다시 시도해 주세요.',
          retry: true,
          tone: 'failed',
        }

      default:
        return {
          title: failedLine,
          description: '잠시 후 다시 시도해 주세요.',
          retry: true,
          tone: 'failed',
        }
    }
  }

  /*
    `ApiError`가 아닌 것 — 응답을 다루다 터진 코드거나 우리가 모르는 예외다.
    **서버 문제라고 단정하지 않는다**(4-3 — 확인 못 한 것을 단정하지 않는다).
  */
  return {
    title: `${sub(subject)} 표시되지 않았습니다`,
    description: '화면을 새로 고쳐도 같으면 담당자에게 알려주세요.',
    retry: true,
    tone: 'failed',
  }
}
