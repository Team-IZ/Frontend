# MG-08 프로젝트 상세 — 상황 기록

실계정(이담 · 매니저 · 9기 C반)으로 `미니프로젝트 6차`
(`073c7e8b-dc69-5a8f-a658-5d872a45975f`)를 띄워 확인했다.

## 붙인 것

| 탭 | 오퍼레이션 | 확인 |
|---|---|---|
| 헤더 | `findProject` | ✅ 이름·상태·교안·검증 개념 3건·제출 마감 |
| 헤더 담당 반 | `findProjectClassProgress` | ✅ `C반 · 26명` |
| 팀 | `findTeams` + 생성·수정·배정·해제·확정·다시 열기·자동 배분 | ✅ 7팀 26명 |
| 제출 현황 | `findProjectSubmissionStatus` + `findProjectClassProgress` | ✅ 빈 상태(제출 잠김) |
| 결과 | `findProjectEvaluationSummary` | ✅ 응시 18 · 불합격 4 · 개념별 3행 |
| 개인 결과 | `findTraineeEvaluationDetail` | ✅ 3단/2단/1단 · 축 사다리 · 채점 근거 |

## 렌더에서 잡은 것

### 🔴 팀 목록이 뒤섞여 온다 — 화면이 정렬한다
`findTeams`가 `7 · 2 · 5 · 1 · 4 · 6 · 3팀` 순으로 줬다. 스펙에 순서 약속이 없다
(제출 현황만 「반 이름 → 팀 번호 순」이라고 적혀 있다). 표에 적힌 번호대로 못 읽는
목록이라 반 이름 → 팀 번호로 화면이 세운다(`TeamTab.tsx`). 정렬 파라미터가 없고
서버 판정을 뒤집는 것도 아니라 경계 문제는 아니다.

### ⚠ 제출은 잠겼는데 리포트는 발행 완료다
탭 배지가 `제출 현황 잠김` + `결과 발행 완료`로 동시에 떴다. `teamFormationStage`가
아직 확정 전(`전원 배정`)인데 `reportPublished`가 true다. **화면 버그가 아니라 서버
상태 그대로**이고 두 값의 출처도 다르다(`submission-status` vs `evaluations`).
회차가 재편성됐거나 시드 데이터의 사정일 수 있어 32차에서 물어본다.

### ⚠ 인원 0명인 팀이 있다
`7팀`이 0명인데 `unassignedCount`는 0이다 — 빈 팀을 만들어 두고 아무도 안 넣은
상태다. 팀 삭제 오퍼레이션이 없어(아래) 지울 방법이 화면에 없다.

## 목에서 뺀 것 — 서버에 자리가 없다

| 뺀 것 | 있던 자리 | 사정 |
|---|---|---|
| 팀 삭제 | 팀 탭 행 액션 | 생성·수정·확정·다시 열기·배정·해제·자동 배분만 있다 |
| 다시 보기 활성화·비활성화 | 결과 탭 하단 | `retrySentAt`·`retryDueAt`·`retryTakenAt` 대응 필드 없음 |
| 리포트 발행 | 결과 탭 헤더 | `reportPublished`는 읽기 전용 |
| 자동 배분 겹침 회피 | 자동 배분 모달 | `AutoAssignTeamsRequest`에 파라미터 없음, 응답에도 겹친 팀 없음 |
| 다른 팀에서 데려오기 | 팀 편집 모달 | 목의 ⑤ `SUBMITTING` 국면 자체가 서버에 없다 |
| 직전 회차 도달 단계 | 팀 편집 목록 | 팀·미배정 응답 둘 다 이름과 ID만 준다 |

전부 32차 요청서로 올린다.

## 목과 갈린 어휘

- **상태**: 목 `DONE` → 서버 `CLOSED`
- **팀 편성 국면**: 목 5국면(`BEFORE·FORMING·READY·LOCKED·SUBMITTING`) →
  서버 `NOT_STARTED·FORMING·READY_TO_CONFIRM·CONFIRMED·CLOSED`. 앞 넷은 1:1,
  다섯째만 다르다(제출 시작 여부는 `submissionOpened`로 따로 온다)
