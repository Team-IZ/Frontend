import { useMemo } from 'react'
import { useFindMyReports } from '@/api/reporting/useReportingQueries'
import type { findMyReports_Response } from '@/api/reporting/reportingTypes'
import { clampLevel } from './types'
import type { ComparedReach, ConceptReport, ReportsData, RoundReport, ServerConcept } from './types'

/*
  리포트 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  한 번의 `GET /reports`가 회차 목록과 본문을 다 준다. 회차를 바꿔도 요청이 없다 —
  마스터-디테일이 캐시 안에서 움직인다.

  공개 범위(`GET /reports/{id}/disclosure`)는 **안 부른다.** 그 응답의 `visibleFields`는
  "무엇이 보이나"를 알려주는데, 목록 응답이 이미 안 보이는 필드를 빼고 주므로 같은
  사실을 두 번 묻는 셈이다. 매니저가 범위를 바꾸는 화면이 생기면 그때 쓴다.
*/

type Server = findMyReports_Response
type ServerReport = Server['reportsById'][string]

export function useReports() {
  const query = useFindMyReports()
  const data = useMemo(() => (query.data ? toView(query.data) : undefined), [query.data])
  return { ...query, data }
}

function toView(s: Server): ReportsData {
  return {
    rounds: s.rounds.map((r) => ({
      id: r.id,
      label: r.label,
      hasPendingRetry: r.hasPendingRetry,
    })),
    reportsById: Object.fromEntries(
      Object.entries(s.reportsById).map(([id, r]) => [id, toReport(r)]),
    ),
  }
}

function toReport(r: ServerReport): RoundReport {
  const base = { id: r.id, label: r.label }

  switch (r.status) {
    case 'PUBLISHED':
      return {
        ...base,
        status: 'PUBLISHED',
        // 상태가 PUBLISHED면 서버가 반드시 채우는 값들 — 스키마는 옵셔널이지만
        // 설명문이 "PUBLISHED에서만"이라고 못박았다. 없으면 빈 값이 낫다(화면이 죽지 않는다)
        publishedAt: r.publishedAt ?? '',
        curriculum: r.curriculum ?? '',
        /*
          **`PRIVATE`은 화면이 볼 일이 없다.** 그건 "공개하지 않음"의 내부 표현이라
          그 리포트는 애초에 `PENDING_VISIBILITY`로 온다(17차 Q1). 그래도 값이 오면
          가장 닫힌 쪽(`SUMMARY`)으로 접는다 — 안 보여야 할 것을 여는 실수는 되돌릴 수 없다.
        */
        scope: r.disclosureScope === 'FULL' ? 'FULL' : 'SUMMARY',
        concepts: (r.concepts ?? []).map(toConcept),
        retryState: r.retryState ?? 'NONE',
        retryDueAt: r.retryDueAt ?? null,
        retryCompletedAt: r.retryCompletedAt ?? null,
        missingConceptCount: r.missingConceptCount ?? 0,
      }
    case 'PENDING_PUBLISH':
      return { ...base, status: 'PENDING_PUBLISH', publishAfter: r.publishAfter ?? null }
    case 'PENDING_VISIBILITY':
    case 'NOT_STARTED':
    case 'NOT_ATTEMPTED':
    case 'VOID_ATTEMPT':
    case 'STOPPED':
      return { ...base, status: r.status }
  }
}

function toConcept(c: ServerConcept): ConceptReport {
  if (!c.asked) return { asked: false, name: c.name }

  return {
    asked: true,
    name: c.name,
    reachedLevel: clampLevel(c.level),
    said: c.said ?? '',
    isRetryTarget: c.isRetryTarget,
    curriculumRef: c.curriculumRef ?? null,
    /*
      **빈 배열은 `null`로 접는다.** 화면이 "있는데 비었다"와 "안 왔다"를 가를 필요가
      없다 — 둘 다 그릴 것이 없다는 뜻이고, 분기를 하나로 줄이면 빈 제목만 남은
      섹션이 생기지 않는다.
    */
    explanation: c.explain?.length ? c.explain : null,
    qa: c.qa?.length ? c.qa.map((q) => ({ ...q })) : null,
    comparedReach: (c.comparedReach as ComparedReach | undefined) ?? null,
  }
}
