---
name: RealiZe
description: AI 기반 교육생 역량 측정·진단 플랫폼의 운영 콘솔
colors:
  canvas: "#f4f5f7"
  surface: "#ffffff"
  surface-2: "#fafbfc"
  border: "#e2e5ea"
  border-strong: "#cfd4dc"
  fg: "#181b20"
  fg-muted: "#5a616b"
  fg-subtle: "#686f7d"
  primary: "#3a4db8"
  primary-hover: "#31429e"
  primary-soft: "#eef0fb"
  primary-border: "#cdd4f2"
  brand-1: "#31429e"
  brand-2: "#232a4d"
  danger: "#c0392b"
  danger-soft: "#fbeceb"
  danger-border: "#f0cdc9"
  warning: "#96631a"
  warning-soft: "#fbf3e6"
  warning-border: "#e6d3a8"
  success: "#1a7d52"
  success-soft: "#e8f5ee"
  success-border: "#b7dfc9"
  info: "#2f6bb0"
  info-soft: "#eaf2fa"
  info-border: "#c5daf0"
  neutral-soft: "#e0e3ea"
  nav: "#1e2436"
  nav-active: "#2a3147"
  nav-fg: "#aeb4c6"
  nav-accent: "#d9a441"
typography:
  display:
    fontFamily: "-apple-system, 'Apple SD Gothic Neo', system-ui, 'Segoe UI', sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "26px"
    fontWeight: 700
  title:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "13px"
    fontWeight: 600
  meta:
    fontFamily: "{typography.display.fontFamily}"
    fontSize: "11px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "13px"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 14px"
    typography: "{typography.meta}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg-muted}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "16px"
  card-footer:
    backgroundColor: "{colors.surface-2}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.fg}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "40px"
    typography: "{typography.mono}"
  badge:
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.meta}"
  sidebar:
    backgroundColor: "{colors.nav}"
    textColor: "{colors.nav-fg}"
---

# Design System: RealiZe

> **토큰의 단일 원천은 `src/index.css`의 `@theme`이다.** 이 문서는 그 값을 읽기 좋게 옮긴 것이고,
> 값의 근거(왜 이 색인가)는 `docs/plan/v1/definition/_source/design-tokens.md`,
> 컴포넌트 명명 계약은 `docs/plan/v1/definition/_source/component-contract.md`에 있다.
> 토큰을 바꾸면 `src/index.css`를 고치고 여기를 맞춘다. 반대 방향 아님.

## 1. Overview

**Creative North Star: "조용한 관제실"**

매니저가 하루 종일 켜두는 화면이다. 필요한 정보를 한눈에 담되, 아무것도 스스로 소리치지 않는다. 배경은 뉴트럴한 쿨 그레이(`canvas #f4f5f7`)로 깔리고, 카드가 흰 면으로 떠 있고, 색이 등장하는 순간은 **상태가 발생했을 때뿐**이다. 액센트는 인디고 하나(`primary #3a4db8`)로 고정 — 주 액션과 선택 상태 말고는 쓰지 않는다.

밀도는 의도적으로 높다. 본문 기준이 14px이고(웹 기본 16px 아님), 표·배지·메타 정보가 11~13px에서 산다. 그래서 대비가 협상 대상이 아니다 — 작은 글씨가 판단 정보를 담기 때문에 캡션 색조차 AA(4.5:1)를 넘는다. `npm run check:design`이 매 CI마다 이걸 다시 계산한다.

이 시스템이 거부하는 것: 그라디언트 카드와 큰 도넛 차트로 채운 "대시보드 대시보드한" 첫 화면, 한 행에서 색이 경쟁하는 배지 더미, 다크 모드 SaaS 랜딩의 glassmorphism·보라 그라디언트·과한 모션, 근거 없이 등급만 크게 띄우는 판결형 UI.

**Key Characteristics:**
- 뉴트럴 베이스 + 단일 인디고 액센트
- 의미 색은 상태가 있을 때만 등장 (danger·warning·success·info)
- 14px 본문, 11px 메타 — 고밀도 B2B
- 다크 모드 없음, 웹폰트 없음(한글은 시스템 폰트 폴백)
- 매니저·슈퍼어드민 셸만 어두운 사이드바(`nav #1e2436`) — 앱의 유일한 어두운 면

