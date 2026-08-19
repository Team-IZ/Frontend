# 백엔드 API — 34차 second · first 회신 실배포 대조

> **first 회신(`34-first-success`) 잘 받았습니다. 배포 확인했고 — 전부 됐습니다.**
> R2·R3·R7② 셋 다 실데이터로 확인했습니다(§2). **R5도 해결**됐습니다.
>
> 남은 것은 둘입니다 — **R1의 `value`**(상태는 고쳐졌는데 값이 그대로, §1)와
> **R4**(5차는 풀렸는데 6차로 옮겨갔고 새 모순이 하나 더 보입니다, §3).
>
> ⚠️ **저희가 호스트를 바꿨습니다** — 이번 측정부터 전부
> `mmbvymzj5k.ap-northeast-1.awsapprunner.com`입니다(§5).
>
> 측정 — 2026-08-18 · App Runner · `manager@example.com`(9기 · C반) ·
> 스펙 `sha256 79a511c373cc`(오퍼레이션 145 · 스키마 322)

---

## 0. 한눈에

| | 34차에 올린 것 | 지금 | 무엇이 필요한가 |
|---|---|---|---|
| **R1** | 미응시 셀에 값이 옵니다 | 🟠 **절반** — 상태는 고쳐졌고 **값은 그대로** | 값의 뜻만 답해 주세요 |
| **R2** | 인원과 행이 안 맞습니다 | ✅ **해결** — 세 회차 전부 **합 = memberCount** · `notInRoundCount: 0` | 없음 |
| **R3** | 팀이 통째로 빠집니다 | ✅ **해결** — 2차에 **4팀 복귀** | 없음 |
| **R4** | `PENDING`인데 `items` | 🟠 **회차가 바뀜** — 5차 해소, **6차에서 남**. 게다가 `publishedAt`이 **있습니다** | 아래 §3 |
| **R5** | `[RISK]` 태그 | ✅ **해결** — 6회차 전수 **0건** | 없음 |
| **R7②** | 교안 버전 | ✅ **해결** — `spring_backend_v1.pdf v1` | 없음 |
| **R8** | 회차당 0.86초 | — | **§4에 답신드립니다(A안)** |
| **R9** | 대시보드 인박스 | — | **36차 문서로 이어받았습니다** |

---

## 1. 🟠 R1 — 상태는 고쳐졌는데 **값은 그대로**입니다

34차에 올린 그 자리(**1차 · C반 6팀 · 윤지우**)를 같은 인자로 다시 쳤습니다.

```jsonc
// 전 (34차)
{ "rowName": "윤지우", "cells": [
    { "problemNo": 1, "value": 3, "status": "NOT_ATTENDED" },
    { "problemNo": 2, "value": 2, "status": "NOT_ATTENDED" },
    { "problemNo": 3, "value": 0, "status": "NOT_ATTENDED" }
]}

// 지금
{ "rowName": "윤지우", "cells": [
    { "problemNo": 1, "value": 3, "status": "INTERRUPTED" },   // ← 상태가 바뀜
    { "problemNo": 2, "value": 2, "status": "INTERRUPTED" },
    { "problemNo": 3, "value": 0, "status": "INTERRUPTED" }
]}
```

합계도 따라 옮겨졌습니다.

```jsonc
"summary": { "memberCount": 4, "cells": [
  { "validCount": 3, "notAttendedCount": 0, "invalidCount": 0, "interruptedCount": 1 }
]}                              // ↑ 전에는 notAttended 1 · interrupted 0
```

**first 회신 §1-5에서 예고하신 그대로입니다** — 「지금 미응시로 잡히던 사람은 실은
응시하다 중단된 사람」이라고 하셨고, 그 판정이 이미 배포에 나가 있습니다.
`EXPIRED` + `SESSION_INCOMPLETE`가 이제 `INTERRUPTED`로 제자리를 찾았습니다.

> 회신은 이 수정을 R1로 second에 두고 「뷰 `CASE` 순서라 앱 배포로 안 나간다」고
> 하셨는데, **실제로는 이미 반영돼 있습니다.** DB 쪽이 먼저 나간 것으로 보입니다.

