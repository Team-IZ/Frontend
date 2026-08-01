# 프론트엔드 세팅 계획 (feature/setup)

> 확정 뷰 기준으로 프론트엔드를 처음부터 세우는 단계 계획. 와이어(`wireframes/`) → 실제 React 앱으로 옮길 때의 순서·스택·경계.
> 근거: 확정 와이어 17종 인벤토리(2026-07-21), `_source/design-tokens.md`, `_source/component-contract.md`.
> **브랜치: `main`에서 `feature/setup` 분기.** 현재 로컬은 `planning`에만 있으므로 이 문서는 planning에서 작성, 실제 코드 착수는 feature/setup에서.
> **단, 팀 규약(`docs/handbook/git-convention.md`)은 `develop` 통합 브랜치를 전제한다.** 레포에 아직 `develop`가 없어 최초 1회는 `main` 기준으로 분기했다 — **0단계에서 `develop`를 만들고, 이후 모든 PR은 `develop`로 보낸다**(`main`은 배포 전용).

---

## 0. 현재 상태 (사실관계)

- **`main`** = Vite8 + React19 + TS6 + oxlint 스타터 그대로. **라우터·상태·데이터패칭 라이브러리 전무.**
- **`planning`** = main 위에 Tailwind v4 + shadcn(@base-ui) + lucide + cva/clsx/tailwind-merge + Geist를 얹었고 `src/components/ui/*` 일부(table·dialog·tabs·select 등) 존재. **이건 main엔 없음** → feature/setup에서 재이식 필요.
- 와이어 = 인라인 CSS 정적 목업. 토큰은 `_source/design-tokens.md` 하나로 통일됨. 컴포넌트 명명·충돌 해소는 `_source/component-contract.md`에 정리됨.

## 1. 범위: 확정 / 임시

| 구분 | 화면 |
|---|---|
| **확정 (세팅 대상)** | 로그인·비번재설정·매니저가입·교육생활성화 / 플랫폼콘솔 / 운영관리(program-admin·roster-assign, 총괄전용) / 대시보드·교육생리스트·교육생상세 / 교안 / 프로젝트 워크스페이스 / 교육생 홈·제출·세션·결과 |
| **임시 (라우트+"준비중" placeholder만)** | 분석·진단(analysis) / 개입관리(intervention) / 리포트(report) — 나중에 전면 재작성 예정 |

## 2. 확정 스택 (main에 없는 것만 추가)

| 영역 | 선택 | 근거 |
|---|---|---|
| 라우터 | **React Router v7** | 탭·모달이 대부분 URL을 가짐(program-admin 4탭, project-workspace 4탭, 콘솔). 중첩 라우트 필수. 보수적·정답. |
| 서버 상태 | **TanStack Query** | 기수 스코프 변경 시 재조회, 제출 분석 폴링, mutation 전부. |
| 전역 클라 상태 | **Zustand — 스토어 2개만** (`auth/role`, `cohort scope`) | 그 이상 만들지 않음. |
| 폼 | **React Hook Form + zod** | 무거운 것에만(프로젝트 생성 위저드, 체크포인트 모달, 동의 플로우). 로그인 등은 native. |
| 데이터 소스 | **MSW 목 서버** | 백엔드 미완. 화면은 처음부터 `fetch` + Query로 짜고 `api/*` 인터페이스 뒤에 MSW 핸들러. 백엔드 나오면 핸들러만 끔 → 재작업 제로. |
| UI | **Tailwind v4 + shadcn(base-ui) + lucide + cva** (planning 선택 유지) | — |
| 차트 | **라이브러리 없음** | 확정 뷰의 그래프는 전부 인라인 SVG polyline/원 수준. recharts류는 analysis 붙일 때 재검토. |
| 실시간(세션) | **세팅 단계 관심사 아님** | 세션 화면 착수할 때 SSE/WS 결정. 지금 미리 안 깜. |

## 3. 단계 계획

### 0단계 · 브랜치 & 베이스라인
- `main`에서 `feature/setup` 분기.
- **`develop` 통합 브랜치 생성** + `main`·`develop` 브랜치 보호 규칙(직접 push 금지) 설정 — 규약이 성립하려면 실재해야 한다.
- **규약 자동화 4종**(체크리스트를 사람이 체크하지 않게): `.githooks/commit-msg`(메시지 형식) · `.oxlintrc.json`에 `no-console` · GitHub Actions 빌드 체크 · `.github/pull_request_template.md`.
- planning에서 잘 잡아둔 셋업만 이식: tailwind/shadcn deps, `src/lib/utils.ts`, `components.json`, path alias. planning 스타터 잔재(App.css hero 데모)는 버림.
- 라이브러리 설치: react-router · @tanstack/react-query · zustand · react-hook-form + zod · msw.

