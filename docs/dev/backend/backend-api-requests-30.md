# 백엔드 API — 30차 요청 · 매니저 명부·상세를 붙이며

> **29차 R2 회신 감사합니다 — CI가 풀렸습니다.** 막고 있던 14건 중 13건이 사라졌고,
> 남은 1건은 저희 검사기 오탐이라 저희 쪽을 고쳤습니다(§1). **지금 스펙은 `error 0건`입니다.**
>
> 이어서 **매니저 교육생 명부(MG-05)·상세(MG-06)를 실서버에 붙였습니다.** 두 화면 다
> 실계정으로 렌더까지 끝냈습니다.
>
> **다음 세 화면(프로젝트 상세·히트맵·교안)에서 막혔습니다.** 「사용 가능」으로 받은
> 오퍼레이션들인데 **실응답이 스펙과 달라서**입니다(§3·§4). 화면별로 무엇이 막았는지는
> §14에 표로 정리했습니다.
>
> 그리고 **29차 R1(404 무응답)은 그대로입니다.** 이번엔 저희 화면이 직접 맞았습니다(§2).
>
> 측정 — 2026-08-15 · 실서버 · 프록시(Lambda URL) 경유 · 오퍼레이션 143 · 스키마 307 ·
> 계정 `manager@example.com`(9기 · C반 · 26명)

---

## 0. 한눈에

| | 무엇 | 우선순위 |
|---|---|---|
| **R1** | 🚨 **404가 아직 무응답입니다** — 이번엔 **없는 기수의 명단 조회**가 걸렸습니다(40초 넘게 침묵) | 🚨 **인프라** |
| **R2** | 🚨 **응답이 스펙과 다른 곳 셋** — `class-progress.summary`(4필드) · **히트맵 `concepts[]`(7필드)** · 브리프 `openingRemark`가 `FAILED`일 때 `null` | 🚨 **계약** |
| **R3** | 🚨 **담당 반 스코프가 오퍼레이션마다 다릅니다** — 같은 화면의 네 조회 중 둘만 좁혀집니다 | 🚨 |
| **R4** | 🔴 `GET /projects/{id}/teams`에 **반 정보가 없어** 팀이 어느 반인지 알 수 없습니다 | 🔴 |
| **R5** | 🔴 명부 `lowStageConceptCount` **설명이 실제와 다릅니다** — `0~2단`이라 적혀 있는데 `0~1단`을 셉니다 | 🔴 **문서** |
| **R6** | 🔴 `matchedRiskTypeCodes`가 **명부에선 `"{}"`, 상세에선 `[]`** 입니다 | 🔴 |
| **R7** | 🟠 명부에 **계정 상태별 집계가 없어** 화면 머리글 내역을 뺐습니다 | 🟠 |
| **R8** | 🟠 `riskReasonSummary`에 `[SEVERE]` 태그가 문장에 섞여 옵니다 | 🟠 |
| **R9** | 🟠 `findMyEnrollments`에 **기수 상태가 없습니다** — 담당 기수가 둘이면 고를 근거가 없습니다 | 🟠 |
| **R10** | 🟡 `SessionActivityRequest`에 `empty: boolean`이 새어 있습니다 | 🟡 |
| **Q1** | 문항 전문(`findSessionProblem`)을 **매니저도 부를 수 있나요?** | Q |
| **Q2** | **「이 기수 회차에 연결된 교안」** 목록을 주는 조회가 있나요? | Q |
| **✅** | 29차 R2 해제 · 면담 7개 · 검증 세션 6개 · 교안 삭제가 전부 열렸습니다 | — |

---

## 1. ✅ 29차 R2 — 저희 CI가 풀렸습니다

받은 스펙으로 다시 돌린 결과입니다.

```
29차 측정   error 14건  (required 9 · nullable 5)
지금        error  0건
```

