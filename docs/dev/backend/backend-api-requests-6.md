# 백엔드 API — 6차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md) · 3차: [backend-api-requests-3.md](backend-api-requests-3.md) · 4차: [backend-api-requests-4.md](backend-api-requests-4.md) · 5차: [backend-api-requests-5.md](backend-api-requests-5.md)
>
> **요청 2건입니다.** 둘 다 SA-02 기관 상세 설정 탭을 붙이려다 나온 것이고, **화면 구조와 API 규약이 어긋나 있습니다.**
>
> 5차 요청(초대 3종 `hold` 해제 · `Item` 스키마)은 회신 대기 중입니다.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `PUT .../operations/settings` → **`PATCH`로, 필드는 전부 선택** | 🟠 중간 — SA-02 설정 탭이 이것에 걸린다 |
| **R2** | `enableBigProjectContributionAnalysis` **제거** (기획에서 빠진 기능) | 🟠 중간 — 별도로 전달드렸던 건, 스펙 반영 확인용 |

---

## 1. 🟠 R1 — 운영 설정 수정을 부분 수정으로

### 지금

```
PUT /api/v0/organizations/{organizationId}/operations/settings
필수 10 / 전체 13
```

스펙 설명에도 명시돼 있습니다.

> **⚠️ 부분 수정(PATCH)이 아니라 전체 치환(PUT)이다.**
> 보내지 않은 필드는 유지되는 게 아니라 **검증 오류(400)** 가 난다.

### 화면이 이렇게 생겼습니다

설정 탭은 **항목별 모달**입니다. SA-03 플랫폼 설정에서 이미 쓰고 있는 방식이고, SA-02도 같은 구조로 맞춥니다.

```
[ AI 월 예산 상한 ]              [ 변경 ]  → 모달 → 저장
[ 데이터 보존기간 ]              [ 변경 ]  → 모달 → 저장
[ 기능 허용 ]                    [ 변경 ]  → 모달 → 저장
```

**모달 하나가 담당하는 필드는 2~4개입니다.** 그런데 저장할 때는 **13개를 전부** 보내야 합니다.

### 이게 문제인 이유 셋

**① 이력이 쓸모없어집니다** ← 이게 가장 큽니다

`organization_policy`가 **append-only 이력 테이블**이라고 스펙에 적혀 있습니다. 감사·추적이 목적일 텐데,

```
사용자가 바꾼 것:   monthlyAiBudget   1000 → 1500
새 버전에 기록되는 것:  13개 필드 전부
```

**나중에 "누가 무엇을 바꿨나"를 볼 수 없습니다.** 버전 간 diff를 떠도 13개가 통째로 다시 쓰인 것으로만 보입니다.

**② 사용자가 건드리지 않은 값을 되돌립니다**

모달이 담당하지 않는 9~11개 필드는 **탭이 화면에 들어올 때 GET으로 받아둔 값**입니다.

```
14:00  A가 기관 상세를 연다        (설정 13개를 받아둠)
14:05  B가 "기능 허용" 모달에서 데이터 export를 켠다
14:10  A가 "예산" 모달에서 예산만 바꾸고 저장
       → A가 14:00에 받은 값 13개가 전송됨
       → B가 켠 데이터 export가 다시 꺼진다
```

A는 예산만 만졌는데 **다른 설정이 되돌아갑니다.** 화면에서 그 사실이 보이지도 않습니다.

**③ 서버가 의도를 알 수 없습니다**

요청 본문만으로는 사용자가 무엇을 바꿨는지 알 수 없습니다. 나중에 **변경 알림·승인·부분 권한**(예: 예산만 바꿀 수 있는 역할)을 붙일 때 전부 불리합니다.

### 그리고 — 같은 스펙 안에서 이것만 예외입니다

현재 스펙의 `PATCH` 8개가 **전부 부분 수정**입니다.

| 오퍼레이션 | 필수/전체 |
|---|---|
| `updateOrganization` | **1/2** — *"`null`·빈 값이면 이름을 바꾸지 않는다"* |
| `updateOperatorStatus` | 1/3 |
| `updateTraineeStatus` | 1/2 |
| `updateSuperAdminStatus` | 1/3 |
| `endCohort` · `updateManagers` · `assignTrainees` · `rollbackAssignment` | 각 1~2 |

