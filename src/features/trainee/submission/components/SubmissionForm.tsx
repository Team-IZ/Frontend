import { UploadIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/Attachment'
import { Button } from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { Card } from '@/components/ui/Card'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { checkRepoUrl, validateZipSize } from '../api'
import { REPO_HELP, REPO_NOT_FOUND_HELP, ZIP_HELP } from '../labels'
import type { SubmitInput } from '../types'

type Props = {
  /** 재제출일 때 이전 값으로 채운다("다시 제출"은 폼으로 돌아간다 — TR-02 §6) */
  initial?: { repoUrl: string; branch: string }
  submitting: boolean
  onSubmit: (input: SubmitInput) => void
}

/** GitHub/ZIP 세그먼트 토글 + 각 방식의 폼. `InputCompositionsPreview.tsx` 케이스 J의 2지 토글 패턴 */
export default function SubmissionForm({ submitting, onSubmit, initial }: Props) {
  const [method, setMethod] = useState<'GITHUB' | 'ZIP'>('GITHUB')
  const [repoUrl, setRepoUrl] = useState(initial?.repoUrl ?? '')
  const [branch, setBranch] = useState(initial?.branch ?? '')
  const [repoError, setRepoError] = useState<string | null>(null)
  const [checkingRepo, setCheckingRepo] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleRepoBlur = async () => {
    if (!repoUrl.trim()) return
    setCheckingRepo(true)
    const result = await checkRepoUrl(repoUrl.trim())
    setCheckingRepo(false)
    setRepoError(result.ok ? null : result.message)
  }

  const handleFilePicked = (picked: File | undefined) => {
    if (!picked) return
    const result = validateZipSize(picked)
    if (!result.ok) {
      setZipError(result.message)
      setFile(null)
      return
    }
    setZipError(null)
    setFile(picked)
  }

  const canSubmit =
    !submitting &&
    (method === 'GITHUB'
      ? repoUrl.trim().length > 0 && !repoError && !checkingRepo
      : !!file && !zipError)

  const handleSubmit = () => {
    if (!canSubmit) return
    if (method === 'GITHUB') {
      onSubmit({ method: 'GITHUB', repoUrl: repoUrl.trim(), branch: branch.trim() || 'main' })
    } else if (file) {
      onSubmit({ method: 'ZIP', file })
    }
  }

  return (
    <Card className="p-5">
      <ButtonGroup className="mb-4">
        <Button
          type="button"
          variant={method === 'GITHUB' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMethod('GITHUB')}
        >
          GitHub 저장소
        </Button>
        <Button
          type="button"
          variant={method === 'ZIP' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMethod('ZIP')}
        >
          ZIP 업로드
        </Button>
      </ButtonGroup>

      {method === 'GITHUB' ? (
        <div className="flex flex-col gap-4">
          <Field data-invalid={!!repoError}>
            <FieldLabel htmlFor="repo-url">저장소 주소</FieldLabel>
            <Input
              id="repo-url"
              placeholder="https://github.com/팀이름/저장소"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value)
                setRepoError(null)
              }}
              onBlur={handleRepoBlur}
              aria-invalid={!!repoError}
            />
            {repoError ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-danger">{repoError}</p>
                <FieldDescription>{REPO_NOT_FOUND_HELP}</FieldDescription>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setMethod('ZIP')}
                >
                  ZIP으로 올리기
                </Button>
              </div>
            ) : (
              <FieldDescription className="whitespace-pre-line">{REPO_HELP}</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="repo-branch">
              브랜치 <span className="text-fg-subtle">비우면 기본 브랜치</span>
            </FieldLabel>
            <Input
              id="repo-branch"
              placeholder="main"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </Field>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="sr-only"
            onChange={(e) => handleFilePicked(e.target.files?.[0])}
          />
          <Attachment
            state={zipError ? 'error' : file ? 'done' : 'idle'}
            className="w-full"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFilePicked(e.dataTransfer.files[0])
            }}
          >
            {!file && <AttachmentTrigger onClick={() => fileInputRef.current?.click()} />}
            <AttachmentMedia>
              <UploadIcon />
            </AttachmentMedia>
            {/*
              AttachmentTitle/Description 기본값은 한 줄 말줄임(truncate)이다 — 이 드롭존
              안내문은 좁은 화면에서 두 줄이 되는 게 잘리는 것보다 낫다(핵심 동작 문구가
              사라지면 안 된다). !important로 명시적으로 덮어써 우선순위 경쟁을 없앤다.
            */}
            <AttachmentContent>
              <AttachmentTitle className="!overflow-visible !text-clip !whitespace-normal">
                {file ? file.name : 'ZIP 파일을 끌어다 놓거나 눌러서 고르세요'}
              </AttachmentTitle>
              <AttachmentDescription className="!overflow-visible !text-clip !whitespace-normal">
                {zipError ?? (file ? `${Math.round(file.size / (1024 * 1024))}MB` : ZIP_HELP)}
              </AttachmentDescription>
            </AttachmentContent>
            {file && (
              <AttachmentActions>
                <AttachmentAction
                  onClick={() => {
                    setFile(null)
                    setZipError(null)
                  }}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            )}
          </Attachment>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-fg-subtle">
          {method === 'GITHUB'
            ? '제출하면 코드 분석이 시작돼요'
            : file
              ? '파일을 골랐어요 — 제출할 수 있어요'
              : '파일을 고르면 제출할 수 있어요'}
        </span>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          제출
        </Button>
      </div>
    </Card>
  )
}
