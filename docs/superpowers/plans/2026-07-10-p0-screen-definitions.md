# P0 화면 정의서(16종) 작성 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능명세서 v8 기준 P0 화면 16종에 대해, 화면정의서(마크다운)와 저해상도 와이어프레임(HTML, Artifact로 발행)을 화면당 1세트씩 작성한다.

**Architecture:** 화면 16개의 콘텐츠 작업(Task 1~17)은 서로 독립적으로 병렬 처리 가능하다 — 단, 전부 동일한 두 개의 공유 소스(`p0-fr-source.md`, `design-system-anchor.md`)를 근거 없이 벗어나지 않는다는 전제에서다. 이 공유 소스만으로는 세부 표현의 미세한 드리프트를 완전히 막지 못하므로, 마지막에 병렬화되지 않은 단일 통합 패스(Task 18)를 두어 16개 산출물을 한 시야에서 대조·통일한다. 즉 "병렬 생성 + 직렬 통일"이 이 계획의 핵심 구조다.

**Tech Stack:** 화면정의서는 마크다운, 와이어프레임은 순수 HTML+인라인 CSS(Tailwind 유사 유틸리티 없이 리포 기존 디자인 토큰 값을 직접 사용) + Artifact 도구로 발행.

---

## 사전 준비 (완료됨 — 참고용)

- `docs/screens/_source/p0-fr-source.md` : P0 화면 16종 각각에 매핑된 FR 전체(P0/P1/P2 모두, MVP단계·중요도 표기)를 `기능명세서_v8.xlsx`에서 추출한 원본. 화면당 `## SC-XXX` 섹션으로 구분되어 있음.
- `docs/screens/_source/design-system-anchor.md` : 16개 화면이 서로 다른(격리된) 서브에이전트/세션에서 만들어져도 시각적으로 하나의 서비스처럼 보이도록 하는 **공통 디자인 언어 고정 문서**. 매니저 셸(사이드바 메뉴 순서·헤더), 교육생 셸, 인증 셸, 카드 패턴, 상태·등급 색상/용어 매핑(위험=red, 프리라이더=amber, 에이스=green 등 전 화면 고정), 빈상태/에러/로딩 패턴, 버튼 위계를 정의한다. **모든 태스크는 이 파일을 근거 없이 벗어나면 안 된다** — 예를 들어 "위험" 배지 색을 화면마다 임의로 다르게 정하지 않는다.
- 화면 배치 순서와 방법론은 `docs/superpowers/specs/2026-07-10-screen-definition-doc-design.md` 참조.

## 공통 작업 절차 (모든 태스크에 동일 적용)

아래 6단계를 각 화면(`{SCREEN_ID}`, `{SLUG}`, `{SOURCE_LINES}`, `{ROLE}`, `{ENTRY}`)에 대해 반복한다. 이 섹션은 각 태스크에서 "공통 절차 적용"으로만 참조되며, 아래 내용이 곧 매 태스크의 실제 절차다.

**기존 컴포넌트 재고** (`src/components/ui`): `avatar`, `badge`, `button`, `card`, `dialog`, `input`, `label`, `select`, `table`, `tabs`. 이 목록에 없는 컴포넌트(차트, 히트맵, 스켈레톤, 토스트, 스트리밍 채팅 버블 등)가 필요하면 화면정의서의 "신규 필요 컴포넌트" 항목에 명시하고, 와이어프레임에서는 근사 HTML로 표현한다.

**디자인 토큰** (`src/index.css`): 배경 `#fff`, 텍스트 `#6b6375`(본문)/`#08060d`(제목), 보더 `oklch(0.922 0 0)`, 강조 배경 `rgba(170,59,255,0.1)`, 강조 보더 `rgba(170,59,255,0.5)`, 폰트 `Geist Variable`(fontsource) 또는 `system-ui`. 와이어프레임 HTML은 이 값을 그대로 인라인 스타일에 사용해 실제 앱 톤과 맞춘다.

- [ ] **Step 0: 디자인 시스템 앵커 확인 (읽기 전용)**
  `docs/screens/_source/design-system-anchor.md`를 전체 읽는다. 이 화면의 역할(매니저/교육생/인증/슈퍼어드민)에 해당하는 셸 규격, 그리고 이 화면에서 쓰일 상태·등급 배지의 색상/용어를 확인하고, Step 2~3에서 반드시 그대로 적용한다. **이 파일은 절대 수정하지 않는다** — 16개 화면 작업이 병렬로 진행되므로 공유 파일 쓰기는 충돌을 일으킨다. 앵커에 없는 새로운 시각 패턴이 필요하면, 정의서(`{SCREEN_ID}-{SLUG}.md`) 맨 아래에 "## 앵커 확장 제안" 섹션을 만들어 거기에만 적는다. Task 18에서 모든 화면의 제안을 한 번에 모아 앵커에 반영한다.

