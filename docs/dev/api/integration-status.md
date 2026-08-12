# API 연동 현황 — 역할·화면별 스냅샷

> 기준: `origin/develop` c643a25(PR #182 머지, 2026-08-11) + 초대·가입 실서버 연동(이 세션, PR 미생성)까지, 코드 직접 확인(각 화면의 `_/api`·`mockData.ts`·`mockDb.ts` 존재 여부와 실제 import 대상).
> "연동 완료"는 화면이 mock 파일 대신 `src/api/{domain}` 생성 훅(`useFind*`/`use*Mutation` 등)을 직접 호출하는 상태를 뜻한다. 자동 갱신 문서가 아니라 이 시점의 수동 스냅샷 — 다음에 다시 확인하려면 각 화면 폴더에 `mockData.ts`/`mockDb.ts`가 남아 있는지부터 보면 된다.

---

## 요약

| 역할 | 화면 수 | 연동 완료 | 상태 |
|---|---|---|---|
| 슈퍼어드민 | 3 | 3 | 전체 완료 |
| 오퍼레이터 | 8 | 8 | 전체 완료 |
| 매니저 | 10 | 0 | 전체 미착수(전부 mock) |
| 교육생 | 4 | 0 | 전체 미착수(전부 mock) |
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

## 교육생 — 전체 미착수(전부 mock)

| 화면 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 홈(TR-01) | `/trainee/home` | mock | `mockDb.ts`(`buildHomeFixture`) |
| 내 리포트 | `/trainee/report` | mock | `mockDb.ts`(`buildReportsFixture`) |
| 세션(문제 풀이) | `/trainee/session` | mock | 스크립트 픽스처(`script.ts`), 인위적 지연(250ms)까지 흉내 |
| 제출 | `/trainee/submission` | mock | `mockDb.ts`(`buildSubmissionFixture`) |

---

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

## 백엔드가 막고 있는 나머지(`src/api/PENDING.md` 기준)

| readiness | 엔드포인트 | 비고 |
|---|---|---|
| unavailable | `GET /reports/{reportId}/disclosure` | 내 리포트 공개 상태 조회 |
| unavailable | `PUT /reports/{reportId}/disclosure` | 리포트 공개 범위 설정 |
| unavailable | `POST /organizations/{organizationId}/purge` | 기관 파기 요청 |
| unavailable | `GET /reports` | 내 리포트 전량 조회(교육생) |
| unavailable | `GET /reports/{reportId}` | 리포트 단건 조회 |
| unavailable | `GET /reports/managed` | 담당 반 리포트 목록 조회(매니저) |

이 6건은 operator 화면엔 안 걸린다(operator는 `class-diagnosis` 단일 엔드포인트만 씀) — 교육생·매니저의 리포트 조회 화면이 나중에 연동될 때 걸릴 항목들.