`InterviewBriefResponse.priorInterview` · `.savedRecord` · `.voidEvidence` ·
`InterviewCaseResponse.nextAction` · `InterviewListResponse.round` 다섯 건이
`anyOf: [{$ref}, {type: "null"}]`로 감싸져 왔고, `required`도 `SessionResponse` ·
`AnswerSubmitResponse` · `AutoHint` · `NextQuestion` · `CurrentQuestion` ·
`ProblemActivityResponse` · `Turn` · `SaveInterviewBriefRequest` 여덟 건 모두 채워졌습니다.

### `SessionActivityRequest`는 회신대로 저희 쪽을 고쳤습니다

마지막 1건이 계속 `required` 없음으로 잡혔는데, **회신 §2-①에 적어 주신 설명이
맞았습니다.**

```jsonc
{
  "minProperties": 1,          // ← 제약이 여기 적혀 있다
  "properties": { "awaySeconds": …, "disconnectedSeconds": …, "firstKeystrokeDelayMs": … }
}
```

세 값 중 **무엇을 보낼지는 그때 관찰된 신호가 정하므로** 하나를 골라 required로 올리면
스펙이 사실과 달라집니다. 서버가 실제로 거절하는 것은 「빈 객체」(`{}` → 400)이고 그것을
그대로 적은 것이 `minProperties: 1`이죠.

**저희 검사기를 그 판정에 맞췄습니다**(`scripts/api-check.mjs` — 최소 개수를 적었으면
답한 것으로 봅니다). 백엔드 CI도 같은 판정이라고 하셔서 양쪽 기준이 이제 같습니다.
**이 건으로 더 손보실 것은 없습니다.**

---

## 2. 🚨 R1 — 404 무응답, 이번엔 저희 화면이 맞았습니다

29차와 같은 측정을 오늘 다시 했습니다. **바뀐 것이 없습니다.**

```
GET /api/v0/definitely-not-a-real-path                      →  40초 넘게 무응답
GET /api/v0/zzz-no-such-route                               →  40초 넘게 무응답
GET /api/v0/cohorts/{없는 UUID}/trainees                     →  40초 넘게 무응답   ← 새로 확인

── 대조군 (같은 시각 · 같은 토큰) ──
GET /api/v0/cohorts/not-a-uuid/projects  →  400 · 0.8초
GET /api/v0/members/me                   →  200 · 1.1초
```

### 이번엔 실제 화면이 이것 때문에 멈춥니다

29차까지는 「없는 경로」로만 재현했는데, **매니저 교육생 상세(MG-06)가 이 경로를
그대로 밟습니다.**

담당하지 않는 반의 교육생 주소로 들어오면 서버가 `404`를 주기로 돼 있고
(`MANAGER_SCOPE_NOT_FOUND`), 저희 화면은 그때
*「담당하는 반의 교육생만 볼 수 있습니다」* 카드를 그리도록 이미 만들어 뒀습니다.

**그런데 404가 안 오니 그 카드가 뜰 일이 없습니다.** 대신 요청 예산(90초)을 다 쓰고
*「불러오지 못했습니다 · 잠시 후 다시 시도해 주세요」* 로 떨어집니다 — 다시 시도해도
같은 결과인데 그렇게 안내하게 됩니다.

같은 모양이 명부에도 있습니다. 기수 id가 어긋나면(반 배정이 바뀐 직후 등) 같은 자리에
빠집니다.

**확인은 요청 하나면 됩니다** — 인증 토큰만 있으면 되고 DB도 안 탑니다.

```
GET /api/v0/definitely-not-a-real-path
```

29차에 적어 주신 대로 앱은 완결된 404를 만들고 있고(`NotFoundResponseTest`),
남은 곳은 **Lambda 프록시 / App Runner 설정**입니다. 저희는 그 코드에 접근 권한이
없어 여기까지밖에 못 좁힙니다.

> 27차(잠든 인스턴스가 전 경로에 침묵)와 같은 층일 가능성이 큽니다 — 그쪽을 보실 때
> 같이 봐 주시면 좋겠습니다.

