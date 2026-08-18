# 백엔드 API — 38차 요청 · 34·36차 회신 실배포 대조 후 남은 것

> **36차 반영 확인했습니다 — 인박스 조회가 살아났습니다**(409 → 200). R2·R6도 됐고
> 부탁드리지 않은 R7①(면담 대기 인원)까지 들어와 있었습니다. 감사합니다.
>
> **다만 인박스를 실제로 열어 보니 「할 일」이 아닌 것이 절반 이상입니다**(R1) —
> 93건 중 **45건이 `COMPLETED`**입니다. 이대로 화면에 그리면 매니저가 이미 끝난
> 사람을 45번 확인하게 됩니다. 이것 하나가 이번 문서의 핵심입니다.
>
> 34차에서 남은 둘(값 `3·2·0` · `publishedAt` 모순)도 여기 이어 담습니다.
>
> 측정 — 2026-08-18 · App Runner(`mmbvymzj5k…`) · `manager@example.com`(9기 · C반) ·
> 스펙 `sha256 23d15b974aca`(오퍼레이션 146 · 스키마 325)

---

## 0. 한눈에

### ✅ 이번에 확인된 것 — 여덟

| 차수 | 무엇 | 확인 |
|---|---|---|
| 36차 R1 | 인박스 409 | ✅ **200 · 93건** · `band`까지 실려 옵니다 |
| 36차 R2 | 미제출 팀 이름 | ✅ `teams[{teamId, teamName}]` — `7팀`·`4팀` |
| 36차 R6 | 「없는 것」에 답 없음 | ✅ **5종 전부 404 · 0.5~0.8초**(App Runner) |
| 34차 R2 | 인원과 행 | ✅ 합 26 = `memberCount` · `notInRoundCount` |
| 34차 R3 | 팀 누락 | ✅ 2차 4팀 복귀 |
| 34차 R5 | `[RISK]` | ✅ 6회차 전수 0건 |
| 34차 R7② | 교안 버전 | ✅ `spring_backend_v1.pdf v1` |
| 34차 R7① | 면담 대기 인원 | ✅ **`INTERVIEW_BACKLOG`**로 들어와 있습니다(안 부탁드렸는데) |

### 🔴 남은 것 — 다섯

| | 무엇 | 어디서 왔나 |
|---|---|---|
| **R1** | 인박스 93건 중 **45건이 `COMPLETED`** — 할 일이 아닙니다 | 36차 R1 후속 |
| **R2** | 34차 R1 — 결과 없는 사람 `value`가 **셀마다 다릅니다** | 34차 R1 |
| **R3** | 34차 R4 — `resultStatus`와 `publishedAt`이 **서로 반대** | 34차 R4 |
| **R4** | 인박스에 `lastVisitedAt`이 없습니다 | 36차 R4 |
| **R5** | signals `summary`가 여전히 **JSON 문자열** | 36차 R3 |

---

## 1. 🔴 R1 — 인박스에 **이미 끝난 사람**이 45건 옵니다

```
GET /api/v0/cohorts/{9기}/notifications/inbox?size=100   →  200 · 4.3초 · 93건

itemType 분포
  REVIEW                 45   ← 전부 sourceStatus=COMPLETED
  INTERVIEW              26
  ABSENT                 11
  ASSESSMENT_NOT_STARTED  6
  REMINDER                5
```

`REVIEW` 45건이 **전부 이렇습니다.**

```jsonc
{ "itemType": "REVIEW",
  "subject": "백은우",
  "sourceStatus": "COMPLETED",
  "reasonCode":   "COMPLETED",
  "evidence": "미니프로젝트 1차 이해도 확인 · ON_TIME · SUCCEEDED · COMPLETED · SESSION_READY",
  "deadlineAt": "2026-03-21T14:59:00Z",   // 5개월 전
  "resolved": false,                       // ← 해소 안 됐다고 옵니다
  "band": 1 }
```

**`ON_TIME` · `SUCCEEDED` · `COMPLETED`** — 제때 냈고, 분석도 됐고, 응시도 끝났습니다.
그런데 `resolved: false`라 미해소 목록에 들어옵니다.

### 이게 왜 문제인가

