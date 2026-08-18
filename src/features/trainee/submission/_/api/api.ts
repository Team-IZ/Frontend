import { useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/_contract'
import { useGetMyAssessmentRounds } from '@/api/assessment/useAssessmentQueries'
import { assessmentKeys } from '@/api/assessment/assessmentKeys'
import { useFindMySubmission } from '@/api/submission/useSubmissionQueries'
import { submissionKeys } from '@/api/submission/submissionKeys'
import type { findMySubmission_Response } from '@/api/submission/submissionTypes'
import { useCheckRepository, useSubmitGithubUrl } from '@/api/submission/useSubmissionMutations'
import { submitZip } from '@/api/uploads'
import type { SubmissionMethod, SubmissionView } from './types'

/*
  제출 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  ## `projectId`를 어디서 얻나
  `GET /projects/{projectId}/my-submission`이 프로젝트를 요구하는데 **라우트에는 그 값이
  없다**(`/trainee/submission`). 홈 응답(`current.projectId`)이 갖고 있으므로 그것을 읽는다.

  **요청이 늘지 않는다** — 홈과 같은 생성 훅을 쓰므로 쿼리 키가 같고, 홈을 거쳐 들어오면
  캐시가 그대로 쓰인다(주소창으로 바로 들어오면 그때 한 번 받는다). 라우트에 `projectId`를
  넣어 해결할 수도 있지만, 그러면 홈이 링크를 만들 때 그 값을 알아야 하고 북마크한 주소가
  다음 회차에 낡는다.
*/

type Server = findMySubmission_Response

/** 제출 화면 한 장. `projectId`를 아직 모르면 조회를 미룬다 */
export function useSubmission() {
  const home = useGetMyAssessmentRounds()
  const projectId = home.data?.current?.projectId ?? null

  const query = useFindMySubmission(
    { path: { projectId: projectId! } },
    // 닫힌 다이얼로그가 조회하지 않게 하는 것과 같은 이유 — 값이 없으면 안 부른다
    { enabled: !!projectId },
  )

  const availableMethods = useMemo(
    () => (home.data?.current?.availableSubmissionMethods ?? []) as SubmissionMethod[],
    [home.data],
  )

  const data = useMemo(
    () => (query.data ? toView(query.data, availableMethods) : undefined),
    [query.data, availableMethods],
  )

  return {
    data,
    /** 홈을 아직 못 읽었으면 그것도 로딩이다 — 화면은 하나의 스피너만 본다 */
    isPending: home.isPending || (!!projectId && query.isPending),
    isError: home.isError || query.isError,
    refetch: query.refetch,
  }
}

function toView(s: Server, availableMethods: SubmissionMethod[]): SubmissionView {
  return {
    status: s.status,
    assessmentRoundId: s.assessmentRoundId,
    roundLabel: s.roundLabel,
    submissionDueAt: s.submissionDueAt,
    method: (s.method ?? null) as SubmissionMethod | null,
    submittedAt: s.submittedAt ?? null,
    analyzedAt: s.analyzedAt ?? null,
    verifyClosesAt: s.verifyClosesAt ?? null,
    // 서버가 `oneOf`로 갈라 주므로 여기서 합치지 않는다 — 판별은 화면이 `in`으로 한다
    content: s.content
      ? 'repoUrl' in s.content
        ? {
            repoUrl: s.content.repoUrl,
            branch: s.content.branch,
            lastCommit: s.content.lastCommit ?? null,
          }
        : {
            fileName: s.content.fileName,
            fileSize: s.content.fileSize,
            lastCommit: s.content.lastCommit ?? null,
          }
      : null,
    failureCode: s.failureCode ?? null,
    availableMethods,
  }
}

/**
 * ZIP 제출·재제출.
 *
 * **멱등키를 화면이 만들어 넘긴다.** 제출 버튼을 누른 순간 하나 만들어 그 제출이 끝날
 * 때까지 들고 있어야 재시도가 같은 키를 쓴다 — 여기서 만들면 호출마다 새 키가 되어
 * 멱등이 성립하지 않는다(uploads.ts 주석).
 *
 * **성공하면 제출 현황과 홈을 다시 읽는다.** 서버가 접수만 하고 분석은 비동기로 돌리므로
 * 화면이 상태를 지어내지 않고 서버가 준 것을 그린다 — 목이 하던 낙관적 전환을 걷어냈다.
 * 홈까지 무효화하는 이유는 카드의 대표 상태가 제출로 바뀌기 때문이다.
 */
export function useSubmitZip() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { assessmentRoundId: string; idempotencyKey: string; file: File }) =>
      submitZip({
        query: { assessmentRoundId: vars.assessmentRoundId },
        idempotencyKey: vars.idempotencyKey,
        file: vars.file,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
    },
  })
}

