# 이슈 · 브랜치가 GitHub에서 연결되는 원리

> "브랜치에 이슈를 연결하면 온라인에서 뭐가 보이나"를 정리한 문서. 처음 이슈를 쓰는 사람 기준.
> 규약 본문은 `git-convention.md`. 이 문서는 그 배경 설명(how·why)이다.

---

## 1. 연결은 어떻게 생기나 — 오해부터 푼다

`git config branch.<name>.issue 3`은 **로컬 설정이다.** GitHub은 이 config를 못 본다.

실제 연결은 이렇게 생긴다:

```
git config (로컬)  →  훅이 커밋 제목에 "(#3)" 텍스트를 붙임  →  push
                                                              ↓
                              GitHub이 커밋/PR 안의 "#3" 텍스트를 읽고 자동 연결
```

**즉 온라인 연결의 정체는 커밋·PR에 적힌 `#3`이라는 텍스트다.** config는 그 텍스트를 자동으로 넣어주는 편의장치일 뿐. PR 본문에 손으로 `#3`을 써도 똑같이 연결된다.

`#숫자`는 커밋 메시지·PR·댓글 어디에 적든 GitHub에서 **클릭 가능한 링크**가 되고, 마우스를 올리면 제목·열림/닫힘 상태가 뜨는 미리보기 카드가 나온다.

## 2. 이슈 페이지에서 보이는 것 (핵심 payoff)

이슈 `#3`을 열면 그 한 페이지에 작업의 전말이 모인다.

- **타임라인** — 시간순 이벤트가 쌓인다:
  - `#3`을 언급한 커밋 → "○○ referenced this issue in commit `abc123`"
  - `#3`을 언급한 PR → "○○ mentioned this issue in pull request #7"
  - 닫힘 → "Closed via #7" (어떤 PR이 닫았는지)
- **오른쪽 Development 패널** — 이 이슈를 닫을 PR·브랜치. "Successfully merging #7 will close this issue" 문구.
- **사이드바** — Assignees(담당자 아바타), Labels, Participants(대화 참여자 전원).

정리하면: **"이 작업 누가·어디까지 했지?"를 이슈 하나로 추적**한다. 흩어진 커밋·PR을 뒤질 필요가 없다.

## 3. PR 페이지에서 보이는 것

- 본문의 `closes #3`이 **링크로 렌더**되고, 사이드바/하단에 "Linked issue #3"으로 묶인다.
- **Commits 탭** — 이 PR의 커밋들이 나열되고 각 `(#3)`이 하이퍼링크.
- 머지 버튼 근처에 "This will close #3" 안내.

## 4. ⚠ 자동 닫힘의 정확한 조건 — 가장 많이 헷갈리는 부분

`closes #3`(= `fixes`/`resolves`)은 **default 브랜치로 머지될 때만** 이슈를 자동으로 닫는다.

이 repo는 **default = `develop`으로 설정**했다(2026-07-21). 그래서:

| PR 방향 | `closes #3` 결과 |
|---|---|
| feature → **develop** (default) | 머지 순간 **#3 자동으로 닫힘** ✅ |
| develop → main | 이슈 닫힘과 무관(코드 승격일 뿐) |

> default가 `main`이던 시절엔 feature→develop 머지로는 이슈가 안 닫혔다(승격 전까지 계속 열림). default를 develop으로 바꾼 이유가 이것 — 규약의 "모든 기능은 develop으로 머지"와 자동 닫힘을 일치시켰다.

수동으로 닫고 싶으면: `gh issue close 3` 또는 이슈 페이지 [Close issue].

## 5. 실전 명령

```bash
gh issue list                       # 열린 이슈
gh issue list --assignee @me        # 내 담당만
gh issue create --title "..." --assignee @me
gh issue view 3 --json title,body   # 내용 보기(이 repo는 --json 필요)
gh issue close 3

# 브랜치에 이슈 연결(1회) → 이후 커밋에 (#N) 자동 부착
git config branch.$(git branch --show-current).issue 3
```

GitHub 검색 필터(이슈 탭 상단 검색창):
`is:issue is:open assignee:@me` · `is:issue is:closed` · `linked:pr`

---

## 부록 · repo 설정 (파일로 안 남는 것 — 여기 못박음)

브랜치 보호·default는 GitHub 웹 설정이라 레포에 커밋되지 않는다. 현재 걸린 설정:

- **Default branch = `develop`** (Settings → General → Default branch)
- **ruleset `protect-main-develop`** — 대상 `main` · `develop` **둘 다**. default를 develop으로
  옮겼으므로 develop이 무방비가 되면 안 된다.
  - `pull_request` — 직접 push 금지 (PR 필수)
  - `required_status_checks: verify` — **CI가 빨가면 머지 불가**
  - `non_fast_forward` · `deletion` — 강제 push·브랜치 삭제 차단
  - **승인 인원은 0** — 의도적 이탈이다. 이유와 되돌리는 조건은 규약 §4.
- `main` = 프로덕션 릴리스 전용. develop → main PR로만 승격.

> 훅은 로컬 방어라 `--no-verify`로 뚫린다. **서버 측 최종 방어선은 이 보호 규칙**이므로 반드시 켠 상태를 유지한다.