인박스는 **「오늘 누구부터 처리할지」** 한 목록이고, 처리한 것은 목록에서 빠지는 것이
동작의 전부입니다(정의서 §1). 45건이 「아무것도 할 게 없는 사람」이면 **매니저가
진짜 할 일 6건(`ASSESSMENT_NOT_STARTED`)을 45건 사이에서 찾아야 합니다.**

`band`도 `1`(마감이 이미 지났다)이라 **맨 위에 옵니다** — 5개월 전 마감이 오늘 할 일의
첫 줄입니다.

### `REVIEW`가 무엇을 뜻하는지 알고 싶습니다

first 회신 §2에서 **「`REVIEW` 판정을 `nudge_eligible`에서 분리해, 다시보기가 실제로
아직 안 끝났으면 독립적으로 미해결 상태를 갖도록 했다」**고 하셨습니다. 그 의도라면
지금 오는 것들은 **다시보기가 끝난 사람**이라 안 와야 할 것 같습니다.

세 가지 중 어느 쪽인지 알려 주시면 그대로 맞추겠습니다.

| 안 | 내용 |
|---|---|
| **A**(선호) | `sourceStatus=COMPLETED`면 `resolved: true`로 — 미해소 목록에서 빠집니다 |
| **B** | `REVIEW`는 원래 「다시보기 대상」이고 지금 판정이 틀렸다 → 조건 수정 |
| **C** | 뜻이 있는 항목이다 → 무엇을 하라는 것인지 알려 주시면 화면이 그에 맞게 그립니다 |

### 곁가지 둘

**① `includeResolved=true`면 유형이 바뀝니다.**

```
includeResolved=false → REVIEW 45 · INTERVIEW 26 · ABSENT 11 · ASSESSMENT_NOT_STARTED 6 · REMINDER 5
includeResolved=true  → REVIEW 45 · ASSESSMENT 42 · ABSENT 10 · INTERVIEW 3
```

`ASSESSMENT` 42건이 새로 나타나고 `INTERVIEW`가 26 → 3으로 줍니다. `ABSENT`도 11 → 10입니다.
**해소된 것을 「추가」로 얹는 것이 아니라 목록 자체가 달라집니다** — `size=100` 상한에
걸려 잘린 것으로 보이는데(`nextCursor`가 있습니다), 그렇다면 정렬이 유형별로 뭉쳐
있어서 **뒤쪽 유형이 통째로 잘립니다.**

**② `evidence`가 코드 나열입니다.**

```
"미니프로젝트 1차 이해도 확인 · ON_TIME · SUCCEEDED · COMPLETED · SESSION_READY"
```

스펙에 「화면에 그대로 보여줄 근거 요약 문구」라고 적혀 있는데, 내부 상태 코드가
그대로 이어져 있어 그대로 못 씁니다. 지금은 화면이 `itemType`으로 문구를 만들고
있습니다 — **`evidence`를 안 쓰는 것이 맞는지**만 확인 부탁드립니다.

---

## 2. 🟠 R2 — 결과 없는 사람의 `value`가 **셀마다 다릅니다** (34차 R1)

34차 R2·R3 수정으로 **결과가 없는 사람도 행으로** 오게 됐는데, 그 값의 모양이
두 가지입니다.

```jsonc
// 1차 · C반 1팀 — 이번에 되살아난 행
{ "rowName": "한유진", "cells": [{ "value": null, "status": "NOT_ATTENDED" }] }

// 1차 · C반 6팀 — 34차 R1에서 여쭌 자리
{ "rowName": "윤지우", "cells": [
    { "problemNo": 1, "value": 3, "status": "INTERRUPTED" },
    { "problemNo": 2, "value": 2, "status": "INTERRUPTED" },
    { "problemNo": 3, "value": 0, "status": "INTERRUPTED" }
]}
```

**둘 다 「유효 결과가 없는 사람」인데 한쪽만 값이 있습니다.**

상태 판정은 고쳐졌습니다 — 34차에 `NOT_ATTENDED`였던 윤지우가 이제 `INTERRUPTED`이고,
합계도 `interruptedCount: 1`로 제자리를 찾았습니다(first 회신 §1-5에서 예고하신 대로).
**값만 남았습니다.**

저희는 `status`를 값보다 먼저 보므로 화면에는 안 그려집니다. 다만 **같은 격자에
`null`인 셀과 값이 있는 셀이 섞이면** 다음에 이 코드를 만지는 사람이 헷갈립니다.

