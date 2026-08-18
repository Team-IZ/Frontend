import { CheckIcon, LockIcon, UploadIcon, XIcon } from 'lucide-react'
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
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { ZIP_HELP, validateZipSize } from '../labels'
import type { RepoCheck } from '../_/api/api'
import type { SubmissionMethod } from '../_/api/types'

type Props = {
  submitting: boolean
  /** 서버가 허용한 수단. `GITHUB_URL`이 없으면 그 탭이 잠긴다 */
  availableMethods: SubmissionMethod[]
  onSubmit: (file: File) => void
  /** 저장소 주소로 낸다. 브랜치는 비우면 서버가 기본 브랜치를 고른다 */
  onSubmitRepository: (repositoryUrl: string, branch: string) => void
  /** 제출 전에 주소를 미리 확인한다 — 오타를 마감 직전에 알게 되는 것을 막는다 */
  onCheckRepository: (repoUrl: string) => Promise<RepoCheck>
  checking: boolean
}

/*
  제출 폼.

  ## 어느 수단을 쓸 수 있는지는 서버가 정한다

  `availableSubmissionMethods`가 기관 정책을 말해 준다 — 화면이 판단하지 않는다.
  `GITHUB_URL`이 빠져 있으면 그 탭이 잠기고, 왜 못 쓰는지 한 줄로 말한다(탭을 아예
  지우면 "이 기관은 GitHub을 안 쓴다"는 사실 자체가 안 보인다).

  ## 저장소는 내기 전에 한 번 확인한다

  `POST /submissions`는 형식·호스트만 보고 실제 접근 가능 여부는 **마감 후 분석에서**
  판정한다(스펙). 그래서 주소를 잘못 내면 마감이 지나서야 알게 된다 —
  `POST /submissions/repository-checks`로 같은 검사를 미리 돌려 그 자리에서 알려준다.
*/
export default function SubmissionForm({
  submitting,
  availableMethods,
  onSubmit,
  onSubmitRepository,
  onCheckRepository,
  checking,
}: Props) {
  const githubAllowed = availableMethods.includes('GITHUB_URL')
  const [method, setMethod] = useState<SubmissionMethod>(
    githubAllowed ? 'GITHUB_URL' : 'ZIP_WITH_GITLOG',
  )
  const [file, setFile] = useState<File | null>(null)
  const [zipError, setZipError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [repoCheck, setRepoCheck] = useState<RepoCheck | null>(null)

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

  /*
    주소가 바뀌면 확인 결과를 버린다 — 예전 주소에 대한 `확인했어요`가 남아 있으면
    고친 주소도 확인된 것처럼 보인다.
  */
  const handleRepoUrlChange = (v: string) => {
    setRepoUrl(v)
    setRepoCheck(null)
  }

  const handleCheck = async () => {
    const url = repoUrl.trim()
    if (!url) return
    setRepoCheck(await onCheckRepository(url))
  }

  const canSubmit =
    method === 'GITHUB_URL'
      ? !submitting && !checking && repoUrl.trim().length > 0
      : !submitting && !!file && !zipError

  const hintText = () => {
    if (submitting) return method === 'GITHUB_URL' ? '제출하는 중이에요…' : '올리는 중이에요…'
    if (method === 'GITHUB_URL') {
      return repoUrl.trim()
        ? '제출하면 코드 분석이 시작돼요'
        : '저장소 주소를 적으면 제출할 수 있어요'
    }
    return file
      ? '파일을 골랐어요 — 제출하면 코드 분석이 시작돼요'
      : '파일을 고르면 제출할 수 있어요'
  }

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
          이 기관은 GitHub 저장소 제출을 쓰지 않아요. ZIP으로 올려 주세요.
        </p>
      )}

      {method === 'GITHUB_URL' ? (
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="repo-url">저장소 주소</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="repo-url"
                className="flex-1"
                placeholder="https://github.com/내계정/저장소"
                value={repoUrl}
                disabled={submitting}
                onChange={(e) => handleRepoUrlChange(e.target.value)}
                onBlur={handleCheck}
              />
              <Button
                type="button"
                variant="ghost"
                disabled={!repoUrl.trim() || checking || submitting}
                onClick={handleCheck}
              >
                {checking ? <Spinner className="size-4" /> : '주소 확인'}
              </Button>
            </div>
            {/*
              확인 결과는 **오류가 아니라 안내다.** 주소가 틀린 것은 사고가 아니라
              고칠 일이라, 실패해도 폼을 빨갛게 덮지 않고 한 줄만 바꾼다.
            */}
            {repoCheck?.ok ? (
              <FieldDescription className="flex items-center gap-1 text-success">
                <CheckIcon className="size-3.5 shrink-0" />
                {repoCheck.message}
              </FieldDescription>
            ) : repoCheck ? (
              <FieldError>{repoCheck.message}</FieldError>
            ) : (
              <FieldDescription>공개 저장소여야 하고, 마감 후 분석 때 읽습니다.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="repo-branch">브랜치 (선택)</FieldLabel>
            <Input
              id="repo-branch"
              placeholder="비워 두면 기본 브랜치"
              value={branch}
              disabled={submitting}
              onChange={(e) => setBranch(e.target.value)}
            />
            <FieldDescription>분석할 브랜치를 지정하고 싶을 때만 적으세요.</FieldDescription>
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
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-fg-subtle">{hintText()}</span>
        <Button
          disabled={!canSubmit}
          onClick={() =>
            method === 'GITHUB_URL'
              ? onSubmitRepository(repoUrl.trim(), branch)
              : file && onSubmit(file)
          }
        >
          제출
        </Button>
      </div>
    </Card>
  )
}