**운영 설정만 필수 10/13입니다.** 프런트 입장에서는 같은 도메인인데 한 곳만 규약이 다른 셈이라, 실수하기 쉬운 자리가 됩니다.

### 요청

**메서드를 `PATCH`로 바꾸고, 모든 필드를 선택으로.**

```
PATCH /api/v0/organizations/{organizationId}/operations/settings

{ "monthlyAiBudget": 1500 }          ← 이것만 바뀐다
{ "allowDataExport": true,
  "allowZipSubmission": false }      ← 모달이 담당하는 것만
```

- 보내지 않은 필드는 **직전 활성 버전 값을 그대로 승계**
- `policyVersion`은 지금처럼 1 올라가면 됩니다(append-only 유지)
- 빈 본문 `{}`은 400으로 막아 주시면 좋겠습니다 — 아무것도 안 바꾸는 요청은 버전만 낭비합니다

> **메서드까지 바꿔 달라는 이유:** 스펙 설명에 *"부분 수정(PATCH)이 아니라 전체 치환(PUT)이다"* 를 **의도적으로 적어 두셨습니다.** 필드만 선택으로 바꾸면 `PUT`인데 부분 수정이 되어 규약이 어긋난 채 남습니다.

### 이게 어려우면 — 차선

`PUT`을 유지해야 할 사정이 있다면, **`policyVersion`을 요청 본문으로 받아** 낙관적 잠금을 걸어 주세요.

```
{ ..., "policyVersion": 7 }
→ 서버의 활성 버전이 7이 아니면 409
```

②를 막을 수는 있습니다(덮어쓰기 대신 실패). 다만 ①·③은 그대로 남고, 프런트는 사용자에게 *"다른 사람이 먼저 바꿨습니다. 새로 고치고 다시 시도하세요"* 를 띄우게 됩니다.

**PATCH 쪽이 사용자 경험·이력 모두에서 낫다고 봅니다.**

---

## 2. 🟠 R2 — `enableBigProjectContributionAnalysis` 제거

**이미 구두로 전달드린 건이라 새 요청은 아닙니다.** 아직 스펙에 남아 있어 확인차 적습니다.

```
UpdateOperationSettingRequest.enableBigProjectContributionAnalysis   * 필수
OperationSettingResponse.enableBigProjectContributionAnalysis        * 필수
```

빅프로젝트 기여도 분석(커밋 기준)은 **기획에서 빠진 기능**입니다. 그런데 요청 본문에 **필수**로 남아 있어서, 저희는 **화면에 없는 값을 지어내 보내야 합니다.**

- `true`를 보내면 → 없는 기능을 켜는 셈
- `false`를 보내면 → 그것도 저희가 정한 값이 아님

**요청·응답 양쪽에서 빼 주세요.** R1(부분 수정)이 반영되면 "안 보내면 그만"이라 급하진 않지만, **응답에 남아 있으면 화면이 쓰지 않는 필드가 타입에 계속 남습니다.**

---

## 3. 참고 — 저희가 이 화면을 어떻게 만들 계획인지

혹시 판단에 도움이 될까 해서 적습니다.

| 모달 | 담당 필드 |
|---|---|
| 한도·예산 | `monthlyAiBudget` · `monthlyTokenLimit` · `storageLimitBytes` |
| 데이터 정책 | `dataRetentionDays` · `defaultDisclosureScope` |
| 기능 허용 | `allowManagerInvite` · `allowDataExport` · `allowZipSubmission` · `allowGithubIntegration` |
| AI 등급 | `codeSessionTierCode` |
| (별도 행) | `organizationStatus` — 정지/활성은 성격이 달라 따로 둡니다 |

**`enableBigProjectContributionAnalysis`는 어느 모달에도 없습니다**(R2) — 화면에 그 항목이 없기 때문입니다.

`defaultDisclosureScope`는 **`SUMMARY` · `PRIVATE` · `FULL` 셋 다** 화면에 넣습니다(지금 화면은 2값이라 맞춥니다).
