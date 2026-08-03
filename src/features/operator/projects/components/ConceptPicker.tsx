import { AlertTriangleIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { cn } from '@/lib/utils/cn'
import { CONCEPT_COUNT } from '../rules'
import type { ConceptHistory, Curriculum, TeachItem } from '../types'

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
  ▸ **이력은 판단을 대신하지 않는다**(OP-04 §3). `집단 미달`은 *"피해야 한다"* 가
    아니고, `코드 매칭 0`은 학생이 못한 것이 아니라 **묻지 못했다**는 뜻이다.
    시스템은 표시까지만 한다(9-6).
*/
type Props = {
  /** 연결된 교안. 이 교안들의 `teaches` 합집합이 후보다(14번 4-3) */
  curricula: Curriculum[]
  picked: string[]
  onToggle: (teachId: string) => void
  /** 지난 회차 이력. 없으면 안 붙는다 — 생성 시점에는 아직 없다 */
  history?: ConceptHistory[]
}

export default function ConceptPicker({ curricula, picked, onToggle, history = [] }: Props) {
  return (
    <>
      {curricula.map((c) =>
        groupBySection(c.teaches).map(([section, items]) => (
          <div key={`${c.id}-${section}`}>
            <p className="bg-surface-2 text-fg-subtle px-3 py-1.5 text-2xs font-semibold">
              {c.name} {c.version} · {section}
            </p>
            {items.map((t) => (
              <ConceptOption
                key={t.id}
                item={t}
                checked={picked.includes(t.id)}
                // 3건을 채우면 나머지는 못 고른다 — 무엇을 빼야 하는지 그 자리에서 보인다
                full={!picked.includes(t.id) && picked.length >= CONCEPT_COUNT}
                history={history.find((h) => h.teachId === t.id)}
                onToggle={() => onToggle(t.id)}
              />
            ))}
          </div>
        )),
      )}
    </>
  )
}

function ConceptOption({
  item,
  checked,
  full,
  history,
  onToggle,
}: {
  item: TeachItem
  checked: boolean
  full: boolean
  history?: ConceptHistory
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
          <b className="text-sm font-semibold">{item.name}</b>
          <span className="text-fg-subtle text-2xs">{item.page}</span>
        </span>
        {history && (
          /*
            이력은 사실만 적는다 — 경고 색은 "묻지 못했다"·"집단 미달"에만 쓴다.
            `사용함`은 판단이 필요 없는 기록이라 회색이다.
          */
          <span
            className={cn(
              'mt-0.5 flex items-center gap-1 text-2xs',
              history.kind === 'USED' ? 'text-fg-subtle' : 'text-warning font-semibold',
            )}
          >
            {history.kind !== 'USED' && <AlertTriangleIcon className="size-3" />}
            {history.note}
          </span>
        )}
        {/* 정의문 — 고르는 순간 그 회차 모든 학생의 문항이 된다 */}
        <span className="text-fg-muted mt-0.5 block text-xs">{item.definition}</span>
      </span>
    </label>
  )
}

/** 후보를 섹션별로 묶는다 — 합쳐 늘어놓으면 `p.55`가 어느 교안 어느 장인지 알 수 없다 */
function groupBySection(items: TeachItem[]): [string, TeachItem[]][] {
  const map = new Map<string, TeachItem[]>()
  for (const item of items) {
    const list = map.get(item.section)
    if (list) list.push(item)
    else map.set(item.section, [item])
  }
  return [...map]
}
