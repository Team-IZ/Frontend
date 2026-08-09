# 백엔드 API — 9차 요청

> 1차: [backend-api-requests.md](backend-api-requests.md) · 2차: [backend-api-requests-2.md](backend-api-requests-2.md) · 3차: [backend-api-requests-3.md](backend-api-requests-3.md) · 4차: [backend-api-requests-4.md](backend-api-requests-4.md) · 5차: [backend-api-requests-5.md](backend-api-requests-5.md) · 6차: [backend-api-requests-6.md](backend-api-requests-6.md) · 7차: [backend-api-requests-7.md](backend-api-requests-7.md) · 8차: [backend-api-requests-8.md](backend-api-requests-8.md)
>
> **8차 R1·R2 반영 확인했습니다.** `SectionItemResponse.description`이 `["string","null"]`이 됐고 `ReplaceRequirementsRequest`에 `required`가 붙었습니다. 검사기가 **error 0 · warn 4**입니다(8차 때 error 2 · warn 18).
>
> 이번 것은 **화면 두 벌**을 동시에 붙이려다 나왔습니다.
>
> - **OP-03 프로젝트 목록 · OP-04 프로젝트 상세** → §1~§6 (R1~R4 · Q1~Q2)
> - **OP-06 운영 관리**(기수·반·명단·매니저·교안·비용 6탭) → §7~§12 (R5~R8 · Q3)
>
> 요청 8건 + 확인 3건입니다. **§7 R5가 이번 회차에서 제일 급합니다** — 한 줄 고치면 풀립니다.

---

## 0. 한눈에

| | 무엇 | 화면 | 우선순위 |
|---|---|---|---|
| **R5** | `Manager.memberId`만 **integer**, 나머지 매니저 ID는 전부 **UUID** | OP-06 반 | 🔴 **막힘 · 최우선** |
| **R1** | 프로젝트에 **저장한 것을 되읽는 GET이 없다** — 교안·검증개념·요구사항 | OP-04 | 🔴 **막힘** |
| **R2** | `findConceptCandidates`가 `findSections`보다 좁다 — 섹션·페이지 없음 | OP-04 | 🔴 **막힘** |
| **R6** | 반을 만든 뒤 **고치거나 지울 수 없고**, `capacity`를 되읽을 수 없다 | OP-06 반 | 🔴 **막힘** |
| **R7** | 매니저 계정 조작 3종(정지·재발송·취소)이 없다 — 오퍼레이터엔 다 있다 | OP-06 매니저 | 🟠 중간 |
| **R3** | `findProjects`에 검색·필터·정렬·상태별 개수가 없다 | OP-03 | 🟠 중간 |
| **R4** | 삭제가 없다 — 프로젝트 · 교안 연결 해제 | OP-04 | 🟠 중간 |
| **R8** | 교안 **기관 전체 목록**과 **단건 상세**가 없다 | OP-06 교안 | 🟠 중간 |
| **Q1** | `status` 3값이 화면의 준비 상태를 못 가른다 — 누가 판정하나 | OP-03 | 🟡 확인 |
| **Q2** | `startDate`/`endDate`가 `date`인데 화면은 마감 **시각**을 그린다 | OP-04 | 🟡 확인 |
| **Q3** | 확인 3건 — 담당 반 저장의 원자성 · 상태 값이 두 벌 · CSV 사전 검증 | OP-06 | 🟡 확인 |

**전부 실호출 또는 스펙 전수 대조로 확인했습니다.** 7차 때 `Operator`가 스펙엔 3필드인데 서버는 9필드를 주고 있었으므로, 이번에는 스펙만 보고 적지 않았습니다 — OP-03·OP-04는 `operator@example.com`으로 로그인해 응답을 직접 받아 봤고, OP-06은 화면의 경계 함수 **29개를 스펙의 오퍼레이션과 1:1로 대조**했습니다.

---

# Ⅰ. OP-03 · OP-04 — 프로젝트

## 1. 🔴 R1 — 저장은 되는데 되읽을 수가 없습니다

### 관측

프로젝트에 붙이는 것이 셋이고, **셋 다 쓰기만 있습니다.**

| 무엇 | 쓰기 | 읽기 |
|---|---|---|
| 교안 연결 | `POST /projects/{id}/curricula` | **없음** |
| 검증 개념 | `PUT /projects/{id}/concepts` | **없음** |
| 요구사항 | `PUT /projects/{id}/requirements` | **없음** |

`GET /projects/{projectId}`를 실제로 호출한 응답입니다.

```jsonc
{
  "projectId": "e25e65a3-b05c-552c-8837-f21f06bfb6b0",
  "cohortId":  "eb5afbe2-41ad-5beb-a045-4d1bf5c96075",
  "name": "미니프로젝트 6차",
  "sequenceNo": 6,
  "category": "MINI_PROJECT",
  "status": "PLANNED",
  "startDate": "2027-02-15",
  "endDate": "2027-02-26"
}
```

**여덟 필드가 전부입니다.** 스펙과 실제 응답이 정확히 같았습니다 — 7차 때와 달리 서버가 더 주고 있지는 않습니다.

### 이게 저희를 막는 이유 — 화면이 그리는 값이 응답에 없습니다

기획 문서가 아니라 **지금 만들어져 돌아가는 화면 코드**에서 뽑았습니다.