---

## 3. 🚨 R2 — 응답이 스펙과 다른 곳이 **셋** 있습니다

셋 다 같은 모양입니다 — **스펙이 `required`라고 적은 필드가 실응답에 없습니다.**
저희 타입은 스펙에서 만들어지므로 **`number`인데 런타임에 `undefined`** 가 되고,
컴파일러가 막아 주지 못합니다.

### ① `class-progress`의 `summary`

프로젝트 상세(MG-08)를 붙이려고 회차 하나(`미니프로젝트 3차`)를 불러 봤습니다.

**스펙 `Summary`** — 네 필드가 **전부 `required`** 입니다.

```
teamCount · submittedTeamCount · unsubmittedTeamCount · analysisFailedTeamCount
```

**실응답 `class-progress.summary`** — 그 넷이 **하나도 없습니다.**

```jsonc
"summary": {
  "targetTraineeCount": 208, "submittedCount": 208,
  "analysisTargetCount": 208, "analysisSucceededCount": 199,
  "assessmentTargetCount": 199, "assessedCount": 198
}
```

**같은 `Summary` 스키마를 `GET /projects/{id}/submissions`도 가리키는데, 그쪽은
스펙대로 옵니다**(`{"teamCount":6,"submittedTeamCount":6,"unsubmittedTeamCount":0,
"analysisFailedTeamCount":0}`). 두 오퍼레이션이 **한 스키마를 공유하면서 서로 다른 모양을
보내고 있습니다.**

**`class-progress`용 스키마를 따로 두시면 됩니다.** 지금 실응답 쪽 필드들이 더 쓸모
있어 보여서(인원 기준 파이프라인 4단계가 그대로 읽힙니다) 값은 그대로 두시고 이름만
겹치지 않게 나눠 주시면 됩니다.

### ② 히트맵의 `concepts[]`

**히트맵(MG-02)도 같습니다.** 스펙 `Concept`은 일곱 필드가 전부 `required`입니다.

```
conceptId · concept · displayOrder · inCode · reachLevel · retryTarget · steps
```

**실응답은 그중 하나도 안 옵니다.**

```jsonc
"concepts": [
  { "problemNo": 1, "teachesId": "…", "conceptName": "API 응답 계약 설계", "groupShortfall": false },
  { "problemNo": 2, "teachesId": "…", "conceptName": "영속성 매핑과 지연 로딩", "groupShortfall": true }
]
```

**이것 때문에 히트맵을 못 붙이고 있습니다** — 표의 **열 이름**(`conceptName`)이 생성된
타입에 아예 없는 필드라, 읽으려면 타입을 속여야 합니다.

실응답 쪽이 이 계층에 더 맞아 보입니다. 스펙의 `reachLevel`·`steps[]`(축별 통과·힌트·점수)는
**개인 한 명의 상세**에 해당하는 값이라, 반·팀 계층 응답에 있을 자리가 아닌 것 같습니다 —
계층별로 스키마가 갈려야 하는 것을 하나로 합쳐 두신 게 아닐까 싶습니다.

> `Cell`·`Row`·`Scope`는 스펙대로 정확히 옵니다. 그리고 **히트맵은 담당 반으로 잘
> 좁혀집니다**(`rows`에 `C반`만) — R3에 해당하지 않습니다.

### ③ 브리프의 `openingRemark`가 `FAILED`일 때 `null`입니다

면담 브리프(MG-04)에서 나왔습니다. 스펙은 `openingRemark`·`items`가 **`required`** 인데,
`briefState: "FAILED"`인 케이스의 실응답은 이렇습니다.

```jsonc
{ "briefState": "FAILED", "openingRemark": null, "items": [], … }
```

