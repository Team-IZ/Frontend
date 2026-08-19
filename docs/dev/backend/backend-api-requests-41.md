# 백엔드 API — 41차 요청 · 인박스로 갈아타려면 세 유형이 더 필요합니다

> **38차 R1 해결 확인했습니다.** 인박스가 `COMPLETED`인 사람을 더 이상 안 싣습니다 —
> `REVIEW`가 45건에서 **4건**으로 줄었고, 그 4건은 다시보기 마감(`review_due_at`)이
> 아직 안 지난 사람들이라 **정확히 맞습니다**(§1). 감사합니다.
>
> 그래서 이제 **네 조회를 인박스 하나로 교체하려고 했는데, 못 합니다** — 스펙의
> `itemType` 여덟 중 **세 개가 실응답에 한 건도 안 옵니다**(§2). 지금 갈아타면
> 미제출·분석 실패·무효 행이 통째로 사라집니다.
>
> 측정 — 2026-08-19 · App Runner · `manager@example.com`(9기 · C반) ·
> 스펙 `sha256 e4dee966b5e3`

---

## 0. 한눈에

| | 무엇 | |
|---|---|---|
| **38차 R1** | 인박스에 `COMPLETED` 45건 | ✅ **해결** — 4건으로 줄었고 전부 마감 전입니다 |
| **R1**(신규) | `SUBMISSION_MISSING`·`ANALYSIS_FAILED`·`INVALID_ATTEMPT`가 **안 옵니다** | 🔴 이것 때문에 교체를 못 합니다 |
| 참고 | `includeResolved=true`면 **목록 자체가 달라집니다** | 🟡 38차에 올린 것이 그대로입니다 |

---

## 1. ✅ 38차 R1 — 정확히 고쳐졌습니다

```
전    REVIEW 45건 · 전부 sourceStatus=COMPLETED · band 1 · 마감이 5개월 전
지금  REVIEW  4건 · deadlineAt 2026-08-24T23:00:00Z · band 3
      백하은 · 이준서 · 노주안 · 정가온
```

**이 4명이 6차 불합격 4명과 같은 사람입니다.** `GET /projects/{id}/evaluations`의
`failedCount`가 4이고 `stuckConceptCount > 0`인 사람이 정확히 이 넷입니다 —
두 API가 같은 사실을 말하고 있어서, 회신이 적어 주신 `review_due_at` 판정이
의도대로 도는 것을 화면 쪽에서도 확인했습니다.

전체 건수도 **92 → 51**로 줄었습니다.

> ⚠ 저희 코드에 「`RETRY`(다시 보기)는 서버에 오퍼레이션이 없다(32차 R14②)」라고
> 적어 둔 주석이 **이제 거짓**이 됐습니다. 정정했습니다 — 인박스로 갈아탈 때 이 행이
> 같이 들어온다고 적어 두었습니다.

---

## 2. 🔴 R1 — `itemType` 셋이 실응답에 없습니다

스펙은 여덟을 적어 두었습니다.

```
SUBMISSION_MISSING · ANALYSIS_FAILED · ASSESSMENT_NOT_STARTED · REVIEW
ASSESSMENT · INVALID_ATTEMPT · INTERVIEW · REMINDER
```

9기 전 회차를 전수로 받아 보면 다섯만 옵니다.

```
GET /cohorts/{9기}/notifications/inbox?size=100
  51건 · nextCursor=null(더 없음)
  { INTERVIEW 26 · ABSENT 11 · ASSESSMENT_NOT_STARTED 5 · REVIEW 4 · REMINDER 5 }

GET …?includeResolved=true&size=100
  100건 · nextCursor 있음
  { ASSESSMENT 83 · ABSENT 11 · INTERVIEW 3 · ASSESSMENT_NOT_STARTED 3 }
```

**`SUBMISSION_MISSING`·`ANALYSIS_FAILED`·`INVALID_ATTEMPT`는 한 건도 없습니다.**
(`ABSENT`도 스펙 목록에는 없는데 실제로는 옵니다 — 목록이 낡은 것으로 보입니다.)

### 데이터가 없어서가 아닙니다

같은 기수·같은 계정으로 다른 조회를 치면 그 셋이 다 있습니다.

```
GET /projects?cohort={9기}
  actionItems → { UNSUBMITTED_TEAMS 1 · ANALYSIS_FAILED_TEAMS 1 · INTERVIEW_BACKLOG 5 }

GET /cohorts/{9기}/analytics/signals
  reasonCode → { INVALID_ATTEMPT 1 · PERSISTENT_LOW 25 · LOW_PARTICIPATION 2 · … }
```

미제출 1팀 · 분석 실패 1팀 · 무효 1건이 **분명히 있는데 인박스에만 안 잡힙니다.**

