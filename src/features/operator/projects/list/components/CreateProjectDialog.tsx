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
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { Checkbox } from '@/components/ui/Checkbox'
import { Field, FieldLabel } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { createProject } from '../../api'
import {
  CONCEPT_COUNT,
  DEFAULT_DUE_TIME,
  DEFAULT_START_TIME,
  canCreate,
  dropOrphanConcepts,
  toSchedule,
  toggleConcept,
} from '../../rules'
import ConceptPicker from '../../components/ConceptPicker'
import RequirementsField from '../../components/RequirementsField'
import { KIND_LABEL } from '../../labels'
import type { CohortScope, Curriculum, ProjectKind } from '../../types'
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
  /** 기수 기간 — 달력이 이 밖을 못 고르게 막는다 */
  cohort?: CohortScope
  /** 생성 성공 시 — 목록을 다시 부르게 한다(서버가 정렬·집계를 다시 해야 한다) */
  onCreated: () => void
}

/** 라벨은 labels.ts가 주인이다 — 여기 다시 적으면 이름을 바꿀 때 한 곳만 바뀐다 */
const KIND_OPTIONS = (Object.keys(KIND_LABEL) as ProjectKind[]).map((k) => ({
  value: k,
  label: KIND_LABEL[k],
}))

/** 새 회차는 대부분 미프다(기수당 미프 6~8회 · 빅프 1회) */
const DEFAULT_KIND: ProjectKind = 'MINI'

export default function CreateProjectDialog({
  open,
  onOpenChange,
  cohortId,
  curricula,
  cohort,
  onCreated,
}: Props) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<ProjectKind>(DEFAULT_KIND)
  const [curriculumIds, setCurriculumIds] = useState<string[]>([])
  const [conceptIds, setConceptIds] = useState<string[]>([])
  const [requirements, setRequirements] = useState<string[]>([])
  const [schedule, setSchedule] = useState<ScheduleValue>({
    startAt: undefined,
    startTime: DEFAULT_START_TIME,
    dueAt: undefined,
    dueTime: DEFAULT_DUE_TIME,
  })
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  /** 연결한 교안들의 `teaches` 합집합 — 이것이 검증 개념 후보다 */
  const selected = useMemo(
    () => curricula.filter((c) => curriculumIds.includes(c.id)),
    [curricula, curriculumIds],
  )
  const candidateCount = selected.reduce((n, c) => n + c.teaches.length, 0)

  /** 교안은 골랐는데 항목이 0 — 등록이 아니라 **분석 상태**를 봐야 한다 */
  const noTeachItem = curriculumIds.length > 0 && candidateCount === 0

  const toggleCurriculum = (id: string) => {
    setCurriculumIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setConceptIds((ids) => dropOrphanConcepts(ids, curricula, next))
      return next
    })
  }

  const pickConcept = (id: string) => setConceptIds((prev) => toggleConcept(prev, id))

  const period = toSchedule(schedule.startAt, schedule.startTime, schedule.dueAt, schedule.dueTime)
  const submittable =
    name.trim().length > 0 && canCreate(curriculumIds, conceptIds) && !!period && !submitting

  const submit = async () => {
    setSubmitting(true)
    setFailed(false)
    try {
      await createProject({
        cohortId,
        name,
        kind,
        curriculumIds,
        conceptIds,
        requirements,
        ...period!,
      })
      onCreated()
      onOpenChange(false)
      reset()
    } catch {
      // 입력값을 유지한다 — 작업 중 저장 실패로 폼이 비면 처음부터 다시 해야 한다(F5)
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setName('')
    setKind(DEFAULT_KIND)
    setCurriculumIds([])
    setConceptIds([])
    setRequirements([])
    setSchedule({
      startAt: undefined,
      startTime: DEFAULT_START_TIME,
      dueAt: undefined,
      dueTime: DEFAULT_DUE_TIME,
    })
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
            <FieldLabel>유형</FieldLabel>
            {/*
              2지 토글은 ButtonGroup이다 — InputCompositionsPreview가 이 조합을
              "2지 토글"로 이미 확정해 뒀다(Button 두 개를 나란히 두는 것과 다르다:
              모서리가 맞물리고 가운데 테두리가 겹치지 않는다).
            */}
            <ButtonGroup>
              {KIND_OPTIONS.map((o) => (
                <Button
                  key={o.value}
                  type="button"
                  variant={kind === o.value ? 'primary' : 'ghost'}
                  size="sm"
                  aria-pressed={kind === o.value}
                  onClick={() => setKind(o.value)}
                >
                  {o.label}
                </Button>
              ))}
            </ButtonGroup>
          </Field>

          <Field>
            <FieldLabel>
              회차 기간 <RequiredMark>필수</RequiredMark>
            </FieldLabel>
            <SchedulePicker
              value={schedule}
              onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
              min={cohort?.startAt}
              max={cohort?.endAt}
            />
            {/* 왜 저장이 안 되는지를 그 자리에서 — 같은 날이면 날짜만 봐서는 안 갈린다 */}
            {schedule.startAt && schedule.dueAt && !period && (
              <p className="text-danger text-2xs">제출 마감이 시작보다 뒤여야 합니다</p>
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
              {curricula.length === 0 ? (
                <p className="text-fg-subtle p-4 text-center text-xs">
                  등록된 교안이 없습니다 —{' '}
                  <b className="text-fg-muted font-semibold">운영 관리 › 교안</b>에서 먼저
                  등록하세요
                </p>
              ) : (
                curricula.map((c) => (
                  <label
                    key={c.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 p-2.5 text-sm',
                      curriculumIds.includes(c.id) && 'bg-primary-soft',
                    )}
                  >
                    <Checkbox
                      checked={curriculumIds.includes(c.id)}
                      onCheckedChange={() => toggleCurriculum(c.id)}
                    />
                    <span className="font-medium">{c.name}</span>
                    <span className="text-fg-subtle text-xs">{c.version}</span>
                    <span className="text-fg-subtle ml-auto text-xs">
                      가르친 항목 {c.teaches.length}
                    </span>
                  </label>
                ))
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
              {curriculumIds.length === 0 ? (
                <p className="text-fg-subtle p-5 text-center text-xs">연결된 교안이 없습니다</p>
              ) : noTeachItem ? (
                <div className="p-5 text-center">
                  <p className="text-fg-muted text-xs">이 교안에서 가르친 항목이 아직 없습니다</p>
                  <p className="text-fg-subtle mt-1 text-2xs">
                    분석이 끝나지 않았거나 실패했습니다 — 운영 관리 › 교안에서 상태를 확인하세요
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <ConceptPicker curricula={selected} picked={conceptIds} onToggle={pickConcept} />
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

function RequiredMark({ children }: { children: React.ReactNode }) {
  return <span className="text-danger text-2xs font-semibold">{children}</span>
}
