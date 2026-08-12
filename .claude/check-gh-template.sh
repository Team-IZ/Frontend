#!/bin/sh
# gh issue/pr create가 프로젝트 템플릿의 필수 절을 채웠는지 검사한다.
# 규약: docs/handbook/git-convention.md §3·§4 · 템플릿: .github/ISSUE_TEMPLATE/ · .github/pull_request_template.md
#
# 왜 훅인가 — 템플릿은 GitHub 웹에서 새 이슈를 열 때만 채워진다. `gh ... --body`로 만들면
# 템플릿을 아예 안 거치므로, 사람이 매번 "템플릿 맞춰"라고 말해야 했다. 그걸 여기서 막는다.
# CI의 issue-format 워크플로는 등록된 뒤에 댓글로 알리는데, 이 훅은 등록 전에 막는다.
#
# stdin: 실행하려는 명령 문자열 (settings.json이 jq로 뽑아 넘긴다)
# 통과하면 아무것도 출력하지 않고 exit 0. 걸리면 deny JSON을 낸다.

cmd=$(cat)

case "$cmd" in
  *"gh issue create"*) kind=issue ;;
  *"gh pr create"*) kind=pr ;;
  *) exit 0 ;;
esac

# 본문을 파일로 넘기는 형태(--body-file / -F)면 그 내용까지 합쳐서 본다
hay="$cmd"
bodyfile=$(printf '%s' "$cmd" | sed -n 's/.*--body-file[ =]\{1,\}"\{0,1\}\([^ "]\{1,\}\).*/\1/p')
[ -z "$bodyfile" ] && bodyfile=$(printf '%s' "$cmd" | sed -n 's/.*[ ]-F[ =]\{1,\}"\{0,1\}\([^ "]\{1,\}\).*/\1/p')
if [ -n "$bodyfile" ] && [ -f "$bodyfile" ]; then
  hay="$hay
$(cat "$bodyfile")"
fi

miss=""
need() {
  printf '%s' "$hay" | grep -q -- "$1" || miss="$miss
  · $2"
}

if [ "$kind" = issue ]; then
  if printf '%s' "$hay" | grep -q -- '버그 개요'; then
    # 버그 리포트 템플릿
    need '버그 개요' '## 버그 개요'
    need '발생 환경' '## 발생 환경'
    need '재현 절차' '## 재현 절차'
    need '실제 결과' '## 실제 결과'
    need '예상 결과' '## 예상 결과'
    tmpl='.github/ISSUE_TEMPLATE/버그-리포트.md'
  else
    # 작업 요청 템플릿
    need '작업 개요' '## 작업 개요'
    need '작업 유형' '## 작업 유형'
    need '작업 내용' '## 작업 내용'
    need '변경 대상' '## 변경 대상'
    need '완료 조건' '## 완료 조건'
    # 작업 유형은 있어도 체크가 없으면 빠진 것과 같다 (CI issue-format과 같은 판정)
    printf '%s' "$hay" | grep -qi -- '\[x\]' || miss="$miss
  · 작업 유형에 체크된 항목([x])이 없음"
    tmpl='.github/ISSUE_TEMPLATE/작업-요청.md'
  fi
else
  need '작업 내용' '## 작업 내용'
  need '리뷰 포인트' '## 리뷰 포인트'
  printf '%s' "$hay" | grep -qE -- 'closes #[0-9]+' || miss="$miss
  · closes #<이슈번호> (머지 시 이슈 자동 종료)"
  tmpl='.github/pull_request_template.md'
fi

# 제목은 [Tag] Title Case — 훅으로 막을 수 있는 건 태그 유무까지다
printf '%s' "$cmd" | grep -qE -- '--title[ =]+"?\[[A-Z]' || miss="$miss
  · --title \"[Feat] Title Case\" 형식의 태그"

[ -z "$miss" ] && exit 0

reason="프로젝트 템플릿의 필수 항목이 빠졌습니다 ($tmpl):
$miss

템플릿을 그대로 채워 --body-file 로 넘기세요. 규약: docs/handbook/git-convention.md §3·§4"

# jq로 감싸야 줄바꿈·따옴표가 JSON에서 깨지지 않는다
jq -n --arg r "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $r
  }
}'