| 화면 · 파일 | 그리는 것 | 서버 |
|---|---|---|
| 목록 `ProjectSummaryCells.tsx:22` | 교안 없으면 **`교안 연결 안 됨`** | ❌ |
| 목록 `ProjectSummaryCells.tsx:26` | 연결 교안 이름·버전을 세로로 나열 | ❌ |
| 목록 `ProjectSummaryCells.tsx:51` | **`⚠ 미확정 · 후보 12건에서 3건`** | ❌ |
| 목록 `ProjectSummaryCells.tsx:57` | 확정 개념 3개를 칩으로 | ❌ |
| 개요 `OverviewTab.tsx:66` | **`검증 개념 2 / 3건`** | ❌ |
| 개요 `OverviewTab.tsx:72` | **`교안 2개`** + 이름 나열 | ❌ |
| 구성 `ConfigTab.tsx:92` | 교안별 **`· 검증 개념 2건 사용 중`** | ❌ |
| 구성 `ConfigTab.tsx:118` | 개념마다 **출처 교안 + 페이지** | ❌ |
| 구성 `ConfigTab.tsx:174` | 요구사항 번호 목록 | ❌ |
| 현황 `StatusTab.tsx:59` | 개념 3건 전이면 **집계를 아예 안 그린다** | ❌ |

**OP-04 네 탭 중 셋(개요·구성·현황)이 이 값들 위에 서 있습니다.** 특히 `StatusTab`은 개념이 3건인지를 첫 줄에서 보고 화면을 통째로 가르므로, 그 값이 없으면 **`class-progress`가 잘 와도 그릴 수 없습니다.**

그리고 저장 직후가 특히 문제입니다. `PUT /concepts`로 3건을 확정한 뒤 **화면을 갱신할 방법이 없습니다** — 무엇이 저장됐는지 다시 물어볼 곳이 없어서, 사용자는 저장했는데 화면은 그대로인 상태를 봅니다.

> **응답을 안 믿고 로컬 상태로 들고 있지는 않습니다.** 그러면 새로고침하는 순간 사라지고, 다른 사람이 바꾼 것도 안 보입니다.

### 요청

**`GET /projects/{projectId}` 응답을 넓혀 주시는 쪽을 선호합니다.** 상세 화면이 한 번에 필요한 값이라 세 번 나눠 부르면 화면 진입에 조회가 4건이 됩니다.

```jsonc
{
  // …지금 8필드 그대로…
  "curricula": [                       // 연결 교안. 순서는 sequenceNo
    { "projectCurriculumId": "…", "curriculumVersionId": "…", "materialId": "…",
      "originalFileName": "spring_backend_v1.pdf", "versionNo": 1,
      "linkedAt": "2026-07-02T00:00:00Z" }
  ],
  "concepts": [                        // 확정된 검증 개념. 0건 또는 3건
    { "mappingId": "…", "teachesId": "…", "extractedName": "트랜잭션 경계 설정",
      "curriculumVersionId": "…",      // ← 출처. 없으면 교안 위치를 가리킬 수 없습니다
      "pageStart": 53, "pageEnd": 55 }
  ],
  "conceptCandidateCount": 12,         // ← 후보 수. 화면이 세면 교안 전량을 받아야 합니다
  "requirementTitles": ["…", "…"]      // PUT /requirements로 보낸 그 배열
}
```

**`conceptCandidateCount`를 따로 청하는 이유**는 화면이 `후보 12건에서 3건`을 목록 표의 셀마다 그리기 때문입니다. 화면이 세려면 회차마다 `concept-candidates`를 부르거나 교안 전량을 받아야 하는데, 목록에 회차가 6개면 조회가 6건 더 나갑니다.

**나누는 편이 편하시면** `GET /projects/{id}/curricula` · `GET /projects/{id}/concepts` · `GET /projects/{id}/requirements` 셋이어도 붙일 수 있습니다. 다만 목록 화면은 회차마다 부를 수 없으므로 **`findProjects` 항목에 `conceptCount`·`curriculumCount`·`conceptCandidateCount` 세 숫자만이라도** 실어 주시면 좋겠습니다.

---

## 2. 🔴 R2 — 같은 개념 데이터인데 후보 조회만 좁습니다

### 관측

두 API가 같은 매핑을 내려주는데 필드 수가 다릅니다.

```jsonc
// GET /curricula/{materialId}/sections  →  items[]
{ "mappingId": "…", "extractedName": "…", "description": "…",
  "definitionMissing": false, "pageStart": 53, "pageEnd": 55,
  "usedAsVerificationConcept": true, "usedRoundLabels": ["미프 2차"] }
// 그리고 이 items를 감싸는 section이 title · pageStart · pageEnd를 갖습니다

// GET /projects/{projectId}/concept-candidates   ← 실제 응답
{ "mappingId": "…", "teachesId": "…",
  "extractedName": "트랜잭션 경계 설정",
  "description": "트랜잭션 경계 설정에 대한 교안 정의문" }
```

**후보 쪽에 `pageStart`·`pageEnd`·`definitionMissing`·섹션 정보가 없습니다.**

### 이게 저희를 막는 이유

개념을 고르는 화면(`components/ConceptPicker.tsx`)이 **후보를 교안·섹션별로 묶어서** 그립니다.

```tsx
// ConceptPicker.tsx:36 — 실제 코드
groupBySection(c.teaches).map(([section, items]) => (
  <p>{c.name} {c.version} · {section}</p>   // ← 섹션 제목이 없으면 이 줄을 못 그립니다
```

