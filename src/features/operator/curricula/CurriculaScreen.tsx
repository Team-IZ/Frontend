import ConsoleShell from '@/shells/ConsoleShell'
import CurriculaTab from './CurriculaTab'
import { useCohortId } from '@/stores/cohortScope'
import { COHORT_STATUS_LABEL } from '../admin/_/labels'

/*
  교안 — **기수가 아니라 기관의 자산이다.** 그래서 사이드바 최상위에 있다.

  ─── 운영 관리 탭에서 꺼낸 이유 ─────────────────────────────────────
  운영 관리는 기수 스코프 화면이다(헤더 스위처가 범위를 정하고 반·명단·비용이 그걸
  따른다). 교안만 그 축을 안 쓰고 있었다 — 실측:

  ▸ `GET /cohorts/{10기|9기|8기|7기}/curricula` → **네 기수 모두 같은 12건**.
    이름만 기수별이지 기관 전체 목록이라, 기수로 거를 방법이 애초에 없다.
  ▸ `Spring 백엔드 설계` 하나가 **4개 기수 26개 프로젝트**에 걸려 있다
    (9기 8 · 10기 6 · 7기 6 · 8기 6). 한 교안을 여러 기수가 돌려 쓴다.
  ▸ 그래서 `9기`를 고른 화면 안에서 **10기·8기·7기 행이 섞여 나왔다.** 화면이 스스로
    모순됐다.

  기수와 교안 사이에는 직접 관계가 없다 — `기수 → 프로젝트 → 교안`뿐이다. 「이 기수가
  뭘 쓰나」는 그 기수의 프로젝트 목록이 답할 질문이라 여기에 기수별 탭을 두지 않는다
  (둬도 기수당 한두 종이라 표가 안 된다).

  (2026-08-18, 이슈 252) **이사 완료.** `운영 관리 › 교안` 탭과 `CurriculaTab`의
  `standalone` prop을 지웠고, 이 폴더도 `admin/` 밖(`features/operator/curricula/`)으로
  옮겼다.
*/
export default function CurriculaScreen() {
  /*
    **스위처를 남긴다 — 다만 이 목록을 거르지 않는다.**

    한 번 지웠다가 되살렸다. 지운 이유는 *"안 거르는 스위처는 거짓말"* 이었는데, 두 가지를
    놓쳤다.

    ▸ **콘솔 전역 스코프다.** 여기서 사라지면 `?cohort=`가 끊겨, 교안을 보고 프로젝트로
      넘어갈 때 고른 기수가 기본값(진행 중)으로 되돌아간다. 10기를 준비하던 사람이
      교안을 한 번 들렀다는 이유로 9기 화면을 받는다.
    ▸ **상세에서는 실제로 쓴다.** 연결된 프로젝트를 「지금 기수 먼저 · 나머지는 접어서」
      가르는 기준이 이 값이다(`CurriculumDetailScreen` LinkedTab).

    그래서 스위처는 **목록의 범위가 아니라 「지금 보고 있는 기수」** 다. 목록이 기관 전체라는
    사실은 머리의 `기관 전체` 문구가 계속 말한다 — 그 한 줄이 없으면 다시 거짓말이 된다.
  */
  const scope = useCohortId()

  return (
    <ConsoleShell
      role="operator"
      /* 목록이 오기 전에는 비운다 — 자리값(`7기`)을 그리면 실제 기수인 척한다 */
      cohort={scope.cohortId ?? ''}
      cohorts={scope.cohortList.map((c) => ({
        value: c.cohortId,
        label: c.name,
        detail: COHORT_STATUS_LABEL[c.status],
      }))}
      onCohortChange={scope.selectCohort}
    >
      <CurriculaTab />
    </ConsoleShell>
  )
}
