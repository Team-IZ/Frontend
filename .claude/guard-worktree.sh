#!/bin/sh
# 작업 트리를 파괴하는 git 명령을 막는다 — 규약: docs/handbook/git-convention.md §5
#
# 왜 필요한가: 터미널·에디터·AI 세션을 여럿 띄워도 작업 트리는 하나다. git에는
# 세션 격리가 없어서 한쪽의 "잠깐 치움"이 다른 쪽에는 파일 삭제로 보인다.
# 실제로 `git stash --include-untracked`가 다른 세션의 작업 파일 13개를 두 번 날렸다.
#
# git 훅으로는 못 막는다(pre-stash 같은 훅이 없다). 그래서 명령 실행 **전에**
# Claude Code가 이 스크립트로 검사한다. 사람이 터미널에서 직접 치는 것은 막지 못하므로
# 최종 방어선은 여전히 규약과 백업이다.
#
# 종료 코드 2 = 차단(사유가 Claude에게 전달된다) · 0 = 통과

cmd=$(cat)

block() {
  echo "$1" >&2
  echo "" >&2
  echo "  규약: docs/handbook/git-convention.md §5 (작업 트리는 공유 자원이다)" >&2
  exit 2
}

case "$cmd" in
  # ── untracked를 stash하면 복구 경로가 아예 없다 ──
  *"git stash"*"--include-untracked"* | *"git stash"*"-u"* | *"git stash"*"--all"*)
    block "✗ untracked 파일을 stash하지 않습니다.

  untracked는 git 히스토리에 없어서 stash를 잃으면 **복구할 방법이 없습니다.**
  다른 세션이 방금 만든 파일이 여기 걸립니다.

  대신:
    · 남의 코드가 깨져 앱이 안 뜨면 → 그 사람에게 말한다(5초면 고친다)
    · 렌더 확인이 꼭 필요하면 → git worktree로 별도 폴더에 격리한다
    · 아니면 typecheck·lint로만 검증하고 넘어간다"
    ;;

  # ── 되돌리기 계열은 남의 미저장 작업을 지운다 ──
  *"git reset --hard"*)
    block "✗ git reset --hard는 스테이징까지 통째로 날립니다.

  다른 세션이 올려둔 변경도 같이 사라집니다.
  되돌릴 대상이 내 커밋이면 'git reset --soft'를 쓰세요."
    ;;

  *"git clean"*)
    block "✗ git clean은 untracked 파일을 삭제합니다.

  다른 세션이 작업 중인 새 파일이 여기 걸립니다 — 복구 경로가 없습니다."
    ;;

  *"git checkout -- "* | *"git checkout ."* | *"git restore "*)
    block "✗ 작업 트리를 되돌리는 명령입니다.

  대상 파일을 다른 세션이 수정 중이면 그 작업이 사라집니다.
  정말 내 변경만 되돌리는 것이 확실하면 사람이 직접 실행하세요."
    ;;
esac

exit 0
