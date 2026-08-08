# 검사는 어디서 어떻게 도나 — CI가 처음인 사람용

> **이 문서를 읽는 사람:** PR을 올렸는데 빨간 ❌가 떴거나, "CI"·"훅"이라는 말이 뭔지 모르는 사람.
> **사전 지식 0.** 15분.
> **"무엇을 하라"는 [git 협업 규약](git-convention.md)에 있다.** 이 문서는 **왜 그런 구조인가**를 설명한다.

---

## 1. CI가 뭔가

**"코드를 올릴 때마다 GitHub이 대신 검사해주는 로봇"** 이다. Continuous Integration의 줄임말인데, 이름은 몰라도 된다.

PR을 올리면 GitHub 서버에서 이 일이 자동으로 일어난다.

```
① 깨끗한 리눅스 컴퓨터를 새로 켠다      ← 내 노트북이 아니다
② 저장소를 clone 한다                   ← 커밋된 것만 온다
③ npm ci 로 라이브러리를 설치한다        ← node_modules를 처음부터
④ 검사를 순서대로 돌린다
⑤ 하나라도 실패하면 PR에 ❌ 를 단다
```

설정은 `.github/workflows/ci.yml` 한 파일에 있다.

### 지금 돌리는 검사 — `npm ci` + 스텝 9개

| 스텝 이름 | 무엇을 보나 |
| --- | --- |
| Format | 코드 서식이 통일됐나 (`prettier`) |
| Design tokens | 색·간격을 정해진 토큰으로 썼나 |
| Design doc up to date | 토큰을 바꾸고 문서를 다시 안 만들었나 |
| Component doc up to date | 위와 같음(컴포넌트) |
| Lint | `console.log` 잔존 등 (`oxlint`) |
| API spec | 백엔드 스펙이 코드 생성을 감당할 품질인가 |
| **API codegen up to date** | 스펙만 갱신하고 생성을 안 돌렸나 |
| Domain rules | 도메인 규칙이 깨졌나 — `check:project`·`check:pagination`·`check:admin` **셋을 한 스텝에서** 돌린다 |
| Build | 타입 검사 + 실제 빌드 (`tsc -b && vite build`) |

> **왜 이렇게 많나** — 각각이 **"통과했는데도 틀린 것"** 을 하나씩 막는다. 예를 들어 `Design tokens`는 타입도 맞고 빌드도 되는데 색을 직접 박아 넣은 코드를 잡는다. 이런 건 사람이 눈으로 찾게 되므로 기계에 맡겼다.

---

## 2. 지금까지 CI가 실패한 이유 — 실측

최근 60회 중 **성공 57 · 실패 3.**

| 언제 | 실패한 스텝 | 성격 |
| --- | --- | --- |
| 2026-08-06 | Design tokens | 로컬에서 안 돌려봄 |
| 2026-08-07 | Lint | 로컬에서 안 돌려봄 |
| **2026-08-08** | **`npm ci`** | **로컬에서는 원리적으로 안 보임** |

**앞의 둘과 세 번째는 완전히 다른 문제다.**

### 앞의 둘 — 그냥 안 돌려본 것

`Lint`·`Design tokens`는 **내 컴퓨터에서 똑같이 실패한다.**

```bash
npm run lint          # 여기서 이미 잡힌다
npm run check:design
```

**심각하지 않다.** CI가 알려주면 고치면 되고 원인도 바로 보인다.

