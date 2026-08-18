import { useState, useRef } from 'react'
import { XIcon } from 'lucide-react'
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
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useQueryClient } from '@tanstack/react-query'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { usePreviewTrainees } from '@/api/member/useMemberMutations'
import { registerTrainees } from '@/api/member/memberApi'
import { memberKeys } from '@/api/member/memberKeys'
import { registerTraineesFromCsv, previewTraineesFromCsv } from '@/api/uploads'
import type { previewTrainees_Response, registerTrainees_Response } from '@/api/member/memberTypes'
import { checkRosterRows, MAX_TRAINEE_INVITE, type ParsedRoster } from '../../_/rules'
import { ROSTER_ISSUE_LABEL } from '../../_/labels'
import { useCohortScope } from '../../_/cohortScope'
import type { RosterEntry, RosterIssue } from '../../_/api/types'
import RosterCsvField from '../../_/components/RosterCsvField'
import RosterIssueList from '../../_/components/RosterIssueList'

/*
  명단 추가 — **두 가지 방식이 진짜 다른 상황을 위한 것이다**(OP-06 §3).

    CSV 일괄   최초 수십~수백 명. 유효 n · 중복 제외 n · 형식 오류 행 번호
    직접 입력   지각 등록 1~2명. 형식·중복을 그 자리에서

  탭으로 가른 이유는 **입력 형태가 다르기 때문**이지 같은 것의 변형이라서가 아니다.
  200명을 한 줄씩 치게 하거나, 두 명 때문에 CSV를 만들게 하면 둘 다 안 쓰인다.

  **한 줄 때문에 전체를 막지 않는다.** 유효 행은 등록하고 오류 행만 번호로 알린다 —
  수백 명 파일을 통째로 되돌리면 아무도 안 쓴다(OP-06 §6).

  **등록과 동시에 활성화 초대가 나간다.** 그래서 누르기 전에 몇 명에게 나가는지를 보여준다.

  ## 두 방식이 서로 다른 API를 쓴다
  | | 등록 | 사전 검증 |
  |---|---|---|
  | CSV | `POST .../trainees` (multipart) | `POST .../trainees/preview` |
  | 직접 입력 | `POST .../trainees/invitations` | `.../invitations/preview` |

  **드라이런은 9차 Q3-③으로 생겼다.** 파일 안에서 알 수 없는 것 하나 — *이미 등록된
  이메일* — 을 서버가 세 준다. 200명을 붙여 넣고 나서야 30명이 중복이라는 걸 알게 되는
  상황이 이걸로 없어졌다.

  ⚠ **미리보기가 통과해도 등록이 반드시 성공하지는 않는다**(스펙 명시) — 두 호출 사이에
  다른 운영자가 같은 주소를 등록할 수 있다. 등록 결과의 `failures`를 그대로 확인한다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (result: registerTrainees_Response) => void
}

/** 직접 입력의 빈 행. 목업처럼 **한 줄은 늘 비어 있다** — `+ 행 추가`를 안 눌러도 칠 수 있다 */
const emptyRow = (): RosterEntry => ({ name: '', email: '' })