- **분석 상태**: 3종 → 5종. `PARTIAL`을 완료로 접지 않는다(스펙 🔴)
- **요구사항 판정**: 목 4종(`MET·UNUSED·EMPTY·NOMATCH`) → 서버 3종
  (`PENDING·PASS·FAIL`) + `evidence` + `judgedByAi`
- **채점 결과**: `resultStatus` 5종이 새로 생겼다. `AVAILABLE`이 아니면
  합격·불합격을 말하지 않는다(응시 중인 사람이 전부 불합격으로 잡힌다)
- **제출 마감**: `endDate`가 아니라 `submissionDueAt`. 둘은 서버에서 연결돼
  있지 않아 기간을 늘려도 마감은 안 움직인다(스펙 명시)
- **상세 응답 스키마가 목록과 다르다**: `ProjectDetailResponse`는 교안·개념을
  객체 배열로 주고 `requirementTitles`를 싣는다. 목록 타입으로 읽으면 안 된다

## 회차·반 파라미터

네 조회 모두 `roundNo`·`classId`가 선택이라 **안 보낸다** — 생략하면 서버가 현재
회차와 담당 반 전체를 고르고, 그것이 이 화면의 범위다. URL이 `projectId` 하나뿐이라
화면에 회차 선택기가 없다.

## 하드닝 — `screen-hardening.md` 절차 (2026-08-17)

### 조회는 병렬이다 — 실측

| 조회 | TTFB | 크기 |
|---|---|---|
| `/projects/{id}` | 2.99s | 1.5KB |
| `/projects/{id}/teams` | 2.48s | 4.8KB |
| `/projects/{id}/submissions` | 2.21s | 8.8KB |
| `/projects/{id}/class-progress` | 2.07s | 1.4KB |
| `/projects/{id}/evaluations` | 1.67s | 17.3KB |

다섯이 **`projectId`만 있으면 되므로 동시에 나간다.** 히트맵의 3단 직렬(12초)과
달리 첫 그림까지 ~3초다.

### 부분합을 세어 봤다 — 서버 숫자는 전부 맞는다

```
팀원 합계        26  = class-progress targetTraineeCount 26
제출한 팀의 인원  21  = class-progress submittedCount 21
제출 팀 수        5  = summary submittedTeamCount 5
개인 응시    DONE 18 · BLOCKED 5 · OPEN 2 · MISSED 1  = 26
```

### 🔴 화면이 제출 5건과 응시 18명을 숨기고 있었다

서버 응답이 **자기 자신과 어긋난다.**

```
submissionOpened   false   (teamFormationStage = READY_TO_CONFIRM · 7팀 전부 DRAFT)
submittedTeamCount 5 / 7   ← 이미 제출했다
analysis           5팀 SUCCEEDED
reportPublished    true    (발행 시각 2026-08-16T10:40:38Z)
```

스펙이 「화면은 `submissionOpened`만 보고 표를 그릴지 빈 상태를 보여줄지 정한다」고
해서 그대로 따랐더니, 화면이 **「아직 팀 편성 중이에요」**라고 말하며 매니저가 이 탭을
여는 이유인 값들을 통째로 숨겼다. 탭 배지도 「잠김」이었다.

**고침** — 그릴 것이 실제로 있으면 그린다. 판정 규칙을 새로 만드는 것이 아니라
(여전히 `submissionOpened`를 본다) 그 값이 **데이터와 어긋날 때만** 데이터를 택한다.
서버가 맞춰 주면 이 분기는 저절로 안 탄다. 32차로 올린다.

### 🔴 확정 경고가 사실이 아니었다

같은 상태에서 「확정하면 학생들이 코드를 제출할 수 있게 되고」 · 「제출이 시작되기
전까지는 되돌릴 수 있습니다」가 떠 있었다 — 둘 다 이미 지난 일이고, **「되돌려도
된다」로 읽혀 위험하다.** 제출이 있으면 다른 문구를 쓴다.

