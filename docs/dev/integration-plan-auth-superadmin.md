# 연동 계획 — Auth · 슈퍼어드민

> **범위:** AU-01/02/03 · SA-01/02/03. 지금 서버가 주는 것이 이 여섯 화면분이다.
> 프로젝트·교안·세션·리포트·면담은 스펙에 없으므로 **목 그대로 둔다.**
>
> 관련 — [api-boundary.md](api-boundary.md)(무엇이 누구 소관인가) ·
> [api-layer-decisions.md](api-layer-decisions.md)(훅·키·에러) · [mock-first-screens.md](mock-first-screens.md)(완료 판정)

---

## 0. 먼저 — 이 작업의 실제 모양

**"목을 실서버로 바꾼다"가 아니다.** 실측해 보니 두 화면군의 상태가 전혀 다르다.

| | 지금 | 이번에 하는 일 |
|---|---|---|
| **Auth** | `authApi.ts` → `mockDb.ts`. **경계가 이미 있다** | Mock 블록만 교체 |
| **슈퍼어드민** | 화면이 **`mockData`를 직접 import** — 타입·함수·상수 전부 | **경계를 새로 만든다** + 교체 |

```
지금 (슈퍼어드민)
  OrgListScreen ──▶ mockData.ts        ← 화면이 목을 직접 안다
  OrgCreateDialog ─▶ createOrg, checkOrgName, type Org, type OrgApiErrorCode

목표
  OrgListScreen ──▶ api.ts ──▶ 생성물(@/api/organization) or 목
```

> **그래서 이번 작업의 절반은 연동이 아니라 어댑터 신설이다.** 그리고 그 어댑터가
> 없으면 스펙에 없는 절반(프로젝트·세션 등)과 구조가 갈린다.

---

## 1. 타입이 서로 많이 다르다 — 여기가 진짜 작업량

목 타입은 **목업 화면을 보고 만든 것**이고, 서버 타입은 **도메인을 보고 만든 것**이다.
그래서 이름만 다른 게 아니라 **모양이 다르다.**

### SA-01/02 기관

| 목 | 서버 | 무엇을 해야 하나 |
|---|---|---|
| `id` | `organizationId` | 이름 |
| `domain` | `emailDomain` | 이름 |
| `status: 'ACTIVE' \| 'SUSPENDED'` | `ACTIVE \| SUSPENDED \| DELETION_PENDING \| DELETED` | **화면이 2값만 안다.** 나머지 둘을 어떻게 그릴지 정해야 한다 |
| `deletion?: { requestedAt, purgeAt }` | `status: DELETION_PENDING` + `deletedAt` | **삭제 예정 배지를 다른 값으로 그린다.** `purgeAt`는 서버가 안 준다 — `deletedAt + dataRetentionDays`로 계산 |
| `operators: string[]` (이름만) | `operators: { memberId, name, email }[]` | 목록 렌더는 `.map(o => o.name)` |
| `cohortCount: number` | `cohorts: { total, running, closed }` | 목업이 `기수 3 (진행 2 · 종료 1)`을 원했으니 **서버 쪽이 더 낫다** |
| `monthlyAiCostUsd` | `currentMonthAiCost` + `currencyCode` | 통화가 값이 됐다 |
| — | `operatorUnassigned` · `budgetExceeded` | **서버가 파생 배지를 준다.** 화면이 `operators.length === 0`으로 유추하던 것을 걷어낸다 |
| — | `activeSessionCount` · `budgetUsageRate` · `slug` · `displayCode` | 새로 생긴 값. 쓸지 말지 정한다 |

### SA-02 오퍼레이터 탭 — ⚠️ **서버가 화면에 필요한 값을 안 준다**

```
목    Operator = { id, name, email, status, invitedAt, lastLoginAt }
서버  Operator = { memberId, name, email }        ← status·invitedAt·lastLoginAt 없음
```

화면은 **상태 배지와 마지막 로그인**을 그린다. `updateOperatorStatus`(정지/재활성)가 있는데
**목록에 상태가 없으면 무엇을 정지하는지 화면이 모른다.**

