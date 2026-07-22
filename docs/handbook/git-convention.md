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

### PR

제목: `[Feat] Add Login Page UI` — 이슈와 같은 형식(§3).

본문에 반드시 — ① 작업 내용 요약 ② 리뷰어가 볼 포인트 ③ `closes #번호`(머지 시 이슈 자동 종료)

- 하나의 PR = 하나의 기능
- 파일 10개 이내 권장 — 리뷰어가 30분 안에 볼 수 있는 크기
- `// TODO`를 남기면 이슈 번호를 같이 단다 (`// TODO: #12`)

### 리뷰 승인은 강제하지 않는다 (의도적 이탈)

정석은 **최소 1인 승인 후 머지**다. 이 레포는 그렇게 하지 않는다
(`required_approving_review_count: 0`).

- **이유:** 프론트 인원이 2명이라 매 PR이 상대 1명에게 병목이 되고,
  지금은 일정이 빠듯해 그 대기 비용이 리뷰로 얻는 것보다 크다고 판단했다.
- **대신:** 리뷰가 필요한 변경(공용 기반·설계 결정·남의 영역을 건드릴 때)은
  **머지 전에 말로 요청한다.** 규칙이 아니라 판단으로 가져간다.
- **되돌리는 조건:** 인원이 늘거나 일정에 여유가 생기면 승인 1인을 다시 켠다.
  이건 트레이드오프를 알고 내린 결정이지 몰라서 빠진 게 아니다.

## 5. 훅이 막는 것 (설명 없음 — 걸리면 훅이 알려준다)

| 규칙 | 수단 | 상태 |
|---|---|---|
| 커밋 메시지 형식 | `.githooks/commit-msg` | ✅ |
| AI 공동저자 trailer 금지 | `.githooks/commit-msg` | ✅ |
| 이슈 번호 자동 부착 | `.githooks/prepare-commit-msg` | ✅ |
| `main`·`develop` 직접 커밋 | `.githooks/pre-commit` | ✅ |
| `.env` 커밋 | `.gitignore` + `.githooks/pre-commit` | ✅ |
| `console.log` 잔존 | `.oxlintrc.json` `no-console` | ✅ |
| 빌드 통과 | GitHub Actions + ruleset required check | ✅ |
| `main`·`develop` 직접 **push** | GitHub ruleset `protect-main-develop` | ✅ |
| PR 제목·본문 형식 | `.github/pull_request_template.md` | ✅ |

> **default 브랜치 = `develop`**(2026-07-21 변경). 보호 규칙은 `main`·`develop` **둘 다**에 건다 — 설정 상세는 `issue-and-branch-online.md` 부록.

`npm install`이 훅을 자동 설정한다(`prepare` 스크립트). 수동: `git config core.hooksPath .githooks`
**규칙을 고치면 `sh .githooks/test-hooks.sh`를 먼저 돌린다** — 훅이 팀 커밋을 잘못 막는 사고 방지.

> 훅은 `--no-verify`로 우회된다. **최종 방어선은 GitHub 브랜치 보호 규칙**이므로 레포 설정을 반드시 함께 건다.
> `.env`는 push되면 히스토리에 남아 gitignore 추가로 해결되지 않는다 — 유출 시 **키 폐기·재발급**.

## 6. 완료의 정의 (Definition of Done)

"다 했어"의 기준이 서로 다르면 리뷰가 매번 협상이 된다. 화면 하나가 완료라는 건:

- 와이어프레임에 정의된 **모든 상태**가 렌더된다 (정상 + 로딩 + 에러 + 빈 상태)
- 목 데이터로 **실제 동작**한다 (클릭하면 결과가 나온다)
- 키보드로 조작 가능하고 포커스가 보인다
- CI 통과 (format · lint · build)

## 7. 커뮤니케이션

- **리뷰를 요청받으면 24시간 내에 본다** (승인은 필수가 아니지만 요청은 막지 않는다)
- 리뷰 코멘트를 반영했으면 resolve, 안 했으면 **이유를 댓글로**
- **2시간 이상 혼자 막히면 팀에 공유** — 혼자 삽질한 시간은 복구되지 않는다
- 충돌은 **혼자 해결 금지**. 해당 파일 작성자에게 공유하고 같이 푼다
