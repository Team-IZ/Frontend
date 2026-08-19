import sys

edits_by_file = {
    "src/features/manager/projects/ProjectDetailScreen.tsx": [
        (
            "  const { cohortId, cohortName, cohorts, selectCohort } = useManagerCohort()",
            "  const { cohortId, cohorts, selectCohort } = useManagerCohort()",
            1,
        ),
    ],
    "src/features/manager/trainees/TraineeDetailScreen.tsx": [
        (
            "  const { cohortId, cohortName, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()",
            "  const { cohortId, failed: cohortFailed, cohorts, selectCohort } = useManagerCohort()",
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
            all_errors.append(f"{path}: expected {expected}, found {count}: {old[:70]!r}...")
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