파일 머리에 이유가 적혀 있습니다 — *"후보를 교안·섹션별로 묶는다. 합쳐 늘어놓으면 `p.55`가 어느 교안의 55쪽인지 알 수 없다."* 지금 응답으로는 **후보 12건이 평평한 한 덩어리**가 되고, 그 12건이 어느 교안에서 왔는지도 응답에 없습니다(`curriculumVersionId`가 없습니다).

그리고 확정된 개념은 **출처를 달고 다녀야** 합니다. 구성 탭이 개념마다 `· spring_backend_v1 v1 · p.53`을 쓰고(`ConfigTab.tsx:126`), 리포트와 면담 브리프가 그 값으로 교안 위치를 가리킵니다.

> **7차 R1과 같은 모양입니다.** 그때도 같은 데이터를 두 응답이 공유하면서 좁은 쪽에 맞춰져 있었습니다.

### 요청

`findConceptCandidates`의 항목을 `findSections`의 항목과 같은 모양으로 맞춰 주세요.

| 더할 필드 | 왜 |
|---|---|
| `curriculumVersionId` | 어느 교안에서 온 후보인지 — 묶는 기준 |
| `sectionId` · `sectionTitle` | 섹션 헤더 문구 |
| `pageStart` · `pageEnd` | `p.53` 표기. 확정 뒤에도 계속 쓰입니다 |
| `definitionMissing` | 정의문이 없는 항목을 고르면 문항 품질이 갈립니다 |

**`findSections`의 항목 스키마를 그대로 `$ref`로 재사용**해 주시면 가장 좋습니다. 두 응답이 갈리면 한쪽에만 필드가 붙는 일이 또 생깁니다.

---

## 3. 🟠 R3 — 목록이 배열만 옵니다

```
GET /api/v0/cohorts/{cohortId}/projects
파라미터: cohortId (경로) 뿐
응답: Project 배열
```

화면(`list/filterState.ts`)이 네 가지를 보냅니다.

| 화면이 보내는 것 | 값 |
|---|---|
| `search` | 회차 이름 검색 |
| `curriculumId` | 교안으로 좁히기 |
| `status` | 상태로 좁히기 |
| `sort` | `준비 필요 순` · `마감 임박 순` · `시작 이른 순` |

그리고 헤더가 **상태별 개수**를 그립니다(`ProjectListScreen.tsx:94` — `총 7개`, 상태 필터 드롭다운에 `준비 중 2 · 진행 중 1 · 종료 2`). 이건 **필터와 무관한 전체 모집단 기준**이라 걸러진 목록에서는 셀 수 없습니다.

### 저희 판단 — 지금은 프론트가 흡수합니다

기수당 회차가 6~8건이라 전량이 한 페이지에 들어가고, 목록에 페이저도 없습니다. **`api.ts` 안에서 거르고 정렬합니다** — 화면 코드는 그대로 두고 경계 안에만 남깁니다.

**다만 기록으로 남깁니다.** ① 회차가 쌓이거나 ② 페이지를 나눠야 할 때 **클라이언트 정렬은 현재 페이지 안에서만 맞기 때문에** 그 순간 재작성이 됩니다. 우선순위는 낮지만, 서버로 옮길 계획이 있는지만 알려주시면 저희가 그때를 대비합니다.

> `total`은 배열 길이로 됩니다. **`counts`(상태별 개수)만은 지금도 정확히 못 만듭니다** — R3 중에서는 이것 하나가 실제 결함입니다.

---

## 4. 🟠 R4 — 삭제가 없습니다

`Project Execution` 11개 중 **`DELETE`가 하나도 없습니다.**

| 화면 | 파일 | 지금 |
|---|---|---|
| 회차 삭제 | `ConfigTab.tsx:190` 위험 구역 + `DeleteProjectDialog.tsx` | 버튼·모달이 다 있는데 부를 곳이 없습니다 |
| 교안 연결 해제 | `ChangeCurriculaDialog.tsx` | `POST /curricula`로 붙이기만 되고 뗄 수가 없습니다 |

**교안 해제가 더 급합니다.** 변경 모달이 체크박스로 교안을 켜고 끄는데, 끄는 쪽이 서버에 없어서 **한 번 잘못 붙이면 되돌릴 수 없습니다.**

```
DELETE /api/v0/projects/{projectId}/curricula/{projectCurriculumId}
DELETE /api/v0/projects/{projectId}
```

**삭제 가능 조건은 서버가 판정해 주세요.** 화면도 `rules.ts`의 `canDelete`로 막지만(제출·응시가 붙은 회차는 못 지움), 클라이언트 검증만 있으면 우회되고 그때 사라지는 것은 **학생이 실제로 한 제출·분석·응시**입니다. 확정 개념이 쓰는 교안을 떼는 것도 같은 성격이라(`canUnlinkCurriculum`) 막아 주시면 좋겠습니다 — 출처가 끊긴 개념은 리포트가 교안 위치를 못 가리킵니다.

---

## 5. 🟡 Q1 — `status` 3값이 화면의 질문에 답하지 못합니다

```
서버   PLANNED · RUNNING · CLOSED        (시간 기준)
화면   PREP · READY · RUNNING · DONE     (설계 기준)
```

