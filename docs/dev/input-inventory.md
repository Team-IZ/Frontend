# 입력(Input) 목록 — 이 제품에 실제로 필요한 형태

`src/components/ui/input.tsx` 하나로 덮을 수 있는지 판단하려고, **와이어프레임 21개 + 정의서
§5 요청 데이터 + 이미 구현된 auth**에서 입력이 나오는 자리를 전부 뽑았다.

> 추측으로 넣은 항목은 없다. 각 행의 **근거** 칸이 실제 파일이다.
> 여기 없는 형태(별점·슬라이더·색선택·리치텍스트 등)는 **이 제품에 없다.** 만들지 않는다.

---

## 1. 한눈에 — 무엇이 부족한가

| | 형태 | 지금 `Input`으로 되나 |
|---|---|---|
| **A** | 문자열·이메일·비밀번호·숫자·URL | ✅ `type`만 바꾸면 됨 |
| **B** | 검색(아이콘 + 지우기) | ⚠️ `input-group` 필요 |
| **C** | 여러 줄(사유·메모·답변) | ✅ `textarea` |
| **D** | 날짜 · 기간(시작~종료) | ❌ **없음** |
| **E** | 읽기전용 + [변경] | ⚠️ 조합 필요 |
| **F** | 칩 입력(초점·커밋 이메일) | ❌ **없음** |
| **G** | 파일 드롭(ZIP) | ⚠️ `attachment` 있으나 드롭존 없음 |
| **H** | 명단 일괄(CSV/붙여넣기) | ❌ **없음** |
| **I** | 접미 단위($ · 일 · 명) | ⚠️ `input-group` 필요 |
| **J** | 선택형(단일·다중) | ✅ `select` / `checkbox` |

**새로 만들어야 하는 것은 D · F · H 셋이고, B · E · G · I는 이미 받은 컴포넌트 조합으로 된다.**

---

## 2. 전체 목록

### A. 기본 타입 — `Input`의 `type`만 다름

| # | 자리 | 타입 | 화면 | 근거 |
|---|---|---|---|---|
| A1 | 이메일 | `email` | SC-A01·A02·A03·S01·M02 | `login.html` `.input`, `{ email }` |
| A2 | 비밀번호 | `password` | SC-A01·A02·A03 | `.input` `••••••••` · **Caps Lock 경고 구현됨** |
| A3 | 이름(사람) | `text` | SC-A02·M02 | `program-admin.html` `.inp>이름` |
| A4 | 기관명 | `text` | SC-S01 | `{ orgName }` · **실시간 중복확인** |
| A5 | 기수명 | `text` | SC-M02 | `.inp>9기`, `{ name }` |
| A6 | 반 이름 | `text` | SC-M02 | `.inp>D반`, `{ className }` |
| A7 | 팀 이름 | `text` | SC-M13 | `.inp>팀 D`, `{ teamName }` |
| A8 | 교안 제목 | `text` | SC-M12 | `.inp>Kubernetes와 CICD` |
| A9 | 저장소 주소 | `url` | SC-T02·M13 | `submission.html` `>저장소 주소<` · placeholder `https://github.com/…` |
| A10 | 질문 수·정원 | `number` | SC-M13·M03 | `{ questionBudget }`, `.inp>5` |

> A9는 형식 검증이 붙는다(SC-T02 M-2 "URL 형식 오류").
> A10은 **우측 정렬 + tabular-nums**. 숫자를 왼쪽 정렬하면 자릿수 비교가 안 된다.

### B. 검색 — 아이콘 + 지우기

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| B1 | 이름·이메일 검색 | SC-M11·M02·M02b | `.search>🔍 이름 · 이메일 검색` (3개 파일) |
| B2 | 기관명 검색 | SC-S01 | `.sel>기관명 검색…` |
| B3 | 기수명·반 검색 | SC-M02 | `.search>🔍 기수명 검색` · `🔍 반 검색` |
| B4 | 교안명·주제 검색 | SC-M12 | `.search>🔍 교안명 · 주제 검색` |
| B5 | 프로젝트명 검색 | SC-M13 | `.search>🔍 프로젝트명 검색` |

와이어 실측 `.search` = `240px · 36px · surface-2 · border-strong · radius-md`.
→ **`input-group`** 으로 앞에 🔍, 값이 있을 때 뒤에 ✕(지우기). 툴바 표준상 **항상 좌측 첫 칸**.

### C. 여러 줄

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| C1 | 세션 답변 | SC-T04 | `session.html` `.ta>답변을 입력하세요…` + `.send>제출` |
| C2 | 개입 사유·내용 | SC-M07 | `{ type(면담/관찰/메모), content }` |
| C3 | 일반 메모 | SC-M06 | `GeneralMemo`(정의서 §8) |
| C4 | 보류 사유 | SC-M04 | `{ signalIds[], reviewAt, reason }` |
| C5 | 요구사항 | SC-M13 | `{ type, classId, startAt, endAt, requirements }` |
| C6 | 리포트 초안 편집 | SC-M01·M08 | `DraftEditor`(정의서 §8) |

