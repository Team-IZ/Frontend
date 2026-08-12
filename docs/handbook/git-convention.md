# Git 협업 규약

> **CI·훅이 처음이면** [검사는 어디서 어떻게 도나](ci-and-checks.md)를 먼저 읽는다 — 무엇이 언제 돌고, 빨간불이 뜨면 어떻게 하는지를 사전 지식 0에서 설명한다. 이 문서는 **무엇을 하라**만 적는다.

> **이 문서가 단일 원천.** 같은 규칙을 다른 곳에 다시 쓰지 않는다 — 사본이 생기면 드리프트가 시작되고, 규약이 3개면 지켜지는 건 0개다.
> **훅이 막는 규칙은 여기서 설명하지 않는다**(§6 색인만). 어기는 순간 훅이 형식을 알려주므로 문서가 또 가르칠 필요가 없다.
> 여기 남은 것은 **사람이 판단해야 하는 것**뿐이다.
> **예외가 하나 있다 — §5.** 훅으로 막히지 않는 것이 있어서(git에 `pre-stash`가 없다) 사람이 알아야 한다.

---

## 1. 브랜치

| 브랜치 | 역할 | 규칙 |
|---|---|---|
| `main` | 프로덕션 배포 전용 | PR만. 직접 push 금지 |
| `develop` | 개발 통합 | 모든 기능은 여기로 머지 |
| `feature/*` | 기능 개발 | develop에서 분기 |
| `fix/*` | 버그 수정 | develop에서 분기 |
| `hotfix/*` | main 긴급 수정 | main에서 분기 |

네이밍은 하이픈: `feature/login-api`, `fix/token-refresh-error`

## 2. 작업 흐름

```
1. develop 최신화      git pull origin develop
2. 이슈 생성 + 담당자 지정          (등록 기준 §3)
3. feature 브랜치 생성
4. 브랜치에 이슈 연결   git config branch.$(git branch --show-current).issue <번호>
5. 작업 → 커밋
6. develop으로 PR → 머지          (리뷰는 §4 참고)
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

### 제목 형식 — `[Tag] Title Case`

이슈와 PR 제목은 **의미 있는 단어의 첫 글자를 대문자로** 쓴다.
관사(`a` `an` `the`)·등위접속사(`and` `or` `but`)·짧은 전치사(`of` `in` `to` `for`)는
소문자. 단 **첫 단어와 마지막 단어는 항상 대문자**.

```
[Chore] Project Settings
[Feat] Login Page and Password Reset
[Fix] Token Refresh Loop in Auth Context
[Refactor] Extract Cohort Scope Into a Store
```

태그는 커밋 type과 같은 어휘를 쓴다 — `[Feat]` `[Fix]` `[Refactor]` `[Style]`
`[Docs]` `[Chore]` `[Remove]` `[Build]` `[Ci]` `[Test]` `[Perf]`.

> **이슈 · 커밋 · 훅이 한 목록을 쓴다.** 이슈 템플릿의 작업 유형, 커밋 type,
> `commit-msg` 훅의 허용 목록이 모두 위 11개다. 한 곳만 늘리면 다른 곳에서 막힌다.

> **커밋 메시지는 반대다.** 커밋은 소문자 명령형(`feat: add login API`)이고
> 훅이 검사한다. 이슈·PR은 GitHub에서 사람이 읽는 제목이라 Title Case를 쓴다.
> 이 규칙은 훅으로 막을 수 없어(GitHub 쪽) 이슈 템플릿의 기본 제목으로만 유도한다.

이슈가 커밋·PR과 온라인에서 어떻게 연결되고 뭐가 보이는지 → `issue-and-branch-online.md`.

여러 세션이 같은 폴더에서 일할 때의 금지 사항은 **§5**에 있다.

## 4. 커밋 본문 · PR

### 커밋 본문에는 "왜"를 쓴다

제목은 **무엇을** 했는지, 본문은 **왜** 그렇게 했는지. 무엇은 diff를 보면 알지만
왜는 3개월 뒤 아무도 기억하지 못한다. 자명한 한 줄 변경이 아니면 본문을 쓴다.

```
chore: enable ts strict, prettier, path alias

