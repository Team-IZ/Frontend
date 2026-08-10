import { Button } from '@/components/ui/Button'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { errorCopy } from '@/lib/errorCopy'

/*
  조회가 실패했을 때 그 자리에 놓는 것. **문구는 `lib/errorCopy`가 정하고 여기는 그린다.**

  ▸ **`onRetry`를 받아도 `retry: false`면 버튼을 그리지 않는다.** 이 한 줄이 이 컴포넌트를
    만든 이유다 — 권한 없음·아직 발행 전에 「다시 시도」가 붙는 것을 화면이 실수로도
    못 하게 만든다(async-states §3-2).
  ▸ **`tone`에 따라 테두리가 갈린다.** 실패는 유형 3(실선+danger), 아직은 유형 1(점선).
    404가 늘 고장인 것은 아니다.
  ▸ **재시도는 자기 대기를 보여준다**(§3-3). 안 그러면 눌러도 반응이 없어 연타한다.
*/
type Props = {
  error: unknown
  /** 조회 대상. 문구에 조사와 함께 들어간다 — `회차를 불러오지 못했습니다` */
  subject: string
  onRetry?: () => void
  /** 재조회가 떠 있는가(`isFetching`). 버튼이 자기 대기를 보여준다 */
  retrying?: boolean
  /** 되돌아갈 곳이 있으면 — 404에서 목록으로 같은 것 */
  action?: React.ReactNode
}

export default function ErrorState({ error, subject, onRetry, retrying, action }: Props) {
  const copy = errorCopy(error, { subject })

  return (
    <Empty
      className={copy.tone === 'failed' ? 'bg-danger-soft border-danger-border border-solid' : ''}
    >
      <EmptyHeader>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
      </EmptyHeader>
      {/* 둘 다 있으면 한 줄에 둔다 — 세로로 쌓이면 아래쪽이 부차적인 선택으로 안 읽힌다 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {copy.retry && onRetry && (
          <Button variant="ghost" disabled={retrying} onClick={onRetry}>
            {retrying && <Spinner className="size-3.5" />}
            다시 시도
          </Button>
        )}
        {action}
      </div>
    </Empty>
  )
}
