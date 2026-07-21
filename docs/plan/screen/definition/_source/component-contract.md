# 구현 계약 — 와이어프레임 → 컴포넌트 정규화 (교육생 라인)

> 목적: 와이어프레임(`wireframes/trainee/*.html`)은 **화면 설계**의 진실이지 **CSS 클래스 구조**의 진실이 아니다. 같은 화면 계열을 빠르게 그리느라 파일마다 같은 클래스명이 다른 컴포넌트를 가리키는 충돌이 쌓였다 — 이걸 그대로 공용 스타일시트로 합치면 서로를 덮어쓴다. 이 문서는 **React/컴포넌트로 옮길 때의 명명·구조·접근성 계약**이다.
> 근거: 교차 화면 일관성 감사(2026-07-19). 와이어 자체는 미변경(구현 시 재작성이 전제라 클래스 리네임의 효용이 낮음).

---

## 1. 클래스 이름 충돌 — 반드시 분리 (같은 이름, 다른 컴포넌트)

| 와이어 클래스 | 어디서 무엇 | 실제 컴포넌트로 분리 |
|---|---|---|
| `.step` | home = **여정 스텝퍼 아이템**(원형 번호+라벨) / submission = **폼 섹션 카드**(border·padding·shadow) | `JourneyStep` vs `FormSection` — **가장 위험한 충돌**(합치면 폼 카드가 24px 원형이 됨) |
| `.badge` | home = 회차 상태(done/soon/analyzing/closed/final) / submission = 검증·팀 태그(warn/ok/info/team) / result = 이의 상태(폐기됨) | `StatusBadge` / `Tag` — 회차 상태(home)를 원형으로. result 것은 D117로 소멸 |
| `.badge.done`(home) vs `.badge.ok`(submission) | 같은 의미(success)·같은 색·다른 이름 | variant 이름을 **success/warning/danger/info/neutral**로 통일. `done`·`ok`·`good` 난립 제거 |
| `.cta` / `.gcta`(session) | 동일 선언(100%·52px·primary·700) | `PrimaryButton size=md(48)/lg(52)` 하나 |
| `.ghost` / `.ghostcta` / `.exit` / `.abtn` | 고스트 버튼 4종(패딩·높이 제각각) | `GhostButton` 하나 + size |
| 스피너 4곳(13/14/15/16px) + `@keyframes sp` 4중 | home·submission·session·result | `Spinner size` 하나. **`prefers-reduced-motion` 가드는 4파일 다 정확** — 이건 유지 |
| `.hint`(submission=필드 힌트) vs `.hint`(문서용) → submission이 `.hint2`로 밀어냄 | 이름 충돌의 흔적 | `FieldHint` / `DocHint`로 접두 분리 |

---

## 2. 인라인 알림 — 4중 구현을 하나로

현재 "노란 알림 박스"를 만드는 방법이 4개고 패딩이 다 다르다:

| 와이어 | 형태 |
|---|---|
| submission `.alert` (warn/danger/info/ok) | **유일하게 4 variant 완비** → 이걸 원형으로 |
| home `.banner` (warning 전용, `.b-cta` 내장) | Alert + trailing action slot |
| session `.banner.warn` (padding·border 다름, `.act` 링크 내장) | 동 |
| result `.astat`/`.flag` | astat=D117로 소멸, flag=문서용 주석(구현 아님) |

→ **`Alert { tone: info|warning|danger|success, action?: slot }`** 하나로 통합. trailing action(배너의 [인증]·[다시 연결])은 slot으로.

---

## 3. 접근성 — 대비(WCAG AA 4.5:1)

| 토큰 | 값 | 대비(흰 배경) | 문제 | 조치 |
|---|---|---|---|---|
| `--c-text-3` | `#8b929c` | **3.1:1** ❌ | 장식이 아니라 **판단 정보**에 쓰임: session `.timer`(남은 시간·고부담 세션의 핵심 수치), home `.metatxt`(측정일·응시 기간), `.privacy` 고지, result `.rmeta`·`.state p` | 정보성 텍스트는 **`#6b7280`(≈4.8:1)** 이상으로. **세션 타이머는 본문 색(`--c-text-2`)으로 승격** |
| `--c-warning` | `#b3771a` | **3.8:1** ❌ | 마감 경고(`.due.warn`)·미검증 배너·귀속 경고·연결 끊김 배너의 **텍스트**가 이 색 — 경고가 가장 안 읽힌다(우선순위 역전) | **텍스트용 warning 톤을 별도로 어둡게**(배경색 `--c-warning-soft`는 유지) |

> 색-단독 상태 표현은 이미 잘 되어 있음(DP 점 옆 `2/4`, 깊이 옆 `2단계째`, 궤적 노드 안 `견고/부분/표면` 텍스트) — 유지.

