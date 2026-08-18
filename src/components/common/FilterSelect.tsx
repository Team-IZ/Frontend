import ControlLabel from '@/components/common/ControlLabel'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'

/*
  **선택지가 서버에서 오는 필터.** 반·회차·팀·교안이 그렇다.

  ─── 왜 따로 있나 ──────────────────────────────────────────────
  이 컨트롤은 툴바와 함께 **즉시 그려지는데 선택지는 늦게 온다.** 그 사이 셀렉트는
  멀쩡해 보이면서 안이 비어 있고, 열어 본 사람은 「내 담당 반이 없나」로 읽는다.

  ```
  툴바 그려짐 187ms → 반 목록 도착 6.0초        (명부 · 실측)
              └── 그동안 열면 「전체」 하나뿐 ──┘
  ```

  `stores/cohortScope`가 반 목록을 미리 받아 이 창을 대부분 없앴지만, **대시보드에
  5초 이상 머물러야** 효과가 있다(실측). 새로고침·딥링크로 바로 들어오면 그대로다.

  ─── 트리거는 건드리지 않는다 ─────────────────────────────────
  「전체」 옵션의 라벨을 「불러오는 중」으로 바꾸는 방법이 먼저 있었는데(오퍼레이터
  프로젝트 목록), 그러면 **선택지가 상태 메시지로 변신한다.**

  · 트리거에 「반 · 불러오는 중」이 뜨면 *필터가 로딩 중*으로 읽힌다 — 실제로는
    필터는 멀쩡히 걸려 있다(「전체」가 적용돼 정상 동작 중)
  · 그 항목을 클릭하면 「불러오는 중」을 고른 셈이 된다

  역할이 다르다.

  ```
  트리거 = 지금 무엇이 걸려 있나   →  "반 · 전체"          (참이라 바꾸지 않는다)
  메뉴   = 무엇을 고를 수 있나     →  여기에 상태를 적는다   (못 고르는 줄로)
  ```

  ─── 실패는 로딩과 다르다 ─────────────────────────────────────
  로딩은 몇 초고 저절로 낫는다. **실패는 그 세션 내내 안 낫는다** — 목록이 실패하면
  필터가 조용히 「전체」 하나로 영구히 쪼그라들고, 쓰는 사람은 그걸 모른다.
  그래서 실패에는 **되돌릴 손잡이**(다시 시도)가 있어야 한다.

  ⚠ **상수 목록에는 쓰지 않는다.** 정렬·계정 상태처럼 코드가 갖는 선택지는 늦게 올
  일이 없어서, 「불러오는 중」을 달면 그 자체가 거짓말이 된다.
*/

export type FilterOption = { value: string; label: string }

type Props = {
  /**
   * `반`·`회차` — **컨트롤 안 왼쪽 이름표**(`ControlLabel`)로 그린다.
   *
   * 값에 섞지 않는다(`반 · 전체` ✗). 오퍼레이터가 그러다 되돌렸다 — 파일명이 그대로
   * 들어가는 교안 필터에서 **트리거가 580px까지 늘어나 툴바가 두 줄로 접혔고 표가
   * 44px 내려갔다.** 항목마다 같은 접두사가 반복되는 문제도 있다.
   */
  label: string
  value: string
  onChange: (value: string) => void
  /**
   * 서버를 안 기다리는 선택지 — 「전체」처럼 코드가 갖는 것.
   * 목록이 늦어도 이건 고를 수 있다.
   */
  fixed?: FilterOption[]
  /**
   * 서버에서 오는 선택지. **`undefined`면 아직 안 온 것**이다(빈 배열과 다르다) —
   * 빈 배열은 「없다」고 확인된 상태다.
   */
  options: FilterOption[] | undefined
  /** 조회가 실패했다 — 상태 행이 그 사실과 손잡이를 그린다 */
  failed?: boolean
  onRetry?: () => void
  className?: string
}

export default function FilterSelect({
  label,
  value,
  onChange,
  fixed = [],
  options,
  failed = false,
  onRetry,
  className = 'w-32',
}: Props) {
  const loaded = options ?? []
  const all = [...fixed, ...loaded]

  /*
    `items`는 트리거가 **고른 값의 라벨**을 그리는 데 쓴다. 이름표는 섞지 않는다 —
    `ControlLabel`이 트리거 안에서 따로 그린다.

    상태 행은 값이 아니라 안내라 여기 넣지 않는다 — 넣으면 트리거가 그것을 그릴 수 있다.
  */
  const items = Object.fromEntries(all.map((o) => [o.value, o.label]))

  /** 아직 안 왔나 — 실패가 아니고 값도 없으면 기다리는 중이다(값 유무로 가른다) */
  const waiting = !failed && options === undefined

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? all[0]?.value)} items={items}>
      <SelectTrigger
        className={cn('h-9', className)}
        aria-label={`${label} 필터`}
        title={all.find((o) => o.value === value)?.label}
      >
        <ControlLabel>{label}</ControlLabel>
        {/* 긴 이름은 자른다 — 트리거가 자라면 툴바가 접힌다 */}
        <SelectValue className="truncate" />
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}

        {/*
          상태 행 — **고를 수 없다.** `disabled`라 포인터도 안 먹고 키보드로도 안 걸린다.
          `role="option"`을 그대로 두는 것은 스크린리더가 메뉴를 읽을 때 이 줄도
          읽어야 하기 때문이다(눈으로만 보이는 안내는 안내가 아니다).
        */}
        {waiting && (
          <SelectItem value="__loading" disabled className="text-fg-subtle">
            불러오는 중…
          </SelectItem>
        )}
        {failed && (
          <div className="border-border mt-1 border-t px-1.5 pt-1.5 pb-1">
            <p className="text-fg-muted text-2xs">{label} 목록을 불러오지 못했습니다</p>
            {onRetry && (
              <button
                type="button"
                className="text-primary mt-1 text-2xs font-semibold hover:underline"
                onClick={onRetry}
              >
                다시 시도
              </button>
            )}
          </div>
        )}
      </SelectContent>
    </Select>
  )
}