## 2. Colors

조용한 쿨 그레이 램프 위에 인디고 하나, 그리고 의미가 발생할 때만 켜지는 4색.

### Primary
- **Indigo** (`#3a4db8`): 주 액션 버튼, 선택된 행/탭, 링크. 한 화면에 주 액션은 하나가 원칙이다. hover는 `#31429e`, 선택 행 배경은 `primary-soft #eef0fb`.
- **Brand gradient** (`#31429e` → `#232a4d`): 인증 화면(AU-01·02·03) 좌측 패널 전용. 앱 내부에는 그라디언트가 없다.

### Secondary
의미 색 4종. **같은 의미는 항상 같은 색**이고, 화면에서 임의 색을 신설하지 않는다. 각각 텍스트용 진한 값 / `-soft` 배경 / `-border` 테두리 3종 세트다.
- **Danger** (`#c0392b`): 위험·차단·에러·하락 시그널(DETERIORATED). 인증 실패, 403 격리, 비활성 차단.
- **Warning** (`#96631a`): 주의·표본 부족·미검증·부분 회복·일시 잠금. 원래 `#b3771a`였으나 3.77:1로 미달 — 경고가 가장 안 읽히는 우선순위 역전이라 어둡게 교정했다.
- **Success** (`#1a7d52`): 정상·활성·회복(RECOVERED)·승인(APPROVED).
- **Info** (`#2f6bb0`): 정보·안내·온디맨드 패널.

### Neutral
- **Canvas** (`#f4f5f7`): 페이지 배경.
- **Surface / Surface-2** (`#ffffff` / `#fafbfc`): 카드·패널 / 툴바·표 헤더 셀·카드 푸터.
- **Border / Border-strong** (`#e2e5ea` / `#cfd4dc`): 구분선 / 폼 컨트롤·ghost 버튼 테두리.
- **fg** (`#181b20`): 본문·제목.
- **fg-muted** (`#5a616b`): 보조 본문. 와이어 실측 280회.
- **fg-subtle** (`#686f7d`): 캡션·메타. 614회, 그중 47%가 작은 글씨. SSOT의 `#8b929c`는 3.14:1이라 4.63:1로 교정.
- **neutral-soft** (`#e0e3ea`): 비활성·보류 배지 배경.

### Nav (어두운 면)
- **nav / nav-active** (`#1e2436` / `#2a3147`): 매니저·슈퍼어드민 사이드바.
- **nav-fg** (`#aeb4c6`): nav 위 글자, 7.45:1.
- **nav-accent** (`#d9a441`): 총괄 배지 등 어두운 면 위 강조. 밝은 배경용 `warning #96631a`를 여기 쓰면 3.01:1로 미달한다 — 밝은 쪽을 위해 어둡게 만든 색이라서.

### Named Rules
**The One Accent Rule.** 액센트는 인디고 하나다. 주 액션과 선택 상태 밖에서 `primary`를 쓰지 않는다. "이 버튼만 좀 다르게"가 쌓이면 어느 게 주 액션인지 화면에서 안 읽힌다.

**The Semantic-Only Rule.** 색으로 예쁘게 만들지 않는다. `danger`/`warning`/`success`/`info`는 그 의미가 실제로 발생했을 때만 켜진다. 비활성·보류·PENDING은 색이 아니라 `fg-subtle`로 표현한다.

**The Never-Color-Alone Rule.** 색만으로 상태를 말하지 않는다. 점 옆에 `2/4`, 깊이 옆에 `2단계째`처럼 텍스트가 항상 동반된다.

## 3. Typography

**Font:** `-apple-system, 'Apple SD Gothic Neo', system-ui, 'Segoe UI', sans-serif` — display/body 구분 없이 하나.
**Mono:** `ui-monospace, Menlo, monospace` — 코드 제출·근거 줄.

