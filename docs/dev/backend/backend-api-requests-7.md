# 백엔드 API — 7차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md) · 3차: [backend-api-requests-3.md](backend-api-requests-3.md) · 4차: [backend-api-requests-4.md](backend-api-requests-4.md) · 5차: [backend-api-requests-5.md](backend-api-requests-5.md) · 6차: [backend-api-requests-6.md](backend-api-requests-6.md)
>
> **요청 1건입니다. 🔴 지금 SA-02 오퍼레이터 탭을 막고 있습니다.**
>
> **서버는 정상입니다.** 실제 응답에는 필드가 다 옵니다 — **스펙 스키마만 잘려 있습니다.**

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `Operator` 스키마에 필드 6개가 빠져 있다 (서버는 다 내려줌) | 🔴 **막힘** |

---

## 1. 🔴 R1 — `Operator` 스키마가 실제 응답과 다르다

### 관측

`GET /api/v0/organizations/{organizationId}/operators`를 실제로 호출한 응답입니다.

```jsonc
{
  "organizationId": "8660c0d3-…",
  "activeCount": 0,
  "content": [
    {
      "memberId": "06a0859b-…",
      "name": null,
      "email": "…@example.invalid",
      "status": "PENDING",                    // ← 스키마에 없음
      "invitedAt": "2026-08-07T16:40:57Z",    // ← 없음
      "lastLoginAt": null,                    // ← 없음
      "pendingInvitationTokenId": "8285e903-…", // ← 없음
      "suspendable": false,                   // ← 없음
      "invitationDeliveryFailed": false       // ← 없음
    }
  ]
}
```

**그런데 스펙의 `Operator` 스키마에는 셋뿐입니다.**

```
components.schemas.Operator   →   memberId · name · email
```

### 설명문에는 아홉 개가 다 적혀 있습니다

같은 오퍼레이션의 `description` 표에 이렇게 적어 두셨습니다.

| 필드 | 설명 (원문) |
|---|---|
| `status` | `ACTIVE`(활성) · `PENDING`(초대됨) · `INACTIVE`(정지) |
| `invitedAt` | 최초 초대 시각. 초대 이력이 없으면 `null` |
| `lastLoginAt` | 최근 로그인. 없으면 `null` → 화면에 `대기 중` |
| `pendingInvitationTokenId` | 대기 중 초대 토큰. **`null`이 아니면 취소·재발송 가능** |
| `suspendable` | `false`면 정지 버튼을 잠근다(마지막 활성 오퍼레이터) |
| `invitationDeliveryFailed` | `true`면 **메일이 나가지 않았다** → 재발송 유도 |

**문서가 요구하는 화면 동작이 전부 이 여섯 개에 달려 있습니다.** 「행별 버튼 노출 기준」 표도 `suspendable`·`pendingInvitationTokenId`를 조건으로 쓰고 있습니다.

### 이게 저희를 막는 이유

저희는 **스펙에서 타입을 생성**합니다. 스키마에 없는 필드는 타입에 없고, 쓰면 컴파일이 막습니다.

```ts
// 생성된 타입
type findOperators_Item = { memberId: string; name: string; email: string }

op.status        // ✗ 컴파일 에러
op.suspendable   // ✗ 컴파일 에러
```

그래서 **상태 배지도, 정지 버튼 잠금도, 메일 실패 경고도 만들 수 없습니다.** 오퍼레이터 탭이 통째로 목 데이터에 남아 있습니다.

> **응답을 그냥 `as`로 캐스팅해 쓰지는 않습니다.** 그러면 스펙이 고쳐졌을 때 그 캐스팅이 남고, "스펙에 없는데 쓰고 있는 필드"를 아무도 추적하지 못합니다.

### 왜 이렇게 됐을지 — 추측

`Operator`가 **`OrganizationResponse.operators`에서도 쓰입니다.** 거기서는 이름·이메일만 필요할 텐데, **두 응답이 같은 스키마 이름을 공유**하면서 좁은 쪽에 맞춰진 것으로 보입니다.

