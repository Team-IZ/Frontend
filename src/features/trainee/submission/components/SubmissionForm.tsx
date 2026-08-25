import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import type { RepoCheck } from '../_/api/api'
import type { SubmissionMethod } from '../_/api/types'

type Props = {
  submitting: boolean
  /** 서버가 허용한 수단. `GITHUB_URL`이 없으면 폼 대신 안내만 보인다 */
  availableMethods: SubmissionMethod[]
  /** 저장소 주소로 낸다. 브랜치는 비우면 서버가 기본 브랜치를 고른다 */
  onSubmitRepository: (repositoryUrl: string, branch: string) => void
  /** 제출 전에 주소를 미리 확인한다 — 오타를 마감 직전에 알게 되는 것을 막는다 */
  onCheckRepository: (repoUrl: string) => Promise<RepoCheck>
  checking: boolean
}

/*
  제출 폼 — GitHub 저장소 하나만 받는다.

  🔴 **ZIP 업로드를 지웠다**(사용자 지시 — 지금 GitHub URL로만 제출이 가능하다).
  `SubmissionMethod`·`METHOD_LABEL`은 그대로 둔다 — 이 값을 없애면 **예전에 ZIP으로
  낸 제출**(`SubmittedContentCard`가 그리는 과거 기록)의 타입·표시 라벨이 없어진다.
  지우는 것은 "새로 낼 때 고르는 경로"뿐이다.

  ## 어느 수단을 쓸 수 있는지는 서버가 정한다

  `availableSubmissionMethods`가 기관 정책을 말해 준다 — 화면이 판단하지 않는다.
  `GITHUB_URL`이 빠져 있으면(지금은 없는 조합이지만 계약상 있을 수 있다) 폼 대신
  안내를 보여준다 — ZIP이 없어진 지금은 대체 수단이 없으므로 매니저에게 알리라고 한다.

  ## 저장소는 내기 전에 한 번 확인한다

  `POST /submissions`는 형식·호스트만 보고 실제 접근 가능 여부는 **마감 후 분석에서**
  판정한다(스펙). 그래서 주소를 잘못 내면 마감이 지나서야 알게 된다 —
  `POST /submissions/repository-checks`로 같은 검사를 미리 돌려 그 자리에서 알려준다.
*/
export default function SubmissionForm({
  submitting,
  availableMethods,
  onSubmitRepository,
  onCheckRepository,
  checking,
}: Props) {
  const githubAllowed = availableMethods.includes('GITHUB_URL')
  const [repoUrl, setRepoUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [repoCheck, setRepoCheck] = useState<RepoCheck | null>(null)

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

  const canSubmit = githubAllowed && !submitting && !checking && repoUrl.trim().length > 0

  const hintText = () => {
    if (!githubAllowed) return '지금은 제출할 수 있는 방법이 없어요.'
    if (submitting) return '제출하는 중이에요…'
    return repoUrl.trim()
      ? '제출하면 코드 분석이 시작돼요'
      : '저장소 주소를 적으면 제출할 수 있어요'
  }

  return (
    <Card className="p-5">
      {githubAllowed ? (
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
        <p className="text-sm text-fg-subtle">
          이 기관은 지금 제출 방법이 설정되어 있지 않아요. 매니저에게 알려 주세요.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-fg-subtle">{hintText()}</span>
        <Button disabled={!canSubmit} onClick={() => onSubmitRepository(repoUrl.trim(), branch)}>
          제출
        </Button>
      </div>
    </Card>
  )
}
