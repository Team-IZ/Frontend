# API 붙이는 법 — 처음 보는 사람용

> **이 문서를 먼저 읽는 사람:** 화면에 서버 데이터를 붙여야 하는데 `src/api/` 폴더가 뭔지 모르겠는 사람.
> **읽는 데 10분.** 왜 이렇게 만들었는지는 맨 아래에서 짧게 설명하고, 자세한 근거는 다른 문서로 넘긴다.
> ⚠️ **"스웨거/OpenAPI가 뭔데요?" 라면** [OpenAPI가 뭔가](openapi-basics.md)를 **먼저** 읽는다(15분). 이 문서는 그걸 안다고 가정한다.

---

## 0. 한 줄 요약

**백엔드 API 문서를 읽어서 `src/api/` 폴더의 코드를 자동으로 만들어 둔다. 화면은 거기 있는 훅을 부르기만 하면 된다.**

```tsx
const { data, isPending, isError } = useFindOrganizations({ query: { page: 0, size: 20 } })
```

`fetch`도 주소도 안 쓴다. 이 한 줄이면 조회가 끝난다.

---

## 1. 왜 자동으로 만드나

백엔드가 API를 만들면 **OpenAPI 문서**라는 게 자동으로 나온다. "이 주소로 이런 걸 보내면 이런 게 온다"가 전부 적힌 JSON 파일이다.

> **OpenAPI 문서**란 서버가 자기 API를 기계가 읽을 수 있는 형식으로 적어 둔 것이다. 백엔드가 손으로 쓰는 게 아니라 코드에서 자동 생성된다.

이걸 손으로 옮겨 적으면 이런 일이 생긴다.

| 손으로 쓰면 | |
| --- | --- |
| 주소를 오타 낸다 | `/organizatons` — 실행해야 안다 |
| 응답 타입을 직접 적는다 | 백엔드가 필드를 바꿔도 **아무도 모른다** |
| 같은 코드를 46번 쓴다 | 조금씩 달라지고, 그게 버그가 된다 |

**자동 생성하면 셋 다 사라진다.** 주소·파라미터·응답 타입이 전부 문서에서 나오므로, 백엔드가 뭘 바꾸면 **다시 생성했을 때 타입 에러로 튀어나온다.**

---

## 2. 화면에서 쓰는 법 — 이것만 알면 된다

### 조회 (데이터 가져오기)

```tsx
import { useFindOrganizations } from '@/api/organization/useOrganizationQueries'

function OrgListScreen() {
  const { data, isPending, isError, refetch } = useFindOrganizations({
    query: { page: 0, size: 20 },
  })

  if (isPending) return <Skeleton />
  if (isError) return <ErrorBox onRetry={() => refetch()} />

  return <Table rows={data.content} />
}
```

**항상 이 넷을 다 그린다.** 로딩·실패·비어 있음·정상. 목으로 만들 때는 실패가 안 나서 잊기 쉬운데, 실서버에서는 네트워크가 잠깐 끊기는 것만으로 실패한다.

### 변경 (만들기·수정·삭제)

```tsx
import { useCreateOrganization } from '@/api/organization/useOrganizationMutations'

const create = useCreateOrganization()

async function onSubmit() {
  try {
    const org = await create.mutateAsync({ body: { name, emailDomain, dataRetentionDays } })
    onCreated(org)
  } catch (e) {
    setError('만들지 못했습니다.')
  }
}

<Button disabled={create.isPending}>만들기</Button>
```

**목록을 다시 읽는 코드를 안 써도 된다.** 변경이 성공하면 그 도메인의 조회가 **자동으로 다시 읽힌다.** 기관을 만들면 기관 목록도, 상단 집계도 알아서 갱신된다.

> 더 좁게 갱신하고 싶으면 `options.onSuccess`에서 직접 하면 되고, **기본 동작은 그냥 두면 된다.** 넓게 다시 읽는 게 낭비일 순 있어도 틀리진 않는다.

### 에러 문구 고르기

서버는 실패할 때 **코드**를 같이 준다. 그걸로 분기한다.

```tsx
import { isApiError } from '@/api/_contract'

catch (e) {
  setError(
    isApiError(e) && e.code === 'LAST_SUPER_ADMIN'
      ? '마지막 슈퍼어드민은 정지할 수 없습니다.'
      : '상태를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.',
  )
}
```

