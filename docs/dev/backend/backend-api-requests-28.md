# 백엔드 API — 28차 요청 · 상태 재현용 테스트 데이터

> **26차 반영을 확인했습니다.** `NOT_STARTED`가 실계정에서 나오고, 응시 창 교집합은
> 화면에 반영했습니다(§6).
>
> 이번 요청은 **테스트 데이터**가 중심입니다. 교육생 3화면을 전수 점검하려고 상태 조합을
> 정리했는데, **지금 계정으로 재현할 수 있는 것이 절반도 안 됩니다.** 교육생 3화면을 전수 점검하려고 상태 조합을
> 정리했는데, **지금 계정으로 재현할 수 있는 것이 절반도 안 됩니다.** 화면은 다
> 만들어져 있지만 **한 번도 눈으로 본 적 없는 분기가 대부분**입니다.
>
> 그리고 점검하다 **저희 쪽 버그를 하나 찾아 고쳤습니다**(§5) — 같은 실패를 두 화면이
> 다르게 말하고 있었습니다.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | **상태 재현용 계정/데이터** — 지금 카드 상태 10종 중 **2종**만 볼 수 있습니다 | 🔴 검증이 막힙니다 |
| **R2** | 새 BFF 경로가 `/api/v0/api/v0/…`로 **중복**돼 있습니다 · 정본이 어느 쪽인가요 | 🟡 확인 |
| **R3** | 같은 회차를 홈은 `미응시`, 리포트는 `발행 전`이라고 합니다 | 🟡 확인 |

---

## 1. 🔴 R1 — 상태 대부분을 한 번도 못 봤습니다

교육생 3화면(TR-01·02·04)의 분기를 전부 뽑아 표로 만든 뒤, 계정 4개
(`trainee01` · `trainee-draft` · `trainee-failed` · `s058`)로 무엇이 재현되는지
세어 봤습니다.

| 축 | 재현됨 | 못 보는 것 |
|---|---|---|
| **TR-01 카드 상태** | **2 / 10** | `ANALYZING` · `ASSESSMENT_AVAILABLE` · `ASSESSMENT_IN_PROGRESS` · `ASSESSMENT_COMPLETED` · `REVIEW_REQUIRED` · `SUBMISSION_MISSED` · `ASSESSMENT_WINDOW_CLOSED` · `NO_ACTIVE_ROUND` |
| **TR-01 CTA** | **2 / 11** | `START_ASSESSMENT` · `START_REVIEW` · `VIEW_REPORT` · `WAIT_FOR_ANALYSIS` · `WAIT_FOR_REPORT` · `RESUME_ASSESSMENT` · `CONTACT_MANAGER` · `NONE` · `RESUBMIT_REPOSITORY` |
| **TR-01 경고 배지** | **1 / 4** | `SUBMISSION_DEADLINE_PASSED` · `ASSESSMENT_WINDOW_CLOSED` · `PROBLEM_NOT_GENERATED` |
| **TR-02 상태** | **2 / 6** | `ANALYZING` · `READY` · `LOCKED` · `SUBMISSION_CLOSED` |
| **TR-04 상태** | **4 / 7** | `PENDING_VISIBILITY` · `VOID_ATTEMPT` · `STOPPED` |
| **`failureCode`** | **1 / 15** | `UNSUPPORTED_LANGUAGE` 외 전부 |
| **`missingConceptCount` > 0** | **0** | 전 리포트가 `missing 0` |
| **개념 `asked: false`(문항 없음)** | **0** | 전 개념이 `asked: true` |

> `past[]`에는 `ASSESSMENT_COMPLETED` 등이 더 있지만 **카드가 아닙니다** — 지난 회차
> 목록의 한 줄 문구만 씁니다. 상태 카드(제목·진행바·안내·CTA)를 그리는 것은
> `current` 하나뿐이라, 실제로 눈으로 본 카드는 **2종**입니다.

### 왜 저희가 스스로 못 만드나

**제출 API가 막혀 있습니다.** 정상 흐름을 한 바퀴 돌리면 앞쪽 상태들이 자연히
생기는데, 그 첫 걸음이 닫혀 있습니다.

```
DRAFT → [제출] → ANALYZING → READY → [세션] → ASSESSMENT_COMPLETED → 리포트
         ↑ 여기가 사용 불가         ↑ 여기도 사용 불가
```

그래서 **데이터로 만들어 주시는 것 말고는 방법이 없습니다.**

### 요청 — 계정을 나눠서 심어 주세요

한 계정에 여러 상태를 넣을 수 없으니(회차마다 하나씩), **상태별로 계정을
나누는 쪽**이 확인이 빠릅니다. `trainee-draft`·`trainee-failed`를 만들어 주셨던
방식 그대로면 됩니다.