**생성이 실패한 브리프**라 값이 없는 것은 자연스럽습니다 — 다만 그러면 타입도 그렇게
적혀 있어야 합니다. `anyOf: [{type:"string"},{type:"null"}]`로 감싸 주시면 화면이
`FAILED` 분기를 컴파일러에게 검사받을 수 있습니다.

> 저희는 그동안 **`briefState`로 먼저 갈라서** 방어해 두겠습니다 — `FAILED`면
> 여는 말·질문을 아예 읽지 않고 「브리프를 만들지 못했습니다 · 다시 시도」로 그립니다.

### ④ 곁들여 — `navigation.classrooms`가 반 계층에서 빕니다

`level=CLASS`로 부르면 `navigation`이 `{"classrooms":[],"teams":[]}`로 옵니다.
`level=TEAM`으로 부르면 `classrooms`에 값이 찹니다. 드릴다운 선택지를 만드는 자리라
**첫 화면(반 계층)에서 비어 있으면 쓸 수가 없습니다** — 지금은 `rows[]`가 곧 반 목록이라
그걸로 대신할 수 있지만, 의도한 동작인지 확인 부탁드립니다.

---

## 4. 🚨 R3 — 담당 반 스코프가 오퍼레이션마다 다릅니다

매니저 계정(`9기 · C반 · 26명`)으로 **프로젝트 상세 한 화면이 쓰는 네 조회**를 같은 시각에
불렀습니다.

| 조회 | 돌아온 범위 | 담당 반으로 좁혀졌나 |
|---|---|---|
| `GET /projects/{id}/submissions` | **C반 6팀** (`classId`·`className` 포함) | ✅ |
| `GET /projects/{id}/evaluations` | `totalCount: 26` — **C반만** | ✅ |
| `GET /projects/{id}/class-progress` | **A~H반 8개 전부** · `targetTraineeCount: 208` | ❌ |
| `GET /projects/{id}/teams` | **48팀 전부** | ❌ |

`class-progress`는 `managerNames`까지 실어서 **다른 매니저가 맡은 반**(`송다온`·`허도윤`
등 7명)을 그대로 돌려줍니다. 명단·상세·히트맵이 전부 담당 반으로 좁혀지는 것과 어긋납니다.

**화면이 못 그립니다.** 같은 페이지 위에서 「제출 현황」 탭은 *6팀 · 26명*, 「반별 진행」은
*208명 · 8반*이 됩니다. 매니저가 보는 숫자가 탭마다 달라지는 것이라 화면에서 걸러 맞출 수도
없습니다 — **거르면 그건 화면이 권한을 판정하는 것**이고, 저희가 지켜 온 경계를 넘습니다.

**둘 다 담당 반으로 좁혀 주시길 부탁드립니다.** 오퍼레이터가 같은 오퍼레이션으로 기수 전체를
봐야 한다면 명단(`findTraineeRoster`)이 그러듯 **역할로 갈라 주시면** 됩니다.

> 혹시 **의도적으로 기수 전체를 주시는 것**이라면(반 비교가 목적이라든지) 알려 주세요 —
> 그러면 저희가 화면에 *「기수 전체」* 라고 밝히고 그리겠습니다. 지금은 어느 쪽인지 알 수
> 없어서 못 붙이고 있습니다.

---

## 5. 🔴 R4 — 팀 목록에 반 정보가 없습니다

`GET /projects/{id}/teams` 응답의 팀 한 건입니다.

```jsonc
{ "teamId": "…", "teamNumber": "1", "name": "1팀", "status": "CONFIRMED", "memberCount": 5 }
```

**어느 반의 1팀인지 알 수 없습니다.** 팀 번호가 반마다 1부터 다시 시작해서 48팀 안에
`1팀`이 여덟 번, `2팀`이 여덟 번 나옵니다 — 목록만 보면 구분이 안 됩니다.

같은 화면의 `submissions` 응답에는 **`classId`·`className`이 팀마다 붙어 옵니다.**
`teams`에도 같은 두 필드를 얹어 주시면 됩니다(R3이 해결되면 개수는 6팀으로 줄지만,
그래도 반 이름은 필요합니다 — 담당 반이 둘 이상인 매니저가 있습니다).