4명이 각자 다른 방언으로 쓰기 시작하면 되돌릴 수 없다.
코드가 쌓이기 전에만 싼 것들을 먼저 넣는다.

- TS strict: 지금 켜서 에러 0건, 나중이면 수백 건
- Prettier: 없으면 매 PR이 공백 diff 전쟁이 된다
```

제목 길이는 훅이 검사한다(72자 초과 = 실패, 50자 초과 = 경고). **경고가 떠도
제목을 억지로 줄이지 말 것** — 줄여서 뜻이 깎이면 본문에 쓰는 게 맞다.

### 제목은 **토픽**이다 — 백엔드 요청 차수를 넣지 않는다

`16차`·`17th`·`request-19` 같은 번호는 **백엔드와 주고받은 순번**이라 이 저장소에서는
아무것도 식별하지 못한다. 3개월 뒤 로그를 보는 사람에게 `19th`는 무엇을 했는지 하나도
알려주지 않는다.

```
✗ chore: regenerate the api layer from the 13th round spec
⭕ chore: regenerate the api layer for trainee submission and reports

✗ docs: file the 19th backend request
⭕ docs: request nullable flags and shared enums for the trainee api
```

**커밋 제목·브랜치 이름·PR 제목 셋 다 같다.** 차수가 꼭 필요하면 **본문에** 적는다 —
거기서는 어느 요청서를 가리키는지가 맥락과 함께 읽힌다.

> 훅이 막는다(§6). 숫자 자체를 막는 것이 아니라 차수 표기(`N차`·`Nth`·`request-N`)만
> 잡으므로 `bump vite to 8.1` 같은 제목은 통과한다.

### PR

제목: `[Feat] Add Login Page UI` — 이슈와 같은 형식(§3).

본문에 반드시 — ① 작업 내용 요약 ② 리뷰어가 볼 포인트 ③ `closes #번호`(머지 시 이슈 자동 종료)

- 하나의 PR = 하나의 기능
- 파일 10개 이내 권장 — 리뷰어가 30분 안에 볼 수 있는 크기
- `// TODO`를 남기면 이슈 번호를 같이 단다 (`// TODO: #12`)

### 올리기 전에 CI를 재현할 수 있다 — `npm run verify:ci`

**로컬 검사는 CI와 다른 것을 본다.** ① 커밋 안 된 파일까지 검사하고 ② `node_modules`가
이미 있어 **설치 단계를 안 거친다.** ②가 실제로 우리를 물었다 — `package.json`에 의존성을
선언하고 `package-lock.json`을 다른 커밋으로 보냈더니 로컬은 전부 통과했는데 CI가 `npm ci`에서
죽었다. 지금은 그 경우를 `pre-commit`이 막지만(§6), 다른 종류의 어긋남은 여전히 남는다.

`verify:ci`는 임시 워크트리에 **커밋된 상태만** 꺼내 `npm ci`부터 돌린다. 작업 폴더는
건드리지 않는다. 돌리는 목록은 `ci.yml`에서 읽으므로 CI가 바뀌면 같이 바뀐다.

| 언제 | 왜 |
|---|---|
| **PR을 쪼갤 때** | 파일이 브랜치마다 갈리면 각 커밋이 혼자 성립하는지 알 수 없다 |
| **빌드 설정을 건드릴 때** | `package.json` · `tsconfig` · `ci.yml` · 번들러 설정 |
| **커밋 안 된 파일이 많이 쌓였을 때** | 로컬 검사가 다른 것을 보고 있다 |

**매번 돌릴 필요는 없다.** 1분 가까이 걸려서 훅에 넣지 않았다 — 훅에 붙이면 `--no-verify`로
우회하게 되고 그러면 훅 전체가 무력해진다.

### 리뷰 승인은 강제하지 않는다 (의도적 이탈)

정석은 **최소 1인 승인 후 머지**다. 이 레포는 그렇게 하지 않는다
(`required_approving_review_count: 0`).