**Character:** 웹폰트를 참조하지 않는다(CSP + 한글은 어차피 시스템 폰트로 폴백). 개성은 서체가 아니라 밀도와 대비에서 나온다.

### Hierarchy
- **Display** (700, 32px): 인증 화면 좌측 마케팅 헤드라인 전용. 앱 내부에는 없다.
- **Headline** (700, 26px): 페이지 제목.
- **Title** (600, 20px): 섹션·카드 제목.
- **Body-lg** (400, 16px): 강조 본문, 큰 수치.
- **Body** (400, 14px): 기본. `<body>`의 font-size가 이 값이다.
- **Label** (600, 13px): 폼 라벨, 표 헤더, 버튼 lg.
- **Caption** (400, 12px): 힌트, 보조 설명, 버튼 sm/md.
- **Meta** (600, 11px): 배지, 표의 보조 정보. 확정 화면 실측 최다(148회) — 12px보다 3배 많다.

### Named Rules
**The 14px Baseline Rule.** 웹 기본 16px이 아니라 14px가 기준이다. 고밀도 운영 도구라서다. 새 화면에서 본문을 16px로 올리지 않는다.

**The Small-Text-Must-Read Rule.** 11~12px에 판단 정보(타이머·기간·표본 수)가 들어간다. 그래서 그 크기에 쓰는 색은 `fg-subtle`이 하한이고, 시간 압박이 있는 세션 타이머는 `fg-muted`로 승격한다.

## 4. Elevation

거의 평평하다. 깊이는 그림자가 아니라 **면(surface)과 테두리**로 만든다 — canvas 위의 흰 카드, 카드 안의 `surface-2` 툴바/푸터, 1px `border`. 그림자는 카드 하나에만 쓰고 종류도 하나뿐이다.

### Shadow Vocabulary
- **card** (`box-shadow: 0 1px 2px rgba(20,24,31,.04), 0 4px 16px rgba(20,24,31,.09)`): 카드·팝오버·드롭다운. 이게 전부다.

### Named Rules
**The One Shadow Rule.** 그림자 스케일을 만들지 않는다. 더 떠 보여야 하면 그림자를 키우는 게 아니라 배치나 위계를 고친다.

## 5. Components

`src/components/ui/` 35개가 실제 구현이다. 새 컴포넌트를 만들기 전에 먼저 여기 있는지 본다(`docs/dev/frontend-architecture.md` §7).

### Buttons
- **Shape:** `rounded-md` (10px), `font-semibold`, 누를 때 1px 내려앉음.
- **Primary:** `bg-primary` + 흰 글자, `px-3.5 py-2 text-xs`(md). hover `bg-primary-hover`.
- **Ghost:** `bg-surface` + `fg-muted` + `border-strong` 1px. hover `bg-canvas`. 취소·닫기·부차적 이동.
- **Danger:** `bg-danger` + 흰 글자. 되돌릴 수 없는 삭제·차단에만.
- **Sizes:** sm(`px-3 py-1.5`) · md(기본) · lg(`h-11 w-full`, 폼 제출).
- **Disabled:** `disabled` 속성으로만. `opacity-60` + `cursor-not-allowed`, `pointer-events-none`은 쓰지 않는다(커서가 안 보임).
- **Focus:** 컴포넌트가 그리지 않는다. `index.css`의 전역 `:focus-visible`(2px `primary` 아웃라인, offset 2px)이 기준선이고, `outline-none`으로 지우면 안 된다.
- variant를 더 만들지 않는다. 필요해 보이면 먼저 묻는다.

### Badges
- **Style:** `rounded-full`, `px-2 py-0.5`, 11px 600. 높이를 고정하지 않는다.
- **Variants:** `success` / `warning` / `danger` / `info` / `neutral` — `{tone}-soft` 배경 + `{tone}` 글자. `done`·`ok`·`good` 같은 이름은 쓰지 않는다(component-contract §1).

