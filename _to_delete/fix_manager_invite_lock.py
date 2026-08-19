import sys

path = "src/features/operator/admin/managers/ManagersTab.tsx"

edits = [
    (
        "            끝난 기수라 담당을 바꾸거나 계정을 정지할 수 없습니다.\n          </AlertDescription>",
        "            끝난 기수라 담당을 바꾸거나 계정을 정지할 수 없고, 새 매니저를 초대할 수도 없습니다.\n          </AlertDescription>",
        1,
    ),
    (
        "        action={<Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>}",
        "        action={locked ? undefined : <Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>}",
        1,
    ),
    (
        '          <Empty variant="empty">\n'
        "            <EmptyHeader>\n"
        "              <EmptyTitle>아직 매니저가 없습니다</EmptyTitle>\n"
        "              <EmptyDescription>\n"
        "                초대하면 담당 반을 맡길 수 있습니다. 반이 담당 없이 시작되면 그 반 면담을 아무도\n"
        "                처리하지 않습니다.\n"
        "              </EmptyDescription>\n"
        "            </EmptyHeader>\n"
        '            <Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>\n'
        "          </Empty>",
        '          <Empty variant="empty">\n'
        "            <EmptyHeader>\n"
        "              <EmptyTitle>아직 매니저가 없습니다</EmptyTitle>\n"
        "              <EmptyDescription>\n"
        "                {locked\n"
        "                  ? '끝난 기수라 매니저를 초대할 수 없습니다.'\n"
        "                  : '초대하면 담당 반을 맡길 수 있습니다. 반이 담당 없이 시작되면 그 반 면담을 아무도 처리하지 않습니다.'}\n"
        "              </EmptyDescription>\n"
        "            </EmptyHeader>\n"
        '            {!locked && <Button onClick={() => setInviteOpen(true)}>+ 매니저 초대</Button>}\n'
        "          </Empty>",
        1,
    ),
]

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

errors = []
for old, new, expected in edits:
    count = content.count(old)
    if count != expected:
        errors.append(f"expected {expected}, found {count}: {old[:60]!r}...")
        continue
    content = content.replace(old, new)

if errors:
    print("ERRORS:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK - 3 edits applied to ManagersTab.tsx")
