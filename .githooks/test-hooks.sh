#!/bin/sh
# 훅 자체 검사:  sh .githooks/test-hooks.sh
# 규칙을 고칠 때 이걸 먼저 돌린다. 실패하면 훅이 팀 커밋을 잘못 막고 있다는 뜻.

cd "$(dirname "$0")/.." || exit 1
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
pass=0; fail=0

# check <기대 ok|ng> <커밋 메시지 전문>  (\n 포함 가능)
check() {
  printf '%b\n' "$2" > "$tmp"
  if sh .githooks/commit-msg "$tmp" >/dev/null 2>&1; then got=ok; else got=ng; fi
  if [ "$got" = "$1" ]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "  FAIL  기대=$1 결과=$got  |  $2"
  fi
}

# 통과해야 하는 것
check ok "feat: add user login API (#5)"
check ok "fix: prevent token refresh loop (#8)"
check ok "refactor: extract AuthContext into custom hook (#10)"
check ok "chore: add .env.example fields"
check ok "remove: drop unused vite starter assets (#3)"
check ok "Merge branch 'develop' into feature/setup"

# 막아야 하는 것
check ng "Feat: add login (#5)"                       # type 대문자
check ng "feat: Add login (#5)"                       # 설명 대문자
check ng "added login api"                            # type 없음
check ng "feat: add login."                           # 마침표
check ng "feat:add login"                             # 콜론 뒤 공백 없음
check ng "feature: add login"                         # 허용되지 않는 type
# 길이: 72 초과만 실패, 50~72는 경고하고 통과
check ng "feat: add a description so long that it sails past seventy two characters and gets cut (#3)"
check ok "docs: reorganize screen definition docs into plan tree (#3)"
check ok "feat: add exactly fifty characters of description (#3)"

# 본문은 길이 제한 없음 — 설명은 본문에 쓰라는 게 규칙의 취지
check ok "feat: add login API (#5)\n\n왜 이렇게 했는지 길게 설명하는 본문.\n여러 줄이어도 통과해야 한다."

# AI 공동저자 trailer 차단
check ng "chore: set up hooks (#3)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
check ng "chore: set up hooks (#3)\n\nco-authored-by: someone <x@y.z>"
check ng "docs: update guide (#3)\n\n🤖 Generated with Claude Code"
check ok "chore: set up hooks (#3)\n\n본문에 co-authored-by 를 문장 안에서 언급하는 건 허용"

echo ""
echo "통과 $pass · 실패 $fail"
[ "$fail" -eq 0 ]