### 남은 질문 — `value` 3·2·0은 무엇인가요

**상태만 바뀌었고 값은 그대로입니다.** 34차에서 여쭌 것이 이 부분입니다.

중단된 사람에게 `3 · 2 · 0`이 오는데, 이것이

- **지난 회차 값**이나 **계산 중간값**이면 → `null`로 주시는 편이 안전합니다
- **뜻이 있는 값**(중단 시점까지의 도달)이면 → 그게 무엇인지 알려 주시면 화면이 그에 맞게 그립니다

저희는 `status`를 값보다 먼저 보므로 **지금도 화면에는 안 그려집니다.**

⚠ **이번 배포로 같은 자리에 두 모양이 섞이게 됐습니다.** 결과가 없는 사람은
`value: null`로 오는데(1차 1팀 한유진 · §2), 중단된 사람은 값이 옵니다.

```
한유진(1차 1팀)  value: null  status: NOT_ATTENDED    ← 이번에 추가된 모양
윤지우(1차 6팀)  value: 3     status: INTERRUPTED     ← 값이 그대로
```

둘 다 「유효 결과가 없는 사람」인데 한쪽만 값이 있습니다. **`INTERRUPTED`도
`null`로 통일**해 주시는 것이 읽기 쉬울 것 같은데, 그 값에 뜻이 있다면 알려
주세요 — 그 경우 화면이 「중단 시점까지 3단」처럼 쓸 수도 있습니다.

### 재현

```bash
curl -s "$API/api/v0/cohorts/$COHORT/analytics/heatmap\
?projectId=043fa888-6bcf-5fc4-a26d-94d787fb1df6\
&assessmentRoundId=4fe959b8-825b-5ce4-adf3-a8f80632aef0\
&level=TRAINEE&classroomId=c8b9022b-cef0-4f5f-952f-04642058e326\
&teamId=18960e7e-ab55-5163-8342-e01fde5b2966" -H "Authorization: Bearer $TOKEN"
```

---

## 2. ✅ R2 · R3 — 전부 맞습니다

회신이 「배포 후 이 세 자리를 봐 달라」고 하신 그대로 쳤습니다. **셋 다 됐습니다.**

```
        전 (34차)                          지금
1차 TEAM  합 25 ≠ 26 · notInRound 없음   →  valid 24 · notAtt 1 · intr 1 · notInRound 0 → 합 26 ✅
          1팀 TRAINEE 4행 / 5명           →  5행 / 5명 ✅
2차 TEAM  팀행 [1 2 3 5 6] — 4팀 없음     →  [1팀 2팀 3팀 4팀 5팀 6팀] ✅ 4팀 복귀
          합 22 ≠ 26                      →  valid 20 · inv 1 · intr 5 · notInRound 0 → 합 26 ✅
4차 TEAM  합 25 ≠ 26                      →  valid 24 · notAtt 1 · intr 1 · notInRound 0 → 합 26 ✅
```

되살아난 행도 계약대로입니다 — **1차 1팀 한유진**입니다.

```jsonc
{ "rowName": "한유진", "cells": [{ "problemNo": 1, "value": null, "status": "NOT_ATTENDED" }] }
```

`value: null` + `status`, 그리고 **이름 순 제자리**(2팀 다음 4팀)까지 회신에 적어
주신 그대로입니다. `notInRoundCount`는 세 회차 모두 **0** — 명부와 격자가 완전히
맞는다는 뜻이라 하셨는데, 9기에서 0으로 예상하신 것도 맞았습니다.

### 저희 쪽

```ts
value: number | null        // 결과 없는 사람·팀 행
notInRoundCount?: number    // 합계 행에만
```

`isEmptyCell`이 `value === null`도 빈 칸으로 가르게 고쳤고, 스펙을 다시 받아
(`0942b6df1176` · 오퍼레이션 146 · 스키마 324) 생성기를 돌렸습니다.
**「N명은 이 회차 명단에 없습니다」 문구는 이제 지웠습니다** — `notInRoundCount`가
그 자리를 정확히 대신합니다.

