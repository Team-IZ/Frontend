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
check ok "build: bump vite to 7.2 (#11)"
check ok "ci: run design guard on pull request (#11)"
check ok "test: cover cohort scope reducer (#11)"
check ok "perf: memoize trainee list rows (#11)"
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

# 백엔드 요청 차수 — 제목에 넣으면 막는다(이 저장소에서 식별력이 0인 번호)
check ng "chore: regenerate the api layer from the 13th round spec (#3)"
check ng "docs: file the 19th backend request (#3)"
check ng "docs: add trainee rules and 16th backend request (#3)"
check ng "chore: apply backend-api-requests-17 (#3)"
check ng "docs: 17차 요청서 작성 (#3)"
# 같은 자리에 오는 정상 제목은 통과해야 한다 — 숫자 자체를 막는 게 아니다
check ok "chore: regenerate the api layer for trainee reports (#3)"
check ok "build: bump vite to 8.1 (#3)"
check ok "feat: support 3 concepts per session (#3)"
check ok "fix: keep the 20 minute timer per problem (#3)"

# 본문은 길이 제한 없음 — 설명은 본문에 쓰라는 게 규칙의 취지
check ok "feat: add login API (#5)\n\n왜 이렇게 했는지 길게 설명하는 본문.\n여러 줄이어도 통과해야 한다."

# AI 공동저자 trailer 차단
check ng "chore: set up hooks (#3)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
check ng "chore: set up hooks (#3)\n\nco-authored-by: someone <x@y.z>"
check ng "docs: update guide (#3)\n\n🤖 Generated with Claude Code"
check ok "chore: set up hooks (#3)\n\n본문에 co-authored-by 를 문장 안에서 언급하는 건 허용"

# ── pre-commit · lock 드리프트 ────────────────────────────────────────────────
# 차단보다 **정당한 커밋을 통과시키는 것**이 중요하다. 의존성을 안 건드린 package.json
# 수정(imports·scripts 등)을 막으면 훅이 일을 방해한다 — 규약 §6이 기록한 사고 유형.

pkg_bak=$(mktemp); lock_bak=$(mktemp)
cp package.json "$pkg_bak"; cp package-lock.json "$lock_bak"
restore() { cp "$pkg_bak" package.json; cp "$lock_bak" package-lock.json; git reset -q; }
trap 'rm -f "$tmp" "$pkg_bak" "$lock_bak"' EXIT

# hook <기대 ok|ng> <설명>  — 현재 스테이징 상태로 pre-commit을 돌린다
hook() {
  if sh .githooks/pre-commit >/dev/null 2>&1; then got=ok; else got=ng; fi
  if [ "$got" = "$1" ]; then pass=$((pass + 1)); else
    fail=$((fail + 1)); echo "  FAIL  기대=$1 결과=$got  |  $2"
  fi
  restore
}

# 의존성이 바뀌었는데 lock이 없으면 차단 (CI가 npm ci에서 죽는다)
sed -i.t 's/"dependencies": {/"dependencies": {\n    "zz-probe": "^1.0.0",/' package.json && rm -f package.json.t
git add package.json 2>/dev/null
hook ng "의존성 추가 + lock 없음"

# 의존성 + lock을 함께 담으면 통과
sed -i.t 's/"dependencies": {/"dependencies": {\n    "zz-probe": "^1.0.0",/' package.json && rm -f package.json.t
printf '\n' >> package-lock.json
git add package.json package-lock.json 2>/dev/null
hook ok "의존성 + lock 함께"

# 의존성이 아닌 필드만 고친 커밋은 lock 없이 통과해야 한다
sed -i.t 's/"scripts": {/"scripts": {\n    "zz:probe": "echo hi",/' package.json && rm -f package.json.t
git add package.json 2>/dev/null
hook ok "scripts만 수정 + lock 없음"

# ── pre-push ──────────────────────────────────────────────
# `verify:ci`를 실제로 돌리지 않고 **분기만** 본다 — 그것까지 돌리면 이 스크립트가 1분이 된다.
push() {
  want=$1; label=$2; input=$3
  if printf '%s' "$input" | sh .githooks/pre-push origin https://x >/dev/null 2>&1; then got=ok; else got=ng; fi
  if [ "$got" = "$want" ]; then pass=$((pass + 1)); else
    fail=$((fail + 1)); echo "  ✗ $label — 기대 $want, 실제 $got"
  fi
}

sha=$(git rev-parse HEAD)
stamp="$(git rev-parse --git-dir)/verify-ci-passed"
saved=""
[ -f "$stamp" ] && saved=$(cat "$stamp")

# 참조가 안 오면(=삭제 푸시) 검사할 것이 없다
push ok "pre-push: 빈 입력" ""
# 로컬 sha가 전부 0이면 브랜치 삭제다
push ok "pre-push: 브랜치 삭제" "refs/heads/x 0000000000000000000000000000000000000000 refs/heads/x $sha
"
# 이미 통과한 커밋을 다시 밀면 건너뛴다 (여기서만 ok가 나온다 — verify:ci를 안 돌리므로)
printf '%s' "$sha" > "$stamp"
push ok "pre-push: 통과한 sha 재푸시" "refs/heads/x $sha refs/heads/x $sha
"

if [ -n "$saved" ]; then printf '%s' "$saved" > "$stamp"; else rm -f "$stamp"; fi

echo ""
echo "통과 $pass · 실패 $fail"
[ "$fail" -eq 0 ]
