import sys

edits_by_file = {
    "src/features/manager/projects/components/DetailHeader.tsx": [
        (
            '  return (\n'
            '    <div className="mb-4">\n'
            '      <div className="flex items-center gap-2">\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="프로젝트 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            '          render={<Link to="/manager/projects" />}\n'
            '          className="-ml-1.5 p-1.5"\n'
            '        >',
            '  return (\n'
            '    <div className="mb-4">\n'
            '      <div className="flex items-center gap-2">\n'
            '        {/*\n'
            '          (이슈 277 QA) **기수를 실어 간다** — 오퍼레이터 상세와 같은 이유(`DetailHeader.tsx`\n'
            '          주석 참고). 고정 경로였으면 스위처로 다른 기수를 골라 두고 들어온 회차에서\n'
            '          여기를 누를 때 목록이 기본값으로 되돌아간다.\n'
            '        */}\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="프로젝트 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            "          render={<Link to={`/manager/projects?cohort=${project.cohortId}`} />}\n"
            '          className="-ml-1.5 p-1.5"\n'
            '        >',
            1,
        ),
    ],
    "src/features/manager/curriculum/CurriculumDetailScreen.tsx": [
        (
            '      <div className="mx-auto max-w-3xl">\n'
            '        <BackRow title="교안 상세" />',
            '      <div className="mx-auto max-w-3xl">\n'
            '        <BackRow title="교안 상세" cohortId={cohortId} />',
            1,
        ),
        (
            '      <div className="mb-4 flex items-center gap-2.5">\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="교안 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            '          render={<Link to="/manager/curriculum" />}\n'
            '          className="p-1.5"\n'
            '        >',
            '      <div className="mb-4 flex items-center gap-2.5">\n'
            '        {/*\n'
            '          (이슈 277 QA) **기수를 실어 간다.** 교안은 기수 소유가 아니라 기관 전체\n'
            '          자산이라 「이 교안의 기수」가 없다 — 대신 지금 스위처가 가리키는 기수를\n'
            '          그대로 들고 간다. 안 그러면 다른 기수를 보다 들어온 교안에서 여기를 누를 때\n'
            '          목록이 기본값(첫 담당 기수)으로 되돌아간다.\n'
            '        */}\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="교안 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            "          render={<Link to={`/manager/curriculum?cohort=${cohortId ?? ''}`} />}\n"
            '          className="p-1.5"\n'
            '        >',
            1,
        ),
        (
            'function BackRow({ title }: { title: string }) {\n'
            '  return (\n'
            '    <>\n'
            '      <div className="[&_h1]:sr-only">\n'
            '        <PageHeader breadcrumb="교안 목록 › 교안 상세" title={title} />\n'
            '      </div>\n'
            '      <div className="mt-2 mb-2 flex items-center gap-2.5">\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="교안 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            '          render={<Link to="/manager/curriculum" />}\n'
            '          className="p-1.5"\n'
            '        >',
            'function BackRow({ title, cohortId }: { title: string; cohortId: string | undefined }) {\n'
            '  return (\n'
            '    <>\n'
            '      <div className="[&_h1]:sr-only">\n'
            '        <PageHeader breadcrumb="교안 목록 › 교안 상세" title={title} />\n'
            '      </div>\n'
            '      <div className="mt-2 mb-2 flex items-center gap-2.5">\n'
            '        <Button\n'
            '          variant="ghost"\n'
            '          size="sm"\n'
            '          aria-label="교안 목록으로 돌아가기"\n'
            '          nativeButton={false}\n'
            "          render={<Link to={`/manager/curriculum?cohort=${cohortId ?? ''}`} />}\n"
            '          className="p-1.5"\n'
            '        >',
            1,
        ),
    ],
}

all_errors = []
new_contents = {}
touched = {}
for path, edits in edits_by_file.items():
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    for old, new, expected in edits:
        count = content.count(old)
        if count != expected:
            all_errors.append(f"{path}: expected {expected}, found {count}: {old[:60]!r}...")
            continue
        content = content.replace(old, new)
        touched[path] = touched.get(path, 0) + 1
    new_contents[path] = content

if all_errors:
    print("ERRORS (no files written):")
    for e in all_errors:
        print(" -", e)
    sys.exit(1)

for path, content in new_contents.items():
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"OK - {sum(touched.values())} edits applied across {len(touched)} files")
