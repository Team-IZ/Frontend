# MG-01 매니저 대시보드 — 연동 가능성 조사

> **아직 목이다.** 매니저 화면 여덟 중 이 화면만 실서버에 안 붙었다.
> 붙일 수 있는지 배포본으로 확인한 기록이고, **결론은 「지금은 못 붙인다」**다.
>
> 조사 — 2026-08-18 · 실서버 · `manager@example.com`(9기 · C반) ·
> 스펙 `sha256 63512bad30a1`

## 1. 이 화면이 무엇인가

지표판이 아니라 **인박스**다 — 「오늘 누구부터 처리할지」 한 목록이고, 처리한 것은
목록에서 빠진다. KPI 카드 그리드가 없는 이유가 그것이다(정의서 §1).

```
행 6종    ABSENT(미응시) · RETRY(다시 보기) · INVALID(무효)
          INTERVIEW(면담 대기) · UNSUBMITTED(미제출) · ANALYSIS_FAILED(분석 실패)
밴드 1~4   급한 순 — 사용자가 못 고른다(MG-03 정렬과 같은 원칙)
체크       매니저가 「처리했다」고 표시 → 그 행이 목록에서 빠진다
스코프     「지난 방문 이후」 / 「전체」
```

## 2. 조사 결과 — 6종 중 **3.5종**

| 인박스 행 | 서버 | 판정 |
|---|---|---|
| UNSUBMITTED | `GET /projects` → `actionItems[type=UNSUBMITTED_TEAMS]` | ✅ 실데이터 확인(6차 C반 2팀) |
| ANALYSIS_FAILED | 같은 곳 `[type=ANALYSIS_FAILED_TEAMS]` | ✅ 확인(2차 C반 1팀) |
| INTERVIEW | `GET /interviews` `status=PLANNED` | ⚠ **회차마다 따로** 불러야 한다 |
| INVALID | `signals` `reasonCode=INVALID_ATTEMPT` | ⚠ 1건뿐 · 무효 확인 API가 `사용 불가` |
| **ABSENT** | — | 🔴 행 단위로 못 만든다 |
| **RETRY** | — | 🔴 32차 R14②로 「오퍼레이션 없음」 확답 |
| **체크** | — | 🔴 쓰기 자리가 없다 |

### 🔴 미응시를 행으로 못 만든다

```jsonc
// GET /cohorts/{9기}/trainees?size=100   (명부)
roundPrimaryStatusCode → { "(null)": 25, "CONTRIBUTION_UNDERSTANDING_GAP": 1 }
                          NOT_ATTENDED 0건

// GET /cohorts/{9기}/analytics/signals
reasonCode → { PERSISTENT_LOW 25, LOW_PARTICIPATION 2, STAGE_DECLINE 2,
               INVALID_ATTEMPT 1, CONTRIBUTION_UNDERSTANDING_GAP 1 }
                          미응시 코드 없음
```

**「지금 기수에 미응시가 없다」인지 「그 상태를 이 조회가 안 싣는다」인지 화면이
가릴 수 없다.** 히트맵에는 `NOT_ATTENDED` 셀이 실제로 있다(34차 R1이 그 얘기다).

### 🔴 「체크」를 저장할 자리가 없다

스웨거 전수로 봐도 `signals`는 `GET` 하나뿐이고 `status`는 읽기 전용이다.
지금 목은 이 상태를 브라우저 안에서만 들고 있어 **새로 고치면 처리 표시가 사라진다.**

**인박스는 처리한 행이 빠지는 것이 동작의 전부**라, 이게 없으면 화면의 전제가 무너진다.

### ⚠ 세 조회를 화면이 합쳐야 하고 8.3초

```
명부 6.1초 · 면담 2.1초 · 프로젝트 8.3초   →  병렬로도 8.3초
```

면담은 회차를 생략하면 **이번 회차만** 온다(1건). 전 회차의 대기 면담을 보려면
회차 수만큼 더 부른다 — 9기는 8회차다.

```
1차   면담  0건 · 대기 0
4차   면담 12건 · 대기 8      ← 인박스에 나와야 할 것이 여기 있다
6차   면담  1건 · 대기 1
```

## 3. 판정 — **요청서가 먼저다**

`screen-hardening.md` §「발견 하나를 처리하는 법」의 6단으로 내려가면:

```
① 우리 코드로 되나          ✗ 미응시·체크가 서버에 없다
② 이미 있는 응답에 값이 있나  ✗ 명부·signals·risk-trainees 전부 확인했다
③ 스웨거에 다른 API가 있나   ✗ 145 오퍼레이션 전수 확인 — signal 쓰기 0건
④ 문서에 답이 있나          △ RETRY는 32차 R14②로 이미 답을 받았다(없다)
⑤ 다른 레포 영역인가        ✗ 매니저 도메인이다
──────────────────────────────────────
⑥ 백엔드 요청서            → 34차 R9
```

