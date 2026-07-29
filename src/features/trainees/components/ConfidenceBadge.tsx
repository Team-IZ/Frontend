import { Alert, AlertDescription } from '@/components/ui/Alert'

/*
  ② 데이터 신뢰도 경고 — 문제 있을 때만(채점 안정성 REVIEW_REQUIRED 또는 커밋이메일
  미검증 G-4). 사람 신호(①)와 분리된 별도 스트립이라 귀속 카드(⑦)에 매몰하지 않는다(D107).
*/
export function ConfidenceBadge({ message }: { message: string }) {
  return (
    <Alert variant="danger" className="mb-4 py-2.5">
      <AlertDescription className="text-danger">
        <b>데이터 신뢰도 주의</b> · {message}
      </AlertDescription>
    </Alert>
  )
}
