import { AlertTriangle, Clock, PenLine, Users } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { formatDateTime } from '@/lib/format'
import type { InboxBand, InboxItem } from '../_/api/types'

/*
  인박스 행 하나 — 목업 `.it`(와이어 #inbox). 밴드 4종이 아이콘·색 하나씩만
  다르고 나머지 뼈대(아이콘·유형·이름·사유·액션)는 같아서 컴포넌트 하나로 묶는다.

  🔴 **[체크] 버튼을 걷어냈다.** D56 C절로 "매니저가 직접 연락한 뒤 스스로
  체크한다"는 동작을 만들었는데, **서버에 그 상태를 저장할 자리가 없다** —
  스웨거 전수로 봐도 쓰기가 0건이고 `POST /notifications/reminders`는
  `x-readiness: unavailable`이다. 목은 브라우저 안에서만 상태를 들고 있어서
  **새로고침하면 체크가 사라졌다.** 누를 수는 있는데 아무것도 안 남는 버튼은
  장식이고(화면 규칙 C·F "할 수 없는 것을 그리지 않는다"), 인박스에서는 더
  나쁘다 — "처리했다"고 믿게 만든 뒤 다음 방문에 그대로 되살아난다.

  대신 **실제 처리로 행이 빠진다.** 응시하면 명부의 1층 코드가 풀리고, 제출하면
  `actionItems`에서 빠지고, 면담을 끝내면 `PLANNED`이 아니게 된다 — 원천이
  이미 그렇게 동작한다.

  ⚠ `RETRY`(다시 보기) 행도 없다 — 32차 R14②로 「오퍼레이션 없음」 확답을 받았었다.
  **2026-08-19에 생겼다**(38차 R1) — 인박스 조회가 `REVIEW`로 준다. 그 조회로
  갈아탈 때 같이 들어온다(`_/api/api.ts` 머리말). `SESSION_INCOMPLETE`(응시 중단)는 반대로 **새로 생겼다**.
*/

const traineePath = (id: string) => `/manager/trainees/${id}`
/**
 * 🔴 **`?state=`를 반드시 붙인다**(렌더에서 잡았다). 브리프 화면은 이 값으로
 * 「`GET`할지 `POST`로 만들지」를 가른다 — 없으면 있다고 보고 `GET`하는데,
 * 그러면 아직 없는 브리프를 부른다. 실제로 5차에서 브리프를 열었더니 아무것도
 * 안 왔다(그때는 Lambda라 404가 무응답이었다 · 38차 §6). 지금은 404가 0.7초에
 * 오지만, **없는 것을 부르지 않는 것이 계약**이라 이 분기는 그대로다.
 * 5차는 대기 4건이 전부 `NONE`이다. MG-03 목록과 같은 형식이다.
 */
const briefPath = (caseId: string, briefState: string | null) =>
  `/manager/interviews/${caseId}/brief${briefState ? `?state=${briefState}` : ''}`
const projectPath = (id: string) => `/manager/projects/${id}`

const KIND_LABEL: Record<InboxItem['kind'], string> = {
  /*
    창이 닫힌 뒤의 **확정** 결과라 「미응시」다(결정 로그 D56 B절 — 창이 아직
    열려 있으면 「응시 전」). 서버 `NOT_ATTENDED`는 마감이 지나야 붙는 코드라
    (`roundTerminalAt`이 그때만 값을 갖는다) 여기서는 늘 확정 쪽이다.
  */
  ABSENT: '미응시',
  SESSION_INCOMPLETE: '응시 중단',
  INVALID: '무효 응시',
  INTERVIEW: '면담',
  UNSUBMITTED: '미제출',
  ANALYSIS_FAILED: '분석 실패',
}

const BAND_ICON: Record<InboxBand, { Icon: typeof Clock; tone: string }> = {
  1: { Icon: Clock, tone: 'bg-danger-soft border-danger-border text-danger' },
  2: { Icon: AlertTriangle, tone: 'bg-warning-soft border-warning-border text-warning' },
  3: { Icon: PenLine, tone: 'bg-primary-soft border-primary/25 text-primary' },
  4: { Icon: Users, tone: 'bg-surface-2 border-border text-fg-subtle' },
}

