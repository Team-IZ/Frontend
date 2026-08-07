import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { cn } from '@/lib/utils/cn'
import RiskBadge from './components/RiskBadge'
import {
  BRIEF_QUESTIONS,
  CAUSE_OPTIONS,
  destinationsFor,
  getInterviewBrief,
  groupIssueConcepts,
  openingLine,
  saveInterviewBrief,
  talkingConcepts,
  VOID_BRIEF_QUESTIONS,
  type BriefData,
  type CauseKey,
  type OpeningLine,
} from './mockData'

/*
  MG-04 면담 브리프 — "낭독 · 경청 · 라우팅"(정의서 §1).

  ⚠ **정의서 §2는 원래 전체화면·사이드바 가림을 규정했다**(TR-03 검증 세션과 같은
  논리 — "화면이 다르게 생긴 것 자체가 지금 작업 중이라는 신호"). 렌더 확인 중
  사용자가 "다른 매니저 화면은 다 셸이 있는데 브리프만 앱 자체가 사라지는 느낌이라
  어색하다"고 지적, 정의서를 번복하고 `ConsoleShell`로 감싸기로 결정했다(MG04-5) —
  근거·대안 3가지는 `docs/dev/mg-04-brief.md` MG04-5 참고.

  나가는 길(좌상단 뒤로가기·하단 `[취소]`)은 그대로 있다 — 매니저 도구라 잘못 열
  수 있다는 정의서 §2의 취지 자체는 유효해서다.

  ⚠ **나가는 길·저장 완료 이동 전부 `navigate(-1)`을 쓴다** — 원래 셋 다
  `listPath`(면담 목록)로 고정돼 있었는데, MG-01 대시보드가 이 화면의 두 번째
  입구로 생기며 `trainees/DetailHeader.tsx`(D-계열, "히트맵 등 다른 입구에서
  들어와도 정상 복귀")와 같은 문제가 그대로 재현됐다 — 대시보드에서 열었는데
  뒤로가기·저장을 눌러도 엉뚱하게 면담 목록으로 튀었다. **처음엔 저장 완료만
  `listPath`로 남겨뒀는데**("종결 직후엔 어디서 왔든 목록에서 확인한다"는 판단),
  다시 보니 대시보드는 그 자체가 "오늘 처리할 것" 큐라 처리 후 그 큐로 돌아와
  나머지를 마저 보는 게 정의서(MG-01 §2 "대시보드를 거쳐 다른 화면에 가서 그
  사람을 다시 찾는 동선을 만들지 않는다") 취지에 더 맞다고 판단해 뒤집었다 —
  MG-03(면담 목록)에서 열었을 땐 `navigate(-1)`이 그대로 목록이라 기존 흐름(다음
  케이스로 이어서 처리)도 안 깨진다.

  ⚠ **mock 한계 — 대시보드로 돌아가도 방금 종결한 항목이 곧바로 "처리됨"으로
  안 바뀐다.** 대시보드(`dashboard/mockData.ts`)와 이 파일의 mock이 서로 독립된
  데이터셋이라(교차 import 금지 — 이 파일 다른 절과 같은 원칙) 저장 성공을
  대시보드 쪽에 알릴 방법이 없다. 실 API가 붙으면 둘 다 같은 서버 상태를 읽으므로
  저절로 없어진다 — 지금은 mock끼리 데이터를 동기화하는 장치를 새로 만들지
  않았다.

  ⚠ **상단 정보 줄도 사용자 지시로 줄였다** — breadcrumb·"미프 N차 · 2단 이하
  X→Y" 회차 요약을 뺐다("상단 좌측이 지저분하다"). 남긴 건 뒤로가기 아이콘 버튼 ·
  이름 · 반 · 위험 배지뿐이다. 회차·판정 숫자는 ①의 여는 말이 이미 자연스러운
  문장으로 말해주므로 중복이었다고 판단.

  케이스별 데이터 판단 기록은 전부 `mockData.ts` 머리말에 있다("MG-04 면담 브리프
  목업" 절) — 이 파일은 그 값을 그리기만 한다.
*/

const listPath = '/manager/interviews'

