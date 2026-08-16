import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/utils/cn'
import { useManagerCohort } from '@/stores/cohortScope'
import RiskBadge from './components/RiskBadge'
import { destinationsFor } from './causeRouting'
import { useBrief, useCreateInterviewBrief, useSaveInterviewBrief } from './_/api/api'
import { CAUSE_OPTIONS, type Brief, type CauseKey } from './_/api/types'

/*
  MG-04 면담 브리프 — "낭독 · 경청 · 라우팅"(정의서 §1).

  **여는 말과 질문을 AI가 만든다.** 목은 위험 유형별 고정 템플릿 4종과 고정 질문
  배열을 화면이 갖고 있었는데, 서버가 `openingRemark`(1~3문장 구어체)와 `items[]`
  (4~8개 질문 + 매니저만 보는 근거)를 통째로 준다. 그 템플릿·배열이 전부 사라졌다.

  **원인→조치 라우팅은 그대로 화면 것이다** — 스펙이 *"조치는 보내지 않습니다,
  화면이 계산합니다"* 라고 명시한다(`causeRouting.ts`).

  ⚠ **브리프가 없으면 먼저 만든다.** `briefState`가 `NONE`·`FAILED`면 조회가 아니라
  `POST .../brief`다. 없는 브리프를 `GET`하면 서버가 404를 내는데 **404는 지금
  무응답이라**(30차 R1) 화면이 90초를 기다렸다 실패로 떨어진다 — 실측했다.
  목록이 `?state=`로 넘겨주는 `briefState`를 그대로 믿는다.

  ⚠ **나가는 길·저장 완료 이동 전부 `navigate(-1)`을 쓴다** — 이 화면은 면담 목록
  (MG-03)과 대시보드(MG-01) 두 입구가 있어, 고정 링크로 두면 대시보드에서 열었을 때
  엉뚱하게 목록으로 튄다(MG-06 `DetailHeader`와 같은 문제).

  ⚠ **정의서 §2는 원래 전체화면·사이드바 가림을 규정했다.** 렌더 확인 중 사용자가
  "브리프만 앱 자체가 사라지는 느낌"이라고 지적해 `ConsoleShell`로 감쌌다(MG04-5).
*/

export default function InterviewBriefScreen() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { cohortName, cohorts, selectCohort } = useManagerCohort()

  /*
    목록에서 넘겨준 상태. 없으면(주소로 바로 들어온 경우) 있다고 보고 조회한다 —
    그 편이 흔한 경우고, 없으면 아래 실패 화면에서 [브리프 만들기]로 이어진다.
  */
  const stateHint = params.get('state')
  const exists = stateHint !== 'NONE' && stateHint !== 'FAILED'

  const brief = useBrief(id, exists)
  const create = useCreateInterviewBrief()

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      {children}
    </ConsoleShell>
  )

  async function handleCreate() {
    try {
      await create.mutateAsync({ path: { caseId: id } })
      await brief.refetch()
    } catch {
      /* 실패는 아래 화면이 그대로 그린다 — 다시 누를 수 있다 */
    }
  }

  /* 아직 브리프가 없다 — 만들기부터 (조회를 부르지 않는다) */
  if (!exists && !brief.data) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>
            {stateHint === 'FAILED' ? '브리프를 만들지 못했습니다' : '아직 브리프가 없습니다'}
          </EmptyTitle>
          <EmptyDescription>
            여는 말과 질문을 만드는 데 잠시 걸립니다.
            {stateHint === 'FAILED' && (
              <>
                <br />
                지난번 생성이 실패했어요 — 다시 시도해 주세요.
              </>
            )}
          </EmptyDescription>
        </EmptyHeader>
        <div className="mt-2 flex justify-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            돌아가기
          </Button>
          <Button variant="primary" disabled={create.isPending} onClick={() => void handleCreate()}>
            {create.isPending ? '만드는 중…' : '브리프 만들기'}
          </Button>
        </div>
      </Empty>,
    )
  }

  if (brief.isPending) {
    return shell(
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="브리프를 불러오는 중" />
      </div>,
    )
  }

  if (brief.isError || !brief.data) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>브리프를 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도하거나 목록으로 돌아가세요.</EmptyDescription>
        </EmptyHeader>
        <div className="mt-2 flex justify-center gap-2">
          <Button variant="ghost" onClick={() => void brief.refetch()}>
            다시 시도
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            돌아가기
          </Button>
        </div>
      </Empty>,
    )
  }

  /*
    생성이 실패한 브리프 — `openingRemark`가 `null`, `items`가 빈 배열로 온다.
    스펙에 `nullable` 표기가 붙어 타입도 이제 그렇게 말한다(30차 R2③).

    **`briefState`로 먼저 가른다** — 그 자리를 빈 채로 그리면 매니저가 "할 말이
    없구나"로 읽는다. 백엔드도 이 방어를 그대로 두어도 좋다고 했다.
  */
  if (brief.data.briefState === 'FAILED') {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>브리프를 만들지 못했습니다</EmptyTitle>
          <EmptyDescription>여는 말과 질문 생성이 실패했어요. 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <div className="mt-2 flex justify-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            돌아가기
          </Button>
          <Button variant="primary" disabled={create.isPending} onClick={() => void handleCreate()}>
            {create.isPending ? '만드는 중…' : '다시 만들기'}
          </Button>
        </div>
      </Empty>,
    )
  }

  /*
    🔴 **`key`가 없으면 저장한 값이 안 보인다.**

    저장 → 목록 복귀 → 다시 열기를 실제로 눌러 보니 입력칸이 전부 비어 있었다.
    목록은 `다음에 할 것 — "…"`를 정확히 말하는데 브리프만 빈 값이었고, **저장
    버튼은 `저장`**(= `savedRecord`가 있다는 뜻)이라 **버튼과 입력칸이 서로 다른
    데이터를 보고 있었다.**

    원인은 캐시다. 저장이 `interventionKeys.all`을 무효화하면 캐시는 stale이 되지만
    **데이터는 남아 있어** 다시 열 때 옛 응답(`savedRecord: null`)이 즉시 반환된다.
    `BriefSheet`가 그것으로 마운트되며 `useState` 초기값이 빈 값으로 굳고, 새 응답이
    도착해도 초기값은 다시 잡히지 않는다.

    저장된 값이 바뀌면 리마운트해 초기값을 다시 잡는다. 타이핑 중에는 `savedRecord`가
    바뀌지 않으므로 입력이 날아가지 않는다.

    ⚠ **주소로 들어가면 안 나온다** — 캐시가 없어 처음부터 새 응답으로 마운트된다.
    목록에서 **눌러서** 왕복해야 재현된다(screen-hardening §5).
  */
  return shell(
    <BriefSheet
      key={JSON.stringify(brief.data.savedRecord)}
      brief={brief.data}
      cohortName={cohortName ?? ''}
    />,
  )
}

