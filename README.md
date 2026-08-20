# RealiZe Frontend

AI 기반 교육생 역량 측정·진단 플랫폼의 프론트엔드.

## 시작하기

```bash
nvm use          # Node 22 (.nvmrc)
npm install      # 의존성 + git 훅 자동 설정
npm run dev      # http://localhost:5173
```

## 명령어

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (typecheck 포함) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint |
| `npm run typecheck` | 타입 검사 |
| `npm run format` | 코드 포맷 적용 |
| `npm run format:check` | 포맷 검사 (CI와 동일) |

## 문서

| 문서 | 내용 |
| --- | --- |
| [`docs/handbook/git-convention.md`](docs/handbook/git-convention.md) | **작업 전 필독.** 브랜치·커밋·PR 규약 |
| [`docs/handbook/issue-and-branch-online.md`](docs/handbook/issue-and-branch-online.md) | 이슈 사용법, 커밋·PR 연결 원리 |
| [`docs/plan/v2/definition/00-index.md`](docs/plan/v2/definition/00-index.md) | **현재 화면정의서(25화면).** 개발은 이 기준 |
| [`docs/plan/v2/wireframe/`](docs/plan/v2/wireframe/) | v2 와이어프레임 목업 (`index.html`로 열람, [배포본](https://team-iz.github.io/Frontend/wireframe/)) |
| [`docs/plan/v1/`](docs/plan/v1/) | 이전 화면정의서·와이어프레임 — **참고용, 구조는 물려받지 않는다** |
| [`docs/dev/decision-log.md`](docs/dev/decision-log.md) | **개발** 결정 기록 (왜 이렇게 했는가) |
| [`docs/plan/v1/definition/01-decision-log.md`](docs/plan/v1/definition/01-decision-log.md) | v1 화면 설계 결정 기록 (기획 단계, 참고용) |

## 기술 스택

React 19 · TypeScript · Vite

## 규약 요약

- `main` 배포 전용 · `develop` 통합 · 작업은 `feature/*`
- 커밋: `type: short description (#issue)` — 훅이 검사하고 이슈 번호는 자동 부착
- PR은 `develop`으로 (승인 필수 아님 — 필요하면 서로 요청, 이유는 규약 §4)

상세는 [`git-convention.md`](docs/handbook/git-convention.md).
