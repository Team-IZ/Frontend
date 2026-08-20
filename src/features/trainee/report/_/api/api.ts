import { useMemo } from 'react'
import { useFindMyReports } from '@/api/reporting/useReportingQueries'
import type { findMyReports_Response } from '@/api/reporting/reportingTypes'
import { clampLevel } from './types'
import type { ComparedReach, ConceptReport, ReportsData, RoundReport, ServerConcept } from './types'

/*
  리포트 도메인 훅 — **생성 훅을 감싸 화면 어휘로 옮긴다.**

  한 번의 `GET /reports`가 회차 목록과 본문을 다 준다. 회차를 바꿔도 요청이 없다 —
  마스터-디테일이 캐시 안에서 움직인다.

  🔴 **공개/비공개 개념이 폐지됐다.** `disclosure` 엔드포인트도, `scope`도, 리포트
  단위 가림막도 없다. 남는 가림막은 도달 2단 미만 개념의 `explanation`·`qa`뿐이고,
  다시 보기를 마치기 전까지 서버가 그 필드만 가려서 보낸다(개념 단위).
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

  /*
    🔴 **`as ... | 'IN_PROGRESS'` 캐스트가 필요하다**(2026-08-20). 생성 타입
    (`ServerReport['status']`, `npm run api:gen`으로 나온다)이 아직 이 값을 모른다 —
    백엔드 PR이 머지·배포되고 스키마를 다시 생성하기 전까지는 그렇다. 캐스트를
    빼면 컴파일은 되지만(스위치가 여전히 소진적이라) 실제로 서버가 `IN_PROGRESS`를
    보내는 순간 아래 case가 죽은 코드 취급돼 무시되고 `undefined`가 반환돼 화면이
    죽는다. 스키마 재생성 후에는 이 캐스트를 지워도 된다 — 그때는 생성 타입 자체가
    `IN_PROGRESS`를 포함해서 필요 없어진다.

    지역 변수로 뽑아서 switch를 거는 이유는, `r.status`를 캐스트 없이 그대로
    switch에 걸어야 case 안에서 `r.status`를 다시 읽을 때도 좁혀진 타입을 그대로
    받기 때문이다 — `switch (r.status as ...)`처럼 캐스트 식을 바로 걸면 TS가 그
    좁힘을 `r.status`의 다른 참조로 전파하지 못한다.
  */
  const status = r.status as ServerReport['status'] | 'IN_PROGRESS'

  switch (status) {
    case 'PUBLISHED':
      return {
        ...base,
        status: 'PUBLISHED',
        // 상태가 PUBLISHED면 서버가 반드시 채우는 값들 — 스키마는 옵셔널이지만
        // 설명문이 "PUBLISHED에서만"이라고 못박았다. 없으면 빈 값이 낫다(화면이 죽지 않는다)
        publishedAt: r.publishedAt ?? '',
        curriculum: r.curriculum ?? '',
        concepts: (r.concepts ?? []).map(toConcept),
        retryState: r.retryState ?? 'NONE',
        retryDueAt: r.retryDueAt ?? null,
        retryCompletedAt: r.retryCompletedAt ?? null,
        missingConceptCount: r.missingConceptCount ?? 0,
      }
    case 'PENDING_PUBLISH':
      return { ...base, status: 'PENDING_PUBLISH', publishAfter: r.publishAfter ?? null }
    case 'IN_PROGRESS':
      return { ...base, status: 'IN_PROGRESS' }
    case 'NOT_STARTED':
    case 'NOT_ATTEMPTED':
    case 'VOID_ATTEMPT':
    case 'STOPPED':
      return { ...base, status }
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
