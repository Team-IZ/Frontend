import { AlertTriangle, Clock, PenLine, Users } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/Button'
import { checkedLabel, type InboxItem, type ItemBand } from '../mockData'

/*
  인박스 행 하나 — 목업 `.it`(와이어 #inbox). 밴드 4종이 아이콘·색 하나씩만
  다르고 나머지 뼈대(아이콘·유형·이름·사유·액션)는 같아서 컴포넌트 하나로
  묶는다(`InterviewStatusBadge`처럼 유형별 파일을 쪼개기엔 조합이 이 하나뿐).

  ⚠ D56 C절 후속(이슈 124) — 액션 버튼을 "알림"에서 "연락함"으로 바꿨다.
  매니저가 슬랙 등으로 직접 연락한 뒤 스스로 체크하는 동작이라 발송 실패라는
  상태가 성립하지 않아 그 UI(재시도 버튼)도 같이 지웠다.

  ⚠ 용어 재조정(사용자 지적, 2026-08-08) — "연락함"이 명령/상태 어느 쪽인지
  애매하고 시스템이 실제로 메시지를 보낸 것 같은 오해도 줬다. "연락"이라는
  단어 자체를 빼고 "체크"로 바꿨다 — 행에 이미 사유(응시 전·마감 등)가
  보여서 "뭘 체크하는지"는 문맥으로 읽힌다.

  ⚠ "방금"이 고정 문구였다(사용자 지적, 2026-08-08) — 체크한 지 몇 시간·며칠이
  지나도 계속 "방금"이라 실제로 언제 체크했는지 알 수 없었다. 분 단위까진
  필요 없다는 지시라(`mockData.ts` `checkedLabel` 참고) 날짜 단위로
  "오늘"·"어제"·"N일 전"만 계산해 보여준다.
*/

const traineePath = (id: string) => `/manager/trainees/${id}`
const briefPath = (caseId: string) => `/manager/interviews/${caseId}/brief`

const KIND_LABEL: Record<InboxItem['kind'], string> = {
  // 응시 창이 아직 열려 있는(잔여 시간이 붙는) 사람이라 "미응시"가 아니라 "응시 전" —
  // "미응시"는 창이 닫힌 뒤의 확정 결과에만 쓴다(결정 로그 D56 B절)
  ABSENT: '응시 전',
  RETRY: '다시 보기',
  INVALID: '무효 응시',
  INTERVIEW: '면담',
  UNSUBMITTED: '미제출',
  ANALYSIS_FAILED: '분석 실패',
}

const BAND_ICON: Record<ItemBand, { Icon: typeof Clock; tone: string }> = {
  1: { Icon: Clock, tone: 'bg-danger-soft border-danger-border text-danger' },
  2: { Icon: AlertTriangle, tone: 'bg-warning-soft border-warning-border text-warning' },
  3: { Icon: PenLine, tone: 'bg-primary-soft border-primary/25 text-primary' },
  4: { Icon: Users, tone: 'bg-surface-2 border-border text-fg-subtle' },
}

function BandIcon({ band }: { band: ItemBand }) {
  const { Icon, tone } = BAND_ICON[band]
  return (
    <span
      className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border', tone)}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

/** why3 — 유형별 사유 한 줄. 회차는 항상 굵게, 마감·잔여 시간만 강조색(hot2) */
function ItemWhy({ item }: { item: InboxItem }) {
  const round = <b className="text-fg font-bold">{item.roundLabel}</b>
  switch (item.kind) {
    case 'ABSENT':
      return (
        <>
          {round} · 응시 창 <span className="text-danger font-bold">{item.hoursLeft}시간</span> 남음
        </>
      )
    case 'RETRY':
      return (
        <>
          {round} · 창 마감 <span className="text-danger font-bold">{item.deadlineLabel}</span> ·{' '}
          {item.missingCount}건 미응시
        </>
      )
    case 'INVALID':
      return (
        <>
          {round} · {item.totalQuestions}문항 중 {item.unanswered}문항 무응답 · 응답 시간{' '}
          {item.durationMin}분
        </>
      )
    case 'INTERVIEW':
      return (
        <>
          {round} · 대기 {item.waitDays}일
        </>
      )
    case 'UNSUBMITTED':
      return (
        <>
          {round} · 마감 <span className="text-danger font-bold">{item.deadlineLabel}</span>
        </>
      )
    case 'ANALYSIS_FAILED':
      return <>{round} · 저장소를 확인하고 다시 제출해야 합니다</>
  }
}

function WhoCell({ item }: { item: InboxItem }) {
  if (item.kind === 'UNSUBMITTED' || item.kind === 'ANALYSIS_FAILED') {
    return (
      <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
        <span className="font-bold">{item.teamLabel}</span>
        <span className="text-fg-subtle text-2xs">{item.memberCount}명</span>
      </span>
    )
  }
  return (
    <span className="flex w-[130px] shrink-0 items-baseline gap-1.5 text-sm">
      <Link to={traineePath(item.traineeId)} className="font-bold hover:text-primary">
        {item.name}
      </Link>
      <span className="text-fg-subtle text-2xs">{item.className}</span>
    </span>
  )
}

type Props = {
  item: InboxItem
  pending: boolean
  /** 매니저가 슬랙 등으로 직접 연락한 뒤 "체크"를 눌렀을 때(D56 C절 — 실제
   *  발송이 아니라 자기 신고라 실패 상태가 없다). ⚠ 사용자 지적(2026-08-08) —
   *  "연락함"은 명령/상태 어느 쪽인지 애매하고, 시스템이 실제로 메시지를
   *  보낸 것 같은 오해도 줬다. "체크"로 바꿨다 — 행에 이미 사유(응시 전·
   *  마감 등)가 보여서 "뭘 체크하는지"는 문맥으로 읽힌다. */
  onContact: () => void
  onOpenBrief: () => void
  onReviewVoid: () => void
}

export default function InboxRow({ item, pending, onContact, onOpenBrief, onReviewVoid }: Props) {
  const done = item.status === 'CONTACTED'

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0',
        done && 'bg-surface-2',
      )}
    >
      <BandIcon band={item.band} />
      <span className={cn('w-[92px] shrink-0 text-sm font-bold', done && 'opacity-55')}>
        {KIND_LABEL[item.kind]}
      </span>
      <span className={done ? 'opacity-55' : undefined}>
        <WhoCell item={item} />
      </span>
      <span className={cn('text-fg-muted min-w-0 flex-1 text-sm', done && 'opacity-55')}>
        <ItemWhy item={item} />
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {done ? (
          <span className="text-success text-xs font-semibold whitespace-nowrap">
            체크함 · {checkedLabel(item.checkedAt)}
          </span>
        ) : item.kind === 'ABSENT' || item.kind === 'RETRY' ? (
          <Button size="sm" disabled={pending} onClick={onContact}>
            체크
          </Button>
        ) : item.kind === 'INVALID' ? (
          <Button variant="ghost" size="sm" onClick={onReviewVoid}>
            면담 목록에서 확인
          </Button>
        ) : item.kind === 'INTERVIEW' ? (
          <Button size="sm" onClick={onOpenBrief}>
            브리프 열기
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={onContact}>
            체크
          </Button>
        )}
      </span>
    </div>
  )
}

export { briefPath }
