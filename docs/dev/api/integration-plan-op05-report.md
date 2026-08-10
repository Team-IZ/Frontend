# 연동 계획 — OP-05 리포트 (실습용 준비 문서)

> **이 문서의 성격이 다른 문서와 다르다.** [integration-plan-auth-superadmin.md](integration-plan-auth-superadmin.md)는
> 스펙이 이미 있는 도메인을 어떻게 붙였는지 **기록**한 문서다. 이 문서는 스펙이 아직 없는 도메인에
> **미리 준비**해 두는 문서다 — 그래서 "타입 매핑"이 아니라 "무엇을 물어야 하는가"가 본문이다.
>
> 작성 계기: API 프로세스 숙지 실습. 슈퍼어드민 연동 사례(§1 타입 매핑, §6 백엔드에 물을 것)의
> 방법을 그대로 OP-05에 적용해 봤다 — 다만 대조할 서버 타입 자체가 없어서 결과물의 모양이 다르다.

---

## 0. 먼저 — 실제로 연동할 수 있는 상태가 아니다

`npm run api:pull`로 받은 최신 `api/openapi.json` 기준(2026-08-10), **Reporting 태그 6개 엔드포인트 전부
`x-readiness: unavailable`** 이다. `src/api/PENDING.md`에도 그대로 나열돼 있고, `src/api/` 아래
`report` 도메인 폴더 자체가 생성되지 않았다(`organization`·`member`·`auth` 등은 있다).

```
GET  /api/v0/reports                       unavailable
GET  /api/v0/reports/{reportId}             unavailable   ← OP-05가 쓸 것
GET  /api/v0/reports/managed                unavailable
GET  /api/v0/reports/class-diagnosis        unavailable
GET  /api/v0/reports/{reportId}/disclosure  unavailable
PUT  /api/v0/reports/{reportId}/disclosure  unavailable
```

**8차 요청서까지(현재 진행 중인 것은 그 이후 라운드) Reporting 도메인이 안건에 오른 적이 없다** —
8차는 프로젝트 실행·교안 API 24개가 새로 들어오면서 나온 요청이라 리포트와 무관하다
(`backend-api-requests-8.md`). 즉 지금 진행 중인 백엔드 작업(10·11차)도 리포트를 향하고 있다는
근거가 아직 없다 — **확인이 필요하면 사용자가 팀장·백엔드에 직접 물어야 하는 사실**이다.

**그래서 이 문서는 "연동 순서"가 아니라 "연동 전에 뭘 준비해 둘까"다.**

---

## 1. 좋은 소식 — OP-05는 이미 목표 구조다

슈퍼어드민 연동 작업의 절반이 "경계가 없어서 어댑터를 신설하는 것"이었다(화면이 `mockData`를
직접 import). **OP-05는 처음부터 그 경계를 갖고 있다.**

```
src/features/operator/report/_/api/
├─ types.ts    Report 계약 타입 (계정 하나가 아니라 전체 스냅샷 하나)
├─ mockDb.ts   ⚠️ Mock 전용 — 연동 시 파일째 삭제 표식 있음
└─ api.ts      getReport(cohortId) 하나뿐 — 화면이 의존하는 유일한 곳
```

`ReportScreen.tsx`는 `./_/api/api`에서 `getReport`만 가져다 쓰고, `mockDb`를 직접 참조하지 않는다
(grep 확인 완료). `api.ts` 함수 안에 실제 호출 버전이 이미 주석으로 준비돼 있다.

```ts
export function getReport(cohortId: string): Promise<Report> {
  // ===== Mock 버전 (현재 활성) =====
  void cohortId
  return delay(loadReport())
  // return http<Report>(`/reports/${cohortId}`)   ← 스펙이 열리면 이 줄만 켠다
}
```

**연동 당일 할 일이 원칙적으로 이 파일 하나, 몇 줄이다.** 필터·정렬·페이지네이션이 없는
고정 스냅샷 화면이라(정의서 §4 "탐색 도구가 아니라 문서") `toPage()`도, 서버 쿼리 이관도 필요 없다
— SA-01(4단계)이 "가장 큰 첫 사례"였던 것과 반대로, OP-05는 이 레포에서 **제일 작은 연동 사례가 될
것**이다.