### 1단계 · 파운데이션
- `design-tokens.md` → `index.css`의 `:root` CSS 변수로 승격(각 와이어가 인라인 복제한 걸 하나로).
- `component-contract.md §5` 토큰 드리프트 확정(shadow `.09`, `--r-xl` 승격, `--fs-3xl` 데드토큰 폐기, warning/info 테두리 토큰 추가).
- 폴더 구조: `src/{app(라우팅·셸), features/*, components/ui, components/common, lib, api}`.
- **MSW 셋업** — `api/*.ts` 인터페이스 + 핸들러. 화면은 이 인터페이스에만 의존.

### 2단계 · 앱 셸 5종 + 라우트 골격
- 셸: ①Auth(중앙 카드) ②Manager(다크 사이드바 184px + topbar 기수선택기) ③Superadmin(3항목 nav) ④Trainee(사이드바X 중앙 660px) ⑤Session(크롬 최소 집중 셸).
- 라우트 트리 전체를 placeholder로 먼저 깐다.
- **RBAC = 라우트 단위 아님, 컴포넌트 단위 게이팅** — 총괄 전용 저작액션이 화면 안에 산재. `<LeadOnly>` 게이트 프리미티브 1개 + nav 항목 비노출 로직(운영 관리).

### 3단계 · 공용 컴포넌트
- 뼈대 세트: **DataTable**(툴바 검색·필터·정렬 + 중앙 페이저 푸터), Modal, StatusBadge, Alert(info/warn/danger/success), Tabs, StatCard, EmptyState, Stepper, Popover(기수선택기), Toast, FileDrop, Chip에디터, BulkActionBar.
- `component-contract.md` 충돌 해소 반영: `.step` = JourneyStep/FormSection 분리, Alert 4중구현 통합, 접근성 대비 2건(text-3 정보성·warning 텍스트), `.cta.disabled` → 실제 `disabled` 속성.

### 4단계 · Auth 라인 (end-to-end 검증)
- login → 서버가 역할 판정 → 대시보드/홈/콘솔 분기. reset·signup·activation.
- 가장 단순 → 여기서 셸·라우팅·게이팅·MSW 전체 흐름을 처음으로 관통 검증.

### 5단계 · Manager 라인
- 대시보드(셸 확정) → 교육생리스트 → 교육생상세 → 운영관리(program-admin·roster-assign; 총괄 게이팅 + CSV 업로드·벌크) → 교안(PDF 비동기 추출 상태머신) → 프로젝트 워크스페이스(생성위저드 → 팀편성 → 체크포인트; 매니저 최난도).
- **기수 스코프 컨텍스트**를 이 단계에서 실동작(바꾸면 하위 반·명단·프로젝트·대시보드 전부 재조회 + URL 세그먼트 변경).

### 6단계 · Trainee 라인
- 홈(11상태 분기) → 제출(+분석 **폴링** 공유상태, 홈과 미러링) → 세션(**실시간** 최난도, 여기서 SSE/WS 결정) → 결과.

### 임시 처리
- analysis / intervention / report = 라우트 + "준비중" placeholder만. 나중에 전면 재작성.

## 4. 복잡도 핫스팟 (세팅 시 미리 알 것)

1. **검증 세션** — 실시간 질답 스트리밍, 코드 패널 라인 하이라이트 동기화, 서버 타이머(이탈 시 정지), 이어하기, 네트워크 복구. 최난도.
2. **제출 분석 폴링** — 4단계 진행, 화면 닫아도 지속, 홈(H-10/H-11)과 상태 미러링 → 공유 상태 소스 필요.
3. **명단 반 배정** — 다중선택 → 레일 armed → 반 클릭 즉시 배정 + undo 토스트.
4. **팀 편성** — 미배정 풀 다중선택 + 자동배분 모달. 확정 N이 측정 분모로 다른 탭에 즉시 전파.
5. **권한 게이팅** — 컴포넌트 단위. 담당=읽기전용, 총괄=저작.
6. **기수 스코프** — 전역. 바꾸면 하위 전부 재조회.

## 5. 착수 전 확정된 결정

- 데이터: MSW 목 서버.
- 스택: React Router v7 + TanStack Query + Zustand + RHF/zod.
- 실시간·차트 라이브러리: 세팅 단계에서 안 깜, 해당 화면 착수 시 결정.
