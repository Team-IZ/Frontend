import sys

path = "src/features/operator/projects/detail/ProjectDetailScreen.tsx"

edits = [
    (
        "  /*\n"
        "    상단 스위처 라벨용이다 — **조회에는 쓰지 않는다.**\n"
        "\n"
        "    형제 회차·교안·기수 기간은 **이 회차가 속한 기수**(`data.cohortId`)로 부른다.\n"
        '    한때 여기서 얻은 "지금 보고 있는 기수"로 불렀는데, 주소로 직접 들어오면\n'
        "    (딥링크·새로고침·다른 기수 회차 링크) **화면이 두 기수를 섞어 보여준다** —\n"
        "    10기 회차를 열었는데 9기의 교안 목록과 형제 회차를 조회했다. 렌더로 잡았다.\n"
        "  */\n"
        "  const { cohortId: scopeCohortId, cohortName, cohorts, selectCohort } = useCohortId()",
        "  /*\n"
        "    **스위처의 선택 옵션·변경 핸들러만 여기서 가져온다 — 조회에도, 라벨에도 안 쓴다.**\n"
        "\n"
        "    형제 회차·교안·기수 기간은 **이 회차가 속한 기수**(`data.cohortId`)로 부른다.\n"
        '    한때 여기서 얻은 "지금 보고 있는 기수"로 불렀는데, 주소로 직접 들어오면\n'
        "    (딥링크·새로고침·다른 기수 회차 링크) **화면이 두 기수를 섞어 보여준다** —\n"
        "    10기 회차를 열었는데 9기의 교안 목록과 형제 회차를 조회했다. 렌더로 잡았다.\n"
        "\n"
        "    (이슈 277 QA) **스위처 라벨도 같은 함정에 걸렸었다.** 전역 스코프의 `cohortId`를\n"
        "    라벨로 그렸더니, 딥링크로 8기 회차를 열어도 스위처는 전역 기본값(9기)을 가리켰다\n"
        "    — 위와 같은 「두 기수 혼동」을 라벨에서 반복한 것이다. 라벨도 아래 `data.cohortId`\n"
        "    기준으로 바꿨다.\n"
        "  */\n"
        "  const { cohorts, selectCohort } = useCohortId()",
        1,
    ),
    (
        "  /*\n"
        "    조회 기준은 **응답이 알려준 기수**다 — \"지금 보고 있는 기수\"로 부르면 주소로 직접\n"
        "    들어왔을 때 화면이 두 기수를 섞는다.\n"
        "  */\n"
        "  const cohortId = project.data?.cohortId",
        "  /*\n"
        "    조회·스위처 라벨 기준은 **응답이 알려준 기수**다 — \"지금 보고 있는 기수\"로 부르면\n"
        "    주소로 직접 들어왔을 때 화면이 두 기수를 섞는다(위 주석 참고).\n"
        "  */\n"
        "  const cohortId = project.data?.cohortId",
        1,
    ),
    (
        "cohort={scopeCohortId ?? ''}",
        "cohort={cohortId ?? ''}",
        3,
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

print("OK - edits applied to operator ProjectDetailScreen.tsx")
