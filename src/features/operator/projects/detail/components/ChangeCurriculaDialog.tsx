import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useSaveCurricula } from '../../queries'
import { canUnlinkCurriculum } from '../../rules'
import type { Curriculum, ProjectDetail } from '../../types'

/*
  교안 변경 — **개념이 쓰는 교안은 못 뺀다**(OP-04 §5).

  출처가 끊긴 개념은 교안 위치를 가리킬 수 없다. 리포트의 교안 위치와 면담 브리프가
  그 값을 읽으므로 `3장 p.55`를 어느 문서에서 펼지 알 수 없게 된다.

  ▸ **막고, 이유와 함께 어느 개념인지 쓴다.** 못 누르는 체크박스만 두면 왜인지 모르고,
    이름을 안 쓰면 무엇부터 바꿔야 하는지 모른다 — 해제하려면 **그 개념부터** 바꿔야
    하므로 다음 행동이 검증 개념 `변경`이라는 것까지 이 줄에서 읽혀야 한다.
  ▸ **생성 모달과 규칙이 다르다.** 생성(OP-03)은 교안을 빼면 그 개념이 같이 빠진다
    (`dropOrphanConcepts`) — 저장 전이라 빠지는 것이 그 자리에서 보이고 되돌릴 수 있다.
    확정된 회차에서 같은 일이 일어나면 3건이 조용히 2건이 되어 **학생에게 낼 문항이
    사라진다.** 오퍼레이터는 교안만 건드렸는데 회차가 준비 전으로 되돌아간다.
  ▸ **추가는 제약이 없다.** 교안을 더 붙이면 후보만 늘고 확정된 3건은 그대로다.

  교안 목록은 **화면이 조회해서 넘겨준다** — 이 모달이 직접 부르면 열 때마다 요청이
  나간다(CreateProjectDialog와 같은 규칙).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: ProjectDetail
  curricula: Curriculum[]
  /**
   * 교안 목록이 **아직 오는 중인가.** 모르면 열자마자 「등록된 교안이 없습니다 —
   * 운영 관리에서 먼저 등록하세요」가 떠서, 1초 뒤 도착할 목록을 두고 **없다고 단정하며
   * 다른 화면으로 보낸다**(실측 — 열고 1초 시점에 그 문구가 보였다).
   */
  loading?: boolean
}

export default function ChangeCurriculaDialog({
  open,
  onOpenChange,
  project,
  curricula,
  loading,
}: Props) {
  const [picked, setPicked] = useState<string[]>([])
  const [failed, setFailed] = useState(false)
  const save = useSaveCurricula()

  // 열 때마다 현재 연결에서 시작한다 — 변경하러 열었는데 빈 상태면 처음부터 다시 골라야 한다
  useEffect(() => {
    if (open) {
      setPicked(project.curricula.map((c) => c.curriculumVersionId))
      setFailed(false)
    }
  }, [open, project.curricula])

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const linkedIds = project.curricula.map((c) => c.curriculumVersionId)
  const changed = picked.length !== linkedIds.length || picked.some((id) => !linkedIds.includes(id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            교안 변경{' '}
            <span className="text-fg-subtle text-xs font-normal">
              · 검증 개념의 출처 · {picked.length}개 연결
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>저장하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          {loading ? (
            <p className="border-border-strong text-fg-subtle rounded-md border border-dashed p-5 text-center text-xs">
              교안을 불러오는 중
            </p>
          ) : curricula.length === 0 ? (
            <p className="border-border-strong text-fg-subtle rounded-md border border-dashed p-5 text-center text-xs">
              등록된 교안이 없습니다 —{' '}
              <b className="text-fg-muted font-semibold">운영 관리 › 교안</b>에서 먼저 등록하세요
            </p>
          ) : (
            <div className="border-border divide-border divide-y rounded-md border">
              {curricula.map((c) => {
                const checked = picked.includes(c.versionId)
                /*
                  규칙은 `rules.ts`가 갖는다 — 여기서 `concepts.some(...)`을 다시 쓰면
                  같은 규칙이 두 곳에 생기고, 서버 검증(`saveCurricula`)과 갈릴 수 있다.
                */
                /*
                  ⚠ **분석이 안 끝난 교안은 새로 붙일 수 없다.** 붙이면 개념 후보 조회가
                  응답하지 않는다(18차 R1 — `pageCount == null`인 교안에서만 무응답).
                  **이미 붙어 있는 것은 건드리지 않는다** — 떼는 것은 막을 이유가 없다.
                */
                const analyzing = c.pageCount == null && !checked
                const locked =
                  analyzing || (checked && !canUnlinkCurriculum(project.concepts, c.versionId))
                const users = locked
                  ? project.concepts.filter((k) => k.curriculumVersionId === c.versionId)
                  : []

                return (
                  <label
                    key={c.versionId}
                    className={cn(
                      'flex gap-2 p-2.5 text-sm',
                      checked && 'bg-primary-soft',
                      locked ? 'cursor-not-allowed' : 'cursor-pointer',
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      disabled={locked}
                      onCheckedChange={() => toggle(c.versionId)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <b className="font-medium">{c.originalFileName}</b>
                        <span className="text-fg-subtle text-xs">v{c.versionNo}</span>
                        {/*
                          한때 `가르친 항목 N`을 썼는데 교안 목록에 그 수가 없다 —
                          후보는 프로젝트 기준으로 따로 조회된다. 쪽수로 바꿨다:
                          **없는 값을 추정하지 않고 응답에 있는 사실을 쓴다.**
                        */}
                        {/* 쪽수를 모르면 단위도 안 쓴다 — 「쪽」만 남으면 0쪽처럼 읽힌다 */}
                        {analyzing && (
                          <span className="border-border text-fg-subtle rounded-full border px-1.5 py-px text-xs">
                            분석 중 · 아직 못 붙임
                          </span>
                        )}
                        {c.pageCount != null && (
                          <span className="text-fg-subtle ml-auto shrink-0 text-xs">
                            {c.pageCount}쪽
                          </span>
                        )}
                      </span>
                      {/*
                        왜 못 빼는지 + 무엇부터 바꿔야 하는지. 이름을 쓰는 이유는
                        개념이 3건뿐이라 다 적어도 한 줄이고, 개수만 쓰면 검증 개념
                        섹션으로 돌아가 대조해야 하기 때문이다.
                      */}
                      {locked && (
                        <span className="text-fg-subtle mt-1 block text-2xs">
                          검증 개념 {users.length}건이 쓰고 있어 뺄 수 없습니다 —{' '}
                          {users.map((k) => k.extractedName).join(' · ')}
                        </span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="items-center justify-between sm:justify-between">
          {/* 왜 저장할 수 없는지를 버튼 옆에 쓴다 — 흐린 버튼만 두면 이유를 모른다 */}
          <p className="text-fg-subtle text-xs">
            {picked.length === 0
              ? '교안을 1개 이상 연결해야 합니다'
              : changed
                ? '검증 개념 후보가 다시 계산됩니다'
                : '변경된 것이 없습니다'}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              취소
            </Button>
            <Button
              disabled={picked.length === 0 || !changed || save.isPending}
              onClick={async () => {
                setFailed(false)
                try {
                  await save.mutateAsync({
                    projectId: project.projectId,
                    current: project.curricula,
                    nextVersionIds: picked,
                  })
                  onOpenChange(false)
                } catch {
                  // 선택을 유지한다 — 저장 실패로 고른 것이 날아가면 처음부터 다시 해야 한다(F5)
                  setFailed(true)
                }
              }}
            >
              {save.isPending && <Spinner className="size-3.5" />}
              저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
