import { LockIcon, UploadIcon, XIcon } from 'lucide-react'
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
import { ZIP_HELP, validateZipSize } from '../labels'
import type { SubmissionMethod } from '../_/api/types'

type Props = {
  submitting: boolean
  /** 서버가 허용한 수단. `GITHUB_URL`이 없으면 그 탭이 잠긴다 */
  availableMethods: SubmissionMethod[]
  onSubmit: (file: File) => void
}

/*
  🔴 **서버는 두 수단을 다 허용한다고 하는데 저장소 입력 폼이 아직 없다.**

  `availableSubmissionMethods`는 *"기관 정책이 허용하나"* 만 말해 준다 — 그 배열만 믿고
  탭을 열면 GitHub 탭이 선택된 채 그 아래에 ZIP 드롭존이 뜬다(저장소 입력칸이 없으니까).
  고를 수는 있고 낼 수는 없는 탭이 되는 것이라, 여기서 한 번 더 막는다.

  `POST /submissions`도 지금은 열려 있고 생성 훅(`useSubmitGithubUrl`)도 나와 있다.
  **남은 것은 저장소 URL·브랜치 입력 폼을 붙이는 일뿐**이고, 붙이면서 이 상수를 지운다.
  배열에서 `GITHUB_URL`이 빠지면 이 상수가 있어도 알아서 잠긴다.
*/
const GITHUB_FORM_BUILT = false

/*
  제출 폼.

  ## GitHub 탭이 잠겨 있다
  탭을 지우지 않고 잠그는 이유는 ① 곧 열릴 것이고 ② 학생이 "왜 GitHub은 안 되나"를
  화면에서 알 수 있어야 하기 때문이다.
*/
export default function SubmissionForm({ submitting, availableMethods, onSubmit }: Props) {
  const githubAllowed = GITHUB_FORM_BUILT && availableMethods.includes('GITHUB_URL')
  const [method, setMethod] = useState<SubmissionMethod>(
    githubAllowed ? 'GITHUB_URL' : 'ZIP_WITH_GITLOG',
  )
  const [file, setFile] = useState<File | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const canSubmit = !submitting && !!file && !zipError

  return (
    <Card className="p-5">
      <ButtonGroup className="mb-4">
        <Button
          type="button"
          variant={method === 'GITHUB_URL' ? 'primary' : 'ghost'}
          size="sm"
          disabled={!githubAllowed}
          onClick={() => setMethod('GITHUB_URL')}
        >
          {!githubAllowed && <LockIcon className="size-3.5" />}
          GitHub 저장소
        </Button>
        <Button
          type="button"
          variant={method === 'ZIP_WITH_GITLOG' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMethod('ZIP_WITH_GITLOG')}
        >
          ZIP 업로드
        </Button>
      </ButtonGroup>

      {!githubAllowed && (
        <p className="mb-3 text-xs text-fg-subtle">
          GitHub 저장소 제출은 아직 준비 중이에요. 지금은 ZIP으로 올려 주세요.
        </p>
      )}

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
            안내문은 좁은 화면에서 두 줄이 되는 게 잘리는 것보다 낫다.
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-fg-subtle">
          {submitting
            ? '올리는 중이에요…'
            : file
              ? '파일을 골랐어요 — 제출하면 코드 분석이 시작돼요'
              : '파일을 고르면 제출할 수 있어요'}
        </span>
        <Button disabled={!canSubmit} onClick={() => file && onSubmit(file)}>
          제출
        </Button>
      </div>
    </Card>
  )
}