화면 쪽 값은 `labels.ts`에서 `준비 중 · 준비됨 · 진행 중 · 종료`로 나갑니다. **`PLANNED` 하나가 `준비 중`과 `준비됨` 둘로 갈립니다** — 교안·검증개념·마감이 다 찼는지로 가른 것입니다.

이 목록이 답하는 질문이 **"뭐부터 손대야 하나"** 라서(기본 정렬이 `준비 필요 순`), 그 축이 없으면 목록의 존재 이유가 흐려집니다. 행 배경 경고도 **`준비 중` + 마감 임박** 조합에서만 켜집니다(`ProjectListScreen.tsx:192`).

**R1이 반영되면 화면이 유추할 수 있습니다** — 교안 수·개념 수·마감 유무가 응답에 오니까요. 다만 저희 계약에는 *"상태는 서버가 판정해 내려주는 값"* 이라고 적어 뒀습니다. 화면이 유추하면 같은 규칙이 서버와 화면 두 곳에 생깁니다.

**어느 쪽으로 갈지만 정해 주세요.**
- ⓐ 서버가 준비 상태까지 판정해 `PREP`/`READY`를 내려준다
- ⓑ 서버는 지금 3값을 유지하고, **화면이 R1 값으로 유추한다**

**저희는 ⓑ도 괜찮습니다.** 그때는 계약 주석을 고치고 판정을 `rules.ts` 한 곳에 두겠습니다.

> **8차 §4에서 물어보신 것에 대한 답입니다.** `ProjectStatus`를 `CohortStatus`와 **따로 두는 쪽이 맞습니다.** 지금 값이 같은 것은 우연이고, 위 ⓐ로 가면 프로젝트에만 `PREP`·`READY`가 붙어 그 순간 갈립니다. ⓑ로 가더라도 *기수의 종료*와 *회차의 종료*는 판정 주체가 달라서(전자는 운영자 조작, 후자는 마감일) 한쪽에만 값이 늘 여지가 남습니다. **`$ref` 공유 대신 `ProjectStatus`를 새로 만들어 주세요.**

---

## 6. 🟡 Q2 — 마감에 시각이 있나요

```
GET /projects/{id}        → startDate · endDate      : "2027-02-26"        (date)
GET /projects/{id}/class-progress → submissionDueAt  : "2027-02-26T14:59:00Z" (date-time)
```

**같은 회차의 마감이 두 API에서 형식이 다릅니다.** 그리고 `14:59Z`는 KST로 `23:59`인데, 저희 화면도 마감 시각을 `23:59` 고정으로 그리고 있습니다(`rules.ts`의 `DEFAULT_DUE_TIME`). 값이 우연히 맞는 것 같은데 확인이 필요합니다.

- `PATCH /projects/{id}`에 `endDate`를 `2027-02-26`으로 보내면 서버가 **`23:59:59 KST`로 해석**하나요?
- 아니면 다른 시각인가요? 화면이 `2027-02-26 23:59`라고 쓰고 있어서, 서버 기준이 다르면 **학생에게 알려준 마감과 실제 마감이 갈립니다.**
- 시각을 운영자가 정하는 계획이 있나요? (지금 화면은 날짜만 받고 시각은 고정입니다)

> 되돌릴 수 없는 값이고 학생 화면에도 나가는 값이라, 추측하지 않고 여쭙습니다.

---

# Ⅱ. OP-06 운영 관리 — 6탭

먼저 **대조 결과 전체**를 놓습니다. 화면의 경계 함수 29개를 스펙 오퍼레이션과 1:1로 맞춰 봤습니다.

| 탭 | 붙는다 | 막힌다 |
|---|---|---|
| ① 기수 | **4 / 4** — `findCohorts`·`createCohort`·`findCohort`·`endCohort` | — |
| ② 반 | `createClassroom` | 🔴 **R5**(ID 타입) · 🔴 **R6**(수정·삭제·정원) |
| ③ 명단 | `findTraineeRoster`·`registerTrainees`·`assignTrainees`·`rollbackAssignment`·`updateTraineeStatus` | 🟡 Q3-③(CSV 사전 검증) |
| ④ 매니저 | `findManagers`·`inviteManager` | 🟠 **R7**(정지·재발송·취소) |
| ⑤ 교안 | `requestAnalysis`·`findSections` | 🟠 **R8**(목록·상세) |
| ⑥ 비용 | **1 / 1** — `findClassCosts` | — |

**①기수와 ⑥비용은 이 문서와 무관하게 지금 붙입니다.** 아래 넷이 요청 대상입니다.

---

## 7. 🔴 R5 — 같은 매니저인데 ID 타입이 두 개입니다

**이번 회차에서 제일 급한데, 고치는 것은 한 줄입니다.**

### 관측

매니저 ID가 세 곳에 나오는데 **한 곳만 타입이 다릅니다.**

| 어디 | 필드 | 타입 |
|---|---|---|
| `GET /managers` → `ManagerRosterEntry` | `managerId` | `string` · **`format: uuid`** |
| `PATCH /cohorts/{id}/classrooms/{id}/managers` → `UpdateClassroomManagersRequest` | `managerIds[]` | `string` · **`format: uuid`** |
| `GET /cohorts/{id}/classrooms` → `ClassroomResponse.managers[]` → **`Manager`** | `memberId` | **`integer` · `format: int64`** ← |

