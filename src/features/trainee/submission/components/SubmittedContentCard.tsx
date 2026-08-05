import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { SubmittedContent } from '../types'

/** ANALYZING·READY·LOCKED·ANALYSIS_FAILED 4상태가 반복하는 "제출한 내용" 카드 */
export default function SubmittedContentCard({
  content,
  actions,
}: {
  content: SubmittedContent
  actions?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>제출한 내용</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <Row k="저장소" v={content.repoUrl} />
        <Row k="브랜치" v={content.branch} />
        <Row
          k="최근 커밋"
          v={
            <>
              {content.lastCommit.sha} · {content.lastCommit.message}{' '}
              <span className="text-fg-subtle">({content.lastCommit.at})</span>
            </>
          }
        />
        {actions && (
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">{actions}</div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-fg-subtle">{k}</span>
      <span className="text-fg">{v}</span>
    </div>
  )
}