/**
 * GitHub 저장소 제출.
 *
 * ZIP과 달리 **파일이 아니라 주소만 보낸다** — 서버는 형식·호스트만 검사하고 실제
 * 접근 가능 여부는 마감 후 분석에서 판정한다(스펙). 그래서 여기서 성공했다고 코드가
 * 읽혔다는 뜻은 아니다.
 *
 * `branch`는 비워도 된다 — AI 서버가 기본 브랜치를 골라 `resolvedBranch`로 회신한다.
 *
 * ⚠️ **ZIP과 똑같이 `Idempotency-Key`가 필수다**(생략하면 400). 파일을 안 올린다고
 * 예외가 아니다 — 재시도했을 때 제출이 둘로 갈리지 않게 하는 장치라 수단과 무관하다.
 */
export function useSubmitGithub() {
  const queryClient = useQueryClient()
  const m = useSubmitGithubUrl({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all })
      queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
    },
  })
  const submit = useCallback(
    async (vars: { assessmentRoundId: string; repositoryUrl: string; branch?: string }) => {
      await m.mutateAsync({
        /*
          **제출 버튼을 누른 이 순간 키를 만든다.** 재시도는 같은 키라야 서버가 최초
          결과를 돌려주고, 사용자가 주소를 고쳐 다시 내면 새 키가 되어 별개 제출이 된다
          — `submit` 한 번이 곧 한 제출이라 여기가 그 경계다(ZIP과 같은 규칙).
        */
        header: { 'Idempotency-Key': crypto.randomUUID() },
        body: {
          assessmentRoundId: vars.assessmentRoundId,
          repositoryUrl: vars.repositoryUrl,
          // 빈 문자열을 보내면 "빈 브랜치"를 지정한 것이 된다 — 아예 빼야 기본 브랜치가 잡힌다
          ...(vars.branch?.trim() ? { branch: vars.branch.trim() } : {}),
        },
      })
    },
    [m],
  )
  return { submit, isPending: m.isPending, error: m.error }
}

/** 사전 확인 결과 — 화면은 `ok`와 보여줄 한 줄만 쓴다 */
export type RepoCheck = { ok: boolean; message: string }

/**
 * 저장소 주소 사전 확인.
 *
 * **제출 버튼을 누르기 전에** 같은 검사를 미리 돌려 본다(스펙) — 여기서 통과한 주소는
 * 제출에서 같은 이유로 거절되지 않는다. 오타를 마감 직전에 알게 되는 것을 막는다.
 *
 * 거절도 **오류가 아니라 결과다.** 주소가 틀린 것은 사고가 아니라 학생이 고칠 일이라,
 * 화면이 빨간 실패 화면을 띄우지 않고 입력칸 아래 한 줄로 말한다.
 */
export function useRepositoryCheck() {
  const m = useCheckRepository()
  const check = useCallback(
    async (repoUrl: string): Promise<RepoCheck> => {
      try {
        const r = await m.mutateAsync({ body: { repoUrl } })
        return r.ok
          ? { ok: true, message: `${r.ownerLogin}/${r.repositoryName} 확인했어요` }
          : { ok: false, message: '이 주소로는 제출할 수 없어요. 저장소 주소를 확인해 주세요.' }
      } catch (e) {
        if (isApiError(e)) {
          return { ok: false, message: e.message || '주소를 확인하지 못했어요.' }
        }
        throw e
      }
    },
    [m],
  )
  return { check, isPending: m.isPending }
}