```jsonc
// components.schemas.Manager  ← 지금
{ "memberId": { "type": "integer", "format": "int64", "description": "매니저의 회원 ID" },
  "name":     { "type": "string" } }
```

### 이게 저희를 막는 이유 — 되읽어서 다시 보낼 수가 없습니다

반 탭의 담당 매니저 모달은 **읽고 → 고쳐서 → 다시 보내는** 왕복입니다.

```
① GET  /cohorts/{id}/classrooms        →  이 반의 현재 담당: memberId 41, 57   (정수)
② 모달이 체크박스를 미리 켠다           →  매니저 목록의 managerId(UUID)와 대조해야 하는데
                                          41 ↔ "a3f2…" 를 이을 수단이 없습니다
③ PATCH …/managers { managerIds: […] } →  UUID를 요구합니다
```

`UpdateClassroomManagersRequest`가 *"보낸 목록이 그대로 최종 상태가 된다"* 라고 명시돼 있어서 **②에서 현재 담당을 정확히 복원하지 못하면 저장하는 순간 나머지가 전부 해제됩니다.** 조회는 되는데 안전하게 저장할 수가 없습니다.

**이름으로 잇지는 않습니다.** `Manager`에는 `memberId`와 `name` 둘뿐이라 이메일도 없고, 기관에 동명이인이 있으면 그 순간 엉뚱한 사람이 담당이 됩니다.

> `Manager`가 **`CohortResponse.managers[]`에서도 쓰입니다.** 7차 R1(`Operator`)·8차 R2와 **같은 모양**입니다 — 한 스키마를 두 응답이 공유하면서 한쪽 사정에 맞춰졌습니다.

### 요청

**`Manager.memberId`를 `string` · `format: uuid`로 바꿔 주세요.** 다른 두 곳이 이미 UUID라 이쪽을 맞추는 것이 맞습니다.

```jsonc
"Manager": {
  "type": "object",
  "required": ["memberId", "name"],
  "properties": {
    "memberId": { "type": "string", "format": "uuid", "description": "매니저의 회원 ID" },
    "name":     { "type": "string" }
  }
}
```

**정수가 실제 DB PK라서 못 바꾸시는 경우라면**, 반대로 `ManagerRosterEntry.managerId`와 `managerIds[]`가 정수여야 합니다 — **어느 쪽이든 셋이 같기만 하면 됩니다.** 다만 다른 도메인이 전부 UUID라 이쪽만 정수면 화면 경계에서 계속 변환이 붙습니다.

**같이 부탁드리면 `Manager`에 `email`도** 넣어 주시면 좋겠습니다. 반 카드가 `이도윤 · lee@…`로 담당자를 표시하는데, 지금은 이름만 와서 동명이인을 화면에서 가릴 수 없습니다.

---

## 8. 🔴 R6 — 반은 만들 수만 있고, 고치거나 지울 수 없습니다

### 관측

`Classroom` 계열 오퍼레이션 전부입니다.

| | 오퍼레이션 |
|---|---|
| 목록 | `GET /cohorts/{cohortId}/classrooms` |
| 생성 | `POST /cohorts/{cohortId}/classrooms` |
| 담당 매니저 | `PATCH /cohorts/{cohortId}/classrooms/{classroomId}/managers` |
| 교육생 배정 | `PATCH …/classrooms/trainee-assignments` (+ `/rollback`) |
| **수정** | **없음** |
| **삭제** | **없음** |

그리고 **정원이 한쪽에만 있습니다.**

```jsonc
// CreateClassroomRequest.required = ["capacity", "name"]     ← 만들 때는 필수
"capacity": { "type": "integer", "description": "정원. 1 이상이어야 하며…" }

// ClassroomResponse.required = ["classroomId","cohortId","managerAssignmentRequired",
//                               "managers","name","traineeCount"]
//   → capacity 가 없습니다                                    ← 되읽을 수 없음
```

### 이게 저희를 막는 이유

**① 정원을 넣으라고 해 놓고 돌려주지 않습니다.** 반 카드가 `24 / 30명`을 그리는데 분모가 응답에 없습니다. 지금은 화면이 만들 때 보낸 값을 기억할 수밖에 없는데, **새로고침하면 사라지고 다른 사람이 만든 반은 처음부터 모릅니다.** R1과 같은 성격입니다 — 쓰기만 있고 읽기가 없습니다.

**② 오타 하나를 못 고칩니다.** `A반`을 `A방`으로 만들면 되돌릴 방법이 없고, 반 편성을 다시 짜는 것도 불가능합니다. 화면은 **개강 전에만** 수정·삭제를 엽니다(`rules.ts`의 `canEditClasses`) — 개강하면 회차·리포트가 반에 붙기 시작하므로 그때부터는 저희도 잠급니다.

삭제할 때 **안에 있던 교육생은 지우지 않습니다** — `classroomId`를 `null`로 되돌려 미배정으로 보냅니다. 명단에서 지우면 그 사람의 등록 이력이 끊깁니다.

### 요청

```
PATCH  /api/v0/cohorts/{cohortId}/classrooms/{classroomId}     { name?, capacity? }
DELETE /api/v0/cohorts/{cohortId}/classrooms/{classroomId}
```

그리고 **`ClassroomResponse`에 `capacity`를 추가**해 주세요(`required`에도).