`memberCount`만 있고 **구성원이 없는 것**도 확인하고 싶습니다. 팀 편성 화면은 사람을
끌어다 옮기는 화면이라 `members[]`(이름·id)가 필요한데, `unassignedMembers`는 오는 걸 보면
배정된 사람은 다른 조회로 가져오는 구조일까요? 그렇다면 어느 것인지 알려 주세요.

---

## 6. 🔴 R5 — 명부 `lowStageConceptCount` 설명이 실제와 다릅니다

`GET /cohorts/{cohortId}/trainees` 문서에는 이렇게 적혀 있습니다.

> `lowStageConceptCount` | int? | **도달 단계 0~2단(저단계)** 인 문항 수

**실제 값은 0~1단만 셉니다.** 9기 C반 · 미프 3차 실응답입니다.

| 교육생 | `conceptResultItems`의 도달 | `lowStageConceptCount` |
|---|---|---|
| 백은우 | `2 · 2 · 1` | **1** (0~2단이면 3이어야 합니다) |
| 송서준 | `2 · 2 · 2` | **0** (0~2단이면 3) |
| 손지안 | `3 · 3 · 3` | 0 |

**값이 아니라 설명이 틀린 것으로 봅니다.** 근거 둘입니다.

- 교육생 상세(`.../trainees/{traineeId}`)의 같은 이름 필드는 **`2단 미만(0~1단)`** 이라고
  적혀 있습니다 — 두 문서가 서로 다른 말을 합니다
- 히트맵 `Concept.retryTarget`이 *「2단 미달이라 다시 보기 대상」* 이라 **다시 보기 기준도
  2단 미만**입니다

**저희는 0~1단이 맞다고 보고 화면 열 이름을 `2단 미만`으로 고쳤습니다**(원래 목업 문구가
`2단 이하`였습니다). **명부 쪽 설명만 정정해 주시면 됩니다.**

> 이건 렌더로만 잡혔습니다. 숫자 자체는 그럴듯해서 스펙만 읽을 때는 안 보였고,
> 도달 격자(`2 · 2 · 1`)와 나란히 그려 놓고서야 어긋난 게 보였습니다.

---

## 7. 🔴 R6 — `matchedRiskTypeCodes`가 두 응답에서 모양이 다릅니다

같은 이름·같은 뜻인데 직렬화가 갈립니다.

| 어디 | 실제 값 | 타입 |
|---|---|---|
| 명부 `content[].matchedRiskTypeCodes` | `"{}"` · `"{PERSISTENT_LOW}"` | **문자열** |
| 상세 `rounds[].matchedRiskTypeCodes` | `[]` · `["PERSISTENT_LOW"]` | 배열 |

명부 쪽 문서에는 *「코드 배열(문자열로 직렬화됨)」* 이라고 적혀 있는데,
**`"{}"`는 JSON이 아니라 PostgreSQL 배열 리터럴**로 보입니다 —
`JSON.parse("{}")`는 배열이 아니라 빈 객체가 되어 조용히 틀립니다.

같은 응답의 `conceptResultItems`는 **진짜 JSON 문자열**(`"[{\"problemNo\": 1, …}]"`)이라
한 응답 안에 두 가지 문자열 직렬화가 섞여 있습니다.

**저희 화면은 이 필드를 안 씁니다** — 배지 한 칸은 `roundPrimaryStatusCode`(단일 코드)로
충분해서 지금은 읽지 않고 넘겼습니다. 다만 **누가 나중에 이걸 읽으면 반드시 걸립니다.**
가능하면 상세와 같은 배열로 맞춰 주시고, 어려우면 명부 문서에 *「PostgreSQL 배열
리터럴」* 이라고 적어만 주셔도 됩니다.

---