---

## 4. 인터랙티브 요소 시맨틱 — 와이어의 `<span>`/`<div>`를 실제 요소로

와이어는 형태만 그려서 클릭 요소가 대부분 `<span>`/`<div>`다. 구현 시 반드시:

| 와이어 | 실제 시맨틱 |
|---|---|
| submission `.toggle span`(GitHub↔ZIP) | `role="tablist"` + `role="tab"`, 키보드 좌우 이동 |
| submission `.drop`(ZIP 드래그) | `<input type="file">` + 레이블(드래그는 진행 강화용) |
| 모든 `.ta`(답변·URL 입력) | `<textarea>`/`<input>` 실제 요소 |
| `.cta.disabled`(home H-10·submission 분석중) | `<button disabled>` — **현재 disabled 속성이 없어 스크린리더에 활성 버튼으로 읽힘**. "거짓 어포던스 차단" 의도가 보조기술에서만 무효화됨 |
| `.rlink`·`.chg`·`.more`·`.b-cta`·`.rchip`(회차 선택) | `<button>` 또는 `<a>` (포커스 가능) |
| session 새 질문 도착(`.chatbody`) | `aria-live="polite"` — 스크린리더가 새 질문을 읽도록 |
| session `.codebody .hl`(근거 줄) | 근거 줄에 레이블(질문 버블의 `↳파일:줄` 텍스트로 정보는 이미 도달하나 강조 줄 자체엔 없음) |

---

## 5. 디자인 토큰 드리프트 — SSOT 정합

| 토큰 | 교육생 4파일 | 매니저 | SSOT(`_source/design-tokens.md`) | 조치 |
|---|---|---|---|---|
| `--shadow-card` | 3파일 `.08` / 1파일 `.09` | `.09` | 스펙(.06)과 다름 | **`.09`로 통일** + SSOT를 실사용 값으로 갱신(지금 SSOT가 거짓) |
| `--mono` | 2종(`SFMono-Regular` 유무) | `ui-monospace,Menlo,monospace` | 없음 | 매니저 값(다수)으로 통일 |
| `--r-xl:18px` | 4파일 사용 | — | SSOT에 없음 | SSOT에 승격 |
| `--fs-3xl:30px` | home 선언·**미사용** | — | 없음 | **폐기**(데드 토큰). submission `.r-xl`·result `.fs-xl` 미사용분도 정리 |
| 하드코딩 색 | `#e6d3a8`(warning 테두리)·`#c5daf0`(info 테두리)·`#cdd4f2`·`#e0e3ea` | | | soft 배경은 토큰인데 **짝인 테두리 토큰이 없어** 하드코딩됨 → `--c-warning-border`·`--c-info-border`·`--c-neutral-soft` 추가 |

---

## 6. 셸·전이 정합 (마이크로)

- **submission 상단 네비 활성 표시 없음**(8프레임 전부 `.on` 없음) → 제출은 홈의 자식 경로이므로 **홈=활성**.
- **result 뒤로가기 어포던스** — submission은 `.back`(클릭 가능), result는 `.crumb`(비클릭) → **Breadcrumb 하나로 통일**("내 리포트"를 클릭 가능하게).
- **`.wrap` max-width / `.tapp` min-height** — result만 700/480, 나머지 660/520 → **660/520으로 통일**(화면 전환 시 미세 흔들림 제거).
- **마이크로카피 규칙(문서화만, 위반 아님):** 사용자 감정 문장=해요체, 시스템 규칙·사실=합쇼체 — 4파일이 이미 일관. 새 문구 작성자가 깨지 않도록 규칙으로 명시.
- **🔒 글리프 이중 의미** — (a)"점수 안 보임·안심"(다수) vs (b)"당신은 못 봄·잠금"(비공개) → **잠금은 다른 표현**(회색 배지)으로 분리.

---

## 우선순위 (구현 착수 시)

1. **[상] `.step` 분리**(JourneyStep/FormSection) — 공용 CSS 합치면 즉시 깨짐
2. **[상] Alert 통합** — 4중 구현
3. **[상] 대비 2건**(text-3 정보성·warning 텍스트) — 접근성 + 고부담 세션의 타이머 가독성
4. **[상] `.cta.disabled` → `disabled` 속성** — 거짓 어포던스가 보조기술에서 새는 것
5. [중] badge/button variant 이름 통일, 토큰 드리프트·SSOT 갱신
6. [중] 시맨틱(tablist·aria-live), 셸 정합

> 이 문서는 교육생 라인 기준. 매니저 라인 착수 시 §5 토큰·§1 명명은 **전역 공용 컴포넌트/토큰 파일 1개**로 추출하며 확정(그때 하나를 반드시 버려야 함).