- 이름 중복은 생성과 같은 규칙(같은 기수 안에서 중복이면 409)으로 봐 주시면 됩니다. **자기 자신은 빼고** 판정해야 합니다 — 이름은 그대로 두고 정원만 고치는 경우가 흔합니다.
- **정원을 현재 인원보다 작게 두는 것은 막지 말아 주세요.** 정원 초과를 애초에 허용하는 값이고(중도 합류·반 통폐합), 여기서만 막으면 규칙이 두 벌이 됩니다.
- **삭제 가능 조건은 서버가 판정해 주세요.** R4와 같은 이유입니다 — 화면만 막으면 우회되고, 그때 끊기는 것은 실제 배정 이력입니다. 소속 교육생은 미배정으로 되돌려 주시면 됩니다.

---

## 9. 🟠 R7 — 매니저 계정 조작 3종이 없습니다

### 관측

**오퍼레이터에는 다 있고, 매니저에는 초대뿐입니다.** 5차 요청으로 오퍼레이터 쪽을 만들어 주셨던 그 세 개입니다.

| 할 일 | 오퍼레이터 | 매니저 |
|---|---|---|
| 초대 | `POST …/operators/invitations` | `POST /members/organizations/{id}/manager-invitations` ✅ |
| **정지 · 재활성** | `PATCH …/operators/{memberId}/status` | **없음** |
| **초대 재발송** | `POST …/operators/invitations/{tokenId}/resend` | **없음** |
| **초대 취소** | `DELETE …/operators/invitations/{tokenId}` | **없음** |

### 이게 저희를 막는 이유

`ManagerRosterEntry`가 **`status`를 이미 내려주고 있습니다** — `INVITED` · `ACTIVE` · `INACTIVE`. 그런데 그 값을 바꿀 곳이 없어서, 화면은 **상태를 보여 주기만 하고 아무것도 못 합니다.**

특히 세 가지가 실무에서 자주 일어납니다.

- **퇴사한 매니저의 계정이 계속 살아 있습니다.** 정지가 없으면 계정을 막을 수 없습니다.
- **오타 난 이메일로 초대를 보내면 그 초대가 영원히 남습니다.** 취소가 없으니 목록에 `초대 대기`가 계속 쌓입니다.
- **메일이 안 갔을 때 다시 보낼 수가 없습니다.**

**정지는 담당 반을 놓는 조작이기도 합니다.** 상태만 바꾸면 그만둔 사람이 반을 붙들고 있어 `담당 매니저 없음` 경고(`ClassroomResponse.managerAssignmentRequired`)에 안 잡힙니다 — 그 반 학생의 면담·독촉을 아무도 처리하지 않는데 대시보드의 `조치 필요`에도 안 올라갑니다. **경고 체계가 막으려던 상황을 정지 기능이 만듭니다.**

### 요청

**오퍼레이터 3종과 같은 모양이면 됩니다.** 이미 만들어 두신 것이라 스펙도 그대로 옮기실 수 있을 겁니다.

```
PATCH  /api/v0/members/organizations/{organizationId}/managers/{managerId}/status
       { "status": "ACTIVE" | "INACTIVE", "reason"?: "…" }

POST   /api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}/resend
DELETE /api/v0/members/organizations/{organizationId}/manager-invitations/{tokenId}
```

경로는 편하신 대로 정하셔도 됩니다. 필요한 것은 셋입니다.

| | 왜 |
|---|---|
| **`INACTIVE`로 바꿀 때 담당 반을 서버가 푼다** | 위 이유. 화면이 반마다 `PATCH …/managers`를 따로 부르면 중간에 실패했을 때 절반만 풀립니다 |
| **`ManagerRosterEntry`에 `pendingInvitationTokenId`** | 재발송·취소가 토큰 단위인데 매니저 목록에 토큰 ID가 없습니다. `null`이 아니면 버튼을 켠다 — 오퍼레이터 목록과 같은 규칙입니다(7차 R1) |
| **`suspendable`** | 오퍼레이터에 있는 그것입니다. 기관의 마지막 활성 매니저를 정지하면 담당이 통째로 빕니다 |

> **재활성해도 반은 돌려주지 마세요.** 그 사이 다른 사람이 맡았을 수 있고, 되돌리는 것은 배정이지 상태가 아닙니다. 화면도 그렇게 안내합니다.

---

## 10. 🟠 R8 — 교안 탭이 볼 목록과 상세가 없습니다

### 관측

`curricula` 계열에 **읽기가 둘뿐인데, 둘 다 범위가 다릅니다.**

| 오퍼레이션 | 범위 |
|---|---|
| `GET /cohorts/{cohortId}/curricula` (`findLinkableCurricula`) | **기수 하나**에 연결 가능한 것 |
| `GET /curricula/{materialId}/sections` | 교안 하나의 **섹션·개념** |
| `GET /curricula/{materialId}/projects` | 교안 하나를 쓰는 **회차 목록** |
| **기관 전체 교안 목록** | **없음** |
| **교안 단건 상세** (`GET /curricula/{materialId}`) | **없음** |

### 이게 저희를 막는 이유

교안 탭은 **기관 전체 범위**입니다(기수 스위처의 영향을 안 받는 셋 중 하나). 지금은 기수마다 `findLinkableCurricula`를 부르고 합쳐야 하는데, ① 기수가 늘면 요청이 그만큼 늘고 ② *"연결 가능한 것"* 은 전체와 같지 않습니다 — 이미 연결됐거나 분석 실패한 교안이 빠질 수 있습니다.