function BandIcon({ band }: { band: InboxBand }) {
  const { Icon, tone } = BAND_ICON[band]
  return (
    <span
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', tone)}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

/** 유형별 사유 한 줄 — **서버가 준 값만 쓴다.** 없는 값은 자리째 뺀다 */
function ItemWhy({ item }: { item: InboxItem }) {
  switch (item.kind) {
    case 'ABSENT':
    case 'SESSION_INCOMPLETE':
      /* 마감 시각은 `NOT_ATTENDED`·`SESSION_INCOMPLETE`일 때만 온다(스펙) */
      return item.terminalAt ? (
        <>
          응시 창 마감{' '}
          <span className="text-danger font-bold">{formatDateTime(item.terminalAt)}</span>
        </>
      ) : (
        <>응시 창이 닫혔습니다</>
      )
    case 'INVALID':
      /*
        목은 `12문항 중 3문항 무응답 · 응답 시간 2분`처럼 그렸는데 **서버에
        그런 필드가 없다**(36차 R3 — `summary`가 JSON 문자열 하나다). 지어내지
        않고 판정 상태와 발견 시각만 그린다.
      */
      return (
        <>
          {item.reviewStatus === 'CONFIRMED_INVALID' ? '무효 확정' : '무효 확인 중'} ·{' '}
          {formatDateTime(item.detectedAt)} 발견
        </>
      )
    case 'INTERVIEW':
      return <>{item.riskSummary ?? '면담 대기'}</>
    case 'UNSUBMITTED':
      /* 36차 R2로 팀 이름이 왔다 — 이름이 없으면(옛 모양) 개수로 접는다 */
      return item.teams.length > 0 ? (
        <>아직 제출하지 않았습니다</>
      ) : (
        <>
          <b className="text-fg font-bold">{item.teamCount}팀</b>이 아직 제출하지 않았습니다
        </>
      )
    case 'ANALYSIS_FAILED':
      return (
        <>
          {item.representativeName ? `${item.representativeName} 제출 · ` : ''}
          {item.failureReason ?? '저장소를 확인하고 다시 제출해야 합니다'}
        </>
      )
  }
}

/** 누구 — 교육생이면 이름·반, 팀·반 단위면 그 이름 */
function WhoCell({ item }: { item: InboxItem }) {
  if (item.kind === 'UNSUBMITTED') {
    /* 팀 이름이 있으면 팀이 대상이다 — 없으면 반이 대상이다(옛 모양) */
    const team = item.teams[0]
    return (
      <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
        <span className="font-bold">{team ? team.teamName : item.className}</span>
        {team && <span className="text-fg-subtle text-2xs">{item.className}</span>}
      </span>
    )
  }
  if (item.kind === 'ANALYSIS_FAILED') {
    return (
      <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
        <span className="font-bold">{item.teamName}</span>
        <span className="text-fg-subtle text-2xs">{item.className}</span>
      </span>
    )
  }
  return (
    <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
      <Link to={traineePath(item.traineeId)} className="hover:text-primary font-bold">
        {item.name}
      </Link>
      {/* 반 이름은 signals가 안 준다 — 없으면 자리를 비운다(지어내지 않는다) */}
      {item.className && <span className="text-fg-subtle text-2xs">{item.className}</span>}
    </span>
  )
}

type Props = {
  item: InboxItem
  /** 미제출·분석 실패가 넘어갈 프로젝트 — 행이 아니라 화면이 안다 */
  projectId: string | null
  onOpenBrief: () => void
  onReviewVoid: () => void
}

export default function InboxRow({ item, projectId, onOpenBrief, onReviewVoid }: Props) {
  return (
    <li className="border-border flex items-center gap-3 border-t px-5 py-3">
      <BandIcon band={item.band} />
      <span className="w-[92px] shrink-0 text-sm font-bold">{KIND_LABEL[item.kind]}</span>
      <WhoCell item={item} />
      <span className="text-fg-muted min-w-0 flex-1 text-sm">
        <ItemWhy item={item} />
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {item.kind === 'INVALID' ? (
          <Button variant="ghost" size="sm" onClick={onReviewVoid}>
            면담 목록에서 확인
          </Button>
        ) : item.kind === 'INTERVIEW' ? (
          /*
            ⚠ **`FAILED`를 막지 않는다**(처음에 막아 뒀다가 되돌렸다). 실측하면
            `FAILED`는 오히려 `GET`이 200으로 내용을 주고, **`NONE`이 404**다.
            그리고 브리프 화면은 `NONE`·`FAILED` 둘 다 [브리프 만들기]로
            받아 준다 — 막을 이유가 없고, 막으면 만들 길까지 막는다.
            대신 아직 없다는 사실은 문구로 말한다.
          */
          <Button size="sm" onClick={onOpenBrief}>
            {item.briefState === 'NONE' || item.briefState === 'FAILED'
              ? '브리프 만들기'
              : '브리프 열기'}
          </Button>
        ) : (item.kind === 'UNSUBMITTED' || item.kind === 'ANALYSIS_FAILED') && projectId ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to={projectPath(projectId)} />}
          >
            프로젝트에서 보기
          </Button>
        ) : null}
      </span>
    </li>
  )
}

export { briefPath }