> C1은 **Enter=줄바꿈, 버튼=제출**이어야 한다. 세션 답변은 여러 줄 코드 설명이라 Enter로
> 보내면 반쯤 쓴 답이 나간다. 채팅 관습(Enter=전송)을 그대로 가져오면 안 되는 자리다.

### D. 날짜 — ❌ 컴포넌트 없음

| # | 자리 | 형태 | 화면 | 근거 |
|---|---|---|---|---|
| D1 | 기수 기간 | **범위**(시작~종료) | SC-M02 | `.inp>2026-09-01 ~ 2026-12-15` |
| D2 | 프로젝트 기간 | **범위** | SC-M13 | `{ startAt, endAt }`, `.inp>2026-04-10` |
| D3 | 측정일 | 단일 | SC-M03 | `{ measureAt }` |
| D4 | 제출 기한 | **범위** | SC-M03 | `{ dueStart, dueEnd }` |
| D5 | 재검토일 | 단일 | SC-M04 | `{ reviewAt }` |
| D6 | 기간 필터 | 프리셋 | SC-S01 | `.sel>이번 달 ▾` |

정의서 §8에 `DatePicker`가 **신규 컴포넌트로 명시**돼 있다(SC-M02).
D6은 달력이 아니라 프리셋 `select`("이번 달/지난 달/전체")다 — 달력을 붙이면 과한 자리다.

### E. 읽기전용 + 변경

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| E1 | 초대 이메일(가입 시 고정) | SC-A02 | `ReadonlyField` — **구현됨** |
| E2 | 커밋 이메일 + [변경] | SC-T02 | `.vrow>✓ 커밋 이메일 검증됨 … .chg>변경` |
| E3 | org_id 등 식별자 | SC-S01 | 개요 탭 정보 행 |

E2는 값 + 검증 배지 + 변경 링크가 한 줄이다. 입력칸이 아니라 **상태 표시 + 진입점**이다.

### F. 칩 입력 — ❌ 컴포넌트 없음

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| F1 | 질문 초점(측정 축) | SC-M13·M03 | `.chips > .fchip>상태 관리 ✕` + `.fchip.add>+ 초점 추가` |
| F2 | 커밋 이메일 여러 개 | SC-T02 | `{ repoUrl, commitEmails[] }` |

정의서 §8에 `ChipInput`이 **신규로 명시**돼 있다(SC-M03).

### G. 파일

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| G1 | ZIP 드롭존 | SC-T02 | `.drop>여기로 .zip 파일을 끌어놓거나 클릭해서 선택` |
| G2 | git log 파일 | SC-T02 | `>git log 파일도 함께 올려주세요.` |
| G3 | 명단 CSV | SC-M02 | `.inp>CSV 업로드 또는 나중에` |

`attachment` 컴포넌트는 **올린 뒤의 목록**을 그리고, **드롭존 자체는 없다.** 그 부분이 빈다.

### H. 일괄 입력 — ❌ 컴포넌트 없음

| # | 자리 | 화면 | 근거 |
|---|---|---|---|
| H1 | 명단 추가(CSV / 직접 입력 2방법) | SC-M02 | `program-admin.html:996` `/* 명단 추가 모달 — 2방법(CSV / 직접) 내부 탭 */` |

`{ roster[]: {name, email} }` — 이름+이메일 쌍을 여러 줄로 받는다. 모달 안에 탭 2개.

### I. 접미 단위

| # | 자리 | 단위 | 화면 |
|---|---|---|---|
| I1 | AI 월 예산 상한 | `$` (앞) | SC-S01 `.selbox>$600 ▾` |
| I2 | 데이터 보존기간 | `일` (뒤) | SC-S01 `.selbox>180일 ▾` |
| I3 | 정원·질문 수 | `명` `개` (뒤) | SC-M13 |

→ **`input-group`** 의 `InputGroupAddon`. 단위를 placeholder에 적으면 입력하는 순간 사라진다.

### J. 선택형 — 이미 있음

| # | 자리 | 컴포넌트 | 화면 |
|---|---|---|---|
| J1 | 상태·역할·반 필터 | `select` | SC-S01·M11·M02·M04·M07 |
| J2 | 약관 동의 | `checkbox` | SC-A02 `{ consents[] }` |
| J3 | 벌크 행 선택 | `checkbox` | D75 · SC-M02·M02b·M04·M11·M13 |
| J4 | 공개 범위 | `select` | `{ range: 비공개\|요약\|전체 }` |
| J5 | 추출 범위 | 2지 토글 | `{ scope: 전체코드\|본인커밋기여분 }` → `button-group` |
| J6 | 제출 방식 | 2지 토글 | `.toggle>GitHub 저장소 / ZIP 업로드` → `button-group` |
| J7 | 반 배정 전략 | 라디오 | `{ strategy: 균등\|랜덤 }` |
| J8 | 담당 매니저 배정 | 다중 select | `{ memberIds[] }`, `.inp>이도윤 ▾` |

---

## 3. 상태 — 모든 입력이 공통으로 가져야 하는 것

와이어 예외 case에서 실제로 쓰인 것만.

