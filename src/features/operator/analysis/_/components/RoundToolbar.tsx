import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { Checkbox } from '@/components/ui/Checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { ROUND_SORTS, ROUND_SORT_LABEL } from '../labels'
import type { ClassOption, Level, RoundColumn, RoundSort } from '../api/types'

/*
  회차 흐름 툴바. **전부 왼쪽**(E3) — 이 화면엔 주 액션이 없으므로 오른쪽은 비운다.

  ─── 배치 ────────────────────────────────────────────────────────
      반별  [반별|팀] [반 ▾]           │  [회차 ▾ – 회차 ▾] [정렬 ▾]
      팀    [반별|팀] [반 ▾] [회차 ▾]  │  [정렬 ▾]

  ▸ **계층이 선택 방식을 정한다**(OP-02 §3). 반별은 반 **복수**(체크박스), 팀은 반
    **단일**(라디오) — 팀 번호는 **반 안에서만 유일**해서(`C반 3팀` vs `D반 3팀`)
    반이 여럿이면 같은 이름의 다른 팀이 한 표에 섞인다.
  ▸ **팀 계층은 회차도 하나 골라야 한다.** 서버가 그렇게 막는다 —
    **팀은 회차마다 다시 짜일 수 있어** 회차를 가로질러 같은 팀으로 추적할 수 없다.
    그래서 팀 계층에는 범위(시작–끝) 대신 **회차 단일 선택**이 온다.
  ▸ **컨트롤 모양이 곧 규칙이다.** 안내 문장을 쓰지 않는다(E10) — 체크박스면 복수,
    라디오면 단일. 단일 선택일 때는 **개수 배지도 빼는데**, 붙어 있으면 더 고를 수
    있는 것처럼 보인다.
  ▸ **회차 범위는 시작·끝을 직접** 고른다. `최근 3회` 같은 프리셋으로 묶지 않는다 —
    그 묶음의 근거를 기획에서 댈 수 없고(E8), 회차 수가 기수마다 6~8로 달라 어느
    기수에서는 안 맞는다.
  ▸ **조건 필터를 만들지 않는다.** `매 회차 오르는 반만` 같은 것은 **필터 이름이 곧
    판정**이 되고 근거를 댈 수 없다(E8 — 이 화면이 실제로 어겼다가 되돌린 자리).
*/

/** 칩에 고른 이름을 나열하고 개수 배지를 붙인다 — 무엇을 보고 있는지가 툴바에 남는다 */
function pickLabel(all: string[], picked: string[], unit: string) {
  if (picked.length === 0 || picked.length === all.length) return `전체 ${all.length}${unit}`
  if (picked.length <= 2) return picked.join(' · ')
  return `${picked.slice(0, 2).join(' · ')} 외 ${picked.length - 2}`
}

function FilterTrigger({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <PopoverTrigger
      render={
        <Button variant="ghost" size="sm">
          <span className="text-fg-subtle text-2xs">{k}</span>
          {children}
          <ChevronDownIcon className="size-3" />
        </Button>
      }
    />
  )
}