- [ ] **Step 1: 소스 읽기**
  `docs/screens/_source/p0-fr-source.md`의 `{SOURCE_LINES}` 구간(해당 `## {SCREEN_ID}` 섹션 전체)을 읽는다. 이 구간에 그 화면에 연결된 모든 FR(P0/P1/P2)의 트리거·입력·처리로직·비즈니스규칙·출력·예외case·화면흐름이 들어 있다.

- [ ] **Step 2: 화면정의서 작성**
  `docs/screens/{SCREEN_ID}-{SLUG}.md`를 아래 템플릿으로 작성한다.

  ```markdown
  # {SCREEN_ID} — <화면명>

  ## 개요
  - **역할(권한)**: {ROLE}
  - **진입경로**: {ENTRY}
  - **연계 FR**: <Step 1에서 읽은 FR ID 목록, 예: DASH-01, DASH-02 ...>
  - **이번 배치(P0) 범위**: <이 FR 중 MVP단계=P0인 것만 나열 — 이번에 실제로 만드는 부분>
  - **후속 확장(P1/P2)**: <MVP단계=P1/P2인 FR 나열 — 레이아웃에는 자리를 남기되 이번엔 미구현>

  ## 목적 & UX 설계 근거
  <1~2문단. (a) 이 화면에서 사용자가 이루려는 목표가 무엇인지 (b) 정보/액션의 우선순위를 왜 이렇게 배치했는지(예: "위험 카드를 최상단에 둔 이유는 FR DASH-10이 '의사결정: 어디를 먼저 확인할지'를 요구하기 때문") (c) 이 화면 특유의 UX 리스크(예: 정보 과밀, 낙인 위험, 스트리밍 대기)와 그 대응을 명시한다. "카드가 있다" 식 서술이 아니라 "왜 이 구조여야 하는지"를 설명한다.

  ## 정보 구조 & 레이아웃
  <상단→하단(또는 좌→우) 순서로 화면을 구성하는 영역을 나열하고 각 영역의 시각적 위계(1차/2차 강조)를 명시. 와이어프레임과 1:1로 대응해야 한다.>

  ## 데이터 & 컴포넌트
  | 영역 | 표시 데이터 | 데이터 출처(FR ID) | UI 컴포넌트 |
  |---|---|---|---|
  | <예: 위험 카드 리스트> | <예: 이름, 위험 축, 하락 시작 시점, 근거 문구> | <예: DASH-10, ENG-04> | <예: card.tsx 반복> |

  ## 화면 액션 → 데이터/API 요구사항
  이 표가 백엔드 개발 계획의 근거가 된다. 이 화면에서 발생하는 모든 사용자 액션(조회 포함)을 빠짐없이 행으로 나열한다.

  | 액션 | 트리거 시점 | 필요 오퍼레이션(조회/생성/수정/삭제) | 요청 데이터(입력 필드) | 응답/부수효과 | 관련 FR | 검증·권한 규칙 |
  |---|---|---|---|---|---|---|
  | <예: 화면 진입 시 위험 목록 로드> | <예: 마운트 시> | <예: 조회> | <예: org_id(세션), 기수 ID, 필터> | <예: 위험/프리라이더/에이스 카드 배열 + 우선순위 사유 문구> | <예: DASH-10, FR-11.1> | <예: org_id 격리(SYS-02), 최소표본 N=5 미달 시 표본부족 처리> |

  각 행의 "관련 FR"은 Step 1 소스의 처리 로직·비즈니스 규칙·예외 처리 문구를 그대로 반영한다 — 새로 지어내지 않는다. FR에 없는 액션(예: 단순 UI 토글)은 "정의서 자체 판단(FR 없음)"이라고 명시한다.

  ## 상태별 UI
  | 상태 | 내용 |
  |---|---|
  | 정상 | <기본 렌더링> |
  | 로딩 | <스켈레톤/스피너 등> |
  | 빈상태 | <데이터 없을 때 안내 문구> |
  | 에러 | <실패 시 표시> |
  | 권한없음 | <해당되면 기술, 없으면 "해당 없음"> |
  | (화면별 추가 상태) | <Step 1의 예외 case에서 UI에 영향 주는 항목을 전부 행으로 추가. case 문구를 그대로 요약> |

  ## 인터랙션 & 화면 전이
  <클릭 시 이동 화면(다른 SC-ID로 명시), 필터/정렬, 편집 등을 나열>

  ## 컴포넌트 매핑
  - 기존 사용: <재고 목록 중 실제 사용할 것>
  - 신규 필요: <없으면 "없음">

  ## 와이어프레임
  <Step 4에서 발행한 Artifact URL을 여기 채운다>
  ```

  **중요:** "상태별 UI"의 각 행은 Step 1에서 읽은 예외 처리 case 문구와 1:1로 대응해야 한다. "화면 액션 → 데이터/API 요구사항"의 각 행은 Step 1의 처리 로직 단계와 대응해야 한다. 둘 다 빠뜨리면 안 된다 — 나중에 Step 6에서 이걸 검사한다.