```
OrganizationResponse.operators[]   →  Operator   (이름·이메일이면 충분)
OperatorListResponse.content[]     →  Operator   (아홉 필드가 필요)
```

### 요청

**목록용 스키마를 분리해 주세요.**

```
OrganizationResponse.operators[]  →  Operator            (지금 그대로, 3필드)
OperatorListResponse.content[]    →  OperatorListItem    (9필드)
```

이름은 편하신 대로 정하셔도 됩니다. 핵심은 **두 응답이 같은 스키마를 공유하지 않는 것**입니다.

`OperatorListItem`에 들어갈 것은 설명문 표 그대로입니다.

| 필드 | 타입 | 필수 |
|---|---|---|
| `memberId` | UUID | 필수 |
| `name` | string? | 필수(값은 null 가능) |
| `email` | string | 필수 |
| `status` | enum `OperatorAccountStatus` | 필수 |
| `invitedAt` | date-time? | 필수(값은 null 가능) |
| `lastLoginAt` | date-time? | 필수(값은 null 가능) |
| `pendingInvitationTokenId` | UUID? | 필수(값은 null 가능) |
| `suspendable` | boolean | 필수 |
| `invitationDeliveryFailed` | boolean | 필수 |

> `status`는 이미 `OperatorAccountStatus`(`PENDING`·`ACTIVE`·`INACTIVE`)가 정의돼 있으니 **`$ref`로 참조**해 주시면 됩니다. 인라인으로 값을 다시 적으면 6차 R2와 같은 문제(같은 개념이 두 타입으로 갈림)가 생깁니다.

---

## 2. 저희 쪽 확인 — 다른 응답도 전수로 봤습니다

같은 종류가 더 있는지, **설명문 표의 필드명과 응답 스키마의 실제 필드**를 전부 대조했습니다.

| 오퍼레이션 | 결과 |
|---|---|
| `findOperators` | 🔴 **6개 누락** — 위 R1 |
| `findTraineeRoster` | ✅ 항목 스키마 온전(13필드 일치) |
| `findManagers` | ✅ 온전(11필드 일치) |
| 그 외 | ✅ 문서에만 있는 것은 **요청 파라미터·에러 코드**라 정상 |

**응답 필드가 실제로 빠진 것은 `Operator` 하나였습니다.** 회차를 나눠 보내지 않으려고 먼저 훑었습니다.

---

## 3. 진행 상황 — 이번 요청과 무관하게 붙인 것

| | |
|---|---|
| SA-02 ① 개요 탭 | ✅ **실서버 연동** — 기수 목록·저장량·예산 소진율 |
| SA-02 ② 오퍼레이터 | 🔴 **R1에 막힘** + 초대 3종은 5차 R1(`hold`) 대기 |
| SA-02 ③ 사용량·비용 | ⏳ 착수 예정 |
| SA-02 ④ 설정 | ⏳ 6차 R1(부분 수정) 대기 |

개요 탭에서는 목이 추정하던 값 셋이 **서버 값으로 바뀌었습니다** — 진행 세션 수(`교육생 × 0.04` 추정이었음), 저장량 증감률(`+8%` 하드코딩이었음), 예산 소진율(화면 나눗셈이었음).

---

## 4. 확인 요청 하나 — `findUsage`의 `period`

R1과 별개로, 사용량 탭을 붙이면서 형식을 몰라 못 넘기고 있습니다.

```
GET /api/v0/organizations/{organizationId}/operations/usage?period=…
period: { "type": "string" }     ← 설명·예시·enum이 없습니다
```

- `2026-08` 같은 `YYYY-MM`인가요?
- 아니면 `CURRENT`·`LAST_MONTH` 같은 상대 표기인가요?
- 생략하면 이번 달인가요?

**설명이나 `example`을 한 줄 붙여 주시면** 저희가 화면의 기간 선택을 그에 맞춥니다(지금 화면은 `이번 달`·`지난 달`·`2개월 전` 세 가지입니다).