## 8. 🟠 R7 — 명부에 계정 상태별 집계가 없습니다

목업 화면 머리글이 이랬습니다.

```
교육생  26명
활성 24 · 초대 대기 1 · 비활성 1
```

**이 세 숫자를 만들 수 없습니다.** 응답에 `cohortTotal` · `totalElements` ·
`unassignedCount`는 있는데 상태별 수가 없고, 목록이 페이지네이션돼 있어
**화면이 셀 수도 없습니다**(한 쪽에 20명씩 옵니다).

`accountStatus`를 바꿔 세 번 더 부르면 나오지만, 이 값은 *「필터와 무관한 전체 모집단」*
기준이라 필터를 바꿀 때마다 3콜이 따라붙습니다.

**지금은 머리글 내역을 뺐습니다**(총원만 그립니다). `unassignedCount` 옆에
`invitedCount` · `inactiveCount` 두 개만 얹어 주시면 되살립니다.

> 급하지 않습니다 — 없어도 화면은 정상 동작합니다. 다만 *「초대만 받고 아직 안 들어온
> 사람이 몇인가」* 는 매니저가 자주 묻는 것이라 언젠가는 필요합니다.

---

## 9. 🟠 R8 — 판정식에 `[SEVERE]` 태그가 문장에 섞여 옵니다

`riskReasonSummary` 실응답입니다.

```
[SEVERE] 최근 2개 유효 회차 점수 1.67 → 1.67 (기수 평균 대비 저점)
```

스펙에 *「화면에 그대로 표시하는 값」* 이라고 적혀 있어 그대로 그렸더니
**`[SEVERE]`가 사용자에게 노출됐습니다.** 대괄호 태그는 개발자용 표기라
매니저 화면에 그대로 둘 수 없습니다.

**지금은 화면에서 접두사만 벗겨 씁니다**(`/^\[[A-Z_]+\]\s*/`). 심각도는 옆의 위험
배지가 이미 말하고 있어서(`지속 저점`이 붉은 배지) 잃는 정보가 없습니다.

**가능하면 태그를 필드로 나눠 주세요** — `severity: "SEVERE" | "WARN" | …` 와
문장만 담긴 `reasonSummary`로요. 지금처럼 문자열을 정규식으로 자르면 태그 이름이
하나 늘 때 저희가 모른 채 지나갑니다.

---

## 10. 🟠 R9 — `findMyEnrollments`에 기수 상태가 없습니다

매니저 화면 다섯 개가 전부 「지금 보고 있는 기수」를 필요로 해서, 그 소스를 정하려고
두 조회를 실계정으로 비교했습니다.

| | 매니저 토큰으로 부른 결과 |
|---|---|
| `GET /cohorts` | **200** — 그런데 `10기`(예정) · `9기` · `8기` · `7기` **기관 기수 전부** |
| `GET /members/me/enrollments` | **200** — `9기` 하나. 담당하는 것만 |

**후자를 쓰기로 했습니다.** 전자를 쓰면 담당하지 않는 기수가 상단 스위처에 뜨고,
고르는 순간 하위 조회가 전부 빈 결과로 떨어집니다 — 화면은 그걸 *「데이터가 없다」* 로
말하게 됩니다.

**그런데 `enrollments`에는 기수 상태(`PLANNED`/`RUNNING`/`CLOSED`)가 없습니다.**
지금 이 계정은 담당 기수가 하나라 문제가 없지만, **진행 중 기수와 막 끝난 기수를 같이
맡은 매니저**가 생기면 어느 쪽을 기본으로 열지 정할 근거가 없어 목록 첫 항목으로
떨어집니다(그 순서도 정의돼 있지 않습니다).

`cohortId` · `cohortName` 옆에 **`status` 하나만** 얹어 주시면 오퍼레이터 화면과 같은
규칙(*진행 중을 고른다*)을 쓸 수 있습니다.

