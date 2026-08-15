# 교육생 화면 — 상태 매트릭스 (TR-01 · TR-02 · TR-04)

> **무엇을 위한 문서인가.** 세 화면이 서버 상태에 따라 **무엇을 그려야 하는지**를
> 한 곳에 모은다. 지금 dev 데이터로는 상태 대부분을 재현할 수 없어서(§4), 무엇이
> 확인됐고 무엇이 미확인인지를 이 표로 관리한다.
>
> 판정은 전부 서버가 한다 — 화면은 코드를 문장으로 옮기기만 한다(api-boundary §1-②).
> 그래서 이 표의 왼쪽 열은 **서버가 주는 값**이고 오른쪽은 **화면이 내는 결과**다.

---

## 1. TR-01 홈 — `representativeStatus` 10종

카드는 **`current` 하나만** 그린다. `past[]`는 아래쪽 "지난 회차" 목록에 한 줄씩만 쓴다.

| 상태 | 제목 | 진행바 | 남은시간 스트립 | 기본 CTA |
|---|---|---|---|---|
| `SUBMISSION_REQUIRED` | 코드를 제출할 차례예요 | ①now | 제출 마감까지(warn) | 코드 제출 → TR-02 |
| `ANALYZING` | 코드 분석이 진행 중이에요 | ①done ②now | — | 이해도 확인(비활성) · *분석이 끝나면 열려요* |
| `ANALYSIS_FAILED` | 코드를 분석하지 못했어요 | ①done ②now | 제출 마감까지(stop) | ZIP으로 다시 제출 → TR-02 |
| `ASSESSMENT_AVAILABLE` | 이해도 확인을 시작할 차례예요 | ①②done ③now | **응시 창 마감까지(go)** | 이해도 확인 시작하기 → TR-03 · *늦어도 HH:MM까지 끝나요* |
| `ASSESSMENT_IN_PROGRESS` | 이해도 확인이 진행 중이에요 | ①②done ③now | — | 이해도 확인(**비활성**) · *진행 중인 응시가 있어요 — 매니저에게* |
| `ASSESSMENT_COMPLETED` | 리포트를 기다리는 중이에요 | ①②③done ④now | — | 내 리포트(비활성) · *발행되면 알려드릴게요* |
| `REVIEW_REQUIRED` | **다시 볼 수 있는 문제가 N개 있어요** | ①②③done ④now | — | 다시 보기 → TR-03(`?retry=1`) |
| `SUBMISSION_MISSED` | 제출 기한이 지났어요 | — | — | (`CONTACT_MANAGER`면 버튼 없음) |
| `ASSESSMENT_WINDOW_CLOSED` | 응시 기한이 지났어요 | — | — | (`NONE`이면 버튼 없음) |
| `NO_ACTIVE_ROUND` | 지금은 예정된 일정이 없어요 | — | — | 없음 |

### 축이 셋 더 있다 — 상태와 독립이다

**① `defaultActionCode` 11종이 CTA를 정한다.** 화면이 상태에서 CTA를 유추하지 않는다.

```
SUBMIT_CODE · RESUBMIT_ZIP · RESUBMIT_REPOSITORY   → TR-02로 간다
START_ASSESSMENT · START_REVIEW                    → TR-03으로 간다
VIEW_REPORT                                        → TR-04로 간다(reportId 필요)
WAIT_FOR_ANALYSIS · WAIT_FOR_REPORT · RESUME_ASSESSMENT → 버튼은 있고 비활성
CONTACT_MANAGER · NONE                             → 버튼 자체가 없다
```

> ⚠️ **`RESUME_ASSESSMENT`는 일부러 경로를 안 준다.** 서버는 재개를 상정하지만 이
> 제품 규칙은 "한 번에 끝낸다"이고, 이 상태는 네트워크가 끊겨 멈춘 사고 대비다.
> 버튼을 열면 *"시작하면 중간에 나갈 수 없어요"* 약속이 무너진다.

**② `warningCodes[]` 4종 — 배열이라 동시에 여러 개가 온다.**

```
SUBMISSION_DEADLINE_PASSED  제출 마감 지남
ANALYSIS_FAILED             분석 실패
ASSESSMENT_WINDOW_CLOSED    응시 창 닫힘
PROBLEM_NOT_GENERATED       문항 일부 미생성
```

