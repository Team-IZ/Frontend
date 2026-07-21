# Git 협업 규약

> **이 문서가 단일 원천.** 같은 규칙을 다른 곳에 다시 쓰지 않는다 — 사본이 생기면 드리프트가 시작되고, 규약이 3개면 지켜지는 건 0개다.
> **훅이 막는 규칙은 여기서 설명하지 않는다**(§5 색인만). 어기는 순간 훅이 형식을 알려주므로 문서가 또 가르칠 필요가 없다.
> 여기 남은 것은 **사람이 판단해야 하는 것**뿐이다.

---

## 1. 브랜치

| 브랜치 | 역할 | 규칙 |
|---|---|---|
| `main` | 프로덕션 배포 전용 | PR만. 직접 push 금지 |
| `develop` | 개발 통합 | 모든 기능은 여기로 머지 |
| `feature/*` | 기능 개발 | develop에서 분기 |
| `fix/*` | 버그 수정 | develop에서 분기 |
| `hotfix/*` | main 긴급 수정 | main에서 분기 |
| `mockup` | 화면 목업·기획 문서 | 코드 라인 밖. push하면 목업 사이트가 즉시 갱신 |

네이밍은 하이픈: `feature/login-api`, `fix/token-refresh-error`

**`mockup`은 코드 브랜치가 아니다.** 와이어프레임·화면정의서·기획 문서가 사는 곳이고, develop으로 머지하지 않는다.
`docs/plan/screen/wireframe/`에 변경이 생긴 채로 push하면 <https://team-iz.github.io/Frontend/> 가 자동 갱신된다(`.github/workflows/deploy-wireframe.yml`). 작업 중인 화면도 그대로 공개되므로 팀이 항상 최신을 본다 — 감추고 싶은 단계면 push를 미룬다.
목업 커밋은 **이슈 번호를 생략해도 된다**(§3의 등록 기준은 코드 작업 기준).

## 2. 작업 흐름

```
1. develop 최신화      git pull origin develop
2. 이슈 생성 + 담당자 지정          (등록 기준 §3)
3. feature 브랜치 생성
4. 브랜치에 이슈 연결   git config branch.$(git branch --show-current).issue <번호>
5. 작업 → 커밋
6. develop으로 PR → 1인 리뷰 → 머지
7. feature 브랜치 삭제
```

**4번을 한 번 해두면 커밋마다 `(#N)`을 손으로 치지 않아도 된다** — 훅이 자동으로 붙인다.
이슈 번호는 터미널에서 확인: `gh issue list` / `gh issue list --assignee @me`

PR 올리기 **전에** develop를 머지해 충돌을 미리 푼다. 충돌 상태로 올리면 리뷰어가 대신 푸는 셈이 된다.

## 3. 이슈 등록 기준

판단 기준 한 줄: **"이거 내가 하고 있다는 걸 팀원이 알아야 하나?"**

| 등록 O | 등록 X |
|---|---|
| 새 기능 개발 | 오타 수정 |
| 버그 발견 | 변수명 변경 |
| 팀원에게 넘길 작업 | 주석 추가 |
| 나중에 해야 할 작업 | 코드 포맷팅 |

등록: GitHub → Issues → New issue → 제목 + Assignees 본인 → 번호 확인.

## 4. PR

제목: `[feat] add login page UI`

본문에 반드시 — ① 작업 내용 요약 ② 리뷰어가 볼 포인트 ③ `closes #번호`(머지 시 이슈 자동 종료)

- 하나의 PR = 하나의 기능
- 파일 10개 이내 권장 — 리뷰어가 30분 안에 볼 수 있는 크기
- `// TODO`를 남기면 이슈 번호를 같이 단다 (`// TODO: #12`)

## 5. 훅이 막는 것 (설명 없음 — 걸리면 훅이 알려준다)

| 규칙 | 수단 | 상태 |
|---|---|---|
| 커밋 메시지 형식 | `.githooks/commit-msg` | ✅ |
| AI 공동저자 trailer 금지 | `.githooks/commit-msg` | ✅ |
| 이슈 번호 자동 부착 | `.githooks/prepare-commit-msg` | ✅ |
| `main`·`develop` 직접 커밋 | `.githooks/pre-commit` | ✅ |
| `.env` 커밋 | `.gitignore` + `.githooks/pre-commit` | ✅ |
| `console.log` 잔존 | `.oxlintrc.json` `no-console` | ⬜ |
| 빌드 통과 | GitHub Actions (PR) | ⬜ |
| `main`·`develop` 직접 **push** | GitHub 브랜치 보호 규칙 | ⬜ |
| PR 제목·본문 형식 | `.github/pull_request_template.md` | ⬜ |

`npm install`이 훅을 자동 설정한다(`prepare` 스크립트). 수동: `git config core.hooksPath .githooks`
**규칙을 고치면 `sh .githooks/test-hooks.sh`를 먼저 돌린다** — 훅이 팀 커밋을 잘못 막는 사고 방지.

> 훅은 `--no-verify`로 우회된다. **최종 방어선은 GitHub 브랜치 보호 규칙**이므로 레포 설정을 반드시 함께 건다.
> `.env`는 push되면 히스토리에 남아 gitignore 추가로 해결되지 않는다 — 유출 시 **키 폐기·재발급**.

## 6. 커뮤니케이션

- PR이 올라오면 **24시간 내 리뷰**
- 리뷰 코멘트를 반영했으면 resolve, 안 했으면 **이유를 댓글로**
- **2시간 이상 혼자 막히면 팀에 공유** — 혼자 삽질한 시간은 복구되지 않는다
- 충돌은 **혼자 해결 금지**. 해당 파일 작성자에게 공유하고 같이 푼다