- [ ] **Step 3: 와이어프레임 HTML 작성**
  `docs/screens/wireframes/{SCREEN_ID}.html`을 작성한다. `design-system-anchor.md`의 셸(매니저/교육생/인증 중 해당하는 것), 카드 패턴, 배지 색상/용어, 버튼 위계를 그대로 적용한다 — 이 화면만의 임의 스타일을 새로 만들지 않는다. Step 2의 "주요 데이터·컴포넌트"와 "상태별 UI"의 정상 상태를 레이아웃으로 표현한다. 로딩/빈상태/에러 등 대체 상태는 같은 파일 하단에 별도 섹션(`<section id="state-loading">` 등)으로 함께 넣어 한 페이지에서 스크롤로 다 볼 수 있게 한다. `<!doctype html>`부터 시작하는 완전한 HTML 문서로 작성한다(Artifact 도구가 아니라 초안 검토용 원본이므로 완결된 문서여야 함).

- [ ] **Step 4: Artifact 발행**
  Artifact 도구로 Step 3 파일을 발행한다(`file_path`: 위 경로, `favicon`: 아래 지정, `description`: 화면명 한 줄). 발행 전 `artifact-design` 스킬을 로드해 지침을 따른다. 반환된 URL을 기록해둔다.

- [ ] **Step 5: 정의서에 와이어프레임 링크 삽입**
  Step 2에서 작성한 `docs/screens/{SCREEN_ID}-{SLUG}.md`의 "와이어프레임" 섹션에 Step 4의 URL을 채워 넣는다.

- [ ] **Step 6: 커버리지 자기 검증 (UI + API 양쪽)**
  Step 1 소스에서 해당 화면의 "예외 처리" 필드에 등장하는 `case` 개수를 센다. Step 2 정의서의 "상태별 UI" 표에서 그 case들에 대응하는 행이 전부 있는지 대조한다. 별도로, Step 1 소스의 각 FR "처리 로직" 단계 수를 세고, "화면 액션 → 데이터/API 요구사항" 표에 그만큼의(또는 논리적으로 묶인) 행이 있는지 대조한다. 둘 중 하나라도 누락이 있으면 정의서를 수정해 채운다.

---

## Task 1: SC-A01 로그인

**Files:**
- Create: `docs/screens/SC-A01-login.md`
- Create: `docs/screens/wireframes/SC-A01.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-A01`, `{SLUG}=login`, `{SOURCE_LINES}=5-124`, `{ROLE}=공용(매니저/교육생/슈퍼어드민 공통 진입점)`, `{ENTRY}=최초 서비스 접속 URL, 또는 로그인 실패 시 이 화면으로 복귀`. Artifact `favicon`: 🔐

## Task 2: SC-A02 이메일 인증·초대

**Files:**
- Create: `docs/screens/SC-A02-email-verification.md`
- Create: `docs/screens/wireframes/SC-A02.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-A02`, `{SLUG}=email-verification`, `{SOURCE_LINES}=125-176`, `{ROLE}=공용(가입·초대된 매니저/교육생)`, `{ENTRY}=초대 메일 또는 가입 확인 메일의 인증 링크 클릭`. Artifact `favicon`: 📧

## Task 3: SC-S01 슈퍼어드민 기관 관리

