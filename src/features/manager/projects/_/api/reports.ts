import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUpdateDisclosure } from '@/api/disclosure/useDisclosureMutations'
import { useFindManagedReports } from '@/api/reporting/useReportingQueries'
import { reportingKeys } from '@/api/reporting/reportingKeys'

/*
  리포트 공개 — MG-08 결과 탭이 쓴다.

  **「발행」과 「공개」는 다른 사건이다.**

    발행  publishedAt    서버가 회차 마감 후 한꺼번에 한다(`ROUND_BATCH`). 매니저 손이 안 간다
    공개  releaseStatus  매니저가 연다. **이 호출이 없으면 발행돼도 영원히 잠겨 있다**(스펙)

  그래서 화면 버튼이 부르는 것은 `PUT /reports/{reportId}/disclosure`다.

  ⚠ **일괄 API가 아직 없다.** 리포트 하나씩이라 한 회차 26명이면 26콜이다. 백엔드가
  일괄을 만들어 주기로 했으니, 그때 `publish()` 안쪽만 갈면 되게 이 한 겹으로 감싼다
  (화면은 「대상 목록을 넘기면 결과가 돌아온다」만 안다).
*/

export type ManagedReport = {
  reportId: string
  traineeUserId: string
  traineeName: string
  classId: string
  className: string
  assessmentRoundId: string
  /** 서버가 `null`을 줄 수 있다 — 없으면 회차 번호로 대신 쓴다 */
  roundName: string | null
  roundNo: number
  /** 서버가 발행한 시각. `null`이면 아직 발행 전이라 열 수 없다 */
  publishedAt: string | null
  /** `NOT_CONFIGURED`(아직 아무도 안 정함) · `RELEASED` · `WITHHELD` */
  releaseStatus: string
  /** 지금 걸린 범위. `null`이면 미지정 */
  scope: string | null
  releasedAt: string | null
  /** 교육생이 실제로 본문을 볼 수 있나 — 발행과 공개가 **둘 다** 갖춰져야 참이다 */
  bodyVisible: boolean
}

/** 매니저가 보낼 수 있는 값. `NOT_CONFIGURED`는 못 보낸다(스펙) — 닫는 것은 `PRIVATE`다 */
export type DisclosureScope = 'PRIVATE' | 'SUMMARY' | 'FULL'

export type PublishResult = {
  ok: string[]
  /** 실패한 것만 — 행 단위로 표시한다(`async-states` §3-5) */
  failed: { reportId: string; error: unknown }[]
}

/**
 * 담당 반 리포트 목록. 회차·반으로 좁힐 수 있다(둘 다 선택).
 *
 * ⚠ 본문은 안 들어 있다 — 「어느 리포트가 발행됐고 지금 어떤 공개 상태인가」만 답한다.
 */
export function useManagedReports(params: {
  cohortId?: string
  roundId?: string
  classId?: string
}) {
  const query = useFindManagedReports(
    { query: { cohortId: params.cohortId, roundId: params.roundId, classId: params.classId } },
    { enabled: !!params.cohortId || !!params.roundId },
  )

  const data = useMemo<ManagedReport[] | undefined>(
    () =>
      query.data?.reports?.map((r) => ({
        reportId: r.reportId,
        traineeUserId: r.traineeUserId,
        traineeName: r.traineeName,
        classId: r.classId,
        className: r.className,
        assessmentRoundId: r.assessmentRoundId,
        roundName: r.roundName ?? null,
        roundNo: r.roundNo,
        publishedAt: r.publishedAt ?? null,
        releaseStatus: r.releaseStatus,
        scope: r.scope ?? null,
        releasedAt: r.releasedAt ?? null,
        bodyVisible: r.bodyVisible,
      })),
    [query.data],
  )

  return { ...query, data }
}

/**
 * 공개 범위를 정한다 — **여러 건을 순차로** 보낸다.
 *
 * 🔴 **한 건이 실패해도 나머지를 계속 보낸다.** 26명 중 3번째에서 멈추면 앞의 둘만
 * 열린 채로 남아, 다시 눌렀을 때 무엇이 이미 열렸는지 화면이 모른다. 끝까지 보내고
 * **실패한 것만** 돌려준다.
 *
 * ⚠ **병렬로 안 보낸다.** 같은 반 리포트 수십 건을 한꺼번에 던지면 서버가 담당 판정을
 * 그만큼 동시에 돌린다 — 일괄 API가 오면 그쪽이 한 번에 하므로, 그때까지는 순차다.
 */
export function usePublishReports() {
  const update = useUpdateDisclosure()
  const queryClient = useQueryClient()
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)

  const publish = useCallback(
    async (reportIds: string[], scope: DisclosureScope): Promise<PublishResult> => {
      const ok: string[] = []
      const failed: PublishResult['failed'] = []
      setTotal(reportIds.length)
      setDone(0)

      for (const reportId of reportIds) {
        try {
          await update.mutateAsync({ path: { reportId }, body: { scope } })
          ok.push(reportId)
        } catch (error) {
          failed.push({ reportId, error })
        }
        setDone((n) => n + 1)
      }

      /* 하나라도 됐으면 목록을 다시 받는다 — 화면이 상태를 스스로 계산하지 않는다 */
      if (ok.length > 0) {
        await queryClient.invalidateQueries({ queryKey: reportingKeys.all })
      }
      return { ok, failed }
    },
    [update, queryClient],
  )

  return { publish, done, total, isPending: update.isPending }
}

/**
 * 🔴 **한 사람에 리포트가 여러 건 온다.** 9기 6차는 36건인데 사람은 19명이고, 17명이
 * 「발행된 것 + 발행 전 것」 두 건을 갖는다(왜 둘인지는 응답에 구분할 필드가 없다 —
 * 39차로 물었다). 그냥 `Map`에 담으면 **뒤엣것이 앞엣것을 덮어써서**, 방금 공개한
 * 사람이 화면에서 미발행으로 보인다(렌더에서 잡았다).
 *
 * 사람마다 **대표 한 건**을 고른다 — 발행된 것이 있으면 그것, 그중에서도 최신이다.
 * 매니저가 여는 대상은 「발행된 리포트」라 그 축이 대표가 맞다.
 */
export function pickByTrainee(reports: ManagedReport[]): ManagedReport[] {
  const best = new Map<string, ManagedReport>()
  for (const r of reports) {
    const cur = best.get(r.traineeUserId)
    if (!cur) {
      best.set(r.traineeUserId, r)
      continue
    }
    const better =
      (!!r.publishedAt && !cur.publishedAt) ||
      (!!r.publishedAt && !!cur.publishedAt && r.publishedAt > cur.publishedAt)
    if (better) best.set(r.traineeUserId, r)
  }
  return [...best.values()]
}

/**
 * 발행·공개 상태로 넷을 가른다. **사람 단위로 센다**(`pickByTrainee`) — 행을 세면
 * 같은 사람이 두 번 잡혀 「19명 발행 전」처럼 실제 인원보다 큰 수가 나온다.
 *
 * **발행된 것만 열 수 있다** — 발행 전에 열어도
 * `bodyVisible`이 거짓이라 교육생에게는 여전히 안 보인다(스펙: 순서를 강제하지
 * 않지만 둘이 모두 갖춰져야 참이다).
 */
export function splitReports(all: ManagedReport[]) {
  const reports = pickByTrainee(all)
  const published = reports.filter((r) => r.publishedAt)
  return {
    pending: reports.length - published.length,
    published,
    opened: published.filter((r) => r.bodyVisible),
    closed: published.filter((r) => !r.bodyVisible),
  }
}