export default function RoundToolbar({
  level,
  classIds: picked,
  teamClassId,
  teamProjectId,
  allClasses,
  allRounds,
  fromRound,
  toRound,
  sort,
  onChange,
}: {
  level: Level
  classIds: string[]
  /** 팀 계층에서 보고 있는 반. `null`이면 아직 안 골랐다 */
  teamClassId: string | null
  /** 팀 계층에서 보고 있는 회차. `null`이면 아직 안 골랐다 */
  teamProjectId: string | null
  allClasses: ClassOption[]
  allRounds: RoundColumn[]
  fromRound: number
  toRound: number
  sort: RoundSort
  onChange: (patch: {
    level?: Level
    classIds?: string[]
    teamClassId?: string | null
    teamProjectId?: string | null
    fromRound?: number
    toRound?: number
    sort?: RoundSort
  }) => void
}) {
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((n) => n !== id) : [...list, id]

  const allClassIds = allClasses.map((c) => c.classId)
  const nameOf = (id: string) => allClasses.find((c) => c.classId === id)?.className ?? ''

  /** 팀 계층인데 반이 없다 — 고를 때까지 팝오버가 열려 있다 */
  const needsClass = level === 'team' && teamClassId === null
  const [classOpen, setClassOpen] = useState(false)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* 2지 토글은 ButtonGroup이다 — Button 두 개로 만들지 않는다(InputCompositionsPreview J) */}
      <ButtonGroup>
        <Button
          variant={level === 'class' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onChange({ level: 'class' })}
        >
          반별
        </Button>
        <Button
          variant={level === 'team' ? 'primary' : 'ghost'}
          size="sm"
          /*
            **반을 자동으로 고르지 않는다.** 전에는 정렬 첫 행(C반)을 잡았는데, 사용자
            눈에는 임의로 보이고 *"왜 C반인가"* 에 답할 근거가 없었다.

            팀 계층의 질문은 *"이 반 안에서 어느 팀이 무너졌나"* 라 **어느 반인지가
            질문의 전제**다. 시스템이 대신 고르면 그것이 답인 줄 안다 — 안 고른 상태로
            두고 반 선택을 열어 사용자가 정하게 한다.

            **반별 선택(`classIds`)은 건드리지 않는다** — 돌아왔을 때 보던 그대로여야 한다.
          */
          onClick={() => onChange({ level: 'team' })}
        >
          팀
        </Button>
      </ButtonGroup>

      {/*
        **반을 안 골랐으면 팝오버를 연다.** `defaultOpen`은 첫 마운트에만 걸려서 계층
        전환(리렌더)에는 반응하지 않는다 — 제어 컴포넌트로 바꿔 상태에 직접 묶는다.
        고르고 나면 사용자 조작으로 여닫힌다.
      */}
      <Popover
        /*
          `undefined`를 섞으면 제어/비제어가 오가면서 닫아도 다시 열린다.
          **항상 제어**로 두고, 반이 없는 동안만 강제로 연다 — 닫으려 하면 계층을
          되돌린다(반 없이 팀 계층에 머무를 이유가 없다).
        */
        open={needsClass ? true : classOpen}
        onOpenChange={(o) => {
          if (needsClass && !o) onChange({ level: 'class' })
          else setClassOpen(o)
        }}
      >
        <FilterTrigger k="반">
          {level === 'class' ? (
            pickLabel(
              allClasses.map((c) => c.className),
              picked.map(nameOf),
              '반',
            )
          ) : teamClassId ? (
            nameOf(teamClassId)
          ) : (
            <span className="text-fg-subtle">고르세요</span>
          )}
        </FilterTrigger>
        <PopoverContent className="w-44 p-1.5">
          {level === 'class' && (
            <button
              type="button"
              className="text-primary hover:bg-surface-2 w-full rounded-sm px-2 py-1.5 text-left text-xs"
              onClick={() =>
                onChange({ classIds: picked.length === allClassIds.length ? [] : allClassIds })
              }
            >
              {picked.length === allClassIds.length ? '전체 해제' : '전체 선택'}
            </button>
          )}
          {allClasses.map(({ classId, className }) => (
            <label
              key={classId}
              className="hover:bg-surface-2 flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              {level === 'class' ? (
                <Checkbox
                  checked={picked.length === 0 || picked.includes(classId)}
                  onCheckedChange={() =>
                    onChange({
                      classIds: toggle(picked.length === 0 ? allClassIds : picked, classId),
                    })
                  }
                />
              ) : (
                // 라디오 = 단일. 컨트롤 모양이 이미 그 말이다(E10)
                <input
                  type="radio"
                  name="class"
                  className="accent-primary size-3.5"
                  checked={teamClassId === classId}
                  onChange={() => {
                    onChange({ teamClassId: classId })
                    setClassOpen(false)
                  }}
                />
              )}
              {className}
            </label>
          ))}
        </PopoverContent>
      </Popover>

      {/*
        **팀 계층은 회차 하나를 고른다.** 서버가 요구한다 — 팀은 회차마다 다시 짜일 수
        있어 회차를 가로질러 같은 팀으로 추적할 수 없다. 아래 회차 **범위**와 자리를
        나눠 쓰는 것이 아니라 **대체한다**(범위가 뜻이 없는 계층이다).
      */}
      {level === 'team' && (
        <span className="text-fg-subtle flex items-center gap-1.5 text-2xs">
          회차
          <RoundSelect
            value={allRounds.find((r) => r.projectId === teamProjectId)?.no ?? null}
            rounds={allRounds}
            onChange={(no) =>
              onChange({
                teamProjectId: allRounds.find((r) => r.no === no)?.projectId ?? null,
              })
            }
          />
        </span>
      )}

      <span className="bg-border mx-1 h-5 w-px" />

      {/*
        회차 범위 — 시작·끝을 직접. 프리셋으로 묶지 않는다.
        **등록 수를 같이 쓴다** — 범위가 `1–3차`인데 등록이 6회면 *"뒤에 더 있다"* 를
        알아야 범위를 넓힐 생각을 한다(정의서 §4-2 — 그 수는 데이터에서 나온다).

        **반별에서만 나온다** — 팀 계층은 회차 하나를 고르므로 범위가 뜻이 없다.
      */}
      {level === 'class' && (
        <span className="text-fg-subtle flex items-center gap-1.5 text-2xs">
          회차
          <RoundSelect
            value={fromRound}
            rounds={allRounds}
            onChange={(v) => onChange({ fromRound: v, toRound: Math.max(v, toRound) })}
          />
          –
          <RoundSelect
            value={toRound}
            rounds={allRounds}
            onChange={(v) => onChange({ toRound: v, fromRound: Math.min(v, fromRound) })}
          />
          <span className="text-fg-subtle/70">등록 {allRounds.length}회</span>
        </span>
      )}

      {/*
        `items`가 있어야 트리거에 **라벨**이 뜬다 — 없으면 내부 값(`LATEST_WORST`)이
        그대로 노출된다. 기존 선례(`ProjectFilters`)가 이미 이 형태다.
      */}
      <Select
        value={sort}
        onValueChange={(v) => onChange({ sort: v as RoundSort })}
        items={ROUND_SORTS.map((s) => ({ value: s, label: `정렬 · ${ROUND_SORT_LABEL[s]}` }))}
      >
        <SelectTrigger size="sm" className="w-56" aria-label="정렬">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROUND_SORTS.map((s) => (
            <SelectItem key={s} value={s}>
              정렬 · {ROUND_SORT_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** 회차 하나를 고르는 select. 미발행·시작 전 회차도 고를 수 있고 **왜 값이 없는지**를 단다 */
function RoundSelect({
  value,
  rounds,
  onChange,
}: {
  /** `null`이면 아직 안 고른 상태 — 트리거에 `고르세요`가 뜬다 */
  value: number | null
  rounds: RoundColumn[]
  onChange: (v: number) => void
}) {
  return (
    <Select
      /*
        **`undefined`를 넣지 않는다.** 그러면 Select가 비제어로 시작했다가 값이 생길 때
        제어로 바뀌면서 첫 선택이 먹지 않는다(Base UI 경고). 빈 문자열이 "안 고름"이다.
      */
      value={value === null ? '' : String(value)}
      /*
        **빈 값을 무시한다.** 팝오버가 닫힐 때 Base UI가 `''`로 한 번 더 발화하는데,
        그대로 받으면 방금 고른 회차가 도로 풀린다 — 고를 수 없는 셀렉트가 됐던 자리다.
      */
      onValueChange={(v) => {
        if (v) onChange(Number(v))
      }}
      items={rounds.map((r) => ({ value: String(r.no), label: r.label }))}
    >
      <SelectTrigger size="sm" className="w-24" aria-label="회차">
        <SelectValue placeholder="고르세요" />
      </SelectTrigger>
      <SelectContent>
        {rounds.map((r) => (
          <SelectItem key={r.projectId} value={String(r.no)}>
            {r.label}
            <span className="text-fg-subtle ml-1.5 text-2xs">{r.projectName}</span>
            {/* **왜 값이 없는지**를 고르는 자리에서 말한다 — 고르고 나서 빈 열을 보지 않게 */}
            {!r.published && <span className="text-fg-subtle ml-1.5 text-2xs">미발행</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
