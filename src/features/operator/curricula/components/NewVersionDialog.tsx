import { useRef, useState } from 'react'
import { UploadIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useQueryClient } from '@tanstack/react-query'
import { registerCurriculumVersion, tooLargeToUpload, MAX_UPLOAD_LABEL } from '@/api/uploads'
import { requestAnalysis } from '@/api/curriculum/curriculumApi'
import { curriculumKeys } from '@/api/curriculum/curriculumKeys'
import { isApiError } from '@/api/_contract'
import { errorCopy } from '@/lib/errorCopy'
import { delay } from '@/lib/cancellableDelay'
import RequiredMark from '../../admin/_/components/RequiredMark'

/*
  교안 **새 버전** 등록 — 개정판을 올린다.

  ## 새 교안 등록과 무엇이 다른가
  | | 새 교안(`RegisterCurriculumDialog`) | 여기 |
  |---|---|---|
  | 만드는 것 | 교안 + v1 | **그 교안의 다음 버전** |
  | 교안명 | **필수** | **선택** — 비우면 기존 제목 유지 |
  | 제목 중복 | 늘 검사 | **제목을 바꿀 때만** 검사한다(스펙) |

  두 화면이 거의 같아 합칠 수도 있었지만 **나눠 둔다.** 필수/선택이 뒤집히고 안내 문구가
  통째로 다른데, 한 컴포넌트에 `mode` 플래그를 넣으면 모든 줄이 분기가 된다.

  ## 🔴 분석을 우리가 이어 붙인다
  `POST /versions`는 분석을 자동으로 걸지 않는다(44차 R4 회신). 새 버전은 내용이 비슷해도
  **다른 파일**이라 쪽 번호·섹션 구성이 바뀔 수 있고, 분석이 안 돌면 검증 개념을 못 뽑아
  **회차에 붙일 수 없는 상태로 남는다.**

  새 교안 등록 쪽은 서버가 자동으로 걸어 줘서 우리 호출이 `409 …IN_PROGRESS`로 튕기는데,
  그쪽과 **같은 방어를 여기도 둔다** — 나중에 서버가 이 경로에도 자동 시작을 붙이면 그때
  이 코드가 조용히 그 상태를 받아들인다(409를 성공으로 친다).

  ## 기존 버전은 그대로 남는다
  올려도 이전 버전 행은 지워지지 않고, 그 버전을 이미 연결해 쓰는 회차도 그대로다 —
  발행된 리포트가 가리키는 쪽 번호가 어긋나지 않는 이유가 이것이다. 그래서 이 다이얼로그는
  **무엇이 사라지는지**를 겁줄 필요가 없고, 대신 *"다음 회차부터 새 버전을 고를 수 있다"* 를
  말한다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  materialId: string
  /** 지금 제목 — 입력란 placeholder로 그대로 쓴다(비우면 이 값이 유지된다) */
  currentTitle: string
  /** 지금 최신 버전 번호 — 새 버전이 몇 번이 될지 미리 말해 준다 */
  currentVersionNo: number
}

/** 실제 등록 요청을 보내기 전 유예시간(D40) — 이 안에 닫으면 요청 자체가 안 나간다 */
const SUBMIT_GRACE_MS = 500