**① 제일 급한 것 — 정상 흐름 3종**

| 계정(예시) | `current` 상태 | 무엇을 확인하나 |
|---|---|---|
| `trainee-analyzing` | `ANALYZING` | 분석 중 카드 · CTA 비활성(*분석이 끝나면 열려요*) · TR-02 분석 중 |
| `trainee-ready` | `ASSESSMENT_AVAILABLE` | **응시 창 카운트다운** · *늦어도 HH:MM까지 끝나요* · TR-02 `READY`(재제출 가능) |
| `trainee-done` | `ASSESSMENT_COMPLETED` | 리포트 대기 카드 · TR-02 `LOCKED` · TR-04 `PENDING_PUBLISH` |

`ASSESSMENT_AVAILABLE`이 특히 중요합니다 — **26차 R1에서 확정한 응시 창 교집합**이
실제로 어느 값으로 그려지는지 그 상태에서만 볼 수 있습니다.

**② 그다음 — 놓친 경로 2종**

| 계정(예시) | 상태 | 확인 |
|---|---|---|
| `trainee-missed` | `SUBMISSION_MISSED` | 미제출 카드 · 경고 배지 `제출 마감 지남` · TR-02 `SUBMISSION_CLOSED` |
| `trainee-closed` | `ASSESSMENT_WINDOW_CLOSED` | 미응시 카드 · 배지 `응시 창 닫힘` · CTA 없음(`NONE`) |

**③ 리포트 쪽 — 기존 계정에 회차만 더해도 됩니다**

```
PENDING_VISIBILITY   매니저가 공개 범위를 안 정한 리포트
VOID_ATTEMPT         무효 응시
STOPPED              중단
missingConceptCount > 0   AI 생성이 일부 실패한 리포트
asked: false 개념        코드에 그 개념이 없어 문항이 안 만들어진 경우
```

**뒤의 둘이 특히 필요합니다.** 23차 Q1에서 *"생성 실패는 배열에서 빠지고
`missingConceptCount`로 센다"* 고 알려 주셨는데, 그 화면을 **한 번도 못 봤습니다.**
`asked: false`(문항 없음)와 나란히 놓았을 때 학생이 둘을 구분할 수 있는지가
저희가 확인해야 할 핵심입니다 — 하나는 정상이고 하나는 장애입니다.

**④ 있으면 좋은 것**

- **`NO_ACTIVE_ROUND`** — 기수에 진행 중인 회차가 없는 계정(합성 카드)
- **`PROBLEM_NOT_GENERATED`** 경고가 붙은 회차
- **경고 배지 2개 이상이 동시에** 붙는 회차 — 배열이라 겹칠 수 있게 만들었는데
  겹친 모습을 못 봤습니다
- **`failureCode` 다른 값** — 지금 `UNSUPPORTED_LANGUAGE` 하나뿐입니다.
  ZIP 계열 몇 개(`EMPTY_CODE` · `ARCHIVE_INVALID` · `GIT_LOG_MISSING`)만 더 있으면
  충분합니다

> **한꺼번에 다 주시지 않아도 됩니다.** ①만 있어도 정상 흐름 전체를 눈으로 확인할
> 수 있어서, 거기부터 주시면 그걸로 먼저 점검하겠습니다.

> 세션 API(TR-03)가 열리면 저희가 직접 응시해서 뒤쪽 상태를 만들 수 있게 됩니다.
> 그때까지의 임시 요청입니다.

---

## 2. 🟡 R2 — 새 BFF 경로가 중복돼 있습니다

이번 배포에 오퍼레이션이 12개 늘었는데, 그중 하나가 교육생 홈용입니다.

```
GET /api/v0/api/v0/bff/me/current-round      operationId: findCurrentRound
        ^^^^^^^^ 여기가 두 번 들어가 있습니다
```

**`/api/v0/`가 중복**입니다. 다른 오퍼레이션은 전부 한 번만 붙습니다.

### 그리고 저희가 쓰는 것과 겹칩니다

설명문에 *"TR-01(교육생 홈)이 보여줄 상태 하나를 조회한다"* 고 적혀 있는데, 저희는
지금 `GET /api/v0/assessment-rounds`로 그 화면을 그리고 있습니다.

| | 응답 | 무엇이 오나 |
|---|---|---|
| `getMyAssessmentRounds` (저희가 쓰는 것) | `AssessmentRoundsResponse` | `membership` + `current` + `upcoming[]` + `past[]` |
| `findCurrentRound` (새것) | `CurrentRoundResponse` | `current` 하나 |

