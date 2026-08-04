import type { ReactNode } from 'react'
import { Link } from 'react-router'
import {
  MessageSquareWarningIcon,
  SearchXIcon,
  UserXIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import {
  ADMIN_MANAGERS,
  ANALYSIS,
  GO_ADMIN,
  GO_ANALYSIS,
  GO_PROJECT,
  TODO_KIND_LABEL,
  projectPath,
} from '../labels'
import type { Todo, TodoKind } from '../api/types'

/*
  **이 네 줄이 이 화면의 존재 이유다**(OP-01 §3).

  ▸ **순서가 곧 우선순위다.** 되돌리기 어려운 순 — 미배정 → 개념 공백 → 집단 미달 →
    면담 적체. **정렬은 서버가 하고**(api-boundary §1-②) 화면은 받은 순서로 그린다.
    MG-01처럼 띠에 이유를 쓰지 않는다 — 순서가 이미 말한다.
  ▸ **여기서 처리하지 않는다.** 각 줄은 링크 하나만 갖는다 — 지표판이 작업대를 겸하면
    둘 다 못 한다(OP-01 §5).
  ▸ **종류마다 필드가 다르다.** 서버가 문장을 내려주면 규칙이 바뀔 때마다 문구가
    따라오고, 데이터가 다르면 그 문장이 거짓말을 한다(A7). 사실만 받아 여기서 조립한다.
*/

const B = ({ children }: { children: ReactNode }) => (
  <b className="text-fg font-semibold">{children}</b>
)

/*
  종류별 아이콘. **넷 다 같은 `⚠`이면 종류를 알려면 라벨을 읽어야 한다.**

  *"순서가 이미 우선순위를 말한다"* 는 맞지만 순서는 **위치**일 뿐 전주의적 신호가 아니다.
  형태는 읽기 전에 처리되므로, 아이콘이 다르면 네 줄을 훑을 때 종류가 먼저 잡힌다.
  그리고 F4(색만으로 상태를 구분하지 않는다)를 한 겹 더 보강한다 — 지금은 톤 2종
  (danger/warning)에만 기대고 있었다.

  lucide는 사이드바·프리미티브가 이미 쓰고 있어 새 의존성이 아니다.
*/
const TODO_ICON: Record<TodoKind, LucideIcon> = {
  UNASSIGNED: UserXIcon,
  CONCEPT_GAP: SearchXIcon,
  GROUP_MISS: UsersIcon,
  INTERVIEW_BACKLOG: MessageSquareWarningIcon,
}

/** 목업 문구를 그대로 옮긴다 — 문구는 계약값이다(00-index) */
function line(t: Todo, upcomingRoundLabel: string | null) {
  switch (t.kind) {
    case 'UNASSIGNED':
      return {
        // 여러 반이면 묶는다. 반마다 한 줄이면 같은 사실이 목록을 채운다
        body: (
          <>
            <B>{t.classNames.join(' · ')}</B>에 담당 매니저가 없습니다
          </>
        ),
        sub: [
          `${t.trainees}명`,
          '면담·독촉을 아무도 처리하지 않습니다',
          // 왜 비었는지는 사실이라 남긴다 — 해석이 아니다
          t.reason,
        ]
          .filter(Boolean)
          .join(' · '),
        to: ADMIN_MANAGERS,
        go: GO_ADMIN,
        /** 회차와 무관하다 — 반이 생긴 뒤로 계속인 상태다 */
        when: '상시',
        /** 구조 문제라 그 반 전체가 방치된다 — 유일하게 danger 톤 */
        severe: true,
      }

    case 'CONCEPT_GAP':
      return {
        body: (
          <>
            <B>&ldquo;{t.conceptName}&rdquo;</B> 코드 매칭 0 —{' '}
            <B>
              {t.totalTeams}팀 중 {t.unmatchedTeams}팀
            </B>
          </>
        ),
        /*
          다음 회차가 아직 시작 전이면 **지금 해야 할 일이 달라진다** — 이미 끝난 회차의
          원인 분석이 아니라 다음 회차 개념을 고르기 전 확인이다(목업 `#pre`).
        */
        sub: upcomingRoundLabel
          ? `${upcomingRoundLabel} 검증 개념을 확정하기 전에 확인해야 합니다`
          : '그 개념이 코드에 없어 묻지 못했습니다 — 개념 선택이 프로젝트와 안 맞았을 수 있습니다',
        to: projectPath(t.projectId),
        go: GO_PROJECT,
        // 코드 매칭은 **분석 완료 시점**에 나온다 — 리포트 발행을 안 기다린다
        when: t.roundLabel,
      }

    case 'GROUP_MISS': {
      // 여러 반이면 반 문제가 아니다 — 개념 선택 자체를 다시 본다(OP-01 §6)
      const many = t.classNames.length > 1
      return {
        body: many ? (
          <>
            <B>{t.classNames.length}개 반</B>에서 &ldquo;{t.conceptName}&rdquo;이 절반 이상 2단 이하
          </>
        ) : (
          <>
            <B>{t.classNames[0]}</B> · &ldquo;{t.conceptName}&rdquo;{' '}
            <B>
              {t.below}/{t.total}
            </B>{' '}
            2단 이하
          </>
        ),
        /*
          목업 sub에 있던 기획 조항 번호 `(9-6)`을 뺐다 — **크롬 안에 조항 번호가 있으면
          그것도 화면에 나가는 글로 읽힌다**(02-layout §8). 규칙의 내용(*"시스템은 표시까지만
          하고 이후 처리는 기관 판단"*)은 사용자가 알아야 하므로 남기고 번호만 지운다.
        */
        // 이름에 이미 `반`이 들어 있다 — 뒤에 또 붙이면 `J반반`이 된다
        sub: many
          ? `${t.classNames.join('·')} · 한 반이 아니라 기수 전체라 교안 쪽을 봐야 합니다`
          : '절반을 넘어 반 문제로 판정 — 개인 위험 사유에서 빠집니다. 시스템은 표시까지만 하고 이후 처리는 기관 판단입니다',
        to: ANALYSIS,
        go: GO_ANALYSIS,
        // 9-6 판정은 리포트 발행 시점에 켜진다 — 항상 직전 발행 회차다
        when: t.roundLabel,
      }
    }

    case 'INTERVIEW_BACKLOG':
      return {
        body: (
          <>
            <B>{t.className}</B> 면담이 <B>{t.elapsedDays}일째</B> 안 끝났습니다
          </>
        ),
        /*
          **다른 반과의 비교를 함께 준다** — 11일이 긴 건지는 그것으로만 판단된다(OP-01 §3).

          목업에는 뒤에 `회차 경과 기준(등재일은 반마다 같음)`이 더 붙어 있는데 뺐다.
          그건 **이 숫자를 어떻게 읽어야 하는지 가르치는 문장**이고(A7 ③), 정의서 §3이
          제시한 예시에도 없다 — 거기는 두 줄로 끝난다.
        */
        sub: `예정 ${t.pending}명 · 다른 반은 ${t.othersMinDays}~${t.othersMaxDays}일`,
        to: ADMIN_MANAGERS,
        go: GO_ADMIN,
        // 면담은 리포트 발행과 함께 등재된다(10-2) — 직전 발행 회차 것이다
        when: t.roundLabel,
      }
  }
}

export default function TodoBlock({
  todos,
  /** 다음 회차가 아직 시작 전이면 그 라벨. 개념 공백 줄의 다음 행동이 달라진다 */
  upcomingRoundLabel = null,
}: {
  todos: Todo[]
  upcomingRoundLabel?: string | null
}) {
  /*
    **0건에 무엇이 없는지를 쓴다.** 빈 목록만 두면 이슈가 없는 것인지 아직 안 본 것인지
    구분되지 않는다(OP-01 §6). 카드가 이미 그 자리를 차지하므로 점선 박스를 또 넣지
    않는다(H7).
  */
  if (todos.length === 0) {
    return (
      <p className="text-fg-subtle px-6 py-6 text-center text-sm leading-[1.8]">
        <b className="text-fg-muted">지금 조치할 운영 이슈가 없습니다</b>
        <br />
        집단 미달·개념 공백·면담 적체·미배정 반이 모두 없습니다.
      </p>
    )
  }

  return (
    <ul>
      {todos.map((t, i) => {
        const l = line(t, t.kind === 'CONCEPT_GAP' ? upcomingRoundLabel : null)
        const Icon = TODO_ICON[t.kind]
        return (
          <li
            key={`${t.kind}-${i}`}
            className="border-border flex items-start gap-3 px-6 py-3 not-first:border-t"
          >
            <span
              aria-hidden
              className={`mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full border ${
                l.severe
                  ? 'bg-danger-soft border-danger-border text-danger'
                  : 'bg-warning-soft border-warning-border text-warning'
              }`}
            >
              <Icon className="size-3" />
            </span>

            {/*
              **시점을 종류 아래에 적는다.** 네 줄이 `상시`·`이번 회차`·`직전 회차`로
              섞이는데, 리포트가 일괄 발행되므로(10-1) **진행 중 회차에는 판정값이 없어**
              이 섞임은 구조적이다 — 없앨 수 없다.

              MG-01이 같은 문제를 *"행마다 회차를 적는다 — 회차 표기가 없으면 **전부 이번
              회차 것으로 읽힌다**"* 로 풀었다. OP-01 정의서에는 그 규칙이 없어서 지금까지
              시점이 본문 안에 묻혀 있었다.
            */}
            <span className="w-[92px] shrink-0 pt-px">
              <span className="block text-sm font-semibold">{TODO_KIND_LABEL[t.kind]}</span>
              <span className="text-fg-subtle mt-0.5 block text-2xs">{l.when}</span>
            </span>

            <span className="text-fg-muted min-w-0 flex-1 text-sm leading-[1.6]">
              {l.body}
              <span className="text-fg-subtle mt-[3px] block text-xs">{l.sub}</span>
            </span>

            <Link
              to={l.to}
              className="text-primary mt-0.5 shrink-0 text-xs whitespace-nowrap hover:underline"
            >
              {l.go} ↗
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
