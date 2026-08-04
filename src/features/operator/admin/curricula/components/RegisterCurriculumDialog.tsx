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
import { registerCurriculum } from '../../_/api/api'
import RequiredMark from '../../_/components/RequiredMark'

/*
  교안 등록.

  ⚠ **목업에 이 모달이 없다.** 목록 헤더의 `+ 교안 등록` 버튼만 그려져 있고 케이스 표에도
  줄이 없다. 그런데 OP-03이 *"등록된 교안이 없습니다 → 운영 관리 › 교안에서 등록"* 으로
  보내므로 **없는 기능이 아니라 안 그려진 기능**이다 — 버튼만 두고 결과를 안 그리면
  누르는 순간 아무 일도 안 일어난다(I1).

  그래서 **최소한만** 만들었다: 파일 · 교안명 · 버전. 실패 문구·에러코드가 정해지면
  그때 케이스 표를 먼저 고치고 여기를 맞춘다(api.ts `registerCurriculum` 주석).

  **올리면 분석이 시작된다.** 분석이 끝나야 `가르친 항목`이 나오고, 그 전에는 이 교안을
  프로젝트에 연결할 수 없다(14번 4-3).
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegistered: () => void
}

export default function RegisterCurriculumDialog({ open, onOpenChange, onRegistered }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [version, setVersion] = useState('v1')
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  const submittable = !!file && name.trim().length > 0 && version.trim().length > 0 && !submitting

  const submit = async () => {
    if (!file) return
    setSubmitting(true)
    setFailed(false)
    try {
      await registerCurriculum({
        name,
        version,
        fileName: file.name,
        // 쪽수는 서버가 파일을 열어야 안다 — 목에서는 0으로 두고 분석이 채운다
        pageCount: 0,
      })
      onRegistered()
      onOpenChange(false)
      setFile(null)
      setName('')
      setVersion('v1')
    } catch {
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>교안 등록</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>등록하지 못했습니다. 같은 이름·버전이 있는지 확인해 주세요.</AlertTitle>
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

          <div className="grid grid-cols-[1fr_auto] gap-2">
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
            </Field>
            <Field className="w-24">
              <FieldLabel htmlFor="cur-version">
                버전 <RequiredMark />
              </FieldLabel>
              <Input
                id="cur-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1"
              />
            </Field>
          </div>

          <p className="text-fg-subtle text-xs">
            등록하면 분석이 시작됩니다. 분석이 끝나야 <b>가르친 항목</b>이 나오고, 그 전에는
            프로젝트에 연결할 수 없습니다.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
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