- **이유:** 프론트 인원이 2명이라 매 PR이 상대 1명에게 병목이 되고,
  지금은 일정이 빠듯해 그 대기 비용이 리뷰로 얻는 것보다 크다고 판단했다.
- **대신:** 리뷰가 필요한 변경(공용 기반·설계 결정·남의 영역을 건드릴 때)은
  **머지 전에 말로 요청한다.** 규칙이 아니라 판단으로 가져간다.
- **되돌리는 조건:** 인원이 늘거나 일정에 여유가 생기면 승인 1인을 다시 켠다.
  이건 트레이드오프를 알고 내린 결정이지 몰라서 빠진 게 아니다.

## 5. 작업 트리는 공유 자원이다 — 여러 세션이 같은 폴더를 본다

> **실제로 두 번 사고가 났다.** 한 세션의 정리 명령이 다른 세션의 미커밋 파일을 통째로
> 가져갔다. 경위·근거·훅 실측은 [decision-log D23](../dev/decision-log.md)에 있다.

터미널·에디터·AI 세션을 여럿 띄워도 **작업 트리는 하나다.** git 명령에 세션 격리가 없어서
경로를 안 주면 **작업 트리 전체**가 대상이 된다. 한쪽의 "잠깐 치움"이 다른 쪽에는 파일 삭제다.

### 동시에 일하면 폴더를 나눈다

```bash
git worktree add ../IZ-<작업이름> -b feature/<브랜치>
cd ../IZ-<작업이름> && npm install
npm run dev -- --port 5174        # 포트가 겹치면
```

끝나면 `git worktree remove ../IZ-<작업이름>`. `.git`은 공유하므로 커밋·브랜치·stash가 한
곳에 모인다. **같은 브랜치를 두 폴더에서 체크아웃할 수 없다** — 세션마다 브랜치가 다르면 된다.

**아래 금지 목록과 훅은 실수를 줄일 뿐 격리가 아니다.** 폴더를 공유하는 한 사고는 다시 난다.

### 폴더를 공유할 때 — 하지 않는 것

`stash -u`(`--include-untracked`·`--all`) · `stash drop`·`clear` · `reset --hard`(`--merge`) ·
`clean` · `checkout --`·`-f` · `restore` · `rm -rf <소스 폴더>`.

**하나로 묶으면 — 파일을 되돌리거나 치우는 명령을 경로 없이 실행하지 않는다.**
특히 **한 번도 `git add` 안 한 파일은 git 어디에도 사본이 없다**(D23 실측). 새 화면을
만드는 작업이 그 상태로 가장 오래 머문다.

### 남의 코드가 깨져서 내 화면을 못 볼 때

`app/routes.tsx`가 glob으로 `*.route.tsx`를 모으므로 **한 화면이 깨지면 앱 전체가 안 뜬다.**

| 하는 것 | |
|---|---|
| **말한다** | 5초면 고친다. 첫 번째 선택지 |
| `npm run typecheck` · `lint`로만 검증 | 렌더 확인을 포기한다 |
| **`git worktree`로 격리** | 별도 폴더에서 본다 |
| ~~잠깐 치우기~~ | **하지 않는다.** 이게 사고의 동기였다 |

### 폴더를 공유해야 한다면

**`git add`를 자주 한다.** `clean`이 못 지우고, 되돌리기로 파일이 없어져도 내용이 남는다.
파괴 명령에는 **경로를 준다** — `git restore src/features/<내 도메인>/`.

### 시작 전에 본다

```bash
git status · git stash list · git worktree list
```

**모르는 변경이 있으면 그대로 둔다.** 내 브랜치가 깨끗해 보여도 남의 세션이 그 위에서 일하는 중일 수 있다.

---

## 6. 훅이 막는 것 (설명 없음 — 걸리면 훅이 알려준다)

