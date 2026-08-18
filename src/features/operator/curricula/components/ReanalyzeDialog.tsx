import { useState } from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { errorCopy } from '@/lib/errorCopy'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useRequestAnalysis } from '@/api/curriculum/useCurriculumMutations'
import type { findUsedProjects_Response } from '@/api/curriculum/curriculumTypes'
import type { CurriculumStatus } from '../../admin/_/api/types'

/*
  다시 분석하기 전에 — **쓰는 회차를 먼저 보여준다**(OP-06 §6).

  다시 분석하면 섹션이 합쳐지거나 쪽 번호가 달라진다. 그러면 **이미 발행된 리포트의
  교안 위치가 실제와 어긋난다** — 면담에서 `3장 36~46쪽`을 폈는데 다른 내용이 나온다.

  **이미 응시한 학생의 문항과 리포트는 그대로 둔다.** 새 분석 결과는 **다음에 만드는
  회차부터** 적용된다 — 지난 회차 결과가 바뀌면 회차 간 비교가 깨진다.

  쓰는 회차가 없으면 이 경고가 필요 없다 — 그때는 무엇이 바뀌는지만 알린다.
  **없는 위험을 매번 확인받으면 확인이 의미를 잃는다.**

  ## 경고 문턱 — **응시가 시작된 회차만**
  한때 `findUsedProjects`가 이름 배열뿐이라 응시 여부를 알 수 없었고, 연결된 회차가
  하나라도 있으면 경고했다. 11차 R3으로 `attendedCount`가 와서 원래 의도대로 좁혔다 —
  **경고가 늘 뜨면 아무도 안 읽는다.**

  `attendedCount`는 완료가 아니라 **시작** 기준이다(스펙 명시). 진행 중인 응시가 있는
  회차도 잡힌다 — 이미 문항을 받은 학생이 있는데 쪽 번호가 바뀌면 그 리포트가 어긋난다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  /**
   * **응시가 시작된** 회차만. 비어 있으면 경고 문구가 달라진다.
   *
   * ⚠ **`undefined`는 「없다」가 아니라 「아직 모른다」다.** 한때 부모가 `?? []`로
   * 메워서, 조회가 도착하기 전에 이 다이얼로그를 열면 **「영향이 없습니다」라고
   * 단언**했다 — 실제로는 3521명이 이미 응시한 교안이었다(실측). 되돌릴 수 없는
   * 행동을 **안전하다고 말하면서** 권하는 자리라 셋을 갈라 받는다.
   */
  inUse: findUsedProjects_Response | undefined
  /** 지금 분석 상태. 돌고 있는데 또 누르는 경우가 있어 그 사실을 말한다. `null`은 분석 전 */
  analysisStatus: CurriculumStatus | null
}

