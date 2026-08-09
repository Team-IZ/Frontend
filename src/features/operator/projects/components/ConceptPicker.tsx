import { AlertTriangleIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils/cn'
import { CONCEPT_COUNT } from '../rules'
import type { ConceptCandidate, Curriculum } from '../types'

/*
  검증 개념 후보 목록 — **생성(OP-03)과 변경(OP-04)이 같은 것을 고른다.**

  두 모달이 각자 그리고 있었다. 껍데기(모달 제목·푸터·저장 대상)는 다르지만 **고르는
  규칙과 후보를 보여주는 방식은 같은 것**이라, 규칙이 바뀌면 두 곳을 고쳐야 했다.
  그 규칙이 이 제품의 Tier 1 불변식이다(14번 Tier1-4 — 3건 고정).

  ▸ **정의문을 같이 보여준다.** 이름만으로는 무엇을 묻게 될지 판단할 수 없는데,
    고르는 순간 그것이 그 회차 **모든 학생의 문항**이 된다.
  ▸ **후보를 교안·섹션별로 묶는다.** 합쳐 늘어놓으면 `p.55`가 어느 교안의 55쪽인지
    알 수 없다.
  ▸ **3건을 채우면 나머지가 잠긴다.** 저장 시점에 알리면 무엇을 빼야 할지 모른다.

  ─── 연동하며 바뀐 것 ───────────────────────────────────────────
  **후보가 교안에 딸려 오지 않는다.** 목에서는 `Curriculum.teaches`였는데 서버는 후보를
  따로 준다(`findConceptCandidates` / `findSections`). 그래서 이 컴포넌트는 **후보 배열을
  통째로 받고** 자기가 교안별로 묶는다 — 두 조회가 같은 모양을 주므로(9차 R2) 생성·변경
  양쪽에서 그대로 쓰인다.

  **선택 키는 `mappingId`다.** 확정(`PUT /concepts`)이 `mappingIds`를 받으므로 고른 것을
  그대로 보낼 수 있다. `teachesId`는 현황·분석이 쓰는 다른 키다.

  **지난 회차 이력이 빠졌다.** 개념 후보에 `집단 미달`·`코드 매칭 0`을 붙여 주던 값인데
  그것을 주는 엔드포인트가 없다(types `ConceptHistory` 주석). 판단을 대신하는 값이
  아니었으므로 없다고 못 고르지는 않는다 — 10차에 요청한다.
*/
type Props = {
  /** 후보 전량. 연결된 교안들의 승인된 매핑이다(14번 4-3) */
  candidates: ConceptCandidate[]
  /** 후보를 묶을 때 쓰는 교안 이름표. 못 찾으면 파일명 대신 버전 ID를 쓰지 않고 생략한다 */
  curricula: Curriculum[]
  /** 고른 `mappingId`들 */
  picked: string[]
  onToggle: (mappingId: string) => void
}

export default function ConceptPicker({ candidates, curricula, picked, onToggle }: Props) {
  return (
    <>
      {groupByCurriculumAndSection(candidates).map(([key, group]) => {
        const c = curricula.find((x) => x.versionId === group.curriculumVersionId)
        return (
          <div key={key}>
            <p className="bg-surface-2 text-fg-subtle px-3 py-1.5 text-2xs font-semibold">
              {c ? `${c.originalFileName} v${c.versionNo}` : '교안'}
              {group.sectionTitle ? ` · ${group.sectionTitle}` : ''}
            </p>
            {group.items.map((it) => (
              <ConceptOption
                key={it.mappingId}
                item={it}
                checked={picked.includes(it.mappingId)}
                // 3건을 채우면 나머지는 못 고른다 — 무엇을 빼야 하는지 그 자리에서 보인다
                full={!picked.includes(it.mappingId) && picked.length >= CONCEPT_COUNT}
                onToggle={() => onToggle(it.mappingId)}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

function ConceptOption({
  item,
  checked,
  full,
  onToggle,
}: {
  item: ConceptCandidate
  checked: boolean
  full: boolean
  onToggle: () => void
}) {
  return (
    <label
      className={cn(
        'flex gap-2 px-3 py-2',
        checked && 'bg-primary-soft',
        full ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
      )}
    >
      <Checkbox className="mt-0.5" checked={checked} disabled={full} onCheckedChange={onToggle} />
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <b className="text-sm font-semibold">{item.extractedName}</b>
          <span className="text-fg-subtle text-2xs">{pageLabel(item)}</span>
        </span>
        {/*
          정의문 — 고르는 순간 그 회차 모든 학생의 문항이 된다. 없으면 그 사실을 쓴다:
          정의문 없는 항목을 고르면 문항이 이름만으로 만들어져 품질이 갈린다.
        */}
        {item.definitionMissing || !item.description ? (
          <span className="text-warning mt-0.5 flex items-center gap-1 text-xs font-semibold">
            <AlertTriangleIcon className="size-3" />
            교안에 정의문이 없습니다
          </span>
        ) : (
          <span className="text-fg-muted mt-0.5 block text-xs">{item.description}</span>
        )}
      </span>
    </label>
  )
}

/** `p.53` · `p.53–55`. 페이지가 없으면 아무것도 안 쓴다 — `p.null`보다 빈 칸이 낫다 */
function pageLabel(c: ConceptCandidate): string {
  if (c.pageStart == null) return ''
  return c.pageEnd && c.pageEnd !== c.pageStart
    ? `p.${c.pageStart}–${c.pageEnd}`
    : `p.${c.pageStart}`
}

type Group = { curriculumVersionId: string; sectionTitle: string | null; items: ConceptCandidate[] }

/**
 * 교안 → 섹션 순으로 묶는다. **교안이 먼저인 이유**는 `p.55`가 어느 문서의 55쪽인지가
 * 섹션 이름보다 먼저 필요하기 때문이다 — 두 교안에 같은 이름의 섹션이 있을 수 있다.
 *
 * 삽입 순서를 그대로 쓴다(`Map`). 서버가 교안 연결 순서·섹션 순서로 주므로 정렬을
 * 화면이 다시 만들면 그 순서를 잃는다.
 */
function groupByCurriculumAndSection(items: ConceptCandidate[]): [string, Group][] {
  const map = new Map<string, Group>()
  for (const item of items) {
    const key = `${item.curriculumVersionId} ${item.sectionId ?? ''}`
    const group = map.get(key)
    if (group) group.items.push(item)
    else
      map.set(key, {
        curriculumVersionId: item.curriculumVersionId,
        sectionTitle: item.sectionTitle,
        items: [item],
      })
  }
  return [...map]
}