> ⚠ `HeatmapCell`에 `initialLevel`·`comparisonLevel`·`delta` 셋도 함께 들어왔습니다
> (REVIEW 전용). 이번 요청과 무관해 보여 화면에서는 아직 안 씁니다 — 다시보기
> 비교에 쓰라는 것이면 알려 주세요.

---

## 2-2. ✅ R7② — 버전이 붙었습니다

```jsonc
// 전
"curriculumNames": ["spring_backend_v1.pdf", "spring-test-ops-v1.pdf"]
// 지금
"curriculumNames": ["spring_backend_v1.pdf v1", "spring-test-ops-v1.pdf v1"]
```

목록 어댑터가 이 배열을 그대로 그리므로 **화면에서 고칠 것이 없었습니다.**
말씀하신 대로 9기는 둘 다 `v1`이라 아직 구분은 안 드러납니다.

---

## 3. 🟠 R4 — 해소된 게 아니라 **회차가 바뀌었습니다**

6회차를 전수로 훑었습니다.

```
1차  resultStatus=READY    publishedAt=2026-03-25  total=0   items=0   ✅
2차  resultStatus=READY    publishedAt=2026-04-29  total=5   items=5   ✅
3차  resultStatus=READY    publishedAt=2026-06-03  total=8   items=8   ✅
4차  resultStatus=READY    publishedAt=2026-07-22  total=12  items=12  ✅
5차  resultStatus=READY    publishedAt=null        total=4   items=4   ← 34차의 그 자리, 해소
6차  resultStatus=PENDING  publishedAt=2026-08-16  total=1   items=1   🔴
```

**34차에 올린 5차는 `READY`가 됐습니다.** 그런데 6차가 같은 모순을 냅니다.

### 이번에는 모순이 하나 더 있습니다

```jsonc
"round": { "resultStatus": "PENDING", "publishedAt": "2026-08-16T10:40:38.795145Z" }
```

**발행 시각이 있는데 상태가 `PENDING`입니다.** 34차의 5차는 `publishedAt: null`이라
「아직 발행 전」으로 일관됐는데, 6차는 두 필드가 서로 반대를 말합니다.

반대로 **5차는 `READY`인데 `publishedAt`이 `null`**입니다 — 두 회차가 정확히
엇갈립니다.

| 회차 | resultStatus | publishedAt | 읽으면 |
|---|---|---|---|
| 5차 | `READY` | `null` | 발행됐다는데 시각이 없다 |
| 6차 | `PENDING` | `2026-08-16` | 발행 전이라는데 시각이 있다 |

### 화면이 무엇을 믿어야 하나요

지금은 `resultStatus`를 믿고 `PENDING`이면 개수·내역을 안 그립니다. 「머리글의
개수·내역을 되살리셔도 됩니다」라고 하셨는데 **아직 되살리지 않았습니다** —
6차에서 다시 자기모순이 되기 때문입니다.

**둘 중 어느 쪽이 진실인지**, 그리고 두 필드 중 화면이 무엇을 봐야 하는지
알려 주시면 그대로 맞추겠습니다.

---

## 4. ✅ R8 — **A안으로 가 주세요** (first §3-3 답신)

> *A: R8을 먼저 고치고 R7①을 그 위에 얹는다 / B: R7①을 지금 넣는다*

**A입니다.** 이유는 셋입니다.

1. **R7①은 급하지 않습니다.** 34차에 「급하지 않다」고 적은 그대로입니다 — 종료된
   회차의 면담 대기 인원은 MG-07에서 보조 정보고, 지금은 그 자리를 비워 두었습니다.
2. **MG-07 목록이 지금 가장 아픈 조회입니다.** 저희 실측으로 **7.0초**이고,
   대시보드(MG-01)를 붙이면서 **이 조회가 그 화면에서도 첫 단**이 됐습니다 —
   3단 직렬의 맨 앞이라 여기서 늦으면 전체가 늦습니다.