> 참고로 `enrollments[].classroom`은 매니저에게 늘 `null`로 옵니다. 매니저 배정이
> `manager_assignment`라는 다른 원장이라 그런 것으로 이해했고, **담당 반은
> `GET /cohorts/{cohortId}/classrooms`가 정확히 담당 반만 돌려줘서**(실측: `C반` 하나)
> 그쪽으로 붙였습니다. 이건 요청이 아니라 확인입니다.

---

## 11. 🟡 R10 — `SessionActivityRequest`에 `empty`가 새어 있습니다

```jsonc
"properties": {
  "awaySeconds": …, "disconnectedSeconds": …, "firstKeystrokeDelayMs": …,
  "empty": { "type": "boolean" }        // ← 이것
}
```

설명이 없고 요청 본문에 담을 값도 아닌 것 같습니다 — `isEmpty()` 게터가 직렬화된
것으로 보입니다. 교육생 세션 화면 쪽이라 저희가 아직 안 붙였지만, 붙이면 생성기가
**보낼 수 있는 필드로 타입을 만들어 냅니다.**

`@JsonIgnore` 하나면 될 것 같습니다.

---

## 12. Q1 — 문항 전문을 매니저도 부를 수 있나요?

`GET /assessment-sessions/{sessionId}/problems/{problemNo}`가 **`사용 가능`으로
열렸습니다.** 저희가 이것을 쓰려는 자리가 있습니다.

교육생 상세(MG-06) 타임라인에서 「이해도 확인」을 펼치면 개념별로 이렇게 나옵니다.

```
2단  JPA 엔티티 관계 설정     자력
2단  계층 분리와 의존성 방향   자력
1단  예외 처리와 롤백 전략     자력
```

**여기 개념마다 근거 한 줄**(*「무엇을 하는 코드인지는 말했지만 왜 그 자리에 뒀는지는
설명하지 못했습니다」*)이 붙어야 매니저가 면담 전에 읽을 것이 생깁니다. 타임라인
응답에는 그 문장이 없고 `sessionId` · `expandable`만 있어서, 저 조회로 가져오는
구조라고 이해했습니다.

**두 가지만 확인 부탁드립니다.**

1. **매니저가 남의 세션 id로 부를 수 있나요?** 문서에 역할 언급이 없습니다. 교육생
   본인만이면 저희는 다른 길을 찾아야 합니다 — 타임라인 `problems[]`에 근거 한 줄을
   실어 주시는 편이 나을 수도 있습니다
2. 부를 수 있다면 **문항 하나씩만 가능한가요?** 개념 3건이면 펼칠 때마다 3콜이 됩니다

**지금은 그 자리를 비워 두고 이유를 화면에 적어 뒀습니다** — *「문답 전문은 아직 볼 수
없습니다」*. 상수 하나로 막아 둬서 답을 받으면 그 줄만 지웁니다.

---

## 13. Q2 — 「이 기수에 연결된 교안」 목록이 있나요?

매니저 교안 화면은 *「이 기수 회차에 연결된 것만」* 보여주는 읽기 전용 목록입니다
(등록·재분석은 오퍼레이터 소관이라 쓰기 액션이 하나도 없습니다). 그 목록을 주는 조회를
못 찾았습니다.

| 후보 | 실제로 주는 것 |
|---|---|
| `GET /cohorts/{cohortId}/curricula` | **기관 전체 교안 버전.** 설명에 *"cohortId는 현재 미검증(항상 토큰의 기관 범위로 조회)"* 라고 적혀 있습니다 |
| `GET /organizations/{organizationId}/curricula` | 기관 전체(페이지네이션) |
| `GET /projects` 의 `curriculumNames[]` | **이름만** 옵니다 — 교안 상세로 갈 `materialId`가 없습니다 |
| `GET /projects/{projectId}` 의 `curricula[]` | 정확한 값이지만 **회차 수만큼 불러야** 모입니다(기수당 6회면 6콜) |