export default function AddRosterDialog({ open, onOpenChange, onAdded }: Props) {
  const [mode, setMode] = useState('csv')
  const [parsed, setParsed] = useState<ParsedRoster | null>(null)
  /** 고른 파일 자체 — CSV 등록이 multipart라 텍스트가 아니라 파일을 보낸다 */
  const [file, setFile] = useState<File | null>(null)
  /*
    미리보기는 **등록 결과가 아니다.** 종전에는 등록 응답 타입을 그대로 썼는데, 스펙에서
    두 스키마가 이름 충돌로 겹쳐 있어 컴파일이 안 막아 줬다(30차 회신 §2). 이름이 갈린
    지금은 미리보기에 `registeredCount`가 없다 — `registrableCount`(등록 가능 인원)다.
  */
  const [preview, setPreview] = useState<previewTrainees_Response | null>(null)
  const [rows, setRows] = useState<RosterEntry[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  /** 서버가 준 원본 에러 — previewFailure와 같은 방식으로 `errorCopy`가 문구를 정한다 */
  const [submitFailure, setSubmitFailure] = useState<unknown>(null)
  /** 진행 중인 CSV 등록 요청 — 닫으면서 취소할 수 있게 들고 있는다 */
  const submitAbortRef = useRef<AbortController | null>(null)

  /*
    기관 도메인은 세션이 준다(9차 Q3-④) — 등록 판정에는 더 안 쓴다(8/18, 도메인 제한
    없앰). CSV 양식·직접 입력 placeholder의 **예시**로만 남긴다.
  */
  const { data: me } = useGetCurrentMember()
  const domain = me?.emailDomain ?? undefined
  const scope = useCohortScope()
  const cohortId = scope.cohortId
  const previewTyped = usePreviewTrainees()
  const queryClient = useQueryClient()

  /*
    **판정은 rules.ts가 한다** — CSV와 같은 규칙을 같은 순서로 돌린다(`checkRosterRows`).
    여기서 한 줄씩 `checkEmail`을 돌렸을 때 CSV가 잡는 것 둘을 놓쳤다: 빈 행이 앞에
    있으면 줄 번호가 밀렸고, 입력칸 사이 중복을 아예 안 봤다.
  */
  const typedIssues: RosterIssue[] = checkRosterRows(rows)
  /** 걸리지 않은 행만 등록 후보다. 번호가 칸과 맞으므로 그 번호로 걸러낸다 */
  const typedValid = rows.filter(
    (r, i) => r.email.trim().length > 0 && !typedIssues.some((x) => x.line === i + 1),
  )

  const entries = mode === 'csv' ? (parsed?.entries ?? []) : typedValid
  const issues = mode === 'csv' ? (parsed?.invalid ?? []) : typedIssues
  /** 1000명 초과 — 서버가 파일 전체를 거절하는 규칙(`MAX_TRAINEE_INVITE`)을 화면에서 먼저 막는다 */
  const tooMany = entries.length > MAX_TRAINEE_INVITE
  const submittable =
    entries.length > 0 && !tooMany && issues.length === 0 && !submitting && !!cohortId

  /** 서버가 센 중복 수 — 응답이 실패 행을 이유별 코드로 준다(3 = 이미 있는 이메일) */
  const duplicates = preview?.failures.filter((f) => f.status === 3).length ?? 0

  /*
    ⚠ **미리보기 실패를 잡는다.** `await`만 하고 실패 경로가 없어서, 서버가 파일을
    거절하면(`400 TRAINEE_NAME_INVALID` — 실측) **처리되지 않은 오류로 새고 화면에는
    아무 말도 안 떴다.** 화면은 자기 판정만 보여주며 「유효 2명」이라고 했다.

    서버가 거절한 이유는 우리 규칙과 다를 수 있다(파일 형식·인코딩·행 위치). 그 말을
    그대로 보여 준다 — 여기서 추측하면 사용자가 엉뚱한 줄을 고친다.
  */
  const [previewFailure, setPreviewFailure] = useState<unknown>(null)

  const askPreviewCsv = async (next: File | null) => {
    setPreviewFailure(null)
    if (!next || !cohortId) return setPreview(null)
    try {
      setPreview(await previewTraineesFromCsv({ path: { cohortId }, file: next }))
    } catch (e) {
      setPreview(null)
      setPreviewFailure(e)
    }
  }

  const askPreviewTyped = async (next: RosterEntry[]) => {
    setPreviewFailure(null)
    if (next.length === 0 || !cohortId) return setPreview(null)
    try {
      setPreview(await previewTyped.mutateAsync({ path: { cohortId }, body: { trainees: next } }))
    } catch (e) {
      setPreview(null)
      setPreviewFailure(e)
    }
  }

  const submit = async () => {
    if (!cohortId) return
    setSubmitting(true)
    setSubmitFailure(null)
    const controller = new AbortController()
    submitAbortRef.current = controller
    try {
      /*
        ⚠ **직접 입력도 CSV처럼 원본 API 함수를 직접 부른다 — 자동 생성 훅
        (`useRegisterTrainees`)을 거치지 않는다.** 훅의 `mutateAsync`는 `signal`을 안 받는다
        (`useMemberMutations.ts`는 자동 생성이라 손 못 댐 — `RegisterCurriculumDialog`가
        `requestAnalysis`를 훅 대신 직접 부르는 것과 같은 이유). 훅을 쓰던 동안은 위
        `controller`의 `abort()`가 아무 요청도 못 끊는 빈 신호였다: 제출 중 닫아도 서버
        등록은 계속 진행됐고, 뒤늦게 온 성공 응답이 **이미 닫힌 다이얼로그의 `onAdded`를
        다시 불렀다** — 취소했다고 믿은 등록이 실제로는 된 것이다.
      */
      const result =
        mode === 'csv' && file
          ? await registerTraineesFromCsv({ path: { cohortId }, file, signal: controller.signal })
          : await registerTrainees({
              path: { cohortId },
              body: { trainees: entries },
              signal: controller.signal,
            })
      // 훅이 대신 해주던 무효화 — 위 이유로 훅을 안 쓰므로 여기서 직접 한다(CSV 경로는 원래도 안 함)
      if (mode !== 'csv') {
        await queryClient.invalidateQueries({ queryKey: memberKeys.all })
      }
      onAdded(result)
      close(false) // 닫기가 비우는 일까지 한다 — 성공·취소가 같은 길로 나간다
    } catch (e) {
      // 닫으면서 우리가 취소한 것 — 이미 닫힌 다이얼로그에 실패를 띄울 필요는 없다
      if (controller.signal.aborted) return
      setSubmitFailure(e)
    } finally {
      setSubmitting(false)
      submitAbortRef.current = null
    }
  }

  const reset = () => {
    setParsed(null)
    setFile(null)
    setPreview(null)
    setRows([emptyRow()])
    setSubmitFailure(null)
    /*
      ⚠ **`previewFailure`가 빠져 있었다.** 나머지는 다 지우면서 이것만 남겨서, 서버가
      거절한 파일(`2행의 이름을 입력해야 합니다`)의 배너가 **닫았다 다시 열어도 그대로**
      떠 있었다 — 파일도 판정도 비어 있는 화면에 실패 문구만 남는다(실측).
    */
    setPreviewFailure(null)
    // pending 상태에서 닫혔을 수 있다 — 닫혔다 다시 열었을 때 스피너가 안 남게 같이 지운다
    setSubmitting(false)
  }

  /*
    **닫으면 비운다.** 성공했을 때만 비우고 있어서, 파일을 올리다 취소하고 다시 열면
    그때의 판정이 그대로 떠 있었다 — 특히 `이미 등록된 이메일 n명`은 **서버가 그 시점에
    센 수**라 그 사이 명단이 바뀌면 틀린 수를 보여준다. 등록은 이어 하는 작업이 아니다.
  */
  const close = (next: boolean) => {
    if (!next) submitAbortRef.current?.abort()
    onOpenChange(next)
    if (!next) reset()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            교육생 추가{' '}
            <span className="text-fg-subtle text-xs font-normal">· {scope.current?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
          {/*
            **submit 실패를 previewFailure와 같은 방식으로 다룬다.** 예전엔
            `catch { setFailed(true) }`로 뭉뚱그려 이유가 무엇이든(예: `CSV_FORMAT_INVALID`
            "한 번에 최대 1000명" 같은 구체적 사유도) 같은 범용 문구만 보여줬다 — 서버가
            이미 행 번호·사유가 담긴 message를 주는데 버리고 있었다.
          */}
          {submitFailure !== null &&
            (() => {
              const copy = errorCopy(submitFailure, { subject: '교육생', action: '등록' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>
                    {(submitFailure as { message?: string }).message ?? copy.description}
                  </AlertDescription>
                </Alert>
              )
            })()}

          {/*
            **미리보기가 거절당하면 그 말을 그대로 보여준다.** 서버는 행 번호까지 준다
            (`"5행의 이름을 입력해야 합니다"`) — 우리가 요약하면 그 줄을 못 찾는다.
          */}
          {previewFailure !== null &&
            (() => {
              const copy = errorCopy(previewFailure, { subject: '교육생', action: '확인' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>
                    {(previewFailure as { message?: string }).message ?? copy.description}
                  </AlertDescription>
                </Alert>
              )
            })()}

          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as string)
              /*
                **판정도 실패도 그 탭의 입력에 딸린 것이다.** `preview`만 지우고 있어서
                CSV가 거절당한 배너가 **직접 입력 탭까지 따라왔다** — 그 탭에는 아직
                아무것도 안 넣었는데 「교육생을 확인하지 못했습니다」가 떠 있었다(실측).
                입력이 바뀌면 그 입력에 대한 답도 같이 버린다.
              */
              setPreview(null)
              setPreviewFailure(null)
              setSubmitFailure(null)
            }}
          >
            <TabsList>
              <TabsTrigger value="csv">CSV 일괄 업로드</TabsTrigger>
              <TabsTrigger value="manual">직접 입력</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="pt-3">
              {/*
                **파일 자체를 들고 있는다.** 화면이 그 자리에서 형식을 판정하고
                (`parseRosterCsv`), 서버에는 **원본 파일을 그대로** 보낸다 — 파싱한 결과를
                다시 CSV로 만들어 보내면 판정 규칙이 두 벌이 된다.
              */}
              <RosterCsvField
                domain={domain ?? ''}
                onChange={(next, _name, picked) => {
                  setParsed(next)
                  setFile(picked)
                  /*
                    **1000명을 넘으면 미리보기를 안 부른다.** 어차피 서버가 같은 이유로
                    거절할 게 확실한 요청이다 — 물어보고 실패 문구를 또 하나 띄우는 대신
                    화면이 이미 아는 사실(`tooMany`)만 보여준다.
                  */
                  if ((next?.entries.length ?? 0) > MAX_TRAINEE_INVITE) {
                    setPreview(null)
                    setPreviewFailure(null)
                    return
                  }
                  void askPreviewCsv(picked)
                }}
              />
              <p className="text-fg-subtle mt-2 text-2xs">
                최대 {MAX_TRAINEE_INVITE.toLocaleString()}명을 한 번에 등록할 때 씁니다. 반 배정은
                등록 후 배정 모드에서 따로 진행돼요.
              </p>
            </TabsContent>

            <TabsContent value="manual" className="pt-3">
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                    <Input
                      value={row.name}
                      placeholder="이름"
                      aria-label={`${i + 1}번째 이름`}
                      onChange={(e) => setRows(patch(rows, i, { name: e.target.value }))}
                    />
                    <Input
                      value={row.email}
                      placeholder={domain ? `name@${domain}` : '이메일'}
                      aria-label={`${i + 1}번째 이메일`}
                      onChange={(e) => {
                        setRows(patch(rows, i, { email: e.target.value }))
                        setPreview(null)
                      }}
                      /*
                        **칸을 떠날 때 서버에 물어본다.** 타이핑 중에 부르면 한 글자마다
                        요청이 나가고, 등록을 누른 뒤에 알려주면 그때 고쳐야 한다.
                      */
                      onBlur={() => void askPreviewTyped(typedValid)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${i + 1}번째 행 삭제`}
                      // 마지막 한 줄은 남긴다 — 다 지우면 칠 곳이 사라진다
                      disabled={rows.length === 1}
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setRows([...rows, emptyRow()])}
              >
                + 행 추가
              </Button>
              <p className="text-fg-subtle mt-2 text-2xs">
                이메일 형식과 중복을 그 자리에서 확인합니다. 등록하면 활성화 초대가 나갑니다.
              </p>
            </TabsContent>
          </Tabs>

          {/* 판정 결과 — **누르기 전에** 무엇이 등록되고 무엇이 걸리는지 보여준다 */}
          {(entries.length > 0 || issues.length > 0) && (
            <div className="border-border bg-surface-2 rounded-md border p-3">
              {tooMany ? (
                <p className="text-danger text-xs">
                  ✗ <b className="font-semibold">{entries.length.toLocaleString()}명</b> — 한 번에
                  최대 {MAX_TRAINEE_INVITE.toLocaleString()}명까지 등록할 수 있습니다. 파일을 나눠서
                  다시 올려 주세요.
                </p>
              ) : (
                // 유효가 0이면 이 줄을 쓰지 않는다 — `✓ 유효 0명`은 체크 표시가 거짓말을 한다
                entries.length > 0 && (
                  <p className="text-success text-xs">
                    ✓ 유효{' '}
                    <b className="font-semibold">{preview?.registrableCount ?? entries.length}명</b>{' '}
                    — 등록하면 활성화 초대가 나갑니다
                  </p>
                )
              )}
              {duplicates > 0 && (
                <p className="text-warning mt-0.5 text-xs">
                  ⚠ 이미 등록된 이메일 <b className="font-semibold">{duplicates}명</b> — 건너뜁니다
                </p>
              )}
              {mode === 'csv' ? (
                <RosterIssueList issues={issues} />
              ) : (
                issues.map((x) => (
                  <p key={x.line} className="text-danger mt-0.5 text-xs">
                    ✗ {x.line}번째 줄 — {ROSTER_ISSUE_LABEL[x.reason]}
                  </p>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={submitting}>
            취소
          </Button>
          {/*
            오류 행이 있으면 막는다. **CSV는 한 줄 때문에 전체를 막지 않는다**는 규칙과
            어긋나 보이지만 다른 이야기다 — 그 규칙은 *서버가 유효 행만 등록한다*는 뜻이고,
            화면은 **고칠 수 있는 것을 고치게** 한다. 여기서 그냥 보내면 오류 행이 조용히
            사라져 몇 명이 빠졌는지 모른 채 끝난다.
          */}
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            등록 · 초대 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function patch(rows: RosterEntry[], i: number, next: Partial<RosterEntry>): RosterEntry[] {
  return rows.map((row, j) => (i === j ? { ...row, ...next } : row))
}