### Cards / Containers
- **Corner:** `rounded-md` (10px). lg(14px)는 더 큰 컨테이너용.
- **Background:** `surface`, 푸터만 `surface-2` + `border-t`.
- **Border:** `border` 1px. ring이 아니라 border를 쓴다(ring은 폭을 안 차지해서 인접 요소와 어긋난다).
- **Padding:** `--card-spacing` 16px, size=sm이면 12px.
- **Page width:** `--container-page` 1320px (매니저 화면 콘텐츠 폭).

### Inputs / Fields
- **Style:** 높이 40px, `rounded-md`, `border-strong` 1px, `bg-surface-2`, `px-3`, 13px. 카드 위에 얹힐 땐 `bg-surface`로 덮는다.
- **Focus:** 테두리가 `ring` 색으로 이동 + 3px 링.
- **Error:** `aria-invalid`에 `border-destructive` + 링. 클래스가 아니라 속성으로 온다.
- **Disabled:** `cursor-not-allowed` + 배경 흐림.

### Navigation
- **Sidebar:** `bg-nav #1e2436`, 글자 `nav-fg`, 선택 항목 `nav-active` 배경. 매니저·슈퍼어드민 셸 전용이고 앱의 유일한 어두운 면이다. nav 항목은 하드코딩이 아니라 **데이터로** 둔다(총괄 nav = 담당 nav + '운영 관리' 하나).
- **Breadcrumb:** 뒤로 가기는 Breadcrumb 하나로 통일. 상위 항목은 클릭 가능해야 한다.

### 표 (Signature Component)
전 화면 공통 배치다. 벗어나지 않는다.
- **헤더:** 좌측에 제목 + 총 개수, 우측에 `+ 추가`.
- **툴바:** 검색·필터·정렬 전부 좌측 정렬. `surface-2` 배경.
- **푸터:** 좌측에 "n–m / 전체 k", **페이저는 정중앙**. 좌/우 정렬 금지 — `npm run check:pagination`이 검사한다.

## 6. Do's and Don'ts

### Do:
- **Do** 색·반경·글자 크기는 토큰만 쓴다. 하드코딩 hex는 `npm run check:design`이 막는다.
- **Do** 크기·간격 임의값(`h-[46px]`)은 허용하되, **같은 값이 3번 반복되면 토큰으로 승격**한다.
- **Do** 새 상태가 생기면 화면에서 색을 고르지 말고 `_source/design-tokens.md`의 의미↔색 매핑표에 먼저 추가한다.
- **Do** 클릭 요소는 실제 `<button>`/`<a>`로, 탭은 `role="tablist"`+`role="tab"`으로, 비동기로 도착하는 내용은 `aria-live="polite"`로.
- **Do** 새 컴포넌트는 `features/{도메인}/components`에 만들고, 다른 도메인도 필요해질 때 `components/common`으로 올린다.
- **Do** 사용자 감정 문장은 해요체, 시스템 규칙·사실은 합쇼체.

### Don't:
- **Don't** 그라디언트 카드·네온 액센트·큰 도넛 차트로 첫 화면을 채우지 않는다. 밀도가 낮고 판단에 안 쓰인다.
- **Don't** glassmorphism·보라 그라디언트·과한 모션을 쓰지 않는다. 이건 랜딩이 아니라 도구다.
- **Don't** 근거 없이 등급·점수만 크게 띄우지 않는다. 자동 확정은 RBAC 레벨에서 차단돼 있고 UI도 같은 선을 지킨다.
- **Don't** `outline-none`으로 전역 포커스 링을 지우지 않는다.
- **Don't** 못 누르는 버튼을 `.disabled` 클래스로 표현하지 않는다 — 스크린리더에 활성 버튼으로 읽힌다. `disabled` 속성을 쓴다.
- **Don't** 페이지네이션을 좌/우로 정렬하지 않는다. 정중앙.
- **Don't** 어두운 사이드바 위에 `warning #96631a`를 쓰지 않는다(3.01:1). `nav-accent #d9a441`이 그 자리다.
- **Don't** 다크 모드 스타일(`dark:*`)을 추가하지 않는다. 요구가 생기면 원시 팔레트 층부터 넣는다.
- **Don't** 버튼·배지 variant를 늘리지 않는다. 필요해 보이면 먼저 묻는다.