### 세 번째 — 로컬에서는 절대 못 보는 것

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json are in sync.
npm error Missing: js-levenshtein@1.1.6 from lock file
… (10건)
```

**내 컴퓨터에서는 아무리 돌려도 이 에러가 안 난다.** 왜인지가 다음 절이다.

---

## 3. 그 하나는 왜 일어났나

### 먼저 — 파일 두 개의 관계

| 파일 | 무엇 | 누가 쓰나 |
| --- | --- | --- |
| `package.json` | "우리는 이 라이브러리들을 씁니다" | **사람** |
| `package-lock.json` | "정확히 이 버전, 이 해시로 설치했습니다" | **npm이 자동으로** |

> `package.json`은 **장보기 메모**, `package-lock.json`은 **영수증**이다. 메모에 "우유"라고 적으면 영수증엔 "서울우유 1L"이 찍힌다.

### 설치 명령 두 개의 차이

```bash
npm install   # 메모를 보고 장을 본다. 영수증을 새로 쓴다
npm ci        # 영수증대로만 산다. 메모와 다르면 멈춘다
```

**CI는 `npm ci`를 쓴다.** 매번 같은 버전이 깔려야 어제와 오늘 결과가 같기 때문이다.

### 무슨 일이 있었나

PR을 여러 개로 쪼개면서 두 파일이 갈렸다.

```
PR ①  package.json          "openapi-fetch 씁니다"
PR ②  package-lock.json     "openapi-fetch 0.13.8 설치함"
```

**메모는 ①에, 영수증은 ②에.** ①만 떼어 `npm ci`를 돌리면 "메모엔 있는데 영수증엔 없다"며 죽는다.

### 왜 로컬에서는 통과했나

```
내 노트북                      CI 서버
├─ node_modules/ 이미 있음     ├─ 아무것도 없음
│  (예전에 설치해둠)            │
└─ lint·build 그냥 돌아감      └─ npm ci 부터 해야 함  ← 여기서 죽음
```

**설치 단계를 안 거치니 어긋난 것을 알 방법이 없었다.**

> **이런 종류가 가장 비싸다.** 실패가 내 잘못을 안 알려준다. 로컬은 초록불인데 CI만 빨간불이니 *"CI가 이상한가?"* 로 시간을 쓰게 된다.

---

## 4. 방어막 ① — 커밋할 때 자동으로 (훅)

**git 훅**은 `git commit`을 칠 때 자동 실행되는 검사다. `.githooks/`에 있고 `npm install`이 자동으로 연결한다.

여기에 검사를 하나 더했다.

```
package.json이 커밋에 담겼나?
  └ 그 변경이 "의존성 구역"을 건드렸나?
       └ package-lock.json도 같이 담겼나?
            ├ 예    → 통과
            └ 아니오 → ✗ 커밋 차단
```

### "의존성 구역만" 보는 것이 핵심이다

```jsonc
{
  "imports":      { … },   // ← 이것만 고치면 lock 필요 없다 → 통과시켜야 함
  "scripts":      { … },   // ← 통과
  "dependencies": { … }    // ← 이걸 고치면 lock이 있어야 함 → 차단
}
```

**`package.json` 변경을 전부 막으면 안 된다.** 실제로 `imports` 필드만 고친 정당한 커밋이 있었다.

> ### 정당한 커밋을 막는 훅이 제일 나쁘다
> 사람들이 `--no-verify`로 우회하기 시작하고, **그러면 `.env` 유출 방지 같은 진짜 중요한 검사까지 같이 꺼진다.** 훅 하나가 잘못되면 훅 전체가 무력해진다.

### 그래서 테스트로 굳혔다

`.githooks/test-hooks.sh`에 세 경우를 넣었다.

| 경우 | 기대 |
| --- | --- |
| 의존성 추가 + lock 없음 | **차단** |
| 의존성 + lock 함께 | 통과 |
| `scripts`만 수정 + lock 없음 | 통과 |

```bash
sh .githooks/test-hooks.sh    # 통과 27 · 실패 0
```

**훅을 고칠 일이 있으면 이걸 먼저 돌린다.** 훅이 팀 커밋을 잘못 막는 사고를 방지한다.

---

## 5. 방어막 ② — CI를 미리 돌려보기

훅은 lock 문제 **하나만** 막는다. 다른 종류의 어긋남은 남는다.

```bash
npm run verify:ci
```

### 하는 일

```
① 임시 폴더에 저장소를 한 벌 더 꺼낸다      (git worktree)
   → 커밋된 것만. 작업 중인 파일은 안 온다
② npm ci 로 처음부터 설치한다               ← CI와 똑같이
③ ci.yml에 적힌 검사를 전부 돌린다
④ 임시 폴더를 지운다
```

```
CI 재현 — 커밋된 상태만 본다
  402e598 Merge pull request #139 …
  ⚠️ 커밋되지 않은 변경 4건은 검사 대상이 아니다 (CI도 안 본다)

  npm ci                                 ✅
  Format                                 ✅
  Lint                                   ✅
  API codegen up to date                 ✅
  Build                                  ✅

✓ CI가 돌리는 것을 전부 통과했다.
```

**내 작업 폴더는 손도 안 댄다.** 작업 중인 파일이 그대로 남는다.

### 돌릴 목록을 `ci.yml`에서 읽는다

손으로 베끼면 **CI가 바뀔 때 갈린다.** 스텝 이름까지 그대로 쓴다.

그리고 **여러 줄 블록을 통째로 실행한다.**

```yaml
- name: API codegen up to date
  run: |
    npm run api:gen         ← 첫 줄만 뽑으면
    git add -A -- src/api   ← 이 두 줄이 안 돌아서
    git diff --cached …     ← 검사가 반쪽만 된다
