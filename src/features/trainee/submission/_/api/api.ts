import { useCallback, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/_contract'
import { useGetMyAssessmentRounds } from '@/api/assessment/useAssessmentQueries'
import { assessmentKeys } from '@/api/assessment/assessmentKeys'
import { useFindMySubmission, useGetAnalysis } from '@/api/submission/useSubmissionQueries'
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

  const raw = useMemo(
    () => (query.data ? toView(query.data, availableMethods) : undefined),
    [query.data, availableMethods],
  )

  /*
    **요약이 끝났다고 말하는 세 상태 모두에서 한 번은 묻는다.**

    `ANALYZING`  진행 중 — 원래 목적이다
    `READY`(문항 0) 요약이 **성공이라고 말하는 실패**가 있다(아래 `failed` 주석)
    `ANALYSIS_FAILED` **서버가 자동으로 다시 돌리고 있을 수 있다**

    마지막이 실측으로 나왔다 — 실패 직후 `executionNo: 2`로 `RUNNING`이 다시 시작됐는데
    화면은 「다시 제출해 주세요」에 멈춰 있었다. 학생이 필요 없는 재제출을 하거나, 재시도가
    성공해도 새로고침 전까지 모른다.

    끝난 응답(`SUCCEEDED`·`PARTIAL`·`FAILED`)을 받으면 `refetchInterval`이 스스로 멈추므로,
    진짜로 끝난 실패에서는 **요청이 한 번뿐**이다.
  */
  const problems = home.data?.current?.preparedProblemCount ?? null
  const analysis = useAnalysisWatch(
    raw?.submissionId ?? null,
    raw?.status === 'ANALYZING' ||
      raw?.status === 'ANALYSIS_FAILED' ||
      (raw?.status === 'READY' && problems === 0),
  )

  /*
    🔴 **요약과 분석 조회가 다르면 분석 조회를 믿는다.**

    같은 제출을 세 곳이 다르게 말한다(2026-08-21 실측 — `SESSION_PREPARATION_FAILED`):

      analysis        FAILED · SESSION_PREPARATION_FAILED
      my-submission   READY   ← 이 화면이 보는 값
      홈              ANALYZING · 버튼 없음

    그대로 두면 화면이 *"분석이 끝났어요 · 이해도 확인을 시작할 수 있습니다"* 라고 하는데
    **문항이 0개라 시작할 것이 없다.** 학생은 홈으로 갔다가 버튼이 없어 되돌아온다.

    셋 중 **가장 구체적인 값**이 분석 조회다 — 사유 코드 14종을 가진 쪽이고, 그중 둘은
    원장에 없어 요약이 애초에 알 수 없다. 백엔드도 *"셋이 다르면 후자를 우선해 달라"* 고
    확인해 주었다(분석 상태 불일치 진단서 2026-08-21). 서버가 요약을 맞추면 이 덮어쓰기는
    같은 값이 되어 저절로 무해해진다.

    **아직 돌고 있으면 돌고 있다고 말한다.** 서버가 실패한 잡을 스스로 다시 돌리는데
    (실측 — `executionNo: 2`), 요약은 앞선 실패를 그대로 들고 있다. 그 사이 화면이
    「다시 제출해 주세요」를 띄우면 학생이 필요 없는 재제출을 한다.
  */
  const phase = analysis?.phase
  const override =
    phase === 'FAILED'
      ? ('ANALYSIS_FAILED' as const)
      : phase === 'QUEUED' || phase === 'RUNNING'
        ? ('ANALYZING' as const)
        : null

  const data = useMemo(
    () => (raw && override && raw.status !== override ? { ...raw, status: override } : raw),
    [raw, override],
  )

  return {
    data,
    /**
     * 분석이 실패한 이유 **원문**. 서버가 *"화면에 그대로 노출 가능"* 이라고 명시한
     * 값이라(백엔드 권장안 §4.2) 우리가 지어낸 문구보다 정확하다.
     *
     * 사유 코드는 14종인데 그중 둘(`SESSION_PREPARATION_FAILED`·`EXTERNAL_JOB_ID_LOST`)은
     * **원장에 없고 조회 시점에 판정된다** — 회차 요약(`analysisFailureCode`)에는 영영
     * 안 나타나므로 이 경로로만 알 수 있다.
     */
    analysisFailureReason: analysis?.phase === 'FAILED' ? (analysis.failureReason ?? null) : null,
    /** 홈을 아직 못 읽었으면 그것도 로딩이다 — 화면은 하나의 스피너만 본다 */
    isPending: home.isPending || (!!projectId && query.isPending),
    isError: home.isError || query.isError,
    refetch: query.refetch,
  }
}

/*
  분석이 끝나는 **그 순간** 화면을 바꾼다.

  `my-submission`·홈은 회차 요약이라 화면이 다시 묻기 전까지 낡은 채로 있다. 학생은
  분석이 끝났는지 보려고 새로고침을 반복하게 되고, 실패했으면 그만큼 재제출이 늦어진다
  (마감이 가까울수록 비싸다).

  `GET /submissions/{id}/analysis`는 **폴링을 전제로 만들어진 조회**다(백엔드 권장안
  2026-08-21). 끝나면 두 요약을 무효화해 화면이 스스로 다음 상태로 넘어간다.

  ## 60초인 이유

  백엔드가 AI 서버를 **1분에 한 번** 훑어 `analysis_job.status`를 갱신한다
  (`AI_ANALYSIS_POLL_DELAY`, 기본 `PT1M`). 그보다 자주 물어야 **같은 값을 다시 받을
  뿐이고** 서버만 두드린다. 그 설정이 바뀌면 이 값도 같이 옮겨야 한다.
*/
const ANALYSIS_POLL_MS = 60_000

/** 여기 닿으면 분석이 끝난 것이다 — `PARTIAL`은 일부만 만들어졌을 뿐 완료로 친다 */
const ANALYSIS_TERMINAL = ['SUCCEEDED', 'PARTIAL', 'FAILED']

function useAnalysisWatch(submissionId: string | null, analyzing: boolean) {
  const queryClient = useQueryClient()
  const enabled = !!submissionId && analyzing

  const { data } = useGetAnalysis(
    { path: { submissionId: submissionId! } },
    {
      enabled,
      /*
        끝났으면 스스로 멈춘다. `refetchInterval`에 함수를 주면 **직전 응답을 보고**
        다음 간격을 정할 수 있다 — 별도 상태를 두고 끄는 것보다 어긋날 자리가 없다.
      */
      refetchInterval: (q) =>
        ANALYSIS_TERMINAL.includes(String(q.state.data?.phase)) ? false : ANALYSIS_POLL_MS,
    },
  )

  const phase = data?.phase
  useEffect(() => {
    if (!enabled || !phase || !ANALYSIS_TERMINAL.includes(String(phase))) return
    /*
      분석이 끝났다는 것은 **요약 두 개가 낡았다**는 뜻이다. 여기서 상태를 지어내지
      않고 서버에 다시 묻는다 — 제출 화면은 `my-submission`, 홈 카드는 회차 조회를 본다.
    */
    queryClient.invalidateQueries({ queryKey: submissionKeys.all })
    queryClient.invalidateQueries({ queryKey: assessmentKeys.all })
  }, [enabled, phase, queryClient])

  return data ?? null
}

function toView(s: Server, availableMethods: SubmissionMethod[]): SubmissionView {
  return {
    status: s.status,
    assessmentRoundId: s.assessmentRoundId,
    roundLabel: s.roundLabel,
    submissionDueAt: s.submissionDueAt,
    submissionId: s.submissionId ?? null,
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