| 상태 | 어디서 | 근거 |
|---|---|---|
| 기본 / 포커스 | 전부 | — |
| 비활성 | 제출 중 | SC-A01 `disabled` |
| **오류 + 메시지** | 전 폼 | SC-A01 case1~9 · SC-S01 case1~3 |
| **검증 중 → 성공** | 기관명 중복확인 | SC-S01 case1 "입력 중 실시간 중복 확인" ✓ 표시 |
| 읽기전용 | E1·E3 | `ReadonlyField` |
| 도움말(hint) | 보존기간·저장소 | `.hint`, `.fhint` |
| 글자수 제한 | **없음** | 와이어 어디에도 없다 — 만들지 않는다 |

---

## 4. 검증 결과 — 새로 만들 컴포넌트는 **없다**

`/ui-preview` → **입력 조합** 탭에서 10개 범주를 전부 조립해 렌더·조작까지 확인했다
(`src/app/InputCompositionsPreview.tsx`). 아래는 그 결과다.

| 범주 | 조합 | 검증 |
|---|---|---|
| A 기본 타입 | `Field` + `Input`(`type`) + `FieldError`·`FieldDescription` | ✅ |
| B 검색 | `InputGroup` + `InputGroupAddon`(🔍) + `InputGroupButton`(✕) | ✅ 값 있을 때만 ✕ 등장·클릭 시 비워짐 |
| C 여러 줄 | `Textarea` | ✅ |
| **D 날짜** | **`Popover` + `Calendar` + `Button`** | ✅ 단일·범위 모두. 범위는 2개월 77칸 |
| E 읽기전용+변경 | `InputGroup`(readOnly) + `Badge` + `InputGroupButton` | ✅ |
| **F 칩** | **`InputGroup` + `Badge`** + 배열 상태 | ✅ Enter 추가 / ✕ 삭제 / 빈 칸 Backspace 삭제 |
| **G 드롭존** | ❌ **조합 불가** — `label` + `input[type=file]` 직접 | ⚠️ 유일한 공백 |
| H 명단 일괄 | `Textarea` + 파싱 | ✅ |
| I 단위 접미 | `InputGroupText` | ✅ `$600` · `180일` |
| J 토글 | `ButtonGroup` / `select` / `checkbox` | ✅ |

**앞선 판단 정정 — D와 F는 새 컴포넌트가 필요 없다.**

- **D**: shadcn 공식 문서도 *"A date picker is built from Popover and Calendar
  (there is no DatePicker root component)"* 라고 못박는다. `calendar.tsx`는 `react-day-picker` v10을
  감싸고 있어 `mode="single|range|multiple"`을 그대로 받고, `date-fns` v4도 이미 설치돼 있다.
- **F**: 칩은 `InputGroupAddon align="block-start"` 안에 `Badge`를 넣으면 된다. 로직은 문자열
  배열 하나가 전부다. 별도 컴포넌트로 뽑을 만큼의 것이 없다.

**G만 진짜 공백이다.** `attachment.tsx`에는 `drop`/`dragover` 핸들러가 **0개**다 —
올린 뒤의 목록만 그린다. 끌어놓기 영역은 직접 만들어야 한다(20줄 남짓).

**안 만든다**
- 글자수 카운터, 슬라이더, 별점, 리치텍스트, 색 선택, 자동완성 콤보박스, 전화번호, 통화 마스킹
  → **와이어·정의서 어디에도 근거가 없다.** 필요해지면 그때.

---

## 4-1. ⚠️ 걸린 함정 — `Field`는 자식의 폭을 강제한다

`Field`의 클래스에 `*:w-full`이 있다. **직계 자식 선택자라 자식이 직접 가진 `w-28`보다
명시도가 높아서**, `<Input className="w-28" />`을 줘도 폭이 부모 전체로 늘어난다(실제로 448px로 나왔다).

좁은 칸이 필요하면 둘 중 하나:

```tsx
<Input className="w-28!" />          // 우선순위로 덮기
<div><Input className="w-28" /></div> // div가 w-full을 먹고 안쪽은 자유
```

**안 만든다**
- 글자수 카운터, 슬라이더, 별점, 리치텍스트, 색 선택, 자동완성 콤보박스, 전화번호, 통화 마스킹
  → **와이어·정의서 어디에도 근거가 없다.** 필요해지면 그때.

---

## 5. 만들 때 지킬 것

- **모든 입력은 `label`을 갖는다.** placeholder는 라벨이 아니다 — 입력하면 사라져서 무슨 칸인지 알 수 없게 된다.
- **오류는 `aria-invalid` + `aria-describedby`로 메시지를 묶는다.** 빨간 테두리만으로는 색을 구분 못 하는 사용자에게 아무 정보도 없다.
- **숫자는 우측 정렬 + `tabular-nums`.**
- 값 형식(날짜·URL)은 **입력 중이 아니라 blur에서** 판정한다. 타이핑 도중 빨개지면 다 치기도 전에 틀렸다고 하는 셈이다. 단, SC-S01 기관명 중복확인은 **실시간이 명세 요구**(case1)라 예외.