`INTERRUPTED`도 `null`로 통일해 주시는 편이 읽기 쉬울 것 같은데, **그 값에 뜻이
있다면**(중단 시점까지의 도달 같은) 알려 주세요 — 그 경우 화면이 「중단 · 3단까지」처럼
쓸 수도 있습니다.

---

## 3. 🟠 R3 — `resultStatus`와 `publishedAt`이 **서로 반대**입니다 (34차 R4)

6회차 전수입니다.

```
1차  resultStatus=READY    publishedAt=2026-03-25  total=0   items=0   ✅
2차  resultStatus=READY    publishedAt=2026-04-29  total=5   items=5   ✅
3차  resultStatus=READY    publishedAt=2026-06-03  total=8   items=8   ✅
4차  resultStatus=READY    publishedAt=2026-07-22  total=12  items=12  ✅
5차  resultStatus=READY    publishedAt=null        total=4   items=4   🟠
6차  resultStatus=PENDING  publishedAt=2026-08-16  total=1   items=1   🔴
```

**34차에 올린 5차는 `PENDING` → `READY`가 됐습니다.** 그런데 두 회차가 정확히
엇갈립니다.

| 회차 | 읽으면 |
|---|---|
| 5차 | 발행됐다는데 **시각이 없습니다** |
| 6차 | 발행 전이라는데 **시각이 있습니다** |

지금 화면은 `resultStatus`를 믿고 `PENDING`이면 개수·내역을 안 그립니다. 「머리글의
개수·내역을 되살리셔도 됩니다」라고 하셨는데 **아직 안 되살렸습니다** — 6차에서 다시
자기모순이 되기 때문입니다.

**둘 중 어느 쪽이 진실인지**, 화면이 무엇을 봐야 하는지 알려 주시면 맞추겠습니다.

---

## 4. 🟡 R4 — 인박스에 `lastVisitedAt`이 없습니다 (36차 R4)

응답 최상위가 `items` · `nextCursor` 둘뿐입니다.

`since` 인자는 있는데 **넣을 값이 없습니다.** 「지난 방문 이후 / 전체」 두 범위 칩은
36차 때 걷어냈고 지금도 그대로입니다 — 지어낸 기준으로 목록을 반 토막 내면
「새로 생긴 일이 없습니다」가 거짓말이 되기 때문입니다.

| 안 | 내용 |
|---|---|
| **A**(선호) | 서버가 매니저별 마지막 조회 시각을 기억하고 응답에 `lastVisitedAt`으로 실어 준다 |
| **B** | 프론트가 로컬에 저장한다 — 기기·브라우저를 바꾸면 기준이 달라집니다 |

**급하지 않습니다** — 지금도 전체 목록으로 쓸 수 있습니다.

---

## 5. 🟡 R5 — signals `summary`가 여전히 JSON 문자열입니다 (36차 R3)

```jsonc
"summary": "{\"attemptId\": \"…\", \"validityReviewStatus\": \"CONFIRMED_INVALID\", …}"
```

객체가 아니라 문자열입니다. 화면이 `JSON.parse`로 풀어 `validityReviewStatus`만 꺼내
쓰는데, 파싱은 실패할 수 있는 일이라 **실패하면 판정 문구를 안 그리도록** 막아 뒀습니다
(「무효 아님」으로 오해되지 않게).

**R1이 풀리면 signals를 아예 안 부르게 되므로 이 요청은 없어집니다** — 인박스가
`INVALID_ATTEMPT`를 이미 싣고 있습니다. **R1 뒤에 보셔도 됩니다.**

---

## 6. ✅ 확인된 것 — 자세히

### 36차 R1 · 인박스가 살아났습니다

```
전 (36차)   GET …/notifications/inbox  →  409 DATA_INTEGRITY_VIOLATION (모든 조합)
지금        GET …/notifications/inbox  →  200 · 4.3초 · 93건 · nextCursor
```

`band`(1~4)까지 실려 옵니다 — 34차 R9에서 「밴드까지 서버가」라고 부탁드린 것입니다.
화면이 밴드를 파생하지 않아도 됩니다.

### 36차 R2 · 미제출에 팀 이름이 붙었습니다

```jsonc
{ "classId": "c8b9022b-…", "className": "C반", "type": "UNSUBMITTED_TEAMS",
  "teamCount": 1, "teams": [{ "teamId": "dab7ea73-…", "teamName": "7팀" }] }
```

