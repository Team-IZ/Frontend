import { Badge } from '@/components/ui/Badge'
import type { ExtractionStatus } from '../mockData'

const EXTRACTION_LABEL: Record<ExtractionStatus, string> = {
  UPLOADED: '업로드됨',
  EXTRACTING: '추출 중…',
  EXTRACTED: '추출 완료',
  EXTRACTION_FAILED: '추출 실패',
}

const EXTRACTION_VARIANT: Record<ExtractionStatus, 'info' | 'danger' | 'neutral'> = {
  UPLOADED: 'neutral',
  EXTRACTING: 'info',
  EXTRACTED: 'info',
  EXTRACTION_FAILED: 'danger',
}

export function ExtractionStatusBadge({ status }: { status: ExtractionStatus }) {
  return <Badge variant={EXTRACTION_VARIANT[status]}>{EXTRACTION_LABEL[status]}</Badge>
}

export type TopicBucket = 'NA' | 'NONE' | 'PARTIAL' | 'FULL'

/** 주제 지정 상태 — 필터·배지가 같은 기준을 쓰도록 여기서 한 번만 판정한다 */
export function topicBucket(assigned: number | null, total: number | null): TopicBucket {
  if (total == null) return 'NA'
  if (assigned === total) return 'FULL'
  if (assigned === 0) return 'NONE'
  return 'PARTIAL'
}

const TOPIC_VARIANT: Record<Exclude<TopicBucket, 'NA'>, 'success' | 'warning' | 'info'> = {
  FULL: 'success',
  PARTIAL: 'warning',
  NONE: 'info',
}

export function TopicAssignmentBadge({ assigned, total }: { assigned: number | null; total: number | null }) {
  const bucket = topicBucket(assigned, total)
  if (bucket === 'NA') return <span className="text-fg-subtle text-2xs">—</span>
  return (
    <Badge variant={TOPIC_VARIANT[bucket]}>
      {assigned} / {total} 섹션
    </Badge>
  )
}
