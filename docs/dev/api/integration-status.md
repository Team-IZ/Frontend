# API 연동 현황 — 역할·화면별 스냅샷

> 기준: `origin/develop` 05fd785(PR #177 머지, 2026-08-11 02:13)까지, 코드 직접 확인(각 화면의 `_/api`·`mockData.ts`·`mockDb.ts` 존재 여부와 실제 import 대상).
> "연동 완료"는 화면이 mock 파일 대신 `src/api/{domain}` 생성 훅(`useFind*`/`use*Mutation` 등)을 직접 호출하는 상태를 뜻한다. 자동 갱신 문서가 아니라 이 시점의 수동 스냅샷 — 다음에 다시 확인하려면 각 화면 폴더에 `mockData.ts`/`mockDb.ts`가 남아 있는지부터 보면 된다.

---

## 요약

| 역할 | 화면 수 | 연동 완료 | 상태 |
|---|---|---|---|
| 슈퍼어드민 | 3 | 3 | 전체 완료 |
| 오퍼레이터 | 8 | 8 | 전체 완료 |
| 매니저 | 10 | 0 | 전체 미착수(전부 mock) |
| 교육생 | 4 | 0 | 전체 미착수(전부 mock) |
| 공통(인증) | 4 | 2 | 로그인·세션만 완료, 초대·비번재설정 미착수 |

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

## 공통(인증) — 로그인만 완료

| 기능 | 경로 | 상태 | 비고 |
|---|---|---|---|
| 로그인·퀵로그인 | `/shared/login` | 완료 | `login()`(`@/api/auth/authApi`) |
| 세션 조회·로그아웃·리프레시 | (전역) | 완료 | `useSession`(`GET /members/me`), `logout`, `/auth/refresh` |
| 초대·가입(회원가입) | `/invite/:token` | mock | `inviteApi.ts`가 여전히 `mockDb.ts` 사용 |
| 비밀번호 재설정 | `/shared/password-reset` | mock | `passwordResetApi.ts`가 여전히 `mockDb.ts` 사용 |
| 개인정보 처리방침 | `/shared/privacy-policy` | N/A | 정적 콘텐츠 페이지, API 없음 |

⚠ **초대·비번재설정은 다른 미착수 항목과 성격이 다르다.** `api/openapi.json` 기준 Auth 태그 10개 엔드포인트가 **전부 `available`**이고(초대 재발송·초대 토큰 해석·매니저 가입·교육생 활성화·비밀번호 재설정 3종 포함), 생성 함수(`resolveInvitation`·`signupManager`·`activateTrainee`·`requestPasswordReset`·`confirmPasswordReset`·`validatePasswordResetToken`)도 `src/api/auth/authApi.ts`에 이미 있다. 백엔드가 막고 있는 게 아니라 **아직 손을 안 댄 것** — 우선순위에 올리면 바로 연동 가능.

**진행 순서(2026-08-11 확정):** 비밀번호 재설정부터(이슈 초안 작성, 매핑이 거의 1:1이라 리스크 낮음) → 초대·가입은 뒤로.
초대·가입을 미룬 이유: `resolveInvitation`(초대 토큰 검증) 실패가 스펙상 `INVITATION_INVALID` 코드 하나로만 오고 만료/이미가입/무효/명단외 4가지를 구분할 필드가 없어서(화면은 지금 4가지를 각각 다른 카드로 보여줌 — §"매니저" 화면 참고), 그대로 연동하면 UX가 퇴화한다. **백엔드 팀원이 이 4가지를 구분되는 코드로 분리하겠다고 확답함(2026-08-11)** — 스펙이 갱신되면 `npm run api:pull && npm run api:gen`으로 반영 여부 확인 후 착수.

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