**저희 화면은 지난 회차 목록도 그려야 해서** 지금 것을 계속 쓰는 편이 맞다고 보고
있습니다. 다만 **같은 화면을 위한 API가 둘이 된 상태**라 확인이 필요합니다.

### 요청

- **경로 중복**을 고쳐 주세요
- **어느 쪽이 정본인가요?** 새것으로 옮겨야 한다면 `past[]`·`upcoming[]`을 어디서
  받아야 하는지 알려 주세요. 지금 것을 계속 쓰면 되는 것이면 그대로 두겠습니다

> ⚠️ 그리고 **설명문의 상태 값 집합이 실제 스키마와 다릅니다.**
> 설명에는 `SUBMISSION_MISSING` · `SUBMISSION_DEADLINE_PASSED` · `COMPLETED_AWAITING_REPORT` ·
> `REVIEW_AVAILABLE`로 적혀 있는데, 실제 `representativeStatus`는
> `TraineeRepresentativeStatus`(`SUBMISSION_REQUIRED` · `SUBMISSION_MISSED` ·
> `ASSESSMENT_COMPLETED` · `REVIEW_REQUIRED` …)를 가리킵니다. 참고하라고 적힌
> `CurrentRoundStatus` 스키마는 **존재하지 않습니다.** 설명문이 낡은 것으로 보입니다.

---

## 3. 🟡 R3 — 같은 회차를 두 화면이 다르게 말합니다

`trainee01`의 **미니프로젝트 5차**입니다. 회차 ID가 같은데 두 API가 다른 상태를 줍니다.

```
GET /assessment-rounds  past[]   representativeStatus: ASSESSMENT_WINDOW_CLOSED
GET /reports            5차       status: PENDING_PUBLISH  (publishAfter 2026-08-16)
```

화면에서는 이렇게 보입니다.

| 화면 | 문구 |
|---|---|
| 홈 · 지난 회차 | **미응시** |
| 리포트 | **아직 발행 전이에요** · 발행 예정 08-16 이후 |

**두 말이 서로를 부정합니다.** 응시하지 않았다면 발행할 리포트가 없고, 발행을
기다린다면 응시를 한 것입니다.

### 어느 쪽이 사실인가요

5차는 24차 §7에서 알려 주신 **개인 응시 창이 회차 창보다 앞선 회차**입니다
(개인 창 7/31~8/3 · 회차 창 8/11~8/14). 그래서 이렇게 짐작하고 있습니다.

- 실제로는 **응시하지 못한 채 개인 창이 닫혔다** → 홈이 맞고, 리포트가 `NOT_ATTEMPTED`여야 합니다
- 리포트 판정이 **회차 종료를 기준으로** 해서 아직 `PENDING_PUBLISH`에 머물러 있다
  → 회차가 끝나면 `NOT_ATTEMPTED`로 바뀔 수도 있습니다

**후자라면 그대로 두셔도 됩니다** — 시간이 지나면 맞아집니다. 다만 그 사이 학생은
*"미응시인데 리포트를 기다리라"* 는 화면을 봅니다.

**어느 쪽인지만 알려 주세요.** 26차 A1에서 `NOT_STARTED`를 나눠 주셨을 때와 같은
종류의 문제라, 판정 기준만 맞추면 풀릴 것으로 봅니다.

---

## 4. 🟢 곁들여 — 주신 명단으로는 세션을 테스트할 수 없습니다

세션 테스트용으로 6차 참여 교육생 명단(211명)을 받았습니다. `progress_state`로
세어 봤습니다.

```
미제출               201명
분석실패                9명
제출(수행 미생성)         1명   ← trainee-failed
─────────────────────────
분석완료 · 응시완료        0명   ❌
```

**분석이 끝난 사람이 한 명도 없습니다.** 세션은 분석이 성공해야 열리므로, 이 명단의
어느 계정으로도 세션 화면에 들어갈 수 없습니다. 세션 API 8개도 아직 `사용 불가`입니다.

R1의 ① `trainee-ready`(`ASSESSMENT_AVAILABLE`) 계정이 있으면 그 문제까지 함께
풀립니다 — **분석이 끝난 계정 하나가 홈·제출·세션 셋을 동시에 열어 줍니다.**

---

## 5. 저희 쪽에서 찾아 고친 것 — 같은 실패를 두 화면이 다르게 말했습니다

`trainee-failed` 계정을 점검하다 찾았습니다. **저희 버그였습니다.**

```
그 계정   ZIP으로 제출 · 실패 코드 UNSUPPORTED_LANGUAGE(분석할 수 없는 언어)

TR-02     "아직 분석할 수 없는 언어예요"                        ← 맞음
TR-01     "저장소 주소와 브랜치를 확인해 주세요"                 ← 틀림
          "조직 밖 저장소라면 ZIP으로 올리면 됩니다"             ← 틀림
```