그리고 **단건 상세가 없어서 교안 하나를 여는 화면을 만들 수 없습니다.** `sections`와 `projects`는 있는데, 그 위에 놓일 머리글(파일명·버전·업로드 일시·업로더·분석 상태·페이지 수)이 어디에서도 안 옵니다. 지금은 목록에서 넘어온 값을 들고 가는 수밖에 없는데, 주소로 바로 들어오면 화면이 비어 있습니다.

### 요청

```
GET /api/v0/organizations/{organizationId}/curricula?query=&status=&sort=&page=&size=
GET /api/v0/curricula/{materialId}
```

목록 항목에 필요한 것은 교안 탭이 그리는 그대로입니다.

| 필드 | 화면 |
|---|---|
| `materialId` · `originalFileName` · `versionNo` | 이름 열 |
| `analysisStatus` | `분석 중` · `분석 완료` · `분석 실패` 배지 |
| `sectionCount` · `conceptCount` | `12섹션 · 개념 48건` |
| `usedProjectCount` | `3개 회차에서 사용 중` — 삭제·교체 판단 근거 |
| `uploadedAt` · `uploadedByName` | 비고 |

**`analysisStatus`가 특히 필요합니다.** `POST /curricula/{materialId}/analyses`로 재분석을 걸어 두고 결과를 확인할 방법이 지금 없습니다 — 진행 중인지 실패했는지 물어볼 곳이 없어서 화면이 폴링할 대상이 없습니다.

> **업로드(`POST /curricula`, multipart)는 이미 있습니다.** 올리는 것은 되는데 올린 목록을 볼 수 없는 상태입니다.

---

## 11. 🟡 Q3 — OP-06 확인 3건

### ① 매니저 한 명의 담당 반을 한 번에 저장할 수 있나요

**저장 방향이 화면과 반대입니다.**

```
서버   PATCH /cohorts/{id}/classrooms/{classroomId}/managers   반 하나  = 매니저 여럿
화면   매니저 상세 모달                                          매니저 하나 = 반 여럿
```

매니저 모달에서 담당 반 셋을 체크하면 **`PATCH`를 세 번 나눠 불러야 하고**, 담당을 뗀 반까지 세면 더 늘어납니다. 중간에 하나가 실패하면 **절반만 반영된 상태**로 남습니다 — 되돌릴 방법이 없습니다.

- 매니저 기준 API(`PUT /managers/{managerId}/classrooms { classroomIds: [...] }`)를 두실 계획이 있나요?
- 아니면 **지금 방향이 정답이고 화면을 반 기준으로 고쳐야 하나요?** 그렇다면 그렇게 하겠습니다 — 두 방향을 다 두면 같은 사실이 두 곳에서 갱신됩니다.

> 급하지는 않습니다. 반이 기수당 6~10개라 호출 수 자체는 문제가 안 됩니다. **부분 실패만 확인되면 됩니다.**

### ② 계정 상태 값이 두 벌입니다

```jsonc
"AccountStatus":         ["INVITED", "ACTIVE", "LOCKED", "INACTIVE"]   // 매니저 · 교육생
"OperatorAccountStatus": ["PENDING", "ACTIVE", "INACTIVE"]             // 오퍼레이터 · 슈퍼어드민
```

**같은 개념인데 초대 대기가 `INVITED`와 `PENDING`으로 갈립니다.** 화면이 배지를 그리는 함수가 역할마다 두 벌이 되고, 두 목록을 나란히 놓는 자리에서 같은 상태가 다른 문자열로 옵니다.

그리고 `LOCKED`가 한쪽에만 있습니다. `OperatorAccountStatus` 설명에 *"v06에서 LOCKED는 폐지됐다 — 로그인 연속 실패로 인한 일시 차단은 상태가 아니라 `login_blocked_until` 시각이다"* 라고 적어 주셨는데, **`AccountStatus`에는 그대로 남아 있습니다.**

- 매니저·교육생에게 `LOCKED`가 **실제로 오나요?** 온다면 화면이 배지와 안내 문구를 만들어야 합니다.
- 오퍼레이터와 같은 이유로 폐지된 것이라면 **`AccountStatus`에서도 빼 주세요.** 안 오는 값이 타입에 있으면 화면이 못 도달하는 분기를 계속 들고 있게 됩니다.
- 이름을 하나로 합칠 계획이 있으면 알려 주세요. 지금 당장은 경계에서 접어 두겠습니다.

### ③ 명단 CSV의 사전 검증을 서버가 해 주시나요

명단 탭이 CSV를 붙여 넣으면 **등록 전에 무엇이 걸리는지** 보여 줍니다.

| 판정 | 누가 |
|---|---|
| 형식 오류 · 기관 도메인 밖 주소 | **화면이 그 자리에서** (`rules.parseRosterCsv`) |
| **이미 등록된 이메일** | 명단 전량을 받아야 셀 수 있어 **서버여야 합니다** |

지금은 `POST /cohorts/{cohortId}/trainees`(등록)만 있고 미리보기가 없습니다. 등록 응답이 *"몇 건 등록 · 몇 건 건너뜀 · 몇 행 오류"* 를 돌려주므로 **미리보기 없이도 붙기는 합니다** — 다만 200명을 붙여 넣고 나서야 30명이 중복이라는 걸 알게 됩니다.

