import sys

path = "src/features/operator/projects/detail/components/DetailHeader.tsx"

edits = [
    (
        "  const due = project.endDate ? dueLabel(project.endDate, now) : null\n"
        "\n"
        "  return (\n"
        "    <div className=\"mb-4\">\n"
        "      <Link\n"
        "        to=\"/operator/projects\"\n"
        "        className=\"text-fg-subtle hover:text-fg mb-1.5 inline-flex items-center gap-0.5 text-xs\"\n"
        "      >",
        "  const due = project.endDate ? dueLabel(project.endDate, now) : null\n"
        "\n"
        "  return (\n"
        "    <div className=\"mb-4\">\n"
        "      {/*\n"
        "        (이슈 277 QA) **기수를 실어 간다.** 예전엔 `/operator/projects`로 고정돼 있어서,\n"
        "        스위처로 다른 기수를 골라 두고 들어온 회차에서 여기를 누르면 목록이 전역\n"
        "        기본값(진행 중 기수)으로 되돌아갔다 — 방금 보던 기수가 사라졌다. 이 회차가\n"
        "        실제로 속한 기수(`project.cohortId`)를 실어 보내면 그 문제가 없다.\n"
        "      */}\n"
        "      <Link\n"
        "        to={`/operator/projects?cohort=${project.cohortId}`}\n"
        "        className=\"text-fg-subtle hover:text-fg mb-1.5 inline-flex items-center gap-0.5 text-xs\"\n"
        "      >",
        1,
    ),
]

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

errors = []
for old, new, expected in edits:
    count = content.count(old)
    if count != expected:
        errors.append(f"expected {expected}, found {count}: {old[:70]!r}...")
        continue
    content = content.replace(old, new)

if errors:
    print("ERRORS:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("OK - breadcrumb fix applied to DetailHeader.tsx")