export default function InterviewBriefScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const load = useCallback(() => getInterviewBrief(id), [id])
  const page = useAsync(load)

  if (page.loading) {
    return (
      <ConsoleShell role="manager">
        <div className="flex justify-center py-16">
          <Spinner className="size-6" aria-label="브리프를 불러오는 중" />
        </div>
      </ConsoleShell>
    )
  }

  if (page.failed || !page.data) {
    return (
      <ConsoleShell role="manager">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>브리프를 찾을 수 없습니다</EmptyTitle>
            <EmptyDescription>잠시 후 다시 시도하거나 목록으로 돌아가세요.</EmptyDescription>
          </EmptyHeader>
          <div className="mt-2 flex justify-center gap-2">
            <Button variant="ghost" onClick={page.reload}>
              다시 시도
            </Button>
            <Button variant="ghost" onClick={() => navigate(listPath)}>
              목록으로
            </Button>
          </div>
        </Empty>
      </ConsoleShell>
    )
  }

  return <BriefSheet brief={page.data} />
}

function BriefSheet({ brief }: { brief: BriefData }) {
  const navigate = useNavigate()
  // 종결 후 다시 연 브리프면 이전에 저장한 값으로 시작한다(사용자 지시 — 재오픈 시
  // 입력이 날아가면 안 된다). 처음 여는 브리프는 `savedRecord`가 없어 빈 값 그대로.
  const [causes, setCauses] = useState<Set<CauseKey>>(new Set(brief.savedRecord?.causes ?? []))
  const [why, setWhy] = useState(brief.savedRecord?.why ?? '')
  const [nextAction, setNextAction] = useState(brief.savedRecord?.nextAction ?? '')
  const [saving, setSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)

  const questions = brief.isVoid ? VOID_BRIEF_QUESTIONS : BRIEF_QUESTIONS
  const talking = talkingConcepts(brief)
  const groupIssues = groupIssueConcepts(brief)
  const opening = openingLine(brief)
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
    setSaving(true)
    setSaveFailed(false)
    try {
      await saveInterviewBrief(brief.caseId, { causes: [...causes], why, nextAction })
      navigate(-1)
    } catch {
      setSaveFailed(true)
    } finally {
      setSaving(false)
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
    <ConsoleShell role="manager">
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
          <span className="text-fg-subtle text-sm">7기 · {brief.className}</span>
        </span>
        <RiskBadge risk={brief.risk} />
      </div>

      <div className="max-w-[820px] pb-8">
        <Block no={1} title="여는 말">
          <div className="bg-primary-soft text-fg rounded-md p-4 text-sm leading-[1.85]">
            {renderOpeningLine(opening)}
          </div>

          {brief.isVoid ? (
            <>
              <div className="text-fg mt-3 text-sm">
                이 회차 결과 — <b className="font-bold">채점하지 않음</b>
                <span className="text-fg-subtle mt-0.5 block text-2xs">
                  도달 단계도 위험 판정도 없습니다. 다시 응시하면 그게 1차가 됩니다.
                </span>
              </div>
              {brief.voidEvidence && (
                <div className="border-border bg-surface-2 text-fg-muted mt-3 rounded-md border px-4 py-2.5 text-xs leading-relaxed">
                  <div className="text-fg-subtle mb-1 text-2xs font-bold">
                    시스템이 본 것 · 판단은 하지 않습니다
                  </div>
                  {brief.voidEvidence.totalQuestions}문항 중{' '}
                  <b className="text-fg font-bold">{brief.voidEvidence.unanswered}문항 무응답</b>
                  {brief.voidEvidence.copied && (
                    <>
                      {' '}
                      · 나머지 1문항은 <b className="text-fg font-bold">질문 문장을 그대로 복사</b>
                    </>
                  )}{' '}
                  · 총 응답 시간{' '}
                  <b className="text-fg font-bold">{brief.voidEvidence.durationMin}분</b>
                </div>
              )}
            </>
          ) : (
            <>
              {talking.length > 0 && (
                <div className="text-fg-muted mt-3 text-sm">
                  이야기할 개념 —{' '}
                  <b className="text-fg font-bold">{talking.map((c) => c.name).join(' · ')}</b>
                </div>
              )}
              {groupIssues.length > 0 && (
                <div className="text-fg-subtle mt-1.5 text-xs leading-relaxed">
                  {groupIssues.map((c) => c.name).join('·')}은{' '}
                  <b className="text-fg-muted font-normal">반 절반 이상이 같은 지점</b>이라 개인
                  사유에서 빠졌습니다(9-6).
                </div>
              )}
              {brief.hasPriorInterview && brief.priorInterview && (
                <div className="border-border text-fg-muted mt-3 flex items-baseline gap-1.5 border-t pt-3 text-sm">
                  <span className="text-warning">⚠</span>
                  <span>
                    지난 면담({brief.priorInterview.dateLabel})에서 정한 것 —{' '}
                    <b className="text-fg font-bold">“{brief.priorInterview.nextAction}”</b>
                  </span>
                </div>
              )}
            </>
          )}
        </Block>

        <Block no={2} title="질문">
          <ul className="space-y-2 text-sm leading-relaxed">
            {questions.map((q) => (
              <li key={q} className="relative pl-4">
                <span className="text-fg-subtle absolute left-0">·</span>
                {q}
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
            selectedCauses.map((cause, causeIdx) => {
              const lines = destinationsFor(cause.key, brief)
              return (
                <div
                  key={cause.key}
                  className={causeIdx > 0 ? 'border-border mt-2 border-t pt-2' : ''}
                >
                  {lines.map((line, i) => (
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
                        {line.owner === 'MANAGER'
                          ? '매니저'
                          : line.owner === 'PASS'
                            ? '전달만'
                            : ''}
                      </span>
                    </div>
                  ))}
                  {cause.key === 'DIFFICULTY_UP' && groupIssues.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {groupIssues.map((c) => (
                        <Alert key={c.name} variant="warning">
                          <AlertDescription className="text-xs leading-relaxed">
                            <b className="text-warning">{c.name}은 이미 반 문제로 판정됐습니다</b> —{' '}
                            {c.groupIssue!.classLabel}(9-6).{' '}
                            <b className="text-warning">개인 위험 사유에서 빠지고</b> 반 전체 안내
                            대상입니다.
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
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
          <Button variant="ghost" disabled={saving} onClick={() => navigate(-1)}>
            취소
          </Button>
          <Button variant="primary" disabled={saving} onClick={handleSaveClick}>
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
            <Button variant="primary" disabled={saving} onClick={() => void doSave()}>
              다시 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConsoleShell>
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

/**
 * ① 여는 말 — 위험 유형 4종 × 고정 템플릿(사용자 지시로 새로 작성, MG04-6). "점수
 * 얘기를 하려는 게 아니라" 같은 정형화된 변명 문구를 빼고 2줄로 짧게 줄였다.
 * 숫자만 `openingLine`(mockData.ts)이 계산해 넘기고 문장 자체는 여기서 고정한다.
 */
function renderOpeningLine(line: OpeningLine) {
  switch (line.kind) {
    case 'VOID':
      return (
        <>
          “이번엔 답변이 거의 없어서 따로 채점하지 않았어요.
          <br />
          그날 무슨 일이 있었는지 편하게 들어보고 싶어서 불렀어요.”
        </>
      )
    case 'DECLINE':
      return (
        <>
          “지난 회차엔 3개 중 <b>{line.prev}</b>개만 막혔었는데, 이번엔 <b>{line.now}</b>개나
          막혔더라고요.
          <br />
          편하게 무슨 일이 있었는지 들어보고 싶어서 불렀어요.”
        </>
      )
    case 'LOW_PERSISTENT':
      return (
        <>
          “최근 <b>{line.streak}</b>번 연속으로 3개 중 <b>{line.lowCount}</b>개에서 막히고
          있더라고요.
          <br />
          계속 같은 자리에서 걸리는 이유가 궁금해서 한번 얘기해보고 싶었어요.”
        </>
      )
    case 'OBSERVE':
      return (
        <>
          “이번에 3개 중 <b>{line.lowCount}</b>개에서 멈췄더라고요.
          <br />
          어떤 부분이 어려웠는지 편하게 들어보고 싶어서 불렀어요.”
        </>
      )
  }
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
