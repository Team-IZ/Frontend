import { useRef, useState } from 'react'
import { UploadIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useQueryClient } from '@tanstack/react-query'
import { registerCurriculum } from '@/api/uploads'
import { useRequestAnalysis } from '@/api/curriculum/useCurriculumMutations'
import { curriculumKeys } from '@/api/curriculum/curriculumKeys'
import RequiredMark from '../../_/components/RequiredMark'

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

  ## ⚠ 올려도 분석은 안 시작된다
  스펙이 명시한다 — *"등록 직후엔 분석이 안 된 상태다. 섹션·검증개념을 쓰려면 별도로
  `POST /curricula/{materialId}/analyses`를 호출해야 한다."*

  그래서 **올린 뒤에 분석을 이어서 부른다.** 두 호출을 사용자에게 나눠 보이지 않는다 —
  등록만 하고 목록에 `분석 전`으로 남으면 그건 아무도 원하지 않는 상태다.
  분석 요청이 실패해도 교안은 이미 올라갔으므로, 그 사실을 문구로 가른다.
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
  const [failed, setFailed] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const requestAnalysis = useRequestAnalysis()

  const submittable = !!file && name.trim().length > 0 && !submitting

  /** 닫을 때 비운다 — 실패 문구·고른 파일·이름이 다음에 열었을 때 남아있으면 안 된다 */
  const reset = () => {
    setFile(null)
    setName('')
    setFailed(null)
  }

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const submit = async () => {
    if (!file) return
    setSubmitting(true)
    setFailed(null)
    try {
      const created = await registerCurriculum({ query: { title: name.trim() }, file })
      try {
        await requestAnalysis.mutateAsync({ path: { materialId: created.materialId } })
      } catch {
        // 교안은 올라갔다 — 목록에서 `다시 분석`으로 이어갈 수 있다
        setFailed('교안은 올라갔지만 분석을 시작하지 못했습니다. 목록에서 다시 분석을 눌러 주세요.')
        await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
        return
      }
      await queryClient.invalidateQueries({ queryKey: curriculumKeys.all })
      close(false)
    } catch {
      setFailed('등록하지 못했습니다. PDF 파일인지 확인해 주세요.')
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
          {failed && (
            <Alert variant="danger">
              <AlertTitle>{failed}</AlertTitle>
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
                  // 파일명에서 교안명을 미리 채운다 — 대부분 그대로 쓰고, 아니면 고친다
                  if (picked && !name) setName(picked.name.replace(/\.pdf$/i, ''))
                }}
              />
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                <UploadIcon />
                {file?.name ?? 'PDF 고르기'}
              </Button>
            </div>
            <FieldDescription>
              암호가 걸린 파일은 본문을 읽을 수 없어 분석이 실패합니다.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="cur-name">
              교안명 <RequiredMark />
            </FieldLabel>
            <Input
              id="cur-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="AI_LLMOps"
            />
            {/* **버전 칸이 없다** — 서버가 매긴다. 새 버전은 같은 자리에 다시 올리는 것이다 */}
            <FieldDescription>버전은 서버가 매깁니다(첫 등록이면 v1).</FieldDescription>
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