export default function NewVersionDialog({
  open,
  onOpenChange,
  materialId,
  currentTitle,
  currentVersionNo,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** 버전은 올라갔는데 분석만 못 건 경우 — 서버 코드가 아니라 우리가 아는 사실이다 */
  const [analysisFailed, setAnalysisFailed] = useState(false)
  /** 서버가 준 원본을 들고 있는다 — 문구는 `errorCopy`가 코드로 정한다 */
  const [failed, setFailed] = useState<unknown>(null)
  const submitAbortRef = useRef<AbortController | null>(null)

  const queryClient = useQueryClient()

  const oversize = !!file && tooLargeToUpload(file)
  /** 제목을 **바꿀 때만** 겹칠 수 있다 — 비우면 검사 자체가 안 돈다 */
  const duplicateTitle = isApiError(failed) && failed.code === 'CURRICULUM_TITLE_DUPLICATED'
  const submittable = !!file && !oversize && !submitting

  const reset = () => {
    setFile(null)
    setTitle('')
    setFailed(null)
    setAnalysisFailed(false)
    setSubmitting(false)
  }

  /** 닫으면 진행 중인 요청을 취소한다 — 뒤늦은 응답이 리셋된 상태를 다시 채우지 않게 */
  const close = (next: boolean) => {
    if (!next) submitAbortRef.current?.abort()
    onOpenChange(next)
    if (!next) reset()
  }

  const submit = async () => {
    if (!file) return
    setSubmitting(true)
    setFailed(null)
    setAnalysisFailed(false)
    const controller = new AbortController()
    submitAbortRef.current = controller
    try {
      await delay(SUBMIT_GRACE_MS, controller.signal)
      const trimmed = title.trim()
      await registerCurriculumVersion({
        path: { materialId },
        // 비운 채로 보내면 서버가 제목을 그대로 두므로 **키 자체를 안 싣는다**
        query: trimmed ? { title: trimmed } : undefined,
        file,
        signal: controller.signal,
      })
      try {
        await requestAnalysis({ path: { materialId }, signal: controller.signal })
      } catch (e) {
        if (controller.signal.aborted) return
        /* 「이미 분석 중」은 실패가 아니라 우리가 원하던 상태다(파일 머리 주석) */
        if (!(isApiError(e) && e.code === 'CURRICULUM_ANALYSIS_IN_PROGRESS')) {
          setAnalysisFailed(true)
          await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
          return
        }
      }
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
      close(false)
    } catch (e) {
      if (controller.signal.aborted) return
      setFailed(e)
    } finally {
      setSubmitting(false)
      submitAbortRef.current = null
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>
            새 버전 올리기{' '}
            <span className="text-fg-subtle text-xs font-normal">
              · v{currentVersionNo} → v{currentVersionNo + 1}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {failed !== null &&
            (() => {
              /* `413`만 예외다 — 앱에 닿기 전에 앞단이 자른 것이라 코드가 없다 */
              if (isApiError(failed) && failed.status === 413)
                return (
                  <Alert variant="danger">
                    <AlertTitle>파일이 너무 큽니다</AlertTitle>
                    <AlertDescription>
                      지금은 {MAX_UPLOAD_LABEL}까지 올릴 수 있습니다 — 나눠서 올려 주세요.
                    </AlertDescription>
                  </Alert>
                )
              const copy = errorCopy(failed, { subject: '새 버전', action: '등록' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}

          {/* 버전은 올라갔다 — 실패가 아니라 **덜 된 것**이라 서버 코드로 말할 것이 없다 */}
          {analysisFailed && (
            <Alert variant="warning">
              <AlertTitle>새 버전은 올라갔지만 분석을 시작하지 못했습니다</AlertTitle>
              <AlertDescription>
                이 화면의 「다시 분석」을 눌러 주세요 — 분석이 끝나야 회차에 붙일 수 있습니다.
              </AlertDescription>
            </Alert>
          )}

          <Field>
            <FieldLabel>
              파일 <RequiredMark />
            </FieldLabel>
            <div className="border-border-strong bg-surface-2 rounded-md border border-dashed p-5 text-center">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  if (failed !== null) setFailed(null)
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                {file?.name ?? 'PDF 고르기'}
              </Button>
            </div>
            {/*
              **고르기 전에는 상한을 안 쓴다** — 대부분에게 쓸모없는 제약을 먼저 읽히고,
              그 문구는 지금 뭘 해야 하는지 아무것도 안 알려 준다(등록 다이얼로그와 같은 규칙).
            */}
            {file && oversize ? (
              <FieldDescription className="text-danger">
                이 파일은 {(file.size / 1024 / 1024).toFixed(1)}MB로 <b>{MAX_UPLOAD_LABEL}</b>를
                넘습니다 — 나눠서 올리거나 용량을 줄여 주세요.
              </FieldDescription>
            ) : (
              <FieldDescription>
                암호가 걸린 파일은 본문을 읽을 수 없어 분석이 실패합니다.
              </FieldDescription>
            )}
          </Field>

          {/*
            **교안명이 선택이다** — 이 다이얼로그가 새 교안 등록과 갈리는 지점이라
            `RequiredMark`를 안 붙이고, 비웠을 때 무슨 일이 일어나는지를 그 자리에서 쓴다.

            ⚠ **제목을 고치는 유일한 경로가 여기다** — 제목만 바꾸는 API가 아직 없다
            (44차 R5). 그래서 파일은 그대로인데 제목만 고치려는 사람도 이 문을 쓴다.
          */}
          <Field data-invalid={duplicateTitle}>
            <FieldLabel htmlFor="ver-title">교안명</FieldLabel>
            <Input
              id="ver-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                /* 고치기 시작하면 표시를 거둔다 — 판정은 다음 제출에서 서버가 다시 한다 */
                if (failed !== null) setFailed(null)
              }}
              placeholder={currentTitle}
              aria-invalid={duplicateTitle}
            />
            <FieldDescription>비우면 기존 제목을 그대로 씁니다.</FieldDescription>
            <FieldError>{duplicateTitle ? '이미 쓰고 있는 제목입니다' : ''}</FieldError>
          </Field>

          <p className="text-fg-subtle text-xs">
            올리면 <b>분석이 다시 시작됩니다</b> — 끝나야 회차에 붙일 수 있습니다.
            <br />
            <b>이전 버전은 지워지지 않습니다</b> — 이미 그 버전을 쓰는 회차와 발행된 리포트는
            그대로입니다.
          </p>
        </div>

        <DialogFooter>
          {/* 제출 중에도 눌려야 한다 — 유예시간 안에 이 버튼으로 취소할 수 있어야 한다(D40) */}
          <Button variant="ghost" onClick={() => close(false)}>
            취소
          </Button>
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            올리기 · 분석 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