---

## 2. 타입 매핑 대신 — 서버에 뭘 요청해야 하는가

서버 타입이 없으므로 대조표를 만들 수 없다. 대신 `types.ts`의 `Report` 11개 필드를 훑어
**서버가 그대로 줄 값**과 **화면/목이 계산해서 만든 값**을 갈랐다 — SA-01 연동 때 "화면이 하면
안 되는 것"(`api-boundary.md` §2)을 뒤늦게 걷어낸 전례를 반복하지 않으려는 것이다.

| 필드 | 지금(mock) | 서버에 물을 것 |
|---|---|---|
| `status`·`completedRounds`·`totalRounds` | 회차 등록 개수로 계산 | 그대로 줄 값 — 계산 주체는 서버가 맞다 |
| `concepts[]` 정렬(교안별 최악 → 개념 심각도 내림차순) | **`mockDb.ts`가 직접 정렬**(`buildConcepts` 함수, severity 계산) | ⚠️ **이게 진짜 질문이다.** 서버가 이 순서를 그대로 줄지, 화면이 재정렬해야 하는지 확인 필요 — "고칠 곳을 알려주는 정렬"(정의서 근거)이라 순서 자체가 기능이다 |
| `classRisk[]`의 "기수 전체" 행 | 마지막 회차 분포에서 계산해 배열 맨 앞에 삽입 | 서버가 이 합계 행을 포함해 줄지, 화면이 계산해서 얹어야 하는지 확인 |
| `excluded.{notTaken,invalid,interrupted}` | 고정 비율(71:33:15)로 임의 배분 | **기획에 없는 값**(문서 어디에도 이 비율의 근거가 없다) — 서버 집계 방식을 먼저 물어야 화면 값이 뭘 대체하는지 안다 |
| `groupShortfalls[]` | mock이 3건 하드코딩 | 서버 판정 기준(개념×회차×반 조합에서 미달을 어떻게 정의하는지) 확인 |
| `classRiskRoundLabel` | `${마지막 회차} 기준` 문자열 | 서버가 문자열로 줄지 회차 식별자만 주고 화면이 라벨을 만들지 |

**셋(정렬·전체행 삽입·비율 배분)은 지금 "화면이 서버 일을 하는" 자리다.** 목 단계라 문제가
안 보이지만, `api-boundary.md`가 짚은 패턴과 정확히 같다 — 연동 시점에 서버 응답이 이미
정렬·집계된 채로 오면 화면 쪽 로직을 걷어내야 하고, 안 오면 그대로 둔 채 "왜 화면이 이 계산을
하는지" 주석이 필요하다. **지금 결정할 필요는 없다.** 스펙이 열리는 시점에 다시 본다.

---

## 3. 하지 않는 것

| | 왜 |
|---|---|
| 지금 `api.ts`를 실제 호출로 바꾸는 것 | 스펙이 없다 — 호출하면 404다 |
| `mockDb.ts` 삭제·수정 | 목이 유일한 데이터 원천이다. 화면 완성도가 여기 달려 있다 |
| 위 표의 질문에 지금 답을 정하는 것 | 서버 응답 모양을 보기 전에는 추측이다. **표시하고 질문**(§4 원칙)이지 조용히 정하는 게 아니다 |
| 백엔드에 실제로 요청서 발송 | Reporting 도메인이 안건에 없다 — 사용자가 팀장과 우선순위부터 확인해야 할 사안 |

---

## 4. 한 줄 요약

```
지금 OP-05는 "목이 서버 자리에서 이미 계산해 주는" 구조까지 갖춰져 있다.
막힌 건 코드가 아니라 스펙이다 — Reporting 태그 자체가 아직 열리지 않았다.
연동 준비로 할 수 있는 건 "서버가 이 값을 그대로 줄지" 질문 목록을 미리 만들어 두는 것뿐이고,
그게 위 §2 표다. 스펙이 열리면 api.ts 한 줄 교체 + §2 질문에 대한 답 반영, 두 가지만 하면 된다.
```