⚠️ **서버가 준 `message`를 그대로 화면에 띄우지 않는다.** 그건 개발자용 문구다. **화면 문구는 우리가 정한다** — 백엔드도 그렇게 명시했다.

⚠️ **`code`가 항상 쓸모 있진 않다.** `BAD_REQUEST`·`CONFLICT`처럼 HTTP 상태를 그대로 옮긴 코드는 아무것도 구분해 주지 못한다. 그럴 땐 `e.status`로 떨어진다.

### 목록 응답의 모양이 제각각일 때

백엔드 목록 응답 형태가 다섯 가지다. 표에 넘기기 직전에 한 번 통과시킨다.

```tsx
import { toPage } from '@/api/_contract'

const result = data ? toPage(data) : null
const rows = result?.items ?? []
const total = result?.total ?? 0
```

이름이 `content`가 아닌 응답(예: `classrooms`)은 이렇게 맞춰 준다.

```tsx
toPage({ content: data.classrooms })
```

---

## 3. 명령 세 개

```bash
npm run api:pull    # 백엔드에서 최신 API 문서를 받아온다
npm run api:check   # 그 문서에 문제가 없는지 검사한다
npm run api:gen     # 문서를 읽어 src/api/ 코드를 만든다
```

**보통은 세 개를 순서대로 돌린다.** 백엔드가 "API 추가했어요" 하면 이 셋을 돌리고, 새로 생긴 훅을 쓰면 된다.

| 언제 돌리나 | |
| --- | --- |
| 백엔드가 API를 바꿨다고 할 때 | `pull` → `check` → `gen` |
| 생성 코드가 이상해 보일 때 | `gen`만 다시 |
| 평소 | **안 돌려도 된다.** 결과물이 저장소에 들어 있다 |

> **커밋할 때 자동으로 안 돈다.** 일부러 그렇게 뒀다 — 네트워크가 안 되는 날 커밋이 막히면 안 되기 때문이다. 대신 CI가 "문서만 바꾸고 생성을 안 돌렸는지"를 검사한다.

---

## 4. 폴더에 뭐가 있나

```
src/api/
├─ _contract/      ← 손으로 쓴다. 통신·에러·인증
├─ schema.d.ts     ← 생성물. API 문서 원본 타입
├─ errorCodes.ts   ← 생성물. 서버가 낼 수 있는 에러 코드 전량
├─ PENDING.md      ← 생성물. 아직 못 쓰는 API 목록
└─ organization/   ← 생성물. 도메인마다 하나
   ├─ organizationTypes.ts        타입
   ├─ organizationApi.ts          호출 함수
   ├─ organizationKeys.ts         캐시 키
   ├─ useOrganizationQueries.ts   ← 화면이 쓰는 것 (조회)
   └─ useOrganizationMutations.ts ← 화면이 쓰는 것 (변경)
```

**화면이 직접 쓰는 건 마지막 두 개뿐이다.** 나머지는 그 둘이 알아서 쓴다.

### 손대도 되는 것 / 안 되는 것

| | |
| --- | --- |
| ❌ **`_contract` 빼고 전부** | 파일 맨 위에 `자동 생성 — 손으로 고치지 마세요`가 붙어 있다. 고쳐도 **다음 생성 때 날아간다** |
| ⭕ `_contract/` | 손으로 쓰는 곳. 고칠 일이 있으면 여기 |

**생성물이 이상하면 그 파일이 아니라 `scripts/api-gen.mjs`를 고친다.** 결과가 아니라 원인을 고치는 것이다.

### 폴더 이름은 어디서 오나

`organization`·`auth`·`member` 같은 이름은 **백엔드가 API 문서에 붙인 분류(태그)** 다. 우리 화면 이름이 아니다.

**화면 폴더 옆에 두지 않은 이유가 있다.** 한 분류를 두 역할의 화면이 같이 쓰기 때문이다. 화면 옆에 두면 어느 화면 것인지 임의로 골라야 하고, 다른 역할이 쓰려 할 때 레이어 규칙에 막힌다.

---

## 5. 이름 규칙 — 외울 게 하나뿐이다

타입 이름은 전부 **`{API이름}_{종류}`** 다.

```ts
login_Body        // 보낼 것
login_Response    // 받을 것
login_Errors      // 이 API가 낼 수 있는 에러 코드들
findOrganizations_Query   // 쿼리 파라미터
findOrganization_Path     // 주소에 박히는 값 ({organizationId} 같은 것)
findOrganizations_Item    // 목록의 한 줄
```

