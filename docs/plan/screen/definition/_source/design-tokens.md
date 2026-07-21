# 디자인 토큰 & 컨벤션 (v8 신규 — 기존 자산 미참조)

> 병렬 드리프트 방지용 단일 소스. 모든 화면정의서·와이어프레임은 이 토큰만 쓴다.
> **기존 `src/`·`docs/screens/` 자산은 소스가 아니다.** 전부 새로 정의.
> 화면을 진행하며 필요한 토큰만 점진 추가(지금은 SC-A01 기준 최소셋).
>
> ---
>
> **🔵 구현 반영됨 (2026-07-21).** 이 문서는 **값의 근거**이고, 실제 토큰 정의는
> `src/index.css`의 `@theme`이다. 구현하며 아래 두 가지가 바뀌었다.
>
> **① 이름 — 역할 기준으로 변경** (와이어 실측 사용처 기반)
>
> | 이 문서 | 구현(`@theme`) | 유틸리티 | 역할 |
> |---|---|---|---|
> | `--c-bg` | `--color-canvas` | `bg-canvas` | 페이지 배경 |
> | `--c-surface` / `-2` | `--color-surface` / `-2` | `bg-surface` | 카드 / 보조 표면 |
> | `--c-text` | `--color-fg` | `text-fg` | 본문·제목 |
> | `--c-text-2` | `--color-fg-muted` | `text-fg-muted` | 보조 본문 (와이어 280회) |
> | `--c-text-3` | `--color-fg-subtle` | `text-fg-subtle` | 캡션·메타 (614회, 47%가 xs) |
> | 그 외 | 동일 (`primary`·`danger`·`warning`·`success`·`info`) | | |
>
> **② 값 — WCAG AA(4.5:1) 미달 3건 교정.** 계산 근거는 `scripts/check-design.mjs`가
> 매 CI마다 재검증한다.
>
> | 토큰 | 이 문서 | 구현 | 사유 |
> |---|---|---|---|
> | `text-3` → `fg-subtle` | `#8b929c` (3.14:1) | **`#686f7d`** (4.63:1) | 판단 정보(타이머·기간)에 쓰여 AA 필수 |
> | `warning` | `#b3771a` (3.77:1) | **`#96631a`** (5.13:1) | 경고가 가장 안 읽히는 우선순위 역전 |
> | `success` | `#1f8a5b` (4.33:1) | **`#1a7d52`** (5.12:1) | 구현 중 발견(감사에서 누락됐던 건) |
>
> 추가된 토큰: `*-border` 계열(와이어에서 하드코딩되던 것), `--radius-xl`,
> `--container-page`. `--shadow-card`는 와이어 실사용 값(.09)으로 통일.
> **간격 토큰은 정의하지 않는다** — 이 문서의 4·8·12·16·24·32·48px이 Tailwind
> 기본 스케일과 값이 같다.

## 디자인 방향 (한 줄)
**차분하고 신뢰감 있는 B2B 운영 도구** — 데이터 밀도는 높되 조용한 뉴트럴 베이스 + 절제된 단일 액센트. 상태(위험·회복·표본부족)는 **의미 색으로만** 말한다.

## 컬러 토큰 (CSS 변수)
```css
:root{
  /* 뉴트럴 (cool gray ramp) */
  --c-bg:#f4f5f7; --c-surface:#ffffff; --c-surface-2:#fafbfc;
  --c-border:#e2e5ea; --c-border-strong:#cfd4dc;
  --c-text:#181b20; --c-text-2:#5a616b; --c-text-3:#8b929c;
  /* 브랜드 / 주 액션 */
  --c-primary:#3a4db8; --c-primary-hover:#31429e; --c-primary-soft:#eef0fb;
  /* 의미 색 (semantic) */
  --c-danger:#c0392b;  --c-danger-soft:#fbeceb;
  --c-warning:#b3771a; --c-warning-soft:#fbf3e6;
  --c-success:#1f8a5b; --c-success-soft:#e8f5ee;
  --c-info:#2f6bb0;    --c-info-soft:#eaf2fa;
  /* 반경 / 타이포 / 간격 */
  --r-sm:6px; --r-md:10px; --r-lg:14px;
  --fs-xs:12px; --fs-sm:13px; --fs-base:14px; --fs-lg:16px; --fs-xl:20px; --fs-2xl:26px;
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px; --sp-6:32px; --sp-8:48px;
  --shadow-card:0 1px 2px rgba(20,24,31,.04),0 4px 16px rgba(20,24,31,.06);
  --font:-apple-system,'Apple SD Gothic Neo',system-ui,'Segoe UI',sans-serif; /* 웹폰트 미참조(CSP) */
}
```

## 상태·의미 → 색 매핑표 (같은 의미 = 항상 같은 색)
의미 규범(B)·표현 규범(A)과 1:1. 새 상태가 나오면 여기 추가하고, 화면에서 임의 색 신설 금지.

| 의미 | 색 토큰 | 쓰이는 곳(예) |
|---|---|---|
| 위험·차단·에러·DETERIORATED | `danger` | 인증 실패, 403 격리, 비활성 차단, 하락 시그널 |
| 주의·표본부족·미검증·PARTIAL_RECOVERY·일시잠금 | `warning` | DASH-08 표본부족, AUTH-07 미검증 이메일, 계정 잠금 |
| 정상·활성·회복(RECOVERED)·승인(APPROVED) | `success` | 활성 계정, INTV-06 회복, CUR 승인 |
| 정보·안내·온디맨드 | `info` | 인증 재발송 안내, RPT-05 근거 패널 |
| 비활성·보류·PENDING·HIDDEN | 뉴트럴(`text-3`) | 보류 항목, 미도래 판정, 비공개 리포트 |

## 컴포넌트 명명 (신규 — 화면 진행하며 확장)
| 컴포넌트 | 용도 | 최초 등장 |
|---|---|---|
| `Wordmark` | 로고/서비스명 자리 | SC-A01 |
| `AuthCard` | 인증 화면 중앙 카드 | SC-A01 |
| `TextField` / `PasswordField` | 라벨+입력+검증 메시지 | SC-A01 |
| `PrimaryButton` / `TextLink` | 주 액션 / 보조 링크 | SC-A01 |
| `InlineAlert` (variant: danger/warning/info) | 폼 상단 상태 알림 | SC-A01 |

## 전역 UI 규칙
- **페이지네이션은 정중앙 정렬**(D22). 좌/우 정렬 금지. 페이지 버튼 중앙 + 건수는 그 아래/옆 subtle.

## 와이어프레임 규약
- CSS **전부 인라인**(외부 스크립트·CDN·웹폰트 금지 — Artifact CSP 대비, 로컬=발행본 동일).
- 저해상도 시안: **정상 상태 + 그 화면의 지배적 상태 1~2개**만 시각화. 나머지 예외 상태는 정의서 `.md` 상태표에만(비주얼은 v2 통일 패스).
- 각 프레임에 상태 라벨 + 우측/하단에 상태↔case 매핑 노트.