### 🔴 쓰기가 실패해도 화면이 아무 말도 안 했다

확정을 가로채 409를 만들었더니 **버튼만 원래대로 돌아가고 끝이었다.** 눌렀고,
실패했고, 사용자는 됐는지 안 됐는지 알 수 없다.

`팀 탭`(생성·확정·다시 열기) · `팀 편집`(배정·해제) · `자동 배분` 셋 다 같았다.
`lib/errorCopy` + `Alert variant="danger"`로 붙였다(OP 반 추가와 같은 패턴).

### 🔴 팀 편성 실패 8종이 한 문구로 뭉쳐 있었다

전부 「잠시 후 다시 시도해 주세요」가 나왔는데, **다시 눌러도 안 되는 것들이다.**

```
NO_TEAMS_TO_CONFIRM · TEAMS_NOT_READY · MANAGER_CLASSROOM_AMBIGUOUS
NO_MEMBERS_TO_ASSIGN · AUTO_ASSIGN_NOT_ALLOWED · TEAM_NOT_FOUND
PROJECT_MEMBERSHIP_NOT_FOUND · TEAM_MEMBERSHIP_NOT_FOUND
```

`lib/errorCopy`에 여덟 문구를 **추가**했다(공유 파일이라 수정이 아니라 추가만).
가로채기로 확인:

```
TEAMS_NOT_READY      아직 확정할 수 없습니다 — 미배정 인원이 남아 있거나 …
NO_TEAMS_TO_CONFIRM  확정할 팀이 없습니다 — 팀을 먼저 만들거나 …
500                  팀을 확정하지 못했습니다 — 잠시 후 다시 시도해 주세요
```

### 훑다가 다른 화면에서 나온 것 (MG-04 브리프)

`grep`으로 매니저 쓰기 전부를 훑었더니 **브리프 생성도 같은 구멍**이었다. 실패
표시가 목록에서 온 `stateHint`로만 되어 있어, **이 화면에서 누른 생성이 실패하면**
「아직 브리프가 없습니다」가 그대로 떠 있었다 — 눌렀는데 아무 일도 안 일어난 것처럼
보인다. `create.isError`를 함께 본다.

### 렌더 확인

```
제출 현황  팀 7행 + 개인 26행 · 응시 완료 18 · 미응시 1 · 응시 전/N시간 남음 2 · — 5
          반별 진행 줄  C반 제출 21/26 · 분석 21 · 응시 18
팀        전원 배정 · 7팀 · 미배정 0명 · 편집 7개
결과      26명 목록(막힘 N · 응시 중 · —) + 개념별 3행
```

## 미검증

- **되돌릴 수 없는 쓰기를 실제로 누르지 않았다.** 진행 중인 실제 회차이고,
  **팀 삭제 API가 없어** 팀 추가는 되돌릴 수 없다(0명짜리 `7팀`이 이미 그 상태로
  남아 있다). 확정·배정은 학생 제출과 채점에 영향이 가 실행하지 않았다.
  실패 경로는 위처럼 가로채기로 봤다 — **「전수 확인」이 아니라 「미측정」이다**
- **`FORMING`·`CONFIRMED`·`CLOSED` 국면** — 이 회차는 `READY_TO_CONFIRM` 하나다
- **요구사항 판정** — 이 프로젝트는 `requirements`가 0건이라 그 열이 늘 `—`다.
  펼침·`evidence`·`judgedByAi` 표시를 못 봤다
- **자동 배분** — 팀이 이미 있어 버튼이 안 나온다(`NOT_STARTED`에서만).
  `MANAGER_CLASSROOM_AMBIGUOUS`도 이 계정이 C반 하나뿐이라 못 태웠다
- **0명짜리 팀이 「미제출 ⚠」로 나온다** — 팀원이 없으면 낼 수가 없는데 조치가
  필요한 것처럼 보인다. 팀 삭제 API가 생기면 함께 정리한다