- `POST /cohorts/{cohortId}/trainees/preview` 같은 **드라이런**을 두실 여지가 있나요?
- 없으면 저희가 흡수합니다 — 등록 결과를 그대로 보여 주고, **미리보기 단계를 화면에서 뺍니다.** 우선순위는 낮습니다.

### ④ (하나 더) 오퍼레이터가 `findOrganization`을 부를 수 있나요

명단·매니저 초대가 **기관 이메일 도메인 밖 주소**를 막습니다. 그 값(`OrganizationResponse.emailDomain`)이 `GET /organizations/{organizationId}` 하나에만 있는데, **이 API 문서가 SA-02(슈퍼어드민) 기준으로 적혀 있습니다.**

- 오퍼레이터 토큰으로 **자기 기관**을 부르면 200인가요, 403인가요?
- 403이라면 도메인을 어디서 읽어야 하나요? `GET /me` 응답에 `emailDomain` 한 줄이면 충분합니다.

> **프론트 상수로 두지는 않습니다.** 기관을 하나 더 만드는 순간 틀립니다.

---

## 12. 참고 — 요청하지 않는 것

저희가 흡수하기로 한 것들입니다. 나중에 *"왜 이건 안 물었지"* 가 안 나오게 적어 둡니다.

| | 어떻게 흡수하나 |
|---|---|
| `findCohort`에 **반 개수**가 없다 | 헤더의 `10반 250명`. `findClassrooms`를 한 번 더 불러 셉니다 |
| `class-progress`에 **전체 팀 수**가 없다 | 현황 탭이 `8개 팀 중 6개`를 쓰는데 분모가 없습니다. `failedTeams`만으로는 못 세므로 **문구를 바꾸겠습니다** |
| `managerNames`가 배열 | 화면은 담당 1명을 그립니다. 여러 명이면 `·`로 잇습니다 |
| `category: BIG_PROJECT` | 빅프로젝트는 제품에서 빠졌습니다(6차). 생성 시 항상 `MINI_PROJECT`로 보냅니다 |
| `findRounds`가 `findProjects`와 같은 것을 준다 | 스펙에 *"⚠ 임시"* 로 적혀 있어 알고 있습니다. **화면이 `roundId === projectId`를 가정하지 않게** 경계에서 접어 둡니다 |
| **OP-06 탭 배지 개수**(`기수 4 · 반 10 · 명단 250 · 매니저 8 · 교안 12`) | 전용 API를 청하려다 접었습니다 — **네 개는 이미 목록 응답에 있습니다**: `CohortListResponse.totalElements` · `ClassroomListResponse.classrooms.length` · `TraineeRosterResponse.cohortTotal` · `ManagerRosterResponse.statusCounts`. 교안만 R8에 걸립니다. 탭 하나 열려고 목록 4건이 나가는 건 감수합니다 |
| **교육생 초대 재발송** | `POST /auth/invitations/resend`가 있습니다. **다만 이건 받는 사람용입니다** — 인증 없이 부르고, 계정 존재 여부를 숨기려 항상 같은 202를 줍니다. 오퍼레이터가 명단에서 눌러도 **나갔는지 알 수 없고**, 쿨다운에 걸리면 조용히 안 나갑니다. 지금은 이걸로 붙이고 화면에 *"메일이 도착하지 않으면 잠시 후 다시"* 로 안내하겠습니다. 오퍼레이터 쪽에 `resendOperatorInvitation`(인증·`tokenId` 기반)이 있는 것처럼 **교육생·매니저에도 운영자용 재발송이 생기면** 그때 바꿉니다(R7과 같은 건입니다) |
| `ManagerRosterResponse.statusCounts`가 **기관 전체 모집단** | 설명에 명시해 주셔서 헤더 내역과 푸터 개수를 다른 값으로 그리고 있습니다. 8차 때 오퍼레이터에서 겪은 것과 같아 이번엔 헷갈리지 않았습니다 |

---

## 13. 진행 상황

### OP-03 · OP-04

| | |
|---|---|
| OP-04 ③ 현황 탭 | ✅ **`class-progress`로 붙일 수 있습니다** — 서버 값이 목보다 풍부합니다 |
| OP-04 일정 수정 | ✅ `updateSchedule` — Q2만 확인되면 |
| OP-03 목록 | ⚠️ R1(교안·개념 칸) · R3(필터·개수) |
| OP-04 ①개요 · ④구성 | 🔴 **R1에 막힘** |
| 개념 선택 모달 | 🔴 **R2에 막힘** |
| 회차 삭제 · 교안 해제 | 🔴 **R4에 막힘** |

### OP-06

| 탭 | |
|---|---|
| ① 기수 | ✅ **4/4 — 이번 주에 붙입니다** |
| ⑥ 비용 | ✅ **1/1 — 이번 주에 붙입니다** |
| ③ 명단 | ✅ 5/7 — 붙입니다. Q3-③(미리보기)만 화면에서 뺍니다 |
| ② 반 | 🔴 **R5·R6에 막힘** |
| ④ 매니저 | 🟠 목록·초대는 붙고, **R7 없이는 조작이 없습니다** |
| ⑤ 교안 | 🟠 **R8에 막힘** — 재분석만 붙습니다 |

**R5는 스키마 한 줄입니다.** 그것만 먼저 주시면 반 탭의 절반이 이번 주에 풀립니다. R1·R2가 풀리면 OP-03·OP-04가 한 번에 붙습니다.