→ **백엔드에 요청 대상.** 참고로 `SuperAdmin` 스키마에는 `status · lastLoginAt · createdAt ·
deactivatable`이 다 있다 — **같은 성격의 목록인데 한쪽만 빠진 것**이라 요청하기 쉽다.

### SA-02 설정 탭

| 목 | 서버 |
|---|---|
| `VisibilityDefault = '요약' \| '상세'` **(한글 2값)** | `DisclosureScope = SUMMARY \| PRIVATE \| FULL` **(3값)** |
| `budgetUsd` · `tokenLimitM` · `retentionDays` | `monthlyAiBudget` · `monthlyTokenLimit` · `dataRetentionDays` |
| `githubOrgSync` · `zipUpload` | `allowGithubIntegration` · `allowZipSubmission` |
| — | `allowManagerInvite` · `allowDataExport` · `enableBigProjectContributionAnalysis` · `storageLimitBytes` · `codeSessionTierCode` · `policyVersion` |

**한글 리터럴을 타입으로 쓴 것이 여기서 걸린다.** 라벨은 `labels.ts`로 내리고 값은 서버 enum을 쓴다.

### SA-01 상단 지표

목의 `PLATFORM_SNAPSHOT`(상수)이 서버 `findPlatformSummary`로 대체된다 —
`{ period, organizations, traineeCount, activeSessionCount, aiCost, storage }`.

---

## 2. 무엇이 막혀 있나

| | 상태 | 화면에서 |
|---|---|---|
| `inviteOperator` · `resendOperatorInvitation` · `cancelInvitation` | ⚠️ `hold` (SMTP) | **SA-02 초대 흐름은 목 유지** |
| `purgeOrganization` | ⚠️ `unavailable` | **SA-02 즉시 파기는 목 유지** |
| `inviteSuperAdmin` | 스펙 `available` **인데 백엔드가 "안 될 것"이라고 알림** | ⚠️ **먼저 실제로 호출해 확인** — 스펙과 현실이 갈린다 |

> **`inviteSuperAdmin`은 첫날 확인 항목이다.** 스펙이 `available`이면 생성기가 함수를 만들고
> 화면이 쓰게 되는데, 실제로 502가 나면 **"된다고 표시된 API가 안 되는" 최악의 상태**다.
> 확인 후 `x-readiness`를 `hold`로 바꿔 달라고 요청하거나, 우리가 예외로 관리한다.

---

## 3. 순서 — 왜 이 순서인가

### 1단계 · AU-01 로그인 (가장 작고 가장 많이 배운다)

`authApi.ts`의 Mock 블록만 교체한다. **경계가 이미 있어 화면은 안 바뀐다.**

- 이미 검증됨: 4계정 로그인 · 에러 코드 분기 · 401 처리 · 쿠키
- 새로 붙는 것: **`logout` 실호출** · **라우트 가드**
- ✅ **완료 판정**: 로그인 → 새로고침 → 세션 유지 → 로그아웃 → 로그인 화면. 실패 케이스 문구 확인

> **여기서 한 화면분의 마찰이 전부 드러난다.** 그 다음부터는 반복이다.

### 2단계 · `/me` 도입 — 역할 저장 제거

`authStore`의 `persist`를 걷어내고 `useQuery(['me'])`로 바꾼다.
**화면 코드는 안 바뀐다**(`useAuthStore((s) => s.session)`을 훅으로 감싼다).

- ✅ **완료 판정**: 새로고침해도 로그인 유지 · sessionStorage에 아무것도 안 남음 ·
  정지된 계정이 다음 조회에서 드러남

### 3단계 · AU-02 · AU-03 (같은 패턴 반복)

초대 해석·가입·활성화·비밀번호 재설정. **에러 코드가 많아 화면 문구 매핑이 실제 일이다.**
`resolveInvitation` · `signupManager` · `activateTrainee` · `findConsents` ·
`requestPasswordReset` · `validatePasswordResetToken` · `confirmPasswordReset`

- ⚠️ **주의**: 비밀번호 정책 미충족이 `400` → **`422`로 바뀌었다**(2차 회신)
- ⚠️ **초대 메일 재발송은 SMTP에 걸릴 수 있다** — 1단계에서 같이 확인

### 4단계 · SA-01 기관 목록 ← **어댑터 패턴의 첫 사례**