export default function ReanalyzeDialog({
  open,
  onOpenChange,
  materialId,
  inUse,
  analysisStatus,
}: Props) {
  /** 실패 **원인**을 들고 있는다 — 있고 없고만 알면 화면이 이유를 지어낸다 */
  const [failed, setFailed] = useState<unknown>(null)
  const request = useRequestAnalysis()
  const sending = request.isPending
  const attended = inUse?.reduce((n, p) => n + p.attendedCount, 0) ?? 0
  /*
    ⚠ **이미 분석이 돌고 있는데 또 누를 수 있다.**

    `POST /curricula/{id}/analyses`에 「이미 진행 중」 에러 코드가 없다 — 스펙의 에러가
    `NOT_FOUND`·인증 둘뿐이고, 돌고 있어도 **202로 접수한다**(실측). 그래서 서버가
    막아 주지 않고, 누를 때마다 AI 분석이 한 번 더 걸린다.

    **버튼을 잠그지는 않는다.** 분석이 `PENDING`에서 멈춰 있는 교안이 실제로 있어서,
    잠그면 그것을 풀 길이 사라진다 — 여기가 유일한 출구다. 대신 **무슨 일이 일어나는지
    먼저 말한다.**
  */
  const analysing = analysisStatus === 'PENDING' || analysisStatus === 'RUNNING'

  /*
    **이름을 나열하지 않고 기수로 묶는다.**

    한때 회차 이름을 그대로 이어 붙였는데, 이 교안을 여러 기수가 쓰면
    `미니프로젝트 1차 · 미니프로젝트 2차 · … · 미니프로젝트 1차 · …`가 된다 —
    실측 18개에 같은 이름이 세 번씩 나왔다(9기·8기·7기). **이름만으로는 어느 것인지
    구분이 안 되는데 문장만 길어진다.**

    여기서 답할 질문은 *"얼마나 넓게 쓰이나"* 이고, 어느 회차인지는 뒤의
    **연결된 프로젝트 탭**이 표로 답한다. 기수 이름이 `null`로 올 수 있어(스펙) 그때는
    묶지 않고 따로 센다.
  */
  const byCohort = Object.entries(
    (inUse ?? []).reduce<Record<string, number>>((acc, p) => {
      const key = p.cohortName ?? '기수 미상'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {}),
  )
    .map(([cohort, n]) => `${cohort} ${n}개`)
    .join(' · ')

  /*
    **분석이 돌고 있으면 `force`로 보낸다.**

    ⚠ 이 다이얼로그는 *"오래 멈춰 있을 때만 누르세요"* 라고 안내해 놓고 **눌러도 아무
    일이 없었다** — 서버가 `409 CURRICULUM_ANALYSIS_IN_PROGRESS`로 막기 때문이다.
    말은 하는데 못 하는 자리였다.

    `?force=true`가 그 출구다. **돌고 있는 것을 버리고 처음부터 다시** 돌리므로,
    분석 중이 아닐 때는 보내지 않는다 — 필요 없는 강제는 쓰지 않는다.
  */
  const run = async () => {
    setFailed(null)
    try {
      await request.mutateAsync({
        path: { materialId },
        ...(analysing && { query: { force: true } }),
      })
      onOpenChange(false)
    } catch (e) {
      setFailed(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>다시 분석하기 전에</DialogTitle>
        </DialogHeader>

        {/* 원인을 추측하지 않는다 — 서버가 코드로 말하면 그 문구가 이긴다 */}
        {failed !== null &&
          (() => {
            const copy = errorCopy(failed, { subject: '분석', action: '요청' })
            return (
              <Alert variant="danger">
                <AlertTitle>{copy.title}</AlertTitle>
                <AlertDescription>{copy.description}</AlertDescription>
              </Alert>
            )
          })()}

        {analysing && (
          <Alert variant="warning">
            <AlertTitle>이 교안은 지금 분석 중입니다</AlertTitle>
            <p className="text-fg-muted mt-1 text-sm">
              「처음부터 다시」를 누르면{' '}
              <b className="text-fg font-medium">돌고 있는 것을 버리고</b> 새로 시작합니다 —
              빨라지지는 않습니다. 오래 멈춰 있을 때만 누르세요.
            </p>
          </Alert>
        )}

        {/*
          **모르면 모른다고 한다.** 아래 「영향이 없습니다」는 *확인한 결과*라야 하는데,
          한때 조회 전·실패까지 그 문구를 냈다. 여기서 막지는 않는다 — 멈춘 분석을 푸는
          유일한 출구가 이 버튼이라(§5-6) 잠그면 그 길이 사라진다. **사실만 바꾼다.**
        */}
        {inUse === undefined ? (
          <p className="text-fg-muted text-sm">
            이 교안을 쓰는 프로젝트를{' '}
            <b className="text-fg font-medium">아직 확인하지 못했습니다</b> — 응시가 시작된 회차가
            있으면 이미 발행된 리포트의 교안 위치가 어긋날 수 있습니다. 급하지 않다면 목록을 불러온
            뒤에 다시 시도해 주세요.
          </p>
        ) : inUse.length > 0 ? (
          <div className="flex gap-3">
            {/* 아이콘 색만 tone을 갖는다 — 카드 배면은 흰색이다(H+ 상태 메시지) */}
            <div className="bg-warning-soft text-warning flex size-10 shrink-0 items-center justify-center rounded-md">
              <TriangleAlertIcon className="size-5" />
            </div>
            <div className="space-y-2 text-sm">
              {/*
                **값 뒤에 조사를 붙이지 않는다.** 한때 `{회차이름}가 {교안명}으로`였는데
                둘 다 받침에 따라 「이/가」·「으로/로」가 갈린다 — 서버가 주는 이름이라
                어느 쪽인지 미리 알 수 없다. 고정 명사 뒤로 옮기고 값은 뒤에 나열한다.
              */}
              <p className="font-semibold">
                이 교안으로 응시 중인 프로젝트가 {inUse.length}개 있습니다 — {byCohort}
              </p>
              <p className="text-fg-muted">
                {attended}명이 이미 응시했고, 그 문항은 지금 버전의 쪽 번호와 개념으로
                만들어졌습니다.
              </p>
              <p className="text-fg-muted">
                다시 분석하면 섹션이 합쳐지거나 쪽 번호가 달라질 수 있습니다. 그러면 이미 발행된
                리포트의 교안 위치가 실제와 어긋납니다.
              </p>
              <p className="text-fg font-medium">
                이미 응시한 학생의 문항과 리포트는 그대로 둡니다 — 분석 결과는 다음에 만드는
                프로젝트부터 적용됩니다.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-fg-muted text-sm">
            이 교안을 쓰는 프로젝트 중 응시가 시작된 것이 없어 발행된 리포트에 영향이 없습니다.
            분석이 끝나면 <b className="text-fg font-medium">가르친 항목</b>이 새로 만들어집니다.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            취소
          </Button>
          <Button disabled={sending} onClick={run}>
            {sending && <Spinner className="size-3.5" />}
            {/* 모르는 동안에는 「그래도」를 안 붙인다 — 무엇을 무릅쓰는지 못 말한다 */}
            {analysing ? '처음부터 다시' : inUse?.length ? '그래도 다시 분석' : '다시 분석'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