| 규칙 | 수단 | 상태 |
|---|---|---|
| 커밋 메시지 형식 | `.githooks/commit-msg` | ✅ |
| AI 공동저자 trailer 금지 | `.githooks/commit-msg` | ✅ |
| **커밋 제목에 요청 차수**(`17th`·`16차`) | `.githooks/commit-msg` | ✅ |
| **브랜치 이름에 요청 차수** | `.githooks/pre-commit` | ✅ |
| 이슈 번호 자동 부착 | `.githooks/prepare-commit-msg` | ✅ |
| `main`·`develop` 직접 커밋 | `.githooks/pre-commit` | ✅ |
| `.env` 커밋 | `.gitignore` + `.githooks/pre-commit` | ✅ |
| **의존성만 커밋하고 lock을 빠뜨림** | `.githooks/pre-commit` | ✅ |
| `console.log` 잔존 | `.oxlintrc.json` `no-console` | ✅ |
| 빌드 통과 | GitHub Actions + ruleset required check | ✅ |
| `main`·`develop` 직접 **push** | GitHub ruleset `protect-main-develop` | ✅ |
| PR 제목·본문 형식 | `.github/pull_request_template.md` | ✅ |
| **작업 트리 파괴 명령**(§5) | `.claude/guard-worktree.sh` | 🔺 **AI 세션만 · 부분적** |

> **default 브랜치 = `develop`**(2026-07-21 변경). 보호 규칙은 `main`·`develop` **둘 다**에 건다 — 설정 상세는 `issue-and-branch-online.md` 부록.

`npm install`이 훅을 자동 설정한다(`prepare` 스크립트). 수동: `git config core.hooksPath .githooks`
**규칙을 고치면 `sh .githooks/test-hooks.sh`를 먼저 돌린다** — 훅이 팀 커밋을 잘못 막는 사고 방지.

> **`guard-worktree.sh`는 이 표에서 유일하게 🔺다.** git에 `pre-stash` 같은 훅이 없어서
> Claude Code의 `PreToolUse`로 명령 실행 전에 검사하는 방식이다.
> 검사 대상: `stash -u/--include-untracked/--all` · `reset --hard` · `clean` ·
> `checkout --` · `restore`. 통과 대상: `status` · `stash list` · `stash pop` · `add` · `commit`.
>
> **막지 못하는 것을 알고 쓴다**(실측 — decision-log D23):
> ① **사람이 터미널에 직접 치는 것** ② `stash drop`·`clear` · `checkout -f` ·
> `checkout <브랜치> -- <경로>` · `reset --merge` · `rm -rf` · `git -C` ③ 공백을 둘 넣거나
> 따옴표를 끼우면 통과. 반대로 **명령문에 그 단어가 들어가기만 해도 막는다**(`grep "git clean" …`).
>
> **그래서 이 훅은 방어선이 아니라 실수 알림이다.** 진짜 방어선은 §5의 **폴더 분리**이고,
> 그다음이 규약과 백업이다.

> 훅은 `--no-verify`로 우회된다. **최종 방어선은 GitHub 브랜치 보호 규칙**이므로 레포 설정을 반드시 함께 건다.
> `.env`는 push되면 히스토리에 남아 gitignore 추가로 해결되지 않는다 — 유출 시 **키 폐기·재발급**.

## 7. 완료의 정의 (Definition of Done)

"다 했어"의 기준이 서로 다르면 리뷰가 매번 협상이 된다. 화면 하나가 완료라는 건:

- 와이어프레임에 정의된 **모든 상태**가 렌더된다 (정상 + 로딩 + 에러 + 빈 상태)
- 목 데이터로 **실제 동작**한다 (클릭하면 결과가 나온다)
- 키보드로 조작 가능하고 포커스가 보인다
- CI 통과 (format · lint · build)

## 8. 커뮤니케이션

- **리뷰를 요청받으면 24시간 내에 본다** (승인은 필수가 아니지만 요청은 막지 않는다)
- 리뷰 코멘트를 반영했으면 resolve, 안 했으면 **이유를 댓글로**
- **2시간 이상 혼자 막히면 팀에 공유** — 혼자 삽질한 시간은 복구되지 않는다
- 충돌은 **혼자 해결 금지**. 해당 파일 작성자에게 공유하고 같이 푼다