**지금 붙이면 `RETRY`처럼 지어낸 것을 또 만들게 된다.** MG-07은 「필드가 거의 맞는」
경우라 바로 붙였지만, 이 화면은 전제가 절반쯤 없다.

## 4. 34차 R9로 물은 것

셋 중 어느 쪽인지만 답을 받으면 바로 붙인다.

| 안 | 내용 |
|---|---|
| **A**(선호) | 인박스 전용 조회 하나 — 6종을 한 응답으로, 밴드까지 서버가 |
| **B** | 지금 셋을 쓰되 **미응시 행**과 **체크 쓰기**만 추가 |
| **C** | 인박스를 접는다 — 되는 3종만, 체크 없이 |

## 5. 그때까지

**목 그대로 둔다.** 화면에 보이는 숫자가 실제와 다르다(7기 · A·B·C반 75명 등) —
연동 대기 중인 화면이라 하드닝도 아직 안 한다.

---

# 정정 — 2026-08-18 재조사 (App Runner 배포본)

> **위 §2·§3의 판정이 틀렸다.** 아래가 실측으로 확인된 사실이다.

## 무엇이 틀렸나

| 위에 적힌 것 | 실제 |
|---|---|
| 「미응시를 행 단위로 못 만든다」 | **만들 수 있다.** 명부를 **회차 없이** 쳐서 0건이 나온 것이다 — 생략하면 서버가 이번 회차(6차)를 고르고 6차엔 실제로 0건이다. `?assessmentRoundId=`를 넣으면 **23건**이 이름·반·회차·`roundTerminalAt`까지 온다 |
| 「스웨거 145 오퍼레이션 전수 확인」 | 실제로 훑은 것은 **signals 쓰기**뿐이다. `GET /cohorts/{id}/notifications/inbox`가 **2026-08-13부터 스펙에 있었는데** 못 찾았다 |
| 조사 대상 API 셋(명부·signals·risk-trainees) | `class-progress`(반별 제출·분석·응시)를 안 봤다 — `notAttendedCount`·`sessionIncompleteCount`·`failedTeams[]`가 여기 있다 |

## 회차별 응시 1층 코드 (9기 C반 26명)

```
1차 {NOT_ATTENDED 1, SESSION_INCOMPLETE 1}      4차 {NOT_ATTENDED 1, SESSION_INCOMPLETE 1}
2차 {SESSION_INCOMPLETE 1}                      5차 {NOT_ATTENDED 9, SESSION_INCOMPLETE 9}
3차 {}                                          6차 {}
                                    → 23건, 전부 이름·반·마감시각까지 온다
```

## 인박스 전용 조회(R9)는 살아 있지 않다

`GET …/notifications/inbox`가 **모든 정상 호출에 409 `DATA_INTEGRITY_VIOLATION`**을 낸다.
Lambda·App Runner 두 호스트 모두 같다. 인증·스코프·인자 문제가 아니다:

```
size=0 · size=101        → 400 VALIDATION_FAILED   검증은 돌고 정상 인자는 통과한다
since=2099-01-01         → 409                     결과가 빈 창인데도 터진다(데이터 양 아님)
같은 토큰·같은 기수의 명부·signals·projects → 전부 200
```

GET이 `DATA_INTEGRITY_VIOLATION`을 내는 경로는 사실상 쿼리가 터지는 것뿐이다.
스펙은 `x-readiness: available`이라고 적혀 있다.

⚠ **「스펙이 안 바뀌었으니 미배포」는 근거가 안 된다** — 그들의 수정은 리포지토리 SQL이라
OpenAPI에 드러나지 않는다. 한 번 그렇게 오판했다.

## 지금 붙는 것 — 6종 중 4종 + 신규 1종

| 행 | 원천 | 실데이터 |
|---|---|---|
| ABSENT | 명부 `roundPrimaryStatusCode=NOT_ATTENDED` + `roundTerminalAt` | 12건 |
| 응시 중단(신규) | 같은 곳 `SESSION_INCOMPLETE` — **목에 없는 유형이다** | 11건 |
| INTERVIEW | `/interviews/rounds` + `/interviews?assessmentRoundId=` `PLANNED` | 25건(2~6차) |
| UNSUBMITTED | `/projects` `actionItems[UNSUBMITTED_TEAMS]` | 1건 — **반 단위 `teamCount`뿐, 팀 이름이 없다** |
| ANALYSIS_FAILED | `class-progress` `classes[].failedTeams[]` | 1건 — 이쪽엔 팀 이름이 있다 |
| INVALID | signals `INVALID_ATTEMPT` | 1건 — `summary`가 **JSON 문자열**이다 |
| RETRY | 없다(32차 R14②) | — |
| 체크(쓰기) | 없다 · `POST /reminders`는 `unavailable` | — |
