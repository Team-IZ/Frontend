# API 연동 현황 — 역할·화면별 스냅샷

> 기준: `develop` c80d3da(PR #188 머지, 2026-08-12) + TR-04 작업분(#189, PR 전)까지, 코드 직접 확인.
> "연동 완료"는 화면이 mock 파일 대신 `src/api/{domain}` 생성 훅을 직접 호출하는 상태를 뜻한다.
> 자동 갱신 문서가 아니라 이 시점의 수동 스냅샷 — 다시 확인하려면 각 화면 폴더에
> `mockData.ts`/`mockDb.ts`가 남아 있는지부터 보면 된다.
>
> ⚠️ **스펙은 2026-08-12에 크게 늘었다(오퍼레이션 96 → 118).** 교육생 제출·분석·세션·리포트가
> 통째로 왔지만 **`api:check` error 37건이라 아직 못 붙인다** — [17차 요청](../backend/backend-api-requests-17.md).
> 아래 "미착수"는 **화면을 안 만들었다는 뜻이 아니라 실서버에 안 붙었다는 뜻**이다.

---

## 요약

| 역할 | 화면 수 | 연동 완료 | 상태 |
|---|---|---|---|
| 슈퍼어드민 | 3 | 3 | 전체 완료 |
| 오퍼레이터 | 8 | 8 | 전체 완료 |
| 매니저 | 10 | 0 | 전부 mock. **히트맵 API가 열렸다**(MG-02, 17차 R2에 걸림) |
| 교육생 | 4 | 0 | 전부 mock. **API는 다 왔다** — 17차 R1~R3이 풀리면 바로 붙는다 |
| 공통(인증) | 4 | 4 | 전체 완료(초대·가입은 렌더 확인 전) |

---

## 슈퍼어드민 — 전체 완료

| 화면 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 기관 목록(SA-01) | `/superadmin/orgs` | 완료 | `useFindOrganizations`, `useFindPlatformSummary` |
| 기관 상세 | `/superadmin/orgs/:id` | 완료 | `useFindOrganization` + 운영자/설정/사용량 탭 전부 실호출 |
| 플랫폼 설정 | `/superadmin/settings` | 완료 | `useFindModelSettings`, 모델·티어·가격 다이얼로그 포함 |

---

## 오퍼레이터 — 전체 완료

| 화면 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 대시보드(OP-01) | `/operator/dashboard` | 완료 | PR #176(오늘 새벽 머지) |
| 분석 | `/operator/analysis` | 완료 | PR #177(오늘 새벽 머지) |
| 운영관리(OP-06, 반·기수·비용·교안·매니저·명부 6탭) | `/operator/admin/:tab?` | 완료 | PR #161·#174. 자체 기수 스위처(`admin/_/cohortScope.ts`)로 `'7'` 자리표시자 제거 |
| 교안 상세 | `/operator/admin/curricula/:id` | 완료 | `useFindCurriculum`·`useFindSections`·`useFindUsedProjects` |
| 회차 배정 모드 | `/operator/admin/assign` | 완료 | `useAssignTrainees`·`useRollbackAssignment` |
| 프로젝트 목록(OP-03) | `/operator/projects` | 완료 | PR #164, `projects/queries.ts`가 생성 훅을 감싸는 구조 |
| 프로젝트 상세(OP-04) | `/operator/projects/:id/:tab?` | 완료 | 목록과 같은 `queries.ts` 공유 |
| 리포트(OP-05) | `/operator/report` | 완료 | 이슈 #170, `GET /reports/class-diagnosis` 단일 엔드포인트 |

⚠ admin은 로컬 `cohortScope.ts`, 나머지(대시보드·분석·프로젝트)는 전역 `stores/cohortScope.ts`를 따로 씀 — 둘 다 실서버 연동이라 기능엔 문제없지만 아직 하나로 안 합쳐진 상태(주석에 "상단 기수 스위처가 붙으면 합친다"고 기록돼 있음).

---

## 매니저 — 전체 미착수(전부 mock)

| 화면 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 대시보드(MG-01) | `/manager/dashboard` | mock | `mockData.ts` |
| 히트맵(MG-02) | `/manager/heatmap` | mock | `mockData.ts` |
| 면담 목록(MG-03) | `/manager/interviews` | mock | `mockData.ts` |
| 면담 브리프(MG-04) | `/manager/interviews/:id/brief` | mock | `mockData.ts` |
| 교육생 목록(MG-05) | `/manager/trainees` | mock | `mockData.ts` |
| 교육생 상세(MG-06) | `/manager/trainees/:id` | mock | `mockData.ts` |
| 프로젝트 목록(MG-07) | `/manager/projects` | mock | `mockData.ts` |
| 프로젝트 상세(MG-08) | `/manager/projects/:id` | mock | `mockData.ts` |
| 교안 목록 | `/manager/curriculum` | mock | `mockData.ts` |
| 교안 상세 | `/manager/curriculum/:id` | mock | `mockData.ts` |

`src/features/manager/` 어디에도 `_/api` 디렉토리가 없다. 매니저 도메인용 백엔드 API(코호트/교육생/면담/프로젝트/히트맵) 자체가 아직 스펙에 안 보임.

---

## 교육생 — 화면은 새 모델로 재작성, 연동은 대기

**2026-08-11 확정된 채점 모델로 세션·리포트를 다시 만들었다**(#187 · #189).
개념 3 × 단계 4(0~4단) × 시도 3 · 점수 0~5 · 힌트 2(요청·지급 합산) · 재시험 1회.
규칙은 [tr-03-session.md](../screens/tr-03-session.md) · [tr-04-report.md](../screens/tr-04-report.md).

| 화면 | 경로 | 상태 | 붙일 API | 비고 |
|---|---|---|---|---|
| 홈(TR-01) | `/trainee/home` | mock | `GET /assessment-rounds` ✅ | 44필드 플랫 + `representativeStatus` — 우리 8종 union보다 표현력이 높다 |
| 제출(TR-02) | `/trainee/submission` | mock | `GET /projects/{id}/my-submission` ✅ · `POST /submissions/zip` ✅ · `repository-checks` ✅ | **status 6종이 요청 그대로 왔다** |
| 세션(TR-03) | `/trainee/session` | mock | `assessment-sessions/*` ⚠️ | **7개 전부 `사용 불가`** — 계약은 확인됨 |
| 내 리포트(TR-04) | `/trainee/report` | mock | `GET /reports` · `/{id}` · `/disclosure` ✅ | **16차로 열렸다**(unavailable → available) |

**막는 것은 하나다** — `api:check` error 37건(enum 제약 없음 · required 9 · nullable 28).
스펙을 커밋하면 CI가 그 종료코드로 실패하므로 `api/openapi.json`도 아직 안 올렸다.

## 공통(인증) — 전체 완료

| 기능 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 로그인·퀵로그인 | `/shared/login` | 완료 | `login()`(`@/api/auth/authApi`) |
| 세션 조회·로그아웃·리프레시 | (전역) | 완료 | `useSession`(`GET /members/me`), `logout`, `/auth/refresh` |
| 비밀번호 재설정 | `/shared/password-reset` | 완료 | 이슈 #178 → PR #179(2026-08-11 머지). `passwordResetApi.ts`가 `@/api/auth/authApi` 실호출 |
| 초대·가입(회원가입) | `/invite/:token` | 완료(렌더 확인 3/6) | 이슈 #183 → PR #184(2026-08-11 머지). `inviteApi.ts`가 `resolveInvitation`·`signupManager`·`activateTrainee`·`resendAccountInvitation` 실호출로 교체됨. `mockDb.ts` 삭제 완료 |
| 개인정보 처리방침 | `/shared/privacy-policy` | N/A | 정적 콘텐츠 페이지, API 없음 |

⚠ **비밀번호 재설정은 연동됐지만 렌더 확인이 절반만 됐다.** 위변조 토큰(에러 경로)은 실제 렌더로 확인했지만, 정상 진입·확정 성공·`SAME_AS_CURRENT`·만료·이미사용(성공 경로 대부분)은 **유효한 토큰이 있는 계정이 있어야 확인 가능**한데 시드 계정 이메일이 전부 가짜 도메인(`org.com` 등)이라 아직 못 봤다 — 백엔드에 실제 이메일로 받을 수 있는 테스트 계정을 요청해 둔 상태(상세: `docs/dev/handoff.md` 최신 항목).

⚠ **초대·가입도 아직 렌더 확인 전이다.** 백엔드가 2026-08-11 초대 에러코드를 4종(`INVITATION_EXPIRED` 410 · `INVITATION_ALREADY_ACCEPTED` 409 · `INVITATION_NOT_IN_ROSTER` 403 · `INVITATION_INVALID` 400)으로 분리 확답 → `npm run api:pull && npm run api:gen`으로 스펙 반영 확인 → 실연동 완료까지 이 세션에서 이어갔다. **알아둘 것 셋:**
- **역할 3종을 화면 변형 2종에 매핑했다** — `TRAINEE`→변형 B(활성화), `MANAGER`·`OPERATOR`→변형 A(가입, `signupManager` 공유). `SUPER_ADMIN`이 오면(v1 D12: 슈퍼어드민은 시드·내부 초대 전용, 이 화면 대상 아님) 가입 API가 없어 `INVITATION_INVALID`와 같은 무효 카드로 처리한다.
- **에러 응답엔 `email` 필드가 없다.** 만료·이미가입 상태 카드가 목업엔 이메일을 박아 보여주지만 실제 `ErrorResponse`는 안 준다. "이미 가입됨" 카드는 이메일 문구를 뺐고, "만료" 카드(검증 단계)는 `resendAccountInvitation`이 토큰이 아니라 email을 받게 돼 있어서 **사용자가 이메일을 직접 입력해야 재발송된다** — 목업에 없던 입력칸을 추가했다(사용자 확인받음). 제출 단계(폼을 이미 연 뒤 만료)는 `invite.email`을 이미 알아 기존처럼 자동 재발송.
- **`ACTIVATION_STATE_CHANGED`(409, 동시 요청으로 상태가 먼저 바뀜)는 전용 카드가 없어 시스템 폴백 메시지로 둔다.**

⚠ **실제 초대 메일로 첫 렌더 확인을 하다가 진짜 버그를 하나 잡았다.** 메일 링크의 토큰에
역할 접두사가 붙어 온다는 게 어디에도 문서화돼 있지 않았다 — `sa-<token>`(슈퍼어드민) ·
`op-<token>`(오퍼레이터·매니저 공용) · `stu-<token>`(교육생). 프론트가 접두사까지 통째로
`invitationToken`으로 보내서 정상 초대도 전부 `INVITATION_INVALID`로 떨어지고 있었다.
백엔드 확인 후 `inviteApi.ts`에 `stripRolePrefix`(첫 `-` 앞부분 제거) 추가해서 해결, 실제
메일 링크로 재검증 완료.

**렌더 확인 진행 상황(2/6, 전부 실제 메일 링크로 확인)**: 무효(당시엔 접두사 버그로 인한
것이었지만 카드 자체는 의도대로 렌더됨) · 이미가입 — 완료. **남은 4개:** 만료(이메일 입력 포함) ·
명단외 · 정상 매니저/오퍼레이터 가입 성공 · 정상 교육생 활성화 성공 — 접두사 버그가 고쳐졌으니
백엔드가 보내주는 다음 실이메일 초대로 이어서 확인.

---

## 백엔드가 막고 있는 나머지

**리포트 4건은 16차 요청으로 해제됐다**(`unavailable` → `✅ 사용 가능`).
2026-08-12 기준 남은 것은 아래다.

| readiness | 엔드포인트 | 비고 |
|---|---|---|
| unavailable | `POST /assessment-sessions/{id}/start` · `/answers` · `/hints` · `/activity` | **TR-03 세션 전량** |
| unavailable | `GET /assessment-sessions/current` · `/problems/{problemNo}` | 〃 |
| unavailable | `PATCH /assessment-attempts/{id}/validity` | 무효 응시 판정(매니저) |
| unavailable | `POST /submissions` (GitHub URL) | ZIP(`/submissions/zip`)은 열려 있다 |
| unavailable | `GET /reports/managed` · `/analytics/risk-signals` · `/timeline` · `/notifications/inbox` · `/analytics/concept-scope` | 매니저 화면들 |
| unavailable | `POST /organizations/{organizationId}/purge` | 기관 파기 요청 |

**매니저 히트맵(`/analytics/heatmap`)은 열렸다** — 매니저 6화면 중 처음 붙일 수 있는 것이지만
`ManagerHeatmapResponse`·`Cell`·`Row`·`Scope`가 17차 R2(`required` 누락)에 걸려 있어
지금 붙이면 전 필드가 optional이 된다. **R2 해결 후가 낫다.**