**③ `actionUnavailableReasonCode` — 있으면 CTA 옆 설명을 덮어쓴다.**
서버가 막은 이유가 우리가 지어낸 설명보다 정확하므로 우선한다.

### 응시 창은 두 값의 교집합이다 (26차 R1)

```
닫힘 = min(assessmentCloseAt, roundAssessmentDueAt)
```
카운트다운이 늦은 쪽을 가리키면 **화면이 말하는 마감과 서버가 막는 시점이 갈린다.**

---

## 2. TR-02 코드 제출 — `status` 6종

| 상태 | 배너 | 제출 폼 | 제출한 내용 카드 | 우측 상단 |
|---|---|---|---|---|
| `DRAFT` | **없음**(폼만) | ⭕ | — | 제출 마감 |
| `ANALYZING` | 제출됐어요, 분석 중(inline) | — | ⭕ 홈으로 | 제출 완료 시각 |
| `READY` | 분석이 끝났어요(card·success) | 재제출 누르면 ⭕ | ⭕ 다시 제출·홈으로 | 분석 완료 시각 |
| `LOCKED` | 이제 다시 제출할 수 없어요(inline·warn) | — | ⭕ 홈으로 | 분석 완료 시각 |
| `ANALYSIS_FAILED` | 코드를 분석하지 못했어요(card·danger) | ⭕ | **⭕ 폼 위에** | 제출 마감 |
| `SUBMISSION_CLOSED` | 없음 | — | — | 제출 마감 · 지남 |

### 제출한 내용 카드는 수단에 따라 갈린다 (23차 R1 `oneOf`)

```
GitHub  →  저장소 · 브랜치      (repoUrl이 있으면)
ZIP     →  파일 · 크기          (fileName이 있으면)
공통    →  제출 수단 · 제출 시각 · 최근 커밋(분석 후에만)
```

### 지금 제출 버튼이 막혀 있다

`POST /submissions/zip`이 `사용 불가`(AI 서버, 8/23 재개 예정)라 **버튼을 비활성**으로
두고 사유를 띄운다. 재개일이 제출 마감보다 뒤면 문구가 달라진다.

### 🔴 `failureCode` 15종 중 문구는 9종만 있다

```
있음(ZIP 계열 9)  EMPTY_CODE · ARCHIVE_INVALID · FILE_TOO_LARGE · GIT_LOG_MISSING ·
                  PROHIBITED_FILE · UNSUPPORTED_LANGUAGE · ANALYSIS_TIMEOUT ·
                  TEMPORARY_ERROR · MODEL_ERROR
없음(GitHub 계열 6) SOURCE_UNREACHABLE · INVALID_REPOSITORY_URL · REPO_NOT_FOUND ·
                  REPOSITORY_ACCESS_DENIED · BRANCH_NOT_FOUND · UNSUPPORTED_HOST
```

없는 6종은 **전부 GitHub 제출에서만 나온다.** 지금은 ZIP만 열려 있어 나올 수 없고,
fallback 문구가 있어 깨지지도 않는다. **GitHub 제출 폼을 붙일 때 함께 채운다.**

---

## 3. TR-04 내 리포트 — `status` 7종

| 상태 | 본문 | 레일 문구 |
|---|---|---|
| `PUBLISHED` | 개념 카드 목록(§3-1) | 재시험 상태에 따라 |
| `PENDING_PUBLISH` | 아직 발행 전이에요 · 발행 예정 M-D 이후 | 응시 완료 |
| `PENDING_VISIBILITY` | 아직 공개되지 않았어요 · 매니저가 정하면 | 응시 완료 |
| `NOT_STARTED` | **아직 시작하지 않았어요** · 아직 시간이 있어요 | 시작 전 |
| `NOT_ATTEMPTED` | 이 회차는 리포트가 없어요 · **매니저에게 알려 주세요** | 미응시 |
| `VOID_ATTEMPT` | 응시 기록을 확인하고 있어요(warning) | 확인 필요 |
| `STOPPED` | 답한 데까지만 기록됐어요(warning) | 중단 |