function BriefSheet({ brief, cohortName }: { brief: Brief; cohortName: string }) {
  const navigate = useNavigate()
  const save = useSaveInterviewBrief()

  // 종결 후 다시 연 브리프면 이전에 저장한 값으로 시작한다(사용자 지시 — 재오픈 시
  // 입력이 날아가면 안 된다). 처음 여는 브리프는 `savedRecord`가 없어 빈 값 그대로.
  const [causes, setCauses] = useState<Set<CauseKey>>(
    () => new Set((brief.savedRecord?.causes ?? []) as CauseKey[]),
  )
  const [why, setWhy] = useState(brief.savedRecord?.why ?? '')
  const [nextAction, setNextAction] = useState(brief.savedRecord?.nextAction ?? '')
  const [saveFailed, setSaveFailed] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  const selectedCauses = CAUSE_OPTIONS.filter((o) => causes.has(o.key))
  const sentToText = selectedCauses
    .flatMap((o) => destinationsFor(o.key, brief))
    .map((l) => l.text)
    .join(' · ')

  function toggleCause(key: CauseKey) {
    setCauses((prevSet) => {
      const next = new Set(prevSet)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function doSave() {
    setSaveFailed(false)
    try {
      await save.mutateAsync({
        path: { caseId: brief.caseId },
        body: { causes: [...causes], why, nextAction },
      })
      navigate(-1)
    } catch {
      setSaveFailed(true)
    }
  }

  function handleSaveClick() {
    if (!nextAction.trim()) {
      setShowEmptyConfirm(true)
      return
    }
    void doSave()
  }

  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          aria-label="저장하지 않고 이전 화면으로 돌아가기"
          onClick={() => navigate(-1)}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="flex items-baseline gap-2">
          <span className="text-fg text-xl font-bold tracking-[-0.01em]">{brief.name}</span>
          <span className="text-fg-subtle text-sm">
            {[cohortName, brief.className].filter(Boolean).join(' · ')}
          </span>
        </span>
        <RiskBadge riskType={brief.riskType} />
      </div>

      <div className="max-w-[820px] pb-8">
        <Block no={1} title="여는 말">
          {/* **서버가 만든 문장을 그대로 읽는다** — 화면이 문장을 짓지 않는다 */}
          <div className="bg-primary-soft text-fg rounded-md p-4 text-sm leading-[1.85] whitespace-pre-line">
            {brief.openingRemark}
          </div>

          {brief.isVoid ? (
            <>
              <div className="text-fg mt-3 text-sm">
                이 회차 결과 — <b className="font-bold">채점하지 않음</b>
                <span className="text-fg-subtle mt-0.5 block text-2xs">
                  도달 단계도 위험 판정도 없습니다. 다시 응시하면 그게 1차가 됩니다.
                </span>
              </div>
              {brief.voidEvidence && <VoidEvidence evidence={brief.voidEvidence} />}
            </>
          ) : (
            <>
              {/*
                🔴 `concepts`가 지금 **항상 빈 배열**이다 — 교안 위치·반 문제 판정이
                서버 미구현(스펙에 명시). 「이야기할 개념」 줄이 통째로 안 그려진다.
                채워지기 시작하면 이 코드가 그대로 살아난다.
              */}
              {brief.concepts.length > 0 && (
                <div className="text-fg-muted mt-3 text-sm">
                  이야기할 개념 —{' '}
                  <b className="text-fg font-bold">
                    {brief.concepts.map((c) => c.name).join(' · ')}
                  </b>
                </div>
              )}
              {brief.priorInterview?.nextAction && (
                <div className="border-border text-fg-muted mt-3 flex items-baseline gap-1.5 border-t pt-3 text-sm">
                  <span className="text-warning">⚠</span>
                  <span>
                    지난 면담
                    {brief.priorInterview.interviewedAt &&
                      `(${brief.priorInterview.interviewedAt.slice(5, 10).replace('-', '.')})`}
                    에서 정한 것 —{' '}
                    <b className="text-fg font-bold">“{brief.priorInterview.nextAction}”</b>
                  </span>
                </div>
              )}
            </>
          )}
        </Block>

        <Block no={2} title="질문">
          {/*
            **전 항목을 그대로 그린다** — 스펙 명시("질문을 고르는 UI가 없습니다").
            `questionRationale`은 매니저만 보는 근거라 질문 아래 작게 붙인다.
          */}
          <ul className="space-y-3 text-sm leading-relaxed">
            {[...brief.items]
              .sort((a, b) => a.suggestedOrder - b.suggestedOrder)
              .map((q) => (
                <li key={q.itemId} className="relative pl-4">
                  <span className="text-fg-subtle absolute left-0">·</span>
                  {q.questionText}
                  {q.questionRationale && (
                    <span className="text-fg-subtle mt-0.5 block text-2xs">
                      {q.questionRationale}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </Block>

        <Block no={3} title="원인">
          <div className="flex flex-wrap gap-1.5">
            {CAUSE_OPTIONS.map((o) => {
              const active = causes.has(o.key)
              return (
                <button
                  key={o.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleCause(o.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm',
                    active
                      ? 'bg-primary-soft border-primary-border text-primary font-semibold'
                      : 'bg-surface border-border-strong text-fg-muted hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border',
                      active ? 'bg-primary border-primary text-white' : 'border-border-strong',
                    )}
                  >
                    {active && <Check className="size-2.5" strokeWidth={3} />}
                  </span>
                  {o.label}
                </button>
              )
            })}
          </div>
        </Block>

        <Block no={4} title="조치">
          {selectedCauses.length === 0 ? (
            <div className="text-fg-subtle py-4 text-center text-sm">
              원인을 고르면 조치가 나타납니다.
            </div>
          ) : (
            selectedCauses.map((cause, causeIdx) => (
              <div
                key={cause.key}
                className={causeIdx > 0 ? 'border-border mt-2 border-t pt-2' : ''}
              >
                {destinationsFor(cause.key, brief).map((line, i) => (
                  <div key={i} className="flex items-start gap-3 py-1.5 text-sm">
                    <span className="text-fg w-[132px] shrink-0 font-bold">
                      {line.showLabel ? cause.label : ''}
                    </span>
                    <span className="text-fg-muted flex-1 leading-relaxed">
                      {line.href ? (
                        <Link to={line.href} className="text-primary hover:underline">
                          {line.text}
                        </Link>
                      ) : (
                        renderBold(line.text, line.bold)
                      )}
                    </span>
                    <span
                      className={cn(
                        'w-[62px] shrink-0 text-right text-2xs font-bold whitespace-nowrap',
                        line.owner === 'MANAGER' && 'text-primary',
                        line.owner === 'PASS' && 'text-fg-subtle',
                      )}
                    >
                      {line.owner === 'MANAGER' ? '매니저' : line.owner === 'PASS' ? '전달만' : ''}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </Block>

        <div className="border-border bg-surface rounded-md border p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-fg text-sm font-bold">기록</span>
            <Link
              to={`/manager/trainees/${brief.traineeId}`}
              className="text-primary ml-auto text-xs hover:underline"
            >
              전체 이력 ↗
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <RecordField label="상세 사유">
              <Textarea
                value={why}
                onChange={(e) => setWhy(e.target.value)}
                placeholder="상세 사유를 적어주세요."
                className="min-h-16 text-xs"
              />
            </RecordField>
            <RecordField label="조치" hint="4에서 자동 반영">
              {/*
                ⚠ 이 칸은 **저장되지 않는다** — 서버가 조치를 안 받는다(스펙 명시).
                원인·상세 사유·추후 계획만 남는다.
              */}
              <div
                aria-readonly="true"
                className="border-border-strong bg-input/60 text-fg-subtle min-h-16 cursor-not-allowed rounded-sm border px-2.5 py-2 text-xs leading-relaxed"
              >
                {sentToText || (
                  <>
                    원인을 체크하시면
                    <br />
                    조치가 자동반영됩니다.
                  </>
                )}
              </div>
            </RecordField>
            <RecordField label="추후 계획">
              <Textarea
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="추후 계획을 적어주세요."
                className="min-h-16 text-xs"
              />
            </RecordField>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" disabled={save.isPending} onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button variant="primary" disabled={save.isPending} onClick={handleSaveClick}>
            {brief.savedRecord ? '저장' : '저장하고 종결'}
          </Button>
        </div>
      </div>

      <Dialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>추후 계획을 비워 두고 저장할까요?</DialogTitle>
          </DialogHeader>
          <p className="text-fg-muted text-sm leading-relaxed">
            비워 두면 <b className="text-fg">다음 회차 브리프에 이어받을 것이 없습니다.</b>
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowEmptyConfirm(false)
                void doSave()
              }}
            >
              비워 두고 저장
            </Button>
            <Button variant="primary" onClick={() => setShowEmptyConfirm(false)}>
              돌아가서 적기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={saveFailed} onOpenChange={(open) => !open && setSaveFailed(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>저장하지 못했습니다</DialogTitle>
          </DialogHeader>
          <div className="text-fg-muted space-y-2 text-sm leading-relaxed">
            <p>
              적으신 내용은 <b className="text-fg">그대로 남아 있습니다.</b> 잠시 후 다시 시도해
              주세요.
            </p>
            <p className="text-fg-subtle text-xs">창을 닫으면 지금까지 적은 것이 사라집니다.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveFailed(false)}>
              닫기
            </Button>
            <Button variant="primary" disabled={save.isPending} onClick={() => void doSave()}>
              다시 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** 「시스템이 본 것」 — 무효 응시 브리프에서만. 판단은 하지 않는다 */
function VoidEvidence({ evidence }: { evidence: NonNullable<Brief['voidEvidence']> }) {
  const e = evidence as {
    unanswered: number
    totalQuestions: number
    copied: boolean
    durationMin: number
  }
  return (
    <div className="border-border bg-surface-2 text-fg-muted mt-3 rounded-md border px-4 py-2.5 text-xs leading-relaxed">
      <div className="text-fg-subtle mb-1 text-2xs font-bold">
        시스템이 본 것 · 판단은 하지 않습니다
      </div>
      {e.totalQuestions}문항 중 <b className="text-fg font-bold">{e.unanswered}문항 무응답</b>
      {e.copied && (
        <>
          {' '}
          · 나머지 문항은 <b className="text-fg font-bold">질문 문장을 그대로 복사</b>
        </>
      )}{' '}
      · 총 응답 시간 <b className="text-fg font-bold">{e.durationMin}분</b>
    </div>
  )
}

function Block({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border-border mb-4 overflow-hidden rounded-md border">
      <div className="border-border bg-surface-2 flex items-center gap-2 border-b px-5 py-3">
        <span className="bg-primary flex size-5 shrink-0 items-center justify-center rounded-full text-xs leading-none font-bold text-white tabular-nums">
          {no}
        </span>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function RecordField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col">
      <div className="text-fg-subtle mb-1 text-2xs font-bold">
        {label} {hint && <span className="text-primary font-semibold">· {hint}</span>}
      </div>
      {children}
    </div>
  )
}

/** text 안에서 bold 부분 문자열 하나만 굵게 감싼다(정확히 일치하는 첫 구간) */
function renderBold(text: string, bold?: string) {
  if (!bold) return text
  const idx = text.indexOf(bold)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <b className="text-fg font-bold">{bold}</b>
      {text.slice(idx + bold.length)}
    </>
  )
}