`ANALYSIS_FAILED_TEAMS`도 같은 모양입니다(`4팀`). **화면을 반 단위에서 팀 단위로
되돌릴 수 있게 됐습니다.**

> `INTERVIEW_BACKLOG`(34차 R7①)도 함께 들어와 있습니다 — 부탁드리지 않았는데 감사합니다.
> 다만 이쪽은 `teams: []`이고 `teamCount`가 **인원 수**로 보입니다(2차 5 · 3차 7 ·
> 4차 8 · 5차 4 — 면담 대기 인원과 일치합니다). 필드 이름이 `teamCount`라 화면이
> 「팀 수」로 읽을 뻔했습니다 — **의도가 인원이면 이름을 갈라 주시는 편**이 안전합니다.

### 36차 R6 · 「없는 것」에 답이 옵니다

```
없는 교안 상세            404 · 0.79s  CURRICULUM_MATERIAL_NOT_FOUND
없는 교안 섹션            404 · 0.51s  CURRICULUM_MATERIAL_NOT_FOUND
없는 프로젝트             404 · 0.59s  PROJECT_NOT_FOUND
없는 기수 인박스          404 · 0.58s  MANAGER_SCOPE_NOT_FOUND
아직 회차 없는 프로젝트    404 · 0.78s  PROJECT_ROUND_NOT_CREATED
```

**저희가 측정 호스트를 Lambda에서 App Runner로 옮긴 것으로 해결됐습니다.**
Lambda에서는 같은 다섯이 전부 25~40초 무응답이었습니다.

18차 R1·R7 · 21차 · 25차 R4 · 29차 R1 · 30차 R1 · 32차 R12로 여러 차례 올렸던
「404가 무응답이다」가 **전부 그 차이**였습니다. 저희 프록시·스펙 대상을 옮겼고,
없는 교안 id가 **30초 무응답 → 3.2초에 「교안을 찾을 수 없습니다」**로 떨어집니다.

**Lambda 쪽은 이제 안 씁니다.** 혹시 그쪽이 정식이라면 알려 주세요.

### 34차 R2·R3·R5·R7② · 전부 확인

```
1차 TEAM  valid 24 · notAtt 1 · intr 1 · notInRound 0 → 합 26 = memberCount ✅
          1팀 TRAINEE 5행 / 5명 ✅   (전 4행)
2차 TEAM  팀행 [1팀 2팀 3팀 4팀 5팀 6팀] ✅   (전 4팀 없음)
4차 TEAM  합 26 ✅
[RISK]    6회차 전수 0건 ✅
교안       "spring_backend_v1.pdf v1" ✅
```

되살아난 한유진이 `value: null` + `NOT_ATTENDED`로 **이름 순 제자리**에 들어오는
것까지 회신에 적어 주신 그대로입니다. 화면(반 → 팀 → 팀원 세 계층)으로도 확인했고,
개인 격자에서 그 행이 대시(`―`)로 그려집니다.

**저희도 정리했습니다** — 「4 / 5명」 + 「1명은 이 회차 명단에 없습니다」는 행 수와
`memberCount`를 화면이 빼서 만든 값이었는데, `notInRoundCount`가 그 자리를 정확히
대신하므로 걷어냈습니다. 이제 화면이 인원을 다시 세지 않습니다.

---

## 7. 답을 기다리는 것

| | 무엇 | 급한가 |
|---|---|---|
| **R1** | 인박스 `REVIEW` 45건이 `COMPLETED`입니다 — A·B·C 중 어느 쪽인가요 | 🔴 **가장 급합니다** — 이대로는 화면에 못 붙입니다 |
| **R3** | `resultStatus` vs `publishedAt` 어느 쪽이 진실인가요 | 🟠 머리글 개수를 되살리려면 필요합니다 |
| **R2** | `INTERRUPTED`의 `value`에 뜻이 있나요 | 🟡 화면 동작에는 영향 없습니다 |
| **R4** | `lastVisitedAt`을 주실 수 있나요 | 🟡 급하지 않습니다 |
| **R5** | signals `summary` 객체화 | ⚪ **R1 뒤에 보셔도 됩니다** |
| 참고 | `INTERVIEW_BACKLOG.teamCount`가 인원 수인가요 | 🟡 이름만 확인하면 됩니다 |