**백엔드가 스키마를 뭐라 이름 붙였는지 몰라도 된다.** API 이름만 알면 타입 이름이 나오고, 편집기에서 `login_`까지 치면 뒤가 뜬다.

훅 이름은 **`use` + API이름**이다. `findOrganizations` → `useFindOrganizations`.

---

## 6. 자주 막히는 것

| 증상 | 원인 · 해결 |
| --- | --- |
| 쓰려는 API의 훅이 없다 | **일부러 안 만들었다.** `src/api/PENDING.md`에 이유가 적혀 있다 — 아직 서버가 준비 안 된 것들이다. 그 화면은 목으로 둔다 |
| 파일 업로드를 못 하겠다 | 업로드는 생성 대상이 아니다(`PENDING.md` 아래쪽). 타입은 있으니 그걸 쓰고 호출은 손으로 |
| `api:gen` 돌렸는데 안 바뀐다 | 문서를 안 받았다. `npm run api:pull` 먼저 |
| 타입이 이상하다 (`'90' \| '180'` 같은 것) | **백엔드 문서가 틀린 것이다.** 생성물은 문서를 그대로 비춘다. 화면에서 우회하되 **왜 우회하는지 주석을 반드시 남긴다** |
| 훅을 import했더니 린트가 막는다 | `features/A`가 `features/B`를 부르면 막힌다. **생성 훅을 직접 쓰면 된다** — 같은 캐시 키라 요청이 더 나가지도 않는다 |
| 화면이 갑자기 없는 export를 참조한다며 죽는다 | 개발 서버 캐시다. `rm -rf node_modules/.vite` |

---

## 7. 왜 이렇게 짰나 — 짧게

전부 이해할 필요는 없다. **"왜 저렇게 했지?" 싶을 때만** 보면 된다.

**하나, 훅까지 만들어 주는 도구(orval 등)를 안 썼다.** 그런 도구는 캐시 키 모양·에러 타입·파일 배치를 자기가 정한다. 우리는 **API가 절반만 나와서 나머지 화면이 목으로 돌아야** 하는데, 그 공존을 설정으로 구부리면 다음 버전에서 깨진다. 그래서 타입만 받고 얇은 층을 직접 만들었다.

**둘, 문서를 한 번만 읽고 구조화한 뒤 모든 걸 거기서 만든다.** 참고했던 사내 생성기는 **자기가 방금 만든 파일을 정규식으로 다시 읽고 있었고**, 그 때문에 응답 타입이 `any`로 떨어지고 주소가 뭉개졌다. 그 구조를 안 물려받았다.

**셋, 판단이 필요한 건 생성하지 않는다.** 조회 훅은 기계적이라 만들고, "정확히 어느 목록을 다시 읽어야 하나" 같은 건 못 만든다. 그래서 **도메인 전체를 다시 읽는 것**을 기본으로 주고 필요하면 화면이 덮어쓴다.

**넷, 문서가 이상하면 생성물도 이상한 게 맞다.** 생성기에서 보정하면 **생성물이 거짓말을 하게 된다.** 보정은 손으로 쓰는 층에서, 한 곳에서, 이유를 적고 한다.

### 더 알고 싶으면

- [API 계층 결정 지점](api-layer-decisions.md) — 층·훅·캐시 키·타입·에러를 왜 이렇게 했나
- [codegen 설계](api-codegen.md) — 결정 지점 전량(후보·판단·근거)
- [인증·세션 설계](auth-design.md) — 토큰을 어디에 두나
- [API 경계](api-boundary.md) — 화면이 하면 안 되는 서버 판정
- [API 없이 화면 만들기](../mock-first-screens.md) — **아직 API가 없는 화면**을 만들 때는 이쪽

---

## 8. 요약 카드

```tsx
// 조회
const { data, isPending, isError, refetch } = useFindThings({ query: {…} })

// 변경 — 목록 갱신은 자동
const create = useCreateThing()
await create.mutateAsync({ body: {…} })

// 에러 분기
if (isApiError(e) && e.code === 'SOME_CODE') …

// 목록 모양 맞추기
const { items, total } = toPage(data)
```

```bash
npm run api:pull && npm run api:check && npm run api:gen
```

**생성물은 고치지 않는다. 고칠 게 있으면 `scripts/api-gen.mjs`나 `src/api/_contract/`.**
