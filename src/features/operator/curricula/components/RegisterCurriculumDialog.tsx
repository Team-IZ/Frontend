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
import { registerCurriculum, tooLargeToUpload, MAX_UPLOAD_LABEL } from '@/api/uploads'
import { useRequestAnalysis } from '@/api/curriculum/useCurriculumMutations'
import { curriculumKeys } from '@/api/curriculum/curriculumKeys'
import { isApiError } from '@/api/_contract'
import { errorCopy } from '@/lib/errorCopy'
import RequiredMark from '../../admin/_/components/RequiredMark'

/*
  교안 등록.

  ⚠ **목업에 이 모달이 없다.** 목록 헤더의 `+ 교안 등록` 버튼만 그려져 있고 케이스 표에도
  줄이 없다. 그런데 OP-03이 *"등록된 교안이 없습니다 → 운영 관리 › 교안에서 등록"* 으로
  보내므로 **없는 기능이 아니라 안 그려진 기능**이다 — 버튼만 두고 결과를 안 그리면
  누르는 순간 아무 일도 안 일어난다(I1).

  그래서 **최소한만** 만들었다: 파일 · 교안명. 실패 문구·에러코드가 정해지면 그때 케이스
  표를 먼저 고치고 여기를 맞춘다.

  ## ⚠ 버전 칸을 뺐다
  목에서는 `v1`을 손으로 받았는데 **서버가 버전을 매긴다** — `POST /curricula`가 받는 것은
  파일·제목·주제뿐이고, 응답의 `versionNo`가 서버가 정한 값이다. 새 버전은 같은 자리에
  다시 올리는 것이지 사람이 번호를 적는 것이 아니다.

  ## ⚠ 분석 시작이 두 갈래다 — 스펙과 서버가 다르다
  스펙은 아직 이렇게 적혀 있다 — *"등록 직후엔 분석이 안 된 상태다. 섹션·검증개념을 쓰려면
  별도로 `POST /curricula/{materialId}/analyses`를 호출해야 한다."*

  **실서버는 등록과 동시에 시작한다**(실측 2026-08-16 · 201 직후 `analysisStatus: PENDING`).
  그래서 이어 붙인 우리 호출이 `409 CURRICULUM_ANALYSIS_IN_PROGRESS`로 튕긴다.

  **호출은 남기고 그 409만 성공으로 친다.** 지우면 자동 시작이 없는 경로에서 교안이
  `분석 전`으로 남고, 실패로 읽으면 **돌고 있는 분석을 버리라고 안내**하게 된다(아래 주석).
  두 호출을 사용자에게 나눠 보이지 않는 것은 그대로다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RegisterCurriculumDialog({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  /** 교안은 올라갔는데 분석만 못 건 경우 — 서버 코드가 아니라 우리가 아는 사실이다 */
  const [analysisFailed, setAnalysisFailed] = useState(false)
  /*
    ⚠ **문자열이 아니라 서버가 준 원본을 들고 있는다.** 전에는 `catch`에서 곧장 문구를
    만들어 넣었는데, 그러다 **서로 다른 실패가 한 문구로 뭉개졌다** — 실측:

        413 (파일 6.9MB)              → "PDF 파일인지 확인해 주세요"  🔴
        409 CURRICULUM_TITLE_DUPLICATED → "PDF 파일인지 확인해 주세요"  🔴

    둘 다 **멀쩡한 파일을 의심하게 만든다.** 원본을 들고 있으면 `errorCopy`가 코드로
    문구를 정하고, 제목 중복은 아래에서 입력란까지 짚는다.
  */
  const [failed, setFailed] = useState<unknown>(null)

  const queryClient = useQueryClient()
  const requestAnalysis = useRequestAnalysis()

  /*
    ⚠ **크기는 서버가 아니라 앞단(Lambda)이 막는다** — 그리고 그 실패는 우리 에러 코드가
    없어서(`{"Message": …}`) 화면이 **「PDF 파일인지 확인해 주세요」라고 잘못 말했다**(실측:
    8MB PDF). 멀쩡한 파일을 의심하게 만드는 문구라, 사람은 파일을 다시 저장하거나 다른
    파일을 찾는 **아무 소용 없는 일**을 한다.

    그래서 **고른 순간 판정하고 보내지 않는다.** 진짜 할 일(쪼개기·압축)을 바로 말한다.
  */
  const oversize = !!file && tooLargeToUpload(file)
  /** 제목이 겹쳤나 — 배너와 입력란이 **같은 판정**을 써야 둘이 어긋나지 않는다 */
  const duplicateTitle = isApiError(failed) && failed.code === 'CURRICULUM_TITLE_DUPLICATED'
  const submittable = !!file && !oversize && name.trim().length > 0 && !submitting

  /** 닫을 때 비운다 — 실패 문구·고른 파일·이름이 다음에 열었을 때 남아있으면 안 된다 */
  const reset = () => {
    setFile(null)
    setName('')
    setFailed(null)
    setAnalysisFailed(false)
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const submit = async () => {
    if (!file) return
    setSubmitting(true)
    setFailed(null)
    setAnalysisFailed(false)
    try {
      const created = await registerCurriculum({ query: { title: name.trim() }, file })
      try {
        await requestAnalysis.mutateAsync({ path: { materialId: created.materialId } })
      } catch (e) {
        /*
          ⚠ **「이미 분석 중」은 실패가 아니다 — 우리가 원하던 그 상태다.**

          서버가 **등록과 동시에 분석을 시작하게 바뀌었다**(실측 2026-08-16: 201 직후
          `analysisStatus: PENDING`). 그래서 이어 붙인 이 요청이 `409
          CURRICULUM_ANALYSIS_IN_PROGRESS`로 튕긴다.

          그걸 실패로 읽던 동안 화면은 **「분석을 시작하지 못했습니다. 목록에서 다시 분석을
          눌러 주세요」**라고 했다 — 뒤 목록은 이미 `분석 중`인데. 시킨 대로 누르면
          `?force=true`가 나가 **돌고 있는 분석을 버리고 처음부터 다시** 돌린다.
          없는 문제를 알리고, 그 해결책이 실제로 해를 끼치는 자리였다.

          **스펙은 아직 옛 동작으로 적혀 있다** — *"등록 직후엔 분석이 안 된 상태다"*.
          그래서 이 호출을 지우지 않는다: 서버가 자동으로 안 걸어 주는 경로가 남아 있어도
          여기서 채운다. 이미 돌고 있으면 그대로 성공으로 친다.
        */
        if (!(isApiError(e) && e.code === 'CURRICULUM_ANALYSIS_IN_PROGRESS')) {
          // 교안은 올라갔다 — 목록에서 `다시 분석`으로 이어갈 수 있다
          setAnalysisFailed(true)
          await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
          return
        }
      }
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
      close(false)
    } catch (e) {
      // 원본을 그대로 둔다 — 문구는 `errorCopy`가 코드로 정한다(아래 배너)
      setFailed(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>교안 등록</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/*
            **원인을 추측하지 않는다 — 서버가 코드로 말하면 그 문구가 이긴다.**
            `413`만 예외다: 앱에 닿기 전에 앞단이 자른 것이라 코드가 없다(`uploadLimits`).
          */}
          {failed !== null &&
            (() => {
              if (isApiError(failed) && failed.status === 413)
                return (
                  <Alert variant="danger">
                    <AlertTitle>파일이 너무 큽니다</AlertTitle>
                    <AlertDescription>
                      지금은 {MAX_UPLOAD_LABEL}까지 올릴 수 있습니다 — 나눠서 올려 주세요.
                    </AlertDescription>
                  </Alert>
                )
              const copy = errorCopy(failed, { subject: '교안', action: '등록' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}

          {/* 교안은 올라갔다 — 실패가 아니라 **덜 된 것**이라 서버 코드로 말할 것이 없다 */}
          {analysisFailed && (
            <Alert variant="warning">
              <AlertTitle>교안은 올라갔지만 분석을 시작하지 못했습니다</AlertTitle>
              <AlertDescription>목록에서 「다시 분석」을 눌러 주세요.</AlertDescription>
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
                  const picked = e.target.files?.[0] ?? null
                  setFile(picked)
                  // 파일을 바꾼 것도 앞선 실패를 무르는 행동이다
                  if (failed !== null) setFailed(null)
                  // 파일명에서 교안명을 미리 채운다 — 대부분 그대로 쓰고, 아니면 고친다
                  if (picked && !name) setName(picked.name.replace(/\.pdf$/i, ''))
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                {file?.name ?? 'PDF 고르기'}
              </Button>
            </div>
            {/*
              **고르기 전에는 상한을 안 쓴다.** 「최대 4.5MB」를 늘 띄우면 대부분(작은 파일)에게
              쓸모없는 제약을 먼저 읽히고, 그 문구는 **지금 뭘 해야 하는지 아무것도 안 알려
              준다.** 넘겼을 때만 그 자리에서 크기와 함께 말한다 — 자기 파일이 얼마인지
              알아야 얼마나 줄일지 판단할 수 있다.
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
            **제목 중복은 고칠 곳이 정해져 있다 — 그 칸을 짚는다.** 스펙이 그렇게 하라고
            적어 뒀다(*"제목 입력란에 인라인 오류"*). 위 배너만 있으면 「등록하지 못했다」는
            사실은 알아도 **어디를 고쳐야 하는지**는 눈으로 찾아야 한다.
          */}
          <Field data-invalid={duplicateTitle}>
            <FieldLabel htmlFor="cur-name">
              교안명 <RequiredMark />
            </FieldLabel>
            <Input
              id="cur-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                /*
                  **고치기 시작하면 표시를 거둔다.** 우리가 짚은 그 값을 지금 바꾸는
                  중인데 빨간 테두리가 남아 있으면, 고쳐도 안 된다는 뜻으로 읽힌다
                  (실측: 새 제목을 다 친 뒤에도 `aria-invalid=true`였다).
                  판정은 다음 제출에서 서버가 다시 한다.
                */
                if (failed !== null) setFailed(null)
              }}
              placeholder="AI_LLMOps"
              aria-invalid={duplicateTitle}
            />
            {/* **버전 칸이 없다** — 서버가 매긴다. 새 버전은 같은 자리에 다시 올리는 것이다 */}
            <FieldDescription>버전은 서버가 매깁니다(첫 등록이면 v1).</FieldDescription>
            <FieldError>{duplicateTitle ? '이미 쓰고 있는 제목입니다' : ''}</FieldError>
          </Field>

          <p className="text-fg-subtle text-xs">
            등록하면 분석이 시작됩니다. 분석이 끝나야 <b>가르친 항목</b>이 나오고, 그 전에는
            프로젝트에 연결할 수 없습니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={submitting}>
            취소
          </Button>
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            등록 · 분석 시작
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
