/*
  TR-04 계약 — 확정 모델은 `docs/dev/screens/tr-04-report.md`.

  `trainee/session/types.ts`의 타입을 import하지 않는다 — features 간 교차 import
  금지(oxlintrc). 숫자 하나짜리 타입이라 로컬 복제가 싸다.

  발행 상태는 `PUBLISHED` 하나뿐이고 그 안에서 `retryState`(NONE/PENDING/DONE)가
  갈린다 — 목업의 `locked`·`after`·`clear` 3페이지는 서로 다른 라운드 상태가 아니라
  **같은 발행 화면의 변형**이다(정의서 재검증 발견 #3).
*/

/** 도달 단계 0~4. **`0` = L1조차 통과 못함** — 서버가 스펙에 5단이라고 못박았다 */
export type ReachedLevel = 0 | 1 | 2 | 3 | 4

export type CurriculumRef = { chapter: string; pages: string; title: string }

export type QaEntry = { questionLabel: string; question: string; answer: string }

/**
 * 개념 하나의 시도. 재시험을 봤으면 2건이다.
 *
 * **`seq: 1`이 정본이다** — 재시험 결과는 기록에만 남고 원점수를 바꾸지 않는다.
 * 서버 집계(위험자·집단미달·기수비교)도 첫 응시 기준이다.
 */
export type ConceptAttempt = {
  seq: number
  reachedLevel: ReachedLevel
  qa: QaEntry[]
}

/*
  ⚠️ **`asked: false`(문항 없음)와 `reachedLevel: 0`은 다르다.**

  0단은 *물었는데 못한 것*이고, 문항 없음은 *확정된 개념이 그 학생 코드에 없어
  문항이 아예 안 만들어진 것*이다. 서버가 이 둘을 엄격히 가르고("`level0`과
  `unasked`를 합치면 안 된다"), 매니저 화면도 이미 갈라 그린다.

  옵셔널 필드가 아니라 **union으로 가르는 이유** — 문항 없음 카드가 도달 단계·서술을
  그릴 수 없다는 것을 컴파일러가 막는다. 옵셔널로 두면 `level ?? 0`처럼 조용히
  0단으로 뭉개는 코드가 언젠가 들어온다.
*/
export type ConceptReport =
  | {
      asked: false
      name: string
    }
  | {
      asked: true
      name: string
      /** 마지막으로 통과한 단계. 재시험을 봤어도 **첫 응시 값**이다 */
      reachedLevel: ReachedLevel
      /**
       * 공개 범위 — **개념별**이고 기준은 도달 2단이다(재시험 대상을 가르는 선과 같다).
       * `SUMMARY`는 재시험 전의 임시 상태이고, 재시험을 마치면 `FULL`이 된다.
       */
      scope: 'FULL' | 'SUMMARY'
      said: string
      /** 도달 2단 미만이고 아직 재시험을 안 봤다. `scope === 'SUMMARY'`와 짝이다 */
      isRetryTarget: boolean
      /** `SUMMARY`에서 **필수** — 어디를 보고 오라는 안내가 다시 보기의 전제다 */
      curriculumRef?: CurriculumRef
      /**
       * 막힌 이유 상세 — **`FULL`일 때만 온다.**
       *
       * `SUMMARY`면 서버가 아예 안 보낸다(null이 아니라 없음). 화면에서 숨기는
       * 방식은 금지다 — 안 보이게 하는 것과 안 보내는 것은 다르다.
       */
      explanation?: string[]
      /** 문답 원문 — `FULL`일 때만. 재시험을 봤으면 2건 */
      attempts?: ConceptAttempt[]
    }

export type RoundListItem = {
  id: string
  label: string
  /** 아직 안 한 다시 보기가 있다 — 레일에 점으로 표시(선택 여부와 무관) */
  hasPendingRetry: boolean
}

type RoundBase = { id: string; label: string }

export type PublishedReport = RoundBase & {
  status: 'PUBLISHED'
  publishedAt: string
  curriculum: string
  concepts: ConceptReport[]
  /** `DONE`이면 재시험을 이미 썼다 — **기회는 1회뿐**이라 버튼이 사라진다 */
  retryState: 'NONE' | 'PENDING' | 'DONE'
  retryDueAt?: string // PENDING
  retryCompletedAt?: string // DONE
}

export type RoundReport =
  | PublishedReport
  | (RoundBase & { status: 'PENDING_PUBLISH'; publishAfter: string })
  | (RoundBase & { status: 'PENDING_VISIBILITY' })
  | (RoundBase & { status: 'NOT_ATTEMPTED' })
  | (RoundBase & { status: 'VOID_ATTEMPT' })
  | (RoundBase & { status: 'STOPPED' })

export type ReportsData = {
  rounds: RoundListItem[]
  reportsById: Record<string, RoundReport>
}

/** 물어본 개념만 — 문항 없음은 도달 단계도 재시험도 없어서 대부분의 계산에서 빠진다 */
export const askedConcepts = (concepts: ConceptReport[]) =>
  concepts.filter((c): c is Extract<ConceptReport, { asked: true }> => c.asked)
