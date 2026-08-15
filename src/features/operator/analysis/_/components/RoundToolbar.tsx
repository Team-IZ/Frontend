import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import ControlLabel from '@/components/common/ControlLabel'
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
function pickLabel(all: string[], picked: string[], unit: string, loading?: boolean) {
  /*
   **모르는 것을 0으로 쓰지 않는다**(F3). 목록이 아직 안 왔을 때 `전체 0반`이라고 하면
   *"이 기수엔 반이 없다"* 는 없는 사실을 주장하게 된다 — 개수 없이 `전체`만 쓴다.
   */
  if (loading) return '전체'
  if (picked.length === 0 || picked.length === all.length) return `전체 ${all.length}${unit}`
  if (picked.length <= 2) return picked.join(' · ')
  return `${picked.slice(0, 2).join(' · ')} 외 ${picked.length - 2}`
}

/*
  **컨트롤 안의 라벨.** 무엇을 고르는 칸인지는 **닫힌 상태에서 읽혀야** 한다 — 열어야 아는
  컨트롤은 툴바에 있을 이유가 없다. 그래서 라벨을 밖에 두지 않고 칩 안에 넣는다.

  ▸ **얇은 세로선으로 가른다.** `반 전체 9반`처럼 붙여 놓으면 어디까지가 이름이고 어디부터
    값인지 안 갈린다. 가운뎃점(`·`)도 써 봤지만 값 안에도 `·`가 들어가는 자리가 있어
    (`정렬 · 최근 발행 회차 나쁜 순`) 층이 섞였다.
  ▸ **크기는 값과 같게, 색만 옅게.** 라벨을 작게 하면 한 칩 안에 글자 크기가 둘이 되어
    칩끼리 높이가 안 맞는다 — 가르는 일은 선과 색이 한다.
*/
function FilterTrigger({
  k,
  children,
  disabled,
}: {
  k: string
  children: React.ReactNode
  disabled?: boolean
}) {
  return (
    <PopoverTrigger
      render={
        /*
          **셀렉트 트리거와 똑같이 보여야 한다.** 이 툴바에는 팝오버 하나와 셀렉트 셋이
          섞여 있는데, 껍데기가 다르면 **같은 일을 하는 컨트롤이 다른 물건처럼** 보인다.
          `Select` 트리거 값(`h-9` · `border-input` · `text-sm`)에 맞춘다.
        */
        <Button
          variant="ghost"
          className="border-input text-fg h-9 gap-1.5 py-2 pr-2 pl-3 text-sm font-normal"
          disabled={disabled}
        >
          <ControlLabel>{k}</ControlLabel>
          {children}
          <ChevronDownIcon className="size-4 opacity-50" />
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
  loading,
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
  /**
   * 아직 고를 것이 안 왔다. **빈 목록으로 열리게 두지 않는다** — 열어도 아무것도 없는
   * 컨트롤은 실패보다 나쁘고, *"누를 수 없는 컨트롤은 장식이다"*(E7)의 같은 자리다
   * (async-states §1-6).
   */
  loading?: boolean
  /** `null`이면 아직 모른다 — 회차가 없거나 조회 전이다. 숫자를 지어내지 않는다 */
  fromRound: number | null
  toRound: number | null
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

  /*
    **고를 것이 아직 없다** — 로딩 중이거나, 실패·빈 응답이라 목록이 비었거나. 셋 다
    「반 수를 모른다」는 점에서 같아서 표시도 같아야 한다(§2-5).
  */
  const unknown = loading || allClasses.length === 0
  const noRounds = loading || allRounds.length === 0
  /*
    **회차를 고른 뒤에 반 팝오버를 연다.** 팀 계층은 `회차 → 반` 순으로 고르므로, 회차가
    없는 동안 두 번째 컨트롤을 열면 순서를 거스른다. 회차가 정해지면 다음 할 일이 반
    하나뿐이라 그때 열어 주는 것이 안내가 된다.
  */
  const needsClass = level === 'team' && teamProjectId !== null && teamClassId === null && !unknown
  const [classOpen, setClassOpen] = useState(false)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* 2지 토글은 ButtonGroup이다 — Button 두 개로 만들지 않는다(InputCompositionsPreview J) */}
      {/*
        **셋 다 36px로 맞춘다** — 34·36·37px로 제각각이면 툴바 밑선이 물결친다.
        `ButtonGroup`이 바깥 테두리를 한 겹 더하므로 안쪽 버튼은 `h-[34px]`여야 36이 된다.
      */}
      <ButtonGroup>
        <Button
          variant={level === 'class' ? 'primary' : 'ghost'}
          className="h-[34px] text-sm font-normal"
          onClick={() => onChange({ level: 'class' })}
        >
          반별
        </Button>
        <Button
          variant={level === 'team' ? 'primary' : 'ghost'}
          className="h-[34px] text-sm font-normal"
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
          팀별
        </Button>
      </ButtonGroup>

      {/*
        **팀 계층은 회차 하나를 고른다.** 서버가 요구한다 — 팀은 회차마다 다시 짜일 수
        있어 회차를 가로질러 같은 팀으로 추적할 수 없다. 아래 회차 **범위**와 자리를
        나눠 쓰는 것이 아니라 **대체한다**(범위가 뜻이 없는 계층이다).

        ▸ **반보다 앞에 둔다.** 팀은 회차마다 다시 짜이므로 *"어느 회차의 팀이냐"* 가
          먼저 정해져야 반 안의 팀 목록이 뜻을 갖는다 — 고르는 순서가 곧 질문의 순서다.
          반별 계층에서는 반 칩이 그대로 첫 자리를 지킨다(그쪽은 회차가 범위라 조건이다).
      */}
      {level === 'team' && (
        <span className="flex items-center">
          <RoundSelect
            label="프로젝트"
            disabled={noRounds}
            loading={loading}
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

      {/*
        **반 선택은 두 계층이 같은 컨트롤을 쓴다** — 반별이면 복수(체크박스), 팀별이면
        단일(라디오)이다. 팀별에서는 **회차 다음 자리**다(위 주석).

        **회차를 고른 뒤 팝오버를 연다.** `defaultOpen`은 첫 마운트에만 걸려서 계층
        전환(리렌더)에는 반응하지 않는다 — 제어 컴포넌트로 바꿔 상태에 직접 묶는다.
        고르고 나면 사용자 조작으로 여닫힌다.
      */}
      <Popover
        /*
          `undefined`를 섞으면 제어/비제어가 오가면서 닫아도 다시 열린다.
          **항상 제어**로 둔다.

          **닫아도 계층을 되돌리지 않는다.** 전에는 반 없이 팀 계층에 머무를 수 없다고 보고
          `반별`로 튕겼는데, 이제 회차를 먼저 고르므로 **되돌리면 그 선택까지 사라진다.**
          안 고른 상태는 격자 자리가 「어느 반의 팀을 볼지 골라 주세요」로 말한다.
        */
        open={needsClass || classOpen}
        onOpenChange={setClassOpen}
      >
        <FilterTrigger k="반" disabled={unknown}>
          {level === 'class' ? (
            pickLabel(
              allClasses.map((c) => c.className),
              picked.map(nameOf),
              '반',
              unknown,
            )
          ) : teamClassId ? (
            nameOf(teamClassId)
          ) : (
            /* 잠긴 이유를 말한다 — 「고르세요」인데 눌러도 안 열리면 고장으로 읽힌다 */
            <span className="text-fg-subtle">{unknown ? '불러오는 중' : '고르세요'}</span>
          )}
        </FilterTrigger>
        <PopoverContent className="w-44 p-1.5">
          {/*
            ⚠ **`전체 선택`/`전체 해제` 토글이었는데 둘 다 아무 일도 안 했다.**

            이 화면에서 `classIds: []`는 **「전체」** 다(서버에 `classroomId`를 안 보낸다).
            그런데 버튼이 `[]` ↔ `[전체 id]`를 오갔다 — **두 값이 같은 뜻**이라:
              · `전체 선택` → 9개 id를 명시로 보냄 → **화면은 그대로인데 요청만 나감**
              · `전체 해제` → `[]` → 그게 「전체」라 **해제가 안 되고** 캐시라 요청도 0건

            그래서 **되돌리기 하나만** 둔다. 이미 전체를 보고 있으면 누를 이유가 없으므로
            그때는 그리지 않는다 — *"누를 수 없는 컨트롤은 장식이다"*(E7).
          */}
          {level === 'class' && picked.length > 0 && (
            <button
              type="button"
              className="text-primary hover:bg-surface-2 w-full rounded-sm px-2 py-1.5 text-left text-xs"
              onClick={() => onChange({ classIds: [] })}
            >
              전체 보기
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
                  /*
                    **마지막 한 반은 해제할 수 없다.** 해제하면 `[]`가 되는데 그건 「전체」라
                    **전부 다시 선택된 것처럼** 보인다 — 하나씩 지워 나가다 마지막에서
                    화면이 원점으로 튀었다. 반 0개짜리 격자는 뜻도 없다(기준선이 곧 비교 대상).
                  */
                  disabled={picked.length === 1 && picked.includes(classId)}
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

      <span className="bg-border mx-1 h-5 w-px" />

      {/*
        회차 범위 — 시작·끝을 직접. 프리셋으로 묶지 않는다.
        **등록 수를 같이 쓴다** — 범위가 `1–3차`인데 등록이 6회면 *"뒤에 더 있다"* 를
        알아야 범위를 넓힐 생각을 한다(정의서 §4-2 — 그 수는 데이터에서 나온다).

        **반별에서만 나온다** — 팀 계층은 회차 하나를 고르므로 범위가 뜻이 없다.
      */}
      {/*
        ⚠ **감싼 span 이 색을 정하지 않는다.** 라벨이 밖에 있던 시절 `text-fg-subtle`이
        남아 있어 **셀렉트 값까지 회색으로 상속**됐다 — 반·정렬은 검정인데 회차만 회색이었다.
        여기는 배치만 한다.
      */}
      {level === 'class' && (
        <span className="flex items-center gap-1.5">
          <RoundSelect
            label="프로젝트"
            disabled={noRounds}
            loading={loading}
            value={fromRound}
            rounds={allRounds}
            /* 다른 쪽을 아직 모르면 그대로 둔다 — 없는 값과 비교하지 않는다 */
            onChange={(v) =>
              onChange({ fromRound: v, toRound: toRound === null ? v : Math.max(v, toRound) })
            }
          />
          –
          <RoundSelect
            disabled={noRounds}
            loading={loading}
            value={toRound}
            rounds={allRounds}
            onChange={(v) =>
              onChange({ toRound: v, fromRound: fromRound === null ? v : Math.min(v, fromRound) })
            }
          />
          {/* 회차 수도 아직 모른다 — `등록 0회`는 없는 사실이다 */}
          {/* 컨트롤이 아니라 보조 정보다 — 칩과 다른 크기·색으로 두어야 누를 것으로 안 읽힌다 */}
          {!noRounds && <span className="text-fg-subtle text-xs">등록 {allRounds.length}회</span>}
        </span>
      )}

      {/*
        `items`가 있어야 트리거에 **라벨**이 뜬다 — 없으면 내부 값(`LATEST_WORST`)이
        그대로 노출된다. 기존 선례(`ProjectFilters`)가 이미 이 형태다.
      */}
      <Select
        value={sort}
        onValueChange={(v) => onChange({ sort: v as RoundSort })}
        /* 값에 `정렬 ·`을 붙이지 않는다 — 이름은 칩 안 라벨이 말한다 */
        items={ROUND_SORTS.map((s) => ({ value: s, label: ROUND_SORT_LABEL[s] }))}
      >
        <SelectTrigger className="w-60" aria-label="정렬" disabled={loading}>
          <ControlLabel>정렬</ControlLabel>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROUND_SORTS.map((s) => (
            <SelectItem key={s} value={s}>
              {ROUND_SORT_LABEL[s]}
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
  label,
  disabled,
  loading,
}: {
  /** `null`이면 아직 안 고른 상태 — 트리거에 `고르세요`가 뜬다 */
  value: number | null
  rounds: RoundColumn[]
  onChange: (v: number) => void
  /**
   * 칩 안에 붙일 이름. **범위의 두 번째 칸에는 안 붙인다** — `회차 1차 – 회차 6차`가 되어
   * 같은 값을 두 번 말하게 된다. 라벨 있는 쪽이 시작, 없는 쪽이 끝으로 읽힌다.
   */
  label?: string
  /** 회차 목록이 아직 안 왔다 — 빈 목록으로 열리게 두지 않는다(async-states §1-6) */
  disabled?: boolean
  /**
   * 잠긴 이유가 **조회 중**인가. 「고르세요」로 두면 눌러 보고 빈 목록을 만난다 —
   * 팀별로 바꾸면 계층이 달라 목록을 새로 받으므로(§계층-전환) 이 자리가 실제로 비어 있다.
   */
  loading?: boolean
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
      {/* 폭은 가장 긴 문구(`불러오는 중`)에 맞춘다 — 라벨이 붙는 쪽이 더 넓다 */}
      <SelectTrigger className={label ? 'w-36' : 'w-24'} aria-label="프로젝트" disabled={disabled}>
        {label && <ControlLabel>{label}</ControlLabel>}
        <SelectValue placeholder={loading ? '불러오는 중' : '고르세요'} />
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