**Files:**
- Create: `docs/screens/SC-S01-org-management.md`
- Create: `docs/screens/wireframes/SC-S01.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-S01`, `{SLUG}=org-management`, `{SOURCE_LINES}=177-206`, `{ROLE}=슈퍼어드민`, `{ENTRY}=슈퍼어드민 로그인(SC-A01) 성공 후 기본 진입 화면`. Artifact `favicon`: 🏢

## Task 4: SC-T01 초대 수신·계정 활성화

**Files:**
- Create: `docs/screens/SC-T01-invite-activation.md`
- Create: `docs/screens/wireframes/SC-T01.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-T01`, `{SLUG}=invite-activation`, `{SOURCE_LINES}=207-234`, `{ROLE}=교육생`, `{ENTRY}=매니저가 등록한 명단 기반 초대 메일 수신 → 계정 활성화 링크 클릭`. Artifact `favicon`: 🎓

## Task 5: SC-T02 코드 제출

**Files:**
- Create: `docs/screens/SC-T02-code-submission.md`
- Create: `docs/screens/wireframes/SC-T02.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-T02`, `{SLUG}=code-submission`, `{SOURCE_LINES}=235-318`, `{ROLE}=교육생`, `{ENTRY}=SC-A01 로그인 성공 후(교육생), 또는 SC-T05에서 "다음 체크포인트 응시" 클릭`. Artifact `favicon`: 📤

## Task 6: SC-T04 검증 세션(소크라틱)

**Files:**
- Create: `docs/screens/SC-T04-verification-session.md`
- Create: `docs/screens/wireframes/SC-T04.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-T04`, `{SLUG}=verification-session`, `{SOURCE_LINES}=319-358`, `{ROLE}=교육생`, `{ENTRY}=SC-T02 코드 제출 후 백그라운드 기여분석·DP추출 완료 시 자동 진입`. 이 화면은 LLM 응답 스트리밍이 핵심이므로 와이어프레임에 "스트리밍 중" 상태(타이핑 인디케이터)를 별도 섹션으로 반드시 포함한다. Artifact `favicon`: 💬

## Task 7: SC-T05 결과 리포트 열람

**Files:**
- Create: `docs/screens/SC-T05-result-report.md`
- Create: `docs/screens/wireframes/SC-T05.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-T05`, `{SLUG}=result-report`, `{SOURCE_LINES}=359-429`, `{ROLE}=교육생`, `{ENTRY}=SC-T04 세션 종료 후 자동 이동`. Artifact `favicon`: 📊

## Task 8: SC-M02 기수 생성·명단 등록

**Files:**
- Create: `docs/screens/SC-M02-cohort-setup.md`
- Create: `docs/screens/wireframes/SC-M02.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M02`, `{SLUG}=cohort-setup`, `{SOURCE_LINES}=430-499`, `{ROLE}=매니저`, `{ENTRY}=SC-A01 로그인 성공 후(매니저) 초기 설정 메뉴, 또는 SC-M01 대시보드의 "기수 생성" 진입`. Artifact `favicon`: 🗂️

## Task 9: SC-M03 측정 계획 설정

**Files:**
- Create: `docs/screens/SC-M03-measurement-plan.md`
- Create: `docs/screens/wireframes/SC-M03.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M03`, `{SLUG}=measurement-plan`, `{SOURCE_LINES}=500-589`, `{ROLE}=매니저`, `{ENTRY}=SC-M02 완료 후 이어지는 설정 단계, 또는 사이드 메뉴에서 재진입`. Artifact `favicon`: 📅

## Task 10: SC-M01 브리핑·대시보드

**Files:**
- Create: `docs/screens/SC-M01-briefing-dashboard.md`
- Create: `docs/screens/wireframes/SC-M01.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M01`, `{SLUG}=briefing-dashboard`, `{SOURCE_LINES}=590-883`, `{ROLE}=매니저`, `{ENTRY}=SC-A01 로그인 성공 후(매니저) 기본 진입 화면`. **주의:** 이 화면은 13개 FR이 걸려 있어 소스가 가장 길다(590~883줄). 위험/프리라이더/에이스 카드, 개입 추천 리스트, 벤치마크 칩, 안정성 배지 등 다수 위젯이 한 화면에 공존하므로 "주요 데이터·컴포넌트"에서 위젯 단위로 명확히 구획해서 정리한다. Artifact `favicon`: 🧭

## Task 11: SC-M04 위험/프리라이더/에이스 목록

