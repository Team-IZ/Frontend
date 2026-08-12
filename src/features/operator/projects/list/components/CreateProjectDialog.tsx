import { useMemo, useState } from 'react'
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
import { Field, FieldLabel } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useCreateProjectFlow, useSectionCandidates } from '../../queries'
import {
  CONCEPT_COUNT,
  canCreate,
  dropOrphanConcepts,
  toSchedule,
  toggleConcept,
} from '../../rules'
import ConceptPicker from '../../components/ConceptPicker'
import RequirementsField from '../../components/RequirementsField'
import type { CohortScope, Curriculum } from '../../types'
import SchedulePicker, { type ScheduleValue } from '../../components/SchedulePicker'

/*
  프로젝트 생성 모달.

  **교안이 검증 개념의 출발점이다.** 교안을 연결해야 `가르친 항목`이 나오고 그중 3건을
  고른다 — 그래서 교안을 고르기 전에는 항목 목록이 비활성이고, 교안이 없으면 프로젝트를
  만들 수 없다(14번 4-3).

  ▸ **교안은 여러 개 붙는다.** 한 회차가 교안 하나에만 걸치지 않는다 — LangGraph로
    만들고 Streamlit으로 붙이는 미프면 두 교안이 다 재료다. 하나만 걸게 하면 나머지
    교안에서 가르친 것은 물어볼 방법이 없어진다.
  ▸ **정의문을 같이 보여준다.** 이름만으로는 무엇을 묻게 될지 판단할 수 없는데, 고르는
    순간 그것이 그 회차 **모든 학생의 문항**이 된다.
  ▸ **후보는 교안·섹션별로 묶는다.** 합쳐 늘어놓으면 `p.55`가 어느 교안의 55쪽인지 알 수
    없다. 확정된 3건은 출처를 달고 다닌다 — 리포트와 면담 브리프가 그 값을 읽는다.

  못 만드는 이유를 구분한다(OP-03 §6) — 둘을 같은 문구로 쓰면 오퍼레이터가 **이미 있는
  교안을 또 등록하러 간다.**

    교안 미등록    등록된 교안 자체가 없다     → 운영 관리 › 교안에서 등록
    교안에 항목 0  교안은 있는데 항목이 없다   → 교안 분석 상태 확인(미완·실패)

  교안 목록은 **화면이 조회해서 넘겨준다.** 이 모달이 직접 부르면 열 때마다 요청이
  나가고, 목록의 교안 필터가 이미 같은 값을 갖고 있다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  cohortId: string
  curricula: Curriculum[]
  /**
   * 교안 목록이 **아직 오는 중인가.** 모르면 목록 자리에 「등록된 교안이 없습니다」가
   * 떠서 **운영 관리로 보내는 안내까지 그린다** — 잠깐 뒤에 도착할 것을 두고
   * 없다고 단정하는 셈이다(op-03-situations §2-7).
   */
  curriculaLoading?: boolean
  /** 기수 기간 — 달력이 이 밖을 못 고르게 막는다 */
  cohort?: CohortScope
  /**
   * 회차는 만들어졌는데 뒤 단계가 실패했다 — **상세로 보내 이어서 채우게 한다.**
   * 되돌리지 않는 이유는 지운 이름을 다시 못 쓰기 때문이다(9차 회신 §10).
   */
  onPartial: (projectId: string, message: string) => void
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  cohortId,
  curricula,
  curriculaLoading,
  cohort,
  onPartial,
}: Props) {
  const [name, setName] = useState('')
  const [versionIds, setVersionIds] = useState<string[]>([])
  const [conceptIds, setConceptIds] = useState<string[]>([])
  const [requirements, setRequirements] = useState<string[]>([])
  const [schedule, setSchedule] = useState<ScheduleValue>({
    startAt: undefined,
    dueAt: undefined,
  })
  const [failed, setFailed] = useState(false)

  const selected = useMemo(
    () => curricula.filter((c) => versionIds.includes(c.versionId)),
    [curricula, versionIds],
  )

  const create = useCreateProjectFlow()
  const submitting = create.isPending

  /*
    **후보를 교안 기준으로 조회한다.** 상세의 `findConceptCandidates`는 `projectId`를
    요구하는데 여기는 아직 회차가 없다 — 섹션 조회가 같은 매핑을 주고 겹치는 필드가
    이름·타입까지 같아서(9차 R2 회신) 그대로 쓸 수 있다.

    **고른 교안 조합이 캐시 키다** — 체크를 껐다 켜면 다시 부르지 않는다.
  */
  const candidatesQuery = useSectionCandidates(selected)
  const candidates = candidatesQuery.data ?? []
  const loadingCandidates = candidatesQuery.isFetching

  /** 교안은 골랐는데 항목이 0 — 등록이 아니라 **분석 상태**를 봐야 한다 */
  const noTeachItem = versionIds.length > 0 && !loadingCandidates && candidates.length === 0

  const toggleCurriculum = (id: string) => {
    setVersionIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setConceptIds((ids) => dropOrphanConcepts(ids, candidates, next))
      return next
    })
  }

  const pickConcept = (id: string) => setConceptIds((prev) => toggleConcept(prev, id))

  const period = toSchedule(schedule.startAt, schedule.dueAt)
  const submittable =
    name.trim().length > 0 && canCreate(versionIds, conceptIds) && !!period && !submitting

  const submit = async () => {
    setFailed(false)
    try {
      const result = await create.mutateAsync({
        cohortId,
        name,
        curriculumVersionIds: versionIds,
        mappingIds: conceptIds,
        requirementTitles: requirements,
        ...period!,
      })
      onOpenChange(false)
      reset()
      /*
        **부분 성공을 조용히 넘기지 않는다.** 회차는 만들어졌는데 교안·개념·요구사항 중
        하나가 안 붙은 상태라, 목록에서는 `준비 중`으로만 보이고 무엇이 빠졌는지 모른다.
        상세로 보내 이어서 채우게 한다 — 지우고 다시 만드는 길은 이름 재사용 제약 때문에
        막혀 있다(9차 회신 §10).
      */
      if (result.step !== 'COMPLETE') onPartial(result.projectId, PARTIAL_MESSAGE[result.step])
    } catch {
      // 입력값을 유지한다 — 작업 중 저장 실패로 폼이 비면 처음부터 다시 해야 한다(F5)
      setFailed(true)
    }
  }

  const reset = () => {
    setName('')
    setVersionIds([])
    setConceptIds([])
    setRequirements([])
    setSchedule({ startAt: undefined, dueAt: undefined })
    setFailed(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        모달 전체를 스크롤시키면 `생성`이 화면 밖으로 밀린다 — 주 액션이 스크롤해야
        닿으면 폼을 다 채우고도 무엇을 눌러야 할지 안 보인다. 제목·푸터는 고정하고
        **본문만** 스크롤한다.
      */}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            프로젝트 생성 {/* 기수 이름을 하드코딩했었다 — 기수를 바꾸면 제목만 거짓말을 한다 */}
            {cohort && <span className="text-fg-subtle text-xs font-normal">· {cohort.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>만들지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="project-name">
              프로젝트명 <RequiredMark>필수</RequiredMark>
            </FieldLabel>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="미프 5차"
            />
          </Field>

          <Field>
            <FieldLabel>
              회차 기간 <RequiredMark>필수</RequiredMark>
            </FieldLabel>
            <SchedulePicker
              value={schedule}
              onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
              min={cohort?.startDate ?? undefined}
              max={cohort?.endDate ?? undefined}
            />
            {/* 왜 저장이 안 되는지를 그 자리에서 — 같은 날이면 날짜만 봐서는 안 갈린다 */}
            {schedule.startAt && schedule.dueAt && !period && (
              <p className="text-danger text-2xs">제출 마감이 시작보다 앞설 수 없습니다</p>
            )}
          </Field>

          <Field>
            <FieldLabel>
              교안 연결 <RequiredMark>1개 이상</RequiredMark>{' '}
              <span className="text-fg-subtle text-xs font-normal">
                · 검증 개념이 여기서 나온다
              </span>
            </FieldLabel>
            <div className="border-border divide-border divide-y rounded-md border">
              {curriculaLoading ? (
                <p className="text-fg-subtle p-4 text-center text-xs">교안을 불러오는 중</p>
              ) : curricula.length === 0 ? (
                <p className="text-fg-subtle p-4 text-center text-xs">
                  등록된 교안이 없습니다 —{' '}
                  <b className="text-fg-muted font-semibold">운영 관리 › 교안</b>에서 먼저
                  등록하세요
                </p>
              ) : (
                curricula.map((c) => {
                  /*
                    ⚠ **분석이 안 끝난 교안은 고를 수 없다.** 고르면 후보 조회
                    (`GET /curricula/{id}/sections`)가 **응답하지 않는다** — 에러도
                    아니고 60초를 넘겨도 안 온다(실측). 화면에는 무한 로딩으로 보이고,
                    그 회차는 개념을 못 골라 **생성 자체가 막힌다**(18차 R1).

                    분석 여부를 서버가 따로 주지 않아 `pageCount`로 판정한다 —
                    스펙이 *"분석 전이거나 확정되지 않았으면 null"* 이라고 말하는 값이고,
                    실측에서도 `null`인 교안만 정확히 행업했다. 상태 필드가 생기면
                    그것으로 바꾼다(18차 R2).
                  */
                  const analyzing = c.pageCount == null
                  return (
                    <label
                      key={c.versionId}
                      className={cn(
                        'flex items-center gap-2 p-2.5 text-sm',
                        analyzing ? 'cursor-not-allowed' : 'cursor-pointer',
                        versionIds.includes(c.versionId) && 'bg-primary-soft',
                      )}
                    >
                      <Checkbox
                        checked={versionIds.includes(c.versionId)}
                        disabled={analyzing}
                        onCheckedChange={() => toggleCurriculum(c.versionId)}
                      />
                      <span className={cn('font-medium', analyzing && 'text-fg-subtle')}>
                        {c.originalFileName}
                      </span>
                      <span className="text-fg-subtle text-xs">v{c.versionNo}</span>
                      {/* 왜 못 고르는지 그 자리에서 말한다 — 잠긴 이유가 없으면 고장으로 읽힌다 */}
                      {analyzing && (
                        <span className="border-border text-fg-subtle rounded-full border px-1.5 py-px text-xs">
                          분석 중 · 아직 못 고름
                        </span>
                      )}
                      {/*
                      항목 수는 이 목록에 없다 — 고르면 아래 후보 목록이 채워진다.
                      **쪽수를 모르면 단위도 안 쓴다** — `쪽`만 남으면 0쪽처럼 읽힌다.
                    */}
                      {c.pageCount != null && (
                        <span className="text-fg-subtle ml-auto text-xs">{c.pageCount}쪽</span>
                      )}
                    </label>
                  )
                })
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel>
              검증 개념 <RequiredMark>3건 고정</RequiredMark>{' '}
              <span className="text-fg-subtle text-xs font-normal">
                · 이 회차 모든 학생의 문항 3개
              </span>
            </FieldLabel>
            <div className="border-border rounded-md border">
              <div className="border-border bg-surface-2 flex items-center justify-between border-b px-3 py-2 text-xs">
                <span className="text-fg-subtle">교안이 가르친 항목</span>
                <b className="font-semibold">
                  {conceptIds.length}개 선택됨 / {CONCEPT_COUNT}
                </b>
              </div>

              {/* 교안을 고르기 전에는 항목 목록이 비활성이다 — 항목은 교안에서 나온다 */}
              {versionIds.length === 0 ? (
                <p className="text-fg-subtle p-5 text-center text-xs">연결된 교안이 없습니다</p>
              ) : loadingCandidates ? (
                <div className="flex justify-center py-8">
                  <Spinner className="size-5" aria-label="후보를 불러오는 중" />
                </div>
              ) : noTeachItem ? (
                <div className="p-5 text-center">
                  <p className="text-fg-muted text-xs">이 교안에서 가르친 항목이 아직 없습니다</p>
                  <p className="text-fg-subtle mt-1 text-2xs">
                    분석이 끝나지 않았거나 실패했습니다 — 운영 관리 › 교안에서 상태를 확인하세요
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <ConceptPicker
                    candidates={candidates}
                    curricula={selected}
                    picked={conceptIds}
                    onToggle={pickConcept}
                  />
                </div>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="project-req">
              요구사항{' '}
              <span className="text-fg-subtle text-xs font-normal">· 선택 · 교안과 별개</span>
            </FieldLabel>
            {/*
              요구사항은 교안에서 나오지 않는다 — 과제 문서에서 나와 **구현 P/F에만**
              쓴다(14번 6-3). 검증 개념과 시각적으로 갈라 놓는다.
            */}
            <RequirementsField id="project-req" value={requirements} onChange={setRequirements} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          {/*
            3건 미만·초과, 교안 0개면 저장을 막는다(OP-03 §5). 흐린 버튼 게이팅(C1)과
            다르다 — C1이 금지한 것은 **권한 때문에** 영원히 흐린 버튼이고, 이것은
            입력이 덜 찬 폼이라 채우면 켜진다.
          */}
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** 어디서 멈췄나 → 상세에서 무엇을 이어서 해야 하나. 상태 이름이 아니라 **할 일**을 쓴다 */
const PARTIAL_MESSAGE: Record<string, string> = {
  CURRICULA_FAILED: '회차는 만들어졌지만 교안이 연결되지 않았습니다 — 구성 탭에서 이어서 하세요.',
  CONCEPTS_FAILED:
    '회차는 만들어졌지만 검증 개념이 확정되지 않았습니다 — 구성 탭에서 이어서 하세요.',
  REQUIREMENTS_FAILED:
    '회차는 만들어졌지만 요구사항이 저장되지 않았습니다 — 구성 탭에서 이어서 하세요.',
}

function RequiredMark({ children }: { children: React.ReactNode }) {
  return <span className="text-danger text-2xs font-semibold">{children}</span>
}