> **`NOT_STARTED`와 `NOT_ATTEMPTED`는 정반대다**(26차 A1). 제출 마감이 가르는 축이고,
> 매니저 안내는 **뒤에만** 붙는다 — 마감 전 학생에게 그 문장을 주면 없는 일을 사고로 만든다.

### 3-1. `PUBLISHED` 안에서 축이 넷 더 있다

| 축 | 값 | 화면 |
|---|---|---|
| `scope` | `SUMMARY` | **리포트 머리에 잠금 배너 1개** — 개념마다 반복하지 않는다 |
| | `FULL` | 잠금 배너 없음 · 문답·해설이 온다 |
| `retryState` | `PENDING` + 대상>0 | 다시 볼 수 있는 문제가 N개 있어요 + [다시 보기] |
| | `PENDING` + 대상=0 | **배너를 접는다**(24차 R1 — 서버 모순 방어) |
| | `DONE` | 다시 보기를 마쳤어요 · 성적에 반영되지 않아요 |
| | `NONE` | 배너 없음 |
| `missingConceptCount` | > 0 | 개념 N개의 결과를 만들지 못했어요(장애 — 문항 없음과 다르다) |
| 개념 `asked` | `false` | 문항 없음 — 박스 없이 각주로, 빈 원 핀 |
| | `true` | 도달 단계 배지 + 서술 + 교안 + (FULL이면)문답 |

### 3-2. 개념 카드 안

```
level 0~4       배지 색·문구 (0=설명을 듣지 못했어요 … 4=언제 깨지는지까지)
comparedReach   after > level 이면 "다시 봤을 때 N단" 한 줄 (배지는 원점수 유지)
curriculumRef   교안 위치 알약(info 톤)
qa[]            [내 답변 N개] 토글 — FULL일 때만 온다
explain[]       "어디서 막혔나" — 재시험 대상 + FULL + retryState≠PENDING 일 때만 (26차 R2)
```

---

## 4. 지금 재현할 수 있는 것 — **커버리지가 낮다**

계정 4개(`trainee01` · `trainee-draft` · `trainee-failed` · `s058`)로 확인한 결과다.

| 축 | 커버 | 못 보는 것 |
|---|---|---|
| **TR-01 카드 상태** | **2/10** | `ANALYZING` `ASSESSMENT_AVAILABLE` `ASSESSMENT_IN_PROGRESS` `ASSESSMENT_COMPLETED` `REVIEW_REQUIRED` `SUBMISSION_MISSED` `ASSESSMENT_WINDOW_CLOSED` `NO_ACTIVE_ROUND` |
| **TR-01 CTA** | **2/11** | `START_ASSESSMENT` `START_REVIEW` `VIEW_REPORT` `WAIT_FOR_*` `RESUME_ASSESSMENT` `CONTACT_MANAGER` `NONE` `RESUBMIT_REPOSITORY` |
| **TR-01 경고 배지** | **1/4** | `SUBMISSION_DEADLINE_PASSED` `ASSESSMENT_WINDOW_CLOSED` `PROBLEM_NOT_GENERATED` |
| **TR-02 상태** | **2/6** | `ANALYZING` `READY` `LOCKED` `SUBMISSION_CLOSED` |
| **TR-04 상태** | **4/7** | `PENDING_VISIBILITY` `VOID_ATTEMPT` `STOPPED` |
| **TR-04 `scope`** | 2/2 ✅ | — |
| **TR-04 `retryState`** | 3/3 ✅ | — |
| **`failureCode`** | 1/15 | `UNSUPPORTED_LANGUAGE`만 |
| **`missingConceptCount` > 0** | 0 | 전 리포트가 `missing 0` |
| **`asked: false`(문항 없음)** | 0 | 전 개념이 `asked: true` |

**`past[]`에는 더 있지만 카드가 아니다** — 지난 회차 목록의 한 줄 문구만 쓴다
(`ASSESSMENT_COMPLETED` · `REVIEW_REQUIRED` · `ASSESSMENT_WINDOW_CLOSED`).

### 왜 스스로 못 만드나

**제출 API가 막혀 있다.** 정상 흐름(`DRAFT → 제출 → ANALYZING → READY → 세션 → …`)을
한 바퀴 돌릴 수 없어서, 앞 상태들은 **백엔드가 데이터로 만들어 줘야** 확인할 수 있다.
→ 28차로 요청한다.