홈 안내가 **GitHub 제출을 전제로 하드코딩**돼 있어서, ZIP으로 낸 학생에게 있지도
않은 저장소를 확인하라고 말하고 있었습니다.

**홈은 사유를 말하지 않도록 고쳤습니다** — 수단 중립 문구로 바꾸고 정확한 사유는
제출 화면이 띄웁니다. `analysisFailureCode`(15종) 문구표를 홈에도 복제하면 같은
코드가 두 화면에서 갈릴 수 있어서, **한 곳에만 두는 쪽**을 택했습니다.

> 그래서 `CurrentRoundResponse.analysisFailureCode`를 화면이 쓰지 않게 됐습니다.
> **계약을 바꿔 달라는 뜻은 아닙니다** — 다른 화면이 쓸 수 있으니 그대로 두세요.

### 곁들여 — `TraineeTimelineEvent.type`은 저희 검사기 오탐이었습니다

timeline API를 열어 주신 뒤 저희 `api:check`가 error 1건을 냈는데, **저희 쪽 문제라
검사기를 고쳤습니다.** 그 필드는 `required`이고 값이 5종이라 `null`이 될 수 없고,
설명문의 `null`은 자기가 아니라 **옆 블록들**을 가리키고 있었습니다.

```
"유형마다 아래 블록 중 하나만 채워진다 — 나머지는 `null`이거나 빈 배열이다."
                                        ^^^^^^ 이 필드가 아니라 형제 필드 이야기
```

26차 R2(`TraineeRosterResponse.rounds`) 때 *"이웃 필드를 설명하던 문장이 걸렸다"* 고
알려 주신 것과 **같은 유형**입니다. 그때는 설명문을 고쳐 주셨는데, **같은 유형이 두 번
나온 것은 저희 검사기가 부족하다는 뜻**이라 이번에는 검사기를 고쳤습니다.

**설명문은 그대로 두셔도 됩니다.** 앞으로 "나머지는 null" 같은 문장이 있어도 안 걸립니다.

---

## 6. 26차 반영 확인 ✅

스펙을 다시 받아(`sha256 622f0895…`) 대조하고 실계정 응답까지 확인했습니다.

| 26차 | 결과 |
|---|---|
| **R2** `rounds` | ✅ 설명문 수정으로 `api:check` **error 1건 → 0건**. CI가 풀렸습니다 |
| **A1** `NOT_STARTED` | ✅ enum에 신설. `trainee01`의 6차가 실제로 `NOT_STARTED`로 옵니다 |
| **R1** 응시 창 | ✅ **교집합**으로 확정. `assessmentCloseAt` 설명의 공식까지 확인했습니다 |

**화면에 반영한 것**

- **`NOT_STARTED` 분기 신설** — *"아직 시작하지 않았어요 · 아직 시간이 있어요"*.
  매니저 안내는 `NOT_ATTEMPTED`에만 붙입니다(마감 전 학생에게 그 문장을 주면 없는
  일을 사고로 만듭니다). 레일 문구도 `시작 전` / `미응시`로 갈랐습니다
- **응시 창 교집합** — 카운트다운이 `min(개인 창, 회차 창)`을 씁니다. 늦은 쪽을
  가리키면 화면이 말하는 마감과 서버가 막는 시점이 갈립니다

**§4에서 개인 응시 창을 채우는 코드가 없었다는 것을 찾아 주신 것**이 이번 회신에서
가장 컸습니다. 저희는 그 값을 읽기만 해서 비어 있는 줄 몰랐고, 세션 API가 열린
뒤에야 *"분석이 끝났는데 응시 버튼이 안 나온다"* 로 만났을 것입니다. R1 규칙을
정하다 그 코드를 찾아내신 경로도 그대로 남겨 주셔서, 저희가 같은 값을 어떻게
쓰고 있는지 다시 점검할 수 있었습니다.

---

## 7. 저희 쪽 상태

```
TR-01 홈       ✅ 연동 완료 — 카드 상태 2/10만 눈으로 확인
TR-02 제출     ✅ 연동 완료 — 상태 2/6만 확인 · 제출 버튼은 막아 둠
TR-04 리포트   ✅ 연동 완료 — 상태 4/7 확인
TR-03 세션     ⏳ API 8개 사용 불가 — 목 유지
```

**화면은 다 만들어져 커밋·PR까지 올렸습니다.** 남은 것은 *"만들어 둔 분기가 실제로
맞게 그려지는가"* 인데, 그것을 확인할 데이터가 없습니다.

**R1의 ①(정상 흐름 3종)만 주셔도** 나머지를 한 번에 점검하고 결과를 알려 드리겠습니다.