**`GET /cohorts/{cohortId}/curricula`가 실제로 기수로 걸러 주면** 그대로 쓰겠습니다 —
지금은 경로에 `cohortId`가 있는데 안 쓴다고 적혀 있어서, 이름이 뜻과 어긋난 것인지
아니면 아직 안 붙은 것인지 알 수 없습니다.

**둘 중 하나만 알려 주세요.**
① 그 조회가 기수 범위를 갖도록 채워 주시거나
② 지금이 의도대로라면(기관 전체가 맞다면) 저희가 회차별 `curricula[]`를 모으겠습니다 —
그 경우 화면 문구를 *「기관 교안」* 으로 바꿀지도 같이 정하겠습니다.

---

## 14. ✅ 이번에 붙인 것 · 아직 못 붙인 것

**붙였습니다** — 매니저 교육생 명부(MG-05) · 교육생 상세(MG-06). 실계정 렌더까지
확인했습니다.

| 쓴 오퍼레이션 | 확인한 것 |
|---|---|
| `findMyEnrollments` | 담당 기수 `9기` ✅ |
| `findClassrooms` | 담당 반 `C반` 하나만 온다 ✅ |
| `findTraineeRoster` | 26명 · 회차 6종 · 서버 정렬·필터·페이징 ✅ |
| `findManagerTraineeDetail` | 회차 격자 · 위험 배지 · 판정식 ✅ |
| `findManagerTraineeTimeline` | 이벤트 15건 · `ASSESSMENT`·`REPORT`·`INTERVIEW`·`REVIEW_CLOSED` ✅ |

**눈으로 못 본 상태**(시드에 없어서)도 적어 둡니다 — 데이터를 만들어 주실 수 있으면
그때 확인하겠습니다.

```
계정 상태     INVITED · INACTIVE 행이 담당 반에 없다
회차 배지     NOT_ATTENDED · SESSION_INCOMPLETE (1차에 있는데 그 회차는 위험이 안 걸린다)
              INVALID_ATTEMPT · LOW_PARTICIPATION · CONTRIBUTION_UNDERSTANDING_GAP
타임라인      REVIEW (다시 보기로 도달이 바뀐 사건) — REVIEW_CLOSED만 온다
```

**막혀 있는 것 셋** — 전부 위 항목이 원인입니다.

| 화면 | 막은 것 |
|---|---|
| 프로젝트 상세(MG-08) | **R3**(탭마다 모집단이 다르다) · R2① · R4 |
| 히트맵(MG-02) | **R2②**(열 이름 `conceptName`이 스펙에 없다) |
| 교안 | **Q2**(기수에 연결된 교안 목록이 없다) |

MG-08은 헤더(`findProject`)와 결과 탭(`findProjectEvaluationSummary`)만 보면 응답이
깨끗해서 먼저 붙일 수 있지만, **한 화면 안에서 탭마다 모집단이 달라지는 상태로는 내보낼 수
없어** 회신을 기다립니다. R3만 풀려도 나머지는 저희가 흡수할 수 있습니다.

히트맵은 **R2② 하나뿐**이라 그것만 오면 바로 붙습니다.

**아직 안 붙인 나머지**: 대시보드(MG-01) · 면담 목록(MG-03) · 면담 브리프(MG-04) ·
프로젝트 목록(MG-07). 대시보드는 `notifications/inbox`·`analytics/risk-signals`가
`사용 불가`라 기다리고, **면담 둘은 이번에 스키마가 풀려서 붙일 수 있게 됐습니다** —
다음 차례로 보고 있습니다.

프로젝트 목록(MG-07)은 따로 적을 것이 있어 다음 차수로 미룹니다 — `GET /projects`가
반별 진행·조치(미제출 팀 수 등)를 안 줘서 행마다 `class-progress`를 또 불러야 하는
모양입니다. 저희 쪽 화면 정의를 한 번 더 보고 정리해서 여쭙겠습니다.