**Files:**
- Create: `docs/screens/SC-M04-risk-list.md`
- Create: `docs/screens/wireframes/SC-M04.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M04`, `{SLUG}=risk-list`, `{SOURCE_LINES}=884-993`, `{ROLE}=매니저`, `{ENTRY}=SC-M01 대시보드의 위험/프리라이더/에이스 카드 클릭`. Artifact `favicon`: ⚠️

## Task 12: SC-M06 교육생 상세

**Files:**
- Create: `docs/screens/SC-M06-trainee-detail.md`
- Create: `docs/screens/wireframes/SC-M06.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M06`, `{SLUG}=trainee-detail`, `{SOURCE_LINES}=994-1092`, `{ROLE}=매니저`, `{ENTRY}=SC-M04 위험목록 또는 SC-M11 교육생목록에서 특정 교육생 클릭`. Artifact `favicon`: 👤

## Task 13: SC-M07 개입 관리

**Files:**
- Create: `docs/screens/SC-M07-intervention-management.md`
- Create: `docs/screens/wireframes/SC-M07.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M07`, `{SLUG}=intervention-management`, `{SOURCE_LINES}=1093-1209`, `{ROLE}=매니저`, `{ENTRY}=SC-M01/SC-M04의 개입 추천에서 "개입 생성" 클릭`. Artifact `favicon`: 🛠️

## Task 14: SC-M08 종합 리포트

**Files:**
- Create: `docs/screens/SC-M08-comprehensive-report.md`
- Create: `docs/screens/wireframes/SC-M08.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M08`, `{SLUG}=comprehensive-report`, `{SOURCE_LINES}=1210-1300`, `{ROLE}=매니저`, `{ENTRY}=사이드 메뉴 "리포트" 또는 체크포인트 종료 시 자동 생성 알림에서 진입`. Artifact `favicon`: 📄

## Task 15: SC-M09 이의 검토·판정 수정

**Files:**
- Create: `docs/screens/SC-M09-appeal-review.md`
- Create: `docs/screens/wireframes/SC-M09.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M09`, `{SLUG}=appeal-review`, `{SOURCE_LINES}=1301-1351`, `{ROLE}=매니저`, `{ENTRY}=교육생의 이의제기 제출 알림, 또는 SC-M06 교육생 상세에서 진입`. Artifact `favicon`: ⚖️

## Task 16: SC-M11 교육생 목록

**Files:**
- Create: `docs/screens/SC-M11-trainee-list.md`
- Create: `docs/screens/wireframes/SC-M11.html`

- [ ] 공통 절차 적용. 변수: `{SCREEN_ID}=SC-M11`, `{SLUG}=trainee-list`, `{SOURCE_LINES}=1352-1397`, `{ROLE}=매니저`, `{ENTRY}=사이드 메뉴 "교육생 목록", 또는 SC-M06에서 뒤로가기`. Artifact `favicon`: 📋

## Task 17: 전체 인덱스 및 커버리지 최종 점검

**Files:**
- Create: `docs/screens/README.md`
- Modify: (검증만, 파일 수정 없음 — 문제 발견 시 해당 Task로 돌아가 수정)

- [ ] **Step 1:** `docs/screens/README.md`를 작성한다. 표로 20개 화면 전체(P0 16개 + P1/P2 전용 4개: SC-A03, SC-M05, SC-M10, SC-M12)를 나열하고, P0 16개는 완료 링크를, 나머지 4개는 "다음 배치"로 표시한다.
- [ ] **Step 2:** Task 1~16에서 만든 16개 `.md` 파일을 순회하며 "상태별 UI" 표의 행 수와 `docs/screens/_source/p0-fr-source.md`의 해당 화면 예외 case 총 개수를 다시 한번 대조한다. 불일치가 있으면 해당 Task로 돌아가 수정한다.
- [ ] **Step 3:** 16개 와이어프레임이 전부 Artifact URL을 갖고 있는지(`docs/screens/*.md`에 빈 "와이어프레임" 섹션이 없는지) `grep -L` 등으로 확인한다.

## Task 18: 전 화면 일관성 하모나이제이션 (반드시 격리되지 않은 단일 세션/에이전트가 수행)