**여기가 진짜 첫 화면이다.** 표·페이징·필터·정렬·생성 모달이 다 걸려 있다.

1. `features/superadmin/orgs/api.ts` 신설 — 화면이 `mockData`를 직접 안 보게
2. `types.ts`에 화면용 타입 — 서버 타입을 그대로 쓸지, 좁힐지 여기서 정한다
3. `toPage()` 첫 실사용
4. 서버 필터·정렬로 이관 — 화면의 `useMemo(filter/sort)` 제거

- ✅ **완료 판정**: 검색·상태 필터·정렬이 **서버 쿼리로** 나감 · 페이저 동작 ·
  생성 후 목록 자동 갱신(무효화) · 이름 중복 확인

> **3절의 "화면이 하면 안 되는 것"이 여기서 처음 실전 적용된다.**

### 5단계 · SA-03 플랫폼 설정 (SA-02보다 먼저)

**SA-02보다 작고 막힌 게 적다.** 모델·단가 4개 + 계정 2개.
초대만 예외(2절).

### 6단계 · SA-02 기관 상세 ← **가장 크고 가장 많이 막혀 있다**

탭 4개(개요·오퍼레이터·사용량·설정) + 삭제/복구/파기.

- 오퍼레이터 탭은 **서버 응답에 상태가 없어서** 백엔드 답을 기다린다(1절)
- 초대·파기는 목 유지(2절)
- **즉 이 화면만 "일부는 실서버, 일부는 목"이 된다** — 어댑터가 그걸 가린다

---

## 4. 공통 작업 — 화면마다 반복되는 것

각 화면에서 같은 일을 한다. **첫 화면(4단계)에서 형태를 확정하고 나머지는 복사한다.**

```
features/{역할}/{도메인}/
├─ api.ts        생성 함수 호출 + toPage. 아직 없는 것은 목 그대로
├─ types.ts      화면이 쓰는 타입 (서버 타입에서 좁히거나 그대로 재수출)
├─ labels.ts     enum → 한글 라벨 ('SUMMARY' → '요약')
├─ rules.ts      기획 상수
└─ mockData.ts   남는 부분만. 다 지워지면 파일 삭제
```

**에러 문구 매핑**도 화면마다 필요하다 — `authStates.tsx`가 이미 그 형태다
(`code` → `{variant, message, 액션}`, 모르는 코드는 `status`로 폴백).

---

## 5. 하지 않는 것

| | 왜 |
|---|---|
| 프로젝트·교안·세션·리포트·면담 화면 | **스펙에 없다.** 목 그대로 |
| `mockData.ts` 전량 삭제 | 막힌 기능(초대·파기)이 아직 쓴다. **부분만 지운다** |
| 낙관적 업데이트 | 체감 지연이 실제로 보일 때 |
| 목을 MSW로 이전 | 지금 목은 화면 케이스 시나리오다. 옮기면 두 벌이 된다 |

---

## 6. 백엔드에 물을 것 (연동하면서 생김)

| | 언제 |
|---|---|
| **`Operator`에 `status`·`lastLoginAt`** | 6단계 전. `SuperAdmin`엔 있으니 근거가 명확하다 |
| **`inviteSuperAdmin`이 실제로 되나** | 1단계에서 확인 |
| `purgeAt`을 서버가 주나 | 6단계. 지금은 `deletedAt + dataRetentionDays`로 계산 가능 |
| 목록 응답 `counts` | 상태별 내역이 필요한 화면에서 |

---

## 7. 한 줄 요약

```
1  AU-01 로그인      경계가 이미 있다 — 마찰을 여기서 다 겪는다
2  /me               역할 저장 제거. 화면 안 바뀜
3  AU-02/03          같은 패턴 반복. 에러 문구 매핑이 실제 일
4  SA-01 기관 목록    ★ 어댑터 신설 첫 사례. 표·필터·페이징 전부
5  SA-03 플랫폼 설정  작고 덜 막혔다
6  SA-02 기관 상세    가장 크고 절반이 막혀 있다
```

**4단계가 분기점이다.** 거기서 정한 어댑터·타입·라벨 형태가 나머지 15개 표 화면의 본이 된다.