> ⚠ **`INTERVIEW_BACKLOG`도 인박스에 없습니다**(위 `actionItems`에는 5건 있습니다).
> 인박스의 `INTERVIEW`(26건)와 겹치는 축으로 보이는데, 겹친다면 **양쪽에 다 실리면
> 같은 사람이 두 번 잡힙니다.** 인박스로 교체할 때 어느 쪽을 봐야 하는지 알려주세요.
>
> 🔴 **이 유형 때문에 저희 화면이 한 번 죽었습니다.** `INTERVIEW_BACKLOG`가 배포로
> 새로 오자 MG-07 프로젝트 목록이 라벨 표에서 못 찾아 `undefined`를 읽고 **라우트가
> 통째로 흰 화면**이 됐습니다(2026-08-19). 저희 잘못이고 고쳤습니다 — 이제 모르는
> 유형이 와도 그 줄만 건너뜁니다. **유형을 늘리실 때 미리 알려주시면** 라벨을 먼저
> 넣어 둘 수 있습니다(안 알려주셔도 이제 안 죽습니다).

### 이것 때문에 교체를 못 합니다

지금 화면(MG-01)은 조회 넷을 합쳐 그립니다.

```
GET /projects?cohort=              미제출 · 분석 실패 경보
GET /projects/{id}/class-progress  진행 줄 + 분석 실패 팀 이름
GET /trainees?assessmentRoundId=   미응시 · 응시 중단
GET /interviews?assessmentRoundId= 면담 대기
```

34차 R9부터 「인박스 조회 하나로 합쳐 달라」고 요청드렸고 그 조회가 이제 살아났는데,
**지금 갈아타면 미제출·분석 실패·무효 행이 통째로 사라집니다.** 그래서 네 조회를
그대로 두고 있습니다.

**세 유형이 실제로 실리면 저희가 바로 교체합니다** — 어댑터 한 겹만 갈면 되게
만들어 두었습니다(`dashboard/_/api/api.ts`).

### 여쭙는 것

1. 이 셋을 인박스에 싣는 조건이 **아직 안 걸린 것**인지, 아니면 다른 원천을 봐야
   하는 것인지 알려주세요.
2. 싣는다면 **`SUBMISSION_MISSING`·`ANALYSIS_FAILED`의 대상 단위**도 함께 알려주시면
   좋겠습니다 — `actionItems`는 반 단위(`teamCount`)인데 인박스는 `subject`가 하나라
   팀명이 들어오는 것인지 확인이 필요합니다.
3. **`INTERVIEW_BACKLOG`와 인박스 `INTERVIEW`가 같은 축인가요?** 둘 다 실리면 같은
   면담 대상이 두 번 잡힙니다.
3. 스펙 `itemType` 목록에 **`ABSENT`가 빠져 있습니다**(실제로는 옵니다). 목록을
   갱신해 주시면 저희 타입이 실제와 맞습니다.

---

## 3. 🟡 참고 — `includeResolved=true`면 목록이 달라집니다

38차에 올린 것이 그대로입니다.

```
false → INTERVIEW 26 · ABSENT 11 · ASSESSMENT_NOT_STARTED 5 · REVIEW 4 · REMINDER 5   (51건)
true  → ASSESSMENT 83 · ABSENT 11 · INTERVIEW 3 · ASSESSMENT_NOT_STARTED 3            (100건 · 커서 있음)
```

해소된 것이 **추가로** 얹히는 것이 아니라 목록 자체가 바뀝니다 — `INTERVIEW`가
26에서 3으로 줄고 `REVIEW`·`REMINDER`가 사라집니다. `size=100` 상한에 걸려 잘리는
것으로 보이는데, 정렬이 유형별로 뭉쳐 있으면 **뒤쪽 유형이 통째로 잘립니다.**

지금 화면은 `includeResolved`를 안 씁니다(미해소만 봅니다). **급하지 않습니다.**

---

## 4. 남아 있는 것 — 38차에서 이어집니다

| | 무엇 | 회신 |
|---|---|---|
| 38차 R2 | `INTERRUPTED`의 `value` 3·2·0 | 「뜻이 있다」 — 화면이 그렇게 씁니다. 요청 아님 |
| 38차 R3 | `resultStatus` vs `publishedAt` | 5차는 설계대로 · **6차만 데이터 이상**(수동 되돌리기 잔존) |
| 38차 R4 | `lastVisitedAt` | 저장 구조 없음 · 스키마 결정 필요. 급하지 않음 |
| 38차 R5 | signals `summary`가 JSON 문자열 | **R1과 무관하게 남는다**는 지적 맞습니다 — MG-03·MG-06도 같은 조회를 씁니다 |

**6차 `interview_candidate` 잔존 데이터 정리**만 운영 작업으로 남아 있습니다
(38차 R3 회신 §2 — 코드 결함이 아니라 되돌린 판정의 잔존이라고 하셨습니다).
