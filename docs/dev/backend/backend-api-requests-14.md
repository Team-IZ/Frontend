# 백엔드 API — 14차 요청

> 1차: [1](backend-api-requests.md) · 2차: [2](backend-api-requests-2.md) · 3차: [3](backend-api-requests-3.md) · 4차: [4](backend-api-requests-4.md) · 5차: [5](backend-api-requests-5.md) · 6차: [6](backend-api-requests-6.md) · 7차: [7](backend-api-requests-7.md) · 8차: [8](backend-api-requests-8.md) · 9차: [9](backend-api-requests-9.md) · 10차: [10](backend-api-requests-10.md) · 11차: [11](backend-api-requests-11.md) · 12차: [12](backend-api-requests-12.md) · 13차: [13](backend-api-requests-13.md)
>
> **요청 1건입니다.** 오퍼레이터 여섯 화면의 비동기 상태(로딩·실패)를 다듬다가 나왔습니다.
>
> **이것 하나로 프로젝트 목록 화면 전체가 열리지 않았습니다** — 화면이 빈 것이 아니라
> **앱이 흰 화면이 됩니다.** 프론트에서 방어했으니 급하지는 않지만, **스펙과 서버가
> 서로 다른 말을 하고 있는 상태**라 그대로 두면 다음에 또 같은 일이 납니다.

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | `readinessCounts`가 **스펙에는 `required`인데 응답에 없습니다** | 🔴 **불일치** |

---

## 1. 🔴 R1 — `readinessCounts`가 스펙에만 있습니다

### 관측

`GET /api/v0/cohorts/{cohortId}/projects` 실호출(운영 계정, 2026-08-11):

```
9기  f7011ddf-8b38-437e-9917-97725f258d78
  응답 키       ["projects", "total", "counts"]
  counts        {"PLANNED": 1, "RUNNING": 1, "CLOSED": 5}
  readinessCounts   ← 없음

8기  4f459e1f-379b-542f-ae60-0dc9a3c017f8
  응답 키       ["projects", "total", "counts"]
  readinessCounts   ← 없음
```

그런데 스펙(`api/openapi.json` · `ProjectListResponse`)은 이렇습니다.

```json
{
  "properties": { "projects": …, "total": …, "counts": …, "readinessCounts": … },
  "required": ["counts", "projects", "readinessCounts", "total"]
}
```

**`required`에 들어가 있습니다.** 생성된 타입도 그래서 `readinessCounts: {...}`로 좁혀지고,
화면은 그 값이 늘 온다고 믿습니다.

### 왜 이것이 화면을 깨뜨렸나

10차 Q1 회신에서 `readinessCounts`가 생겼습니다 — 서버 `counts`가 `PLANNED`·`RUNNING`·
`CLOSED` 세 키뿐이라 **준비 중(`PREP`)과 준비됨(`READY`)을 가를 수 없었기 때문**입니다.
화면은 회신대로 그 값을 읽습니다.

```ts
const r = res.readinessCounts as Record<string, number>
counts: { PREP: r.PREP, … }        // ← undefined.PREP
```

`TypeError: Cannot read properties of undefined (reading 'PREP')`

이 예외가 렌더 도중에 나기 때문에 **그 화면만 실패하는 것이 아니라 앱 전체가 사라집니다.**
프로젝트 목록에 들어갈 방법이 없습니다.

> 프론트가 값을 안 믿고 방어했어야 하는 것이 맞습니다 — 그 부분은 고쳤고,
> 라우터에 렌더 예외 그물(`errorElement`)도 뒀습니다. 아래 요청은 **그것과 별개**로
> 스펙과 서버를 맞춰 달라는 것입니다.

### 요청

둘 중 하나면 됩니다. **어느 쪽이든 알려만 주시면 화면이 맞춥니다.**

| | 무엇 | 그러면 |
|---|---|---|
| **A** | 서버가 `readinessCounts`를 **실제로 보낸다** | 상태 필터가 `준비 중 (2)` · `준비됨 (1)`로 개수를 보여줍니다 |
| **B** | 스펙에서 `required`를 빼고 **선택 필드로** 내린다 | 개수 없이 라벨만 그립니다. 기능이 빠지는 것이지 고장은 아닙니다 |

**A를 권합니다.** 개수는 *"고르기 전에 분포를 아는 것"* 이 목적이라 그 자리에 있어야
쓸모가 있습니다. 다만 B라도 화면은 지금 그대로 돕니다 — 급한 것은 **둘 중 어느 쪽인지
정해지는 것**입니다.

### 왜 급하지 않지만 중요한가

지금 상태는 **스펙이 거짓말을 하고 있는 것**입니다. 우리는 스펙에서 타입을 생성하므로,
`required`인 필드는 **컴파일러가 "없을 수 있다"는 코드를 못 쓰게 막습니다.** 즉 이 불일치가
남아 있는 한 프론트는 매번 타입을 거스르는 방어 코드를 손으로 넣어야 하고, 안 넣은 곳이
하나라도 있으면 같은 흰 화면이 다시 납니다.

같은 유형이 8차 R1(`description`이 설명은 null인데 타입이 아님)에도 있었습니다.

---

## 2. 참고 — 이번에 같이 확인한 것

요청은 아니고, 실호출로 확인한 사실입니다.

| | 관측 | 판단 |
|---|---|---|
| 기수 응답의 `traineeCount` | 9기가 **0명**으로 옵니다(실제 223명) | 10차에서 이미 올린 것 — 아직입니다 |
| 명단 페이지 응답의 `page` | 정상입니다 | 이 값 덕에 목록이 옛 값을 그리는 동안에도 **푸터가 앞서 가지 않게** 만들 수 있었습니다. 고맙습니다 |