```

---

## 6. 왜 훅과 명령을 나눴나

**시간이 다르기 때문이다.**

| | 걸리는 시간 | 언제 |
| --- | --- | --- |
| **훅** | **0.1초** | 매 커밋 자동 |
| **`verify:ci`** | **1분** | 필요할 때 수동 |

`verify:ci`를 훅에 넣으면 커밋마다 1분을 기다린다. 그러면 우회가 시작되고 훅 전체가 죽는다.

> ### 훅은 비용이 0에 가까운 것만 맡는다
> 비싼 검사는 **사람이 판단해서** 돌린다. `.githooks/pre-commit` 첫 줄에 적힌 원칙이 이것이다 — *"되돌리기 비싼 사고만 차단한다."*

### `verify:ci`는 언제 돌리나

| 언제 | 왜 |
| --- | --- |
| **PR을 쪼갤 때** | 파일이 브랜치마다 갈리면 각 커밋이 혼자 성립하는지 알 수 없다 |
| **빌드 설정을 건드릴 때** | `package.json` · `tsconfig` · `ci.yml` · 번들러 설정 |
| **커밋 안 된 파일이 많이 쌓였을 때** | 로컬 검사가 다른 것을 보고 있다 |

**매번 돌릴 필요 없다.** 평소에는 `npm run lint`·`npm run build` 정도면 충분하다.

---

## 7. 전체 구조

```
① 코드 작성
      ↓
② git commit ─── 훅이 자동 검사 (0.1초)
                  · main·develop 직접 커밋 금지
                  · .env 커밋 금지
                  · 커밋 메시지 형식 · 이슈 번호 자동 부착
                  · 의존성만 담고 lock 빠뜨림
                  · 포맷 자동 수정
      ↓
③ (선택) npm run verify:ci ─── CI를 미리 재현 (1분)
      ↓
④ git push
      ↓
⑤ PR 생성 ─── GitHub CI가 npm ci + 검사 9가지 (40초)
      ↓
⑥ 초록불이면 머지
```

**층마다 역할이 다르다.**

| 층 | 성격 | 막는 것 |
| --- | --- | --- |
| **훅** | 값싸고 자동 | **되돌리기 비싼 사고**(`.env` 유출 등) |
| **`verify:ci`** | 비싸고 수동 | 로컬에서 안 보이는 것 |
| **CI** | 최종 관문 | 전부. **여기가 진짜 기준** |

> **훅은 `--no-verify`로 우회된다.** 최종 방어선은 항상 **CI + GitHub 브랜치 보호 규칙**이고, 앞의 둘은 *"CI까지 안 가고 미리 잡자"* 는 것이다.

---

## 8. CI가 빨간불이면 — 순서대로

**① 어느 스텝이 실패했나 본다**

```bash
gh pr checks <PR번호>          # 통과/실패 목록
gh run view <run-id> --log-failed
```

또는 PR 페이지에서 ❌ 옆의 `Details`.

**② 로컬에서 그 명령만 돌려본다**

```bash
npm run lint          # Lint 가 실패했다면
npm run check:design  # Design tokens 가 실패했다면
```

**대부분 여기서 똑같이 재현된다.** 재현되면 그냥 고치면 된다.

**③ 로컬에서 재현이 안 되면**

```bash
npm run verify:ci
```

**이게 "로컬과 CI가 다른 것"을 잡는 자리다.** 여기서도 통과하면 CI 설정 자체나 GitHub 쪽 문제일 가능성이 높다.

### 자주 나오는 것

| 스텝 | 대개 이 명령으로 고쳐진다 |
| --- | --- |
| Format | `npx prettier --write .` |
| Design doc / Component doc up to date | `node scripts/design-doc.mjs` · `node scripts/component-doc.mjs` |
| API codegen up to date | `npm run api:gen` |
| `npm ci` | `git add package-lock.json` (훅이 이제 막는다) |

---

## 더 읽을 것

- [git 협업 규약](git-convention.md) — 브랜치·이슈·PR·커밋. **무엇을 하라**는 그쪽에
- `.github/workflows/ci.yml` — CI 설정 원본
- `.githooks/` — 훅 원본. 각 파일 첫 주석에 왜 그 검사가 있는지 적혀 있다
