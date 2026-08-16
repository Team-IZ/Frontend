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

## 미검증

- **쓰기 액션 전부** — 팀 생성·배정·해제·확정·다시 열기·자동 배분을 실계정으로
  눌러보지 않았다. 진행 중인 실제 회차라 편성을 건드리면 되돌리기 어렵다
- **제출 현황 표 본문** — 이 회차는 제출이 아직 안 열려 빈 상태만 봤다.
  팀 행·개인 행 2계층, 요구사항 펼침, 잔여 기한 문구는 미확인
- **자동 배분 담당 반 여럿(`MANAGER_CLASSROOM_AMBIGUOUS`)** — 이 계정은 C반
  하나뿐이라 그 분기를 못 태웠다