Task 1~16이 서로 독립된 서브에이전트에서 만들어졌다면, `design-system-anchor.md`를 공유했더라도 세부 표현(패딩 값, 배지 문구, 카드 내부 정보 순서 등)에 미세한 드리프트가 생길 수 있다. 이 태스크는 그 드리프트를 잡는 마지막 관문이며, **16개를 전부 한 컨텍스트에서 동시에 보는 것이 핵심**이므로 병렬 서브에이전트로 쪼개지 않는다.

**Files:**
- Modify: `docs/screens/*.md` (16개, 필요한 것만)
- Modify: `docs/screens/wireframes/*.html` (16개, 필요한 것만)

- [ ] **Step 1:** 16개 와이어프레임 HTML과 정의서 `.md`를 전부 열어 `design-system-anchor.md` 기준으로 다음을 대조표로 정리한다: (a) 매니저 셸 사이드바 메뉴 순서·문구가 9개 매니저/슈퍼어드민 화면에서 동일한가 (b) 위험/프리라이더/에이스/등급/개입상태 배지 색상이 전 화면에서 동일한가 (c) 카드 패턴(배지→제목→근거문구→메타→액션 순서)이 지켜졌는가 (d) 빈상태/에러/로딩 표현 톤이 동일한가 (e) 버튼 위계(Primary 화면당 1개)가 지켜졌는가 (f) "화면 액션 → 데이터/API 요구사항" 표의 컬럼 구성과 서술 방식(예: org_id 격리 언급 방식, 권한 규칙 표현 방식)이 16개 화면에서 동일한 규칙을 따르는가 — 특히 SYS-02(테넌트 격리)가 관련된 모든 매니저 화면에서 빠짐없이 검증 규칙에 명시됐는가.
- [ ] **Step 2:** 대조표에서 불일치가 발견된 화면의 `.html`과 `.md`를 직접 수정해 앵커 기준으로 통일한다. 16개 정의서의 "## 앵커 확장 제안" 섹션을 모두 모아, 정말 재사용 가치가 있는 것만 `design-system-anchor.md`에 반영하고(중복·화면 특화 항목은 반영하지 않음), 반영 후 각 정의서의 "앵커 확장 제안" 섹션은 삭제한다.
- [ ] **Step 3:** 수정한 `.html`을 Artifact로 재발행하고(같은 `file_path`로 재호출하면 같은 URL로 갱신됨), `.md`의 와이어프레임 링크는 URL이 바뀌지 않으므로 그대로 둔다.
- [ ] **Step 4:** 대조표를 `docs/screens/README.md` 하단에 "일관성 점검 결과" 섹션으로 남긴다.

---

## Self-Review 결과

- **스펙 커버리지:** `docs/superpowers/specs/2026-07-10-screen-definition-doc-design.md`의 템플릿 7개 필드(화면ID/역할/진입경로/연계FR, 목적, 데이터·컴포넌트, 상태별UI, 인터랙션, 컴포넌트매핑, 와이어프레임)가 공통 절차 Step 2 템플릿에 전부 반영됨. P0 배치 순서 16개 전부 Task 1~16으로 매핑됨.
- **플레이스홀더 스캔:** 각 태스크의 `{SOURCE_LINES}`는 실제 존재하는 파일의 실제 줄 번호이며 검증됨(grep 결과 기준). 템플릿 내부의 `<...>` 표기는 "이 값은 Step 1 소스를 읽고 채운다"는 의도된 지시이지 미확정 TBD가 아니다 — 콘텐츠 자체가 화면마다 달라 사전에 고정할 수 없는 값들이다.
- **커밋:** 이 계획에는 git commit 스텝을 넣지 않았다. 사용자가 명시적으로 요청하기 전까지 커밋하지 않는다.
- **일관성 리스크 반영:** 16개 화면을 격리된 서브에이전트로 병렬 생성할 경우의 시각적 드리프트 문제를 `design-system-anchor.md`(공통 셸·색상·패턴 고정) + Task 18(비병렬 통합 하모나이제이션 패스)로 대응했다.
- **개발 착수 가능성 반영:** "이 정의서만으로 프론트·백엔드 모두 개발 계획을 세울 수 있어야 한다"는 요구에 맞춰 템플릿에 "목적 & UX 설계 근거"(왜 이 구조인지), "화면 액션 → 데이터/API 요구사항" 표(백엔드가 엔드포인트를 설계할 수 있는 최소 단위: 오퍼레이션·요청데이터·응답·검증/권한 규칙)를 추가했다. Step 6 자기검증도 UI 상태뿐 아니라 이 API 표의 커버리지까지 검사하도록 확장했다.
