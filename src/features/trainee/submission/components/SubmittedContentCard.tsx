import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatBytes, formatDateTime } from '@/lib/format'
import { METHOD_LABEL } from '../labels'
import type { SubmissionView } from '../_/api/types'

/*
  ANALYZING·READY·LOCKED가 반복하는 "제출한 내용" 카드.

  **`content`가 없어도 그린다.** 아직 아티팩트가 없는 접수 도중에는 서버가 그 키를
  통째로 빼는데, 그것을 조건으로 카드를 감추면 학생은 자기가 무엇을 언제 냈는지
  확인할 길이 없다. 수단과 제출 시각은 늘 있으므로 그 둘을 뼈대로 둔다.
*/
export default function SubmittedContentCard({
  view,
  actions,
}: {
  view: SubmissionView
  actions?: React.ReactNode
}) {
  const { method, submittedAt, content } = view

  return (
    <Card>
      <CardHeader>
        <CardTitle>제출한 내용</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {method && <Row k="제출 수단" v={METHOD_LABEL[method]} />}
        {submittedAt && <Row k="제출 시각" v={formatDateTime(submittedAt)} />}
        {content && (
          <>
            {/*
              **수단에 따라 둘 중 하나다**(23차 R1) — 서버가 `oneOf`로 갈라 주므로
              `in`으로 판별한다. 브랜치는 키는 늘 오지만 분석 전에는 값이 비어 있다.
            */}
            {'repoUrl' in content ? (
              <>
                <Row k="저장소" v={content.repoUrl} />
                {content.branch && <Row k="브랜치" v={content.branch} />}
              </>
            ) : (
              <>
                <Row k="파일" v={content.fileName} />
                <Row k="크기" v={formatBytes(content.fileSize)} />
              </>
            )}
            {/*
              분석 전에는 커밋 정보가 없다 — `-`로 채우면 "커밋이 없는 저장소"처럼
              읽히므로 행 자체를 안 그린다.
            */}
            {content.lastCommit && (
              <Row
                k="최근 커밋"
                v={
                  <>
                    {content.lastCommit.sha} · {content.lastCommit.message}{' '}
                    <span className="text-fg-subtle">({content.lastCommit.at})</span>
                  </>
                }
              />
            )}
          </>
        )}
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