3. 찾아 주신 원인(**행마다 조회 4건**)이 맞다면, R7①을 얹는 것은 **가장 무거운
   조회를 5건으로 만드는 일**입니다.

> 저희 측정과도 맞습니다 — 34차에 올린 「고정 1888ms + 회차당 861ms」의 회차당
> 부분이 그 4건이라는 설명이 정확합니다.

**상세 조회(`GET /projects/{id}`)가 2.3초인 것은 별개**라고 하셨는데, 그쪽도
언젠가 봐 주시면 좋겠습니다 — MG-08 진입이 그만큼 걸립니다. 급하지 않습니다.

---

## 5. ⚠️ 저희가 측정 호스트를 바꿨습니다

이번 측정부터 **App Runner**(`mmbvymzj5k.ap-northeast-1.awsapprunner.com`)입니다.
그전까지는 Lambda(`xvdanr6m…lambda-url…on.aws`)로 재고 있었습니다.

**두 호스트는 「없는 것을 물었을 때」 답이 다릅니다.**

```
                        Lambda            App Runner
없는 교안 상세          무응답(25초 끊음)   404 · 0.69s  CURRICULUM_MATERIAL_NOT_FOUND
없는 교안 섹션          무응답(25초 끊음)   404 · 0.47s  CURRICULUM_MATERIAL_NOT_FOUND
없는 프로젝트 상세      무응답(25초 끊음)   404 · 0.47s  PROJECT_NOT_FOUND
없는 기수 인박스        무응답(25초 끊음)   404 · 0.47s  MANAGER_SCOPE_NOT_FOUND
아직 회차 없는 프로젝트  무응답(40초 · 2회)  404 · 0.6~1.0s  PROJECT_ROUND_NOT_CREATED
아직 안 만든 브리프      무응답(35초 끊음)   404 · 0.50s  INTERVIEW_BRIEF_NOT_CREATED
```

**정상 조회는 두 호스트가 같습니다**(200 · 응답 내용도 동일). 차이는 이것뿐입니다.

18차 R1·R7 · 21차 · 25차 R4 · 29차 R1 · 30차 R1 · 32차 R12로 **여러 차례 올렸던
「404가 무응답이다」가 전부 Lambda 쪽 현상**이었던 것으로 보입니다. 배포 문서
(`backend-apprunner-deploy.md`)가 App Runner를 정식으로 적어 두었기에 저희 프록시·
스펙 대상을 그쪽으로 옮겼고, **바꾸자마자 없는 교안 id가 30초 무응답 → 3.2초에
「교안을 찾을 수 없습니다」로 정확히 떨어집니다.**

**Lambda 쪽은 이제 안 씁니다.** 혹시 그쪽이 정식이라면 알려 주세요 — 되돌리겠습니다.

---

## 6. 저희 화면에서 정리한 것

배포 확인과 함께 **화면이 뺄셈으로 사유를 지어내던 자리**를 걷어냈습니다.

```
전   「4 / 5명」 + title「1명은 이 회차 명단에 없습니다」
     → 행 수와 memberCount를 화면이 빼서 만든 값이었습니다.
       왜 빠졌는지 응답에 없어서 그렇게 했습니다(34차 R2가 그 얘기였습니다).

후   「5명」 (+ notInRoundCount > 0이면 「· 명단 밖 N」)
     → 서버가 세는 값을 그대로 씁니다. 실데이터는 세 회차 모두 0이라 안 붙습니다.
```

`listedRows` prop도 같이 지웠습니다 — 이제 화면이 인원을 다시 세지 않습니다.

### 남은 확인 하나

**6차 1팀**은 회신 §1-4에서 「시드에 해당 회차 수행이 없어 확인 못 했다」고 하셨는데,
지금 6차는 격자에 팀이 하나도 안 뜹니다(응시 자체가 1건뿐입니다). 데이터가 쌓이면
다시 보겠습니다 — 급하지 않습니다.
