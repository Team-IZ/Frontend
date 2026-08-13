import { Skeleton } from '@/components/ui/Skeleton'

/*
  상세가 오는 동안 **그 탭 모양으로** 자리를 잡는다.

  ─── 왜 스피너를 안 쓰나 ────────────────────────────────────────
  OP-01·02·03은 전부 스켈레톤으로 옮겼는데 **여기만 스피너로 남아 있었다.** 같은 콘솔
  안에서 화면마다 기다리는 모양이 다를 이유가 없고, 스피너는 *"기다려"* 만 말하지만
  스켈레톤은 *"이런 것이 올 것이다"* 까지 말한다(async-states §1-2).

  **높이는 실제 화면에서 잰 값이다**(종료 회차 기준) — 요약 카드 98.6 · 일정 419.9 ·
  측정 규칙 275.5 · 현황 표 424.1 + 매칭 카드 140.3. 눈대중으로 잡으면 도착할 때
  그만큼 튀고, 그러면 스켈레톤을 쓴 이유가 없어진다.

  ⚠ **블록을 빼먹으면 그만큼 통째로 밀린다.** 개요에 측정 규칙 카드를 안 그렸다가
  275px이 도착할 때 생겼다 — 스켈레톤이 있는데도 화면이 튀었다.

  **탭마다 모양이 다르므로 셋을 따로 그린다.** 개요를 현황 자리에 그리면 도착 순간
  구조가 통째로 바뀐다 — 스피너와 다를 것이 없어진다.

  ▸ **`aria-hidden`이다.** 자리표시자라 읽어 줄 것이 없다.
  ▸ **스피너를 같이 두지 않는다.** 스켈레톤이 이미 「기다려」를 말한다 — 밑에서 스피너가
    또 돌면 같은 말이 두 번이다. 오래 걸리는 것만 `SlowNotice`가 12초 뒤에 말한다.
*/

/** 개요 — 요약 카드 3 + 일정 타임라인 + 측정 규칙 */
export function OverviewSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-border bg-surface h-[98.6px] rounded-lg border p-4">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="mt-2 h-5 w-20" />
            <Skeleton className="mt-2 h-2.5 w-2/3" />
          </div>
        ))}
      </div>

      {/* 일정 — 머리 + 잠금 안내 줄 + 타임라인 5마디 (실측 419.9px) */}
      <div className="border-border bg-surface rounded-lg border">
        <div className="border-border flex h-[57px] items-center justify-between border-b px-4">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-14" />
        </div>
        <div className="border-border flex h-[37px] items-center border-b px-4">
          <Skeleton className="h-3 w-80" />
        </div>
        {/* 마디 46px × 5 + 간격 16×4 + 안쪽 여백 32 = 325.9 (실측 일정 카드 419.9 − 머리 94) */}
        <div className="flex flex-col gap-4 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex h-[46px] gap-3">
              <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="mt-1.5 h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 측정 규칙 — 머리 51.6 + 규칙 7줄 × 18.6 (실측 275.5px) */}
      <div className="border-border bg-surface rounded-lg border">
        <div className="border-border flex h-[52px] items-center border-b px-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex flex-col gap-2.5 p-4">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex h-[18.6px] items-center gap-3">
              <Skeleton className="h-3 w-20 shrink-0" />
              <Skeleton className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 현황 — 반별 표 + 항목별 코드 매칭 카드.
 *
 * **둘 다 그린다.** 표만 그렸다가 아래 매칭 카드(140.3px)가 도착할 때 생겼다.
 * 행 수는 실측 기수 기준 8반(머리 38.5 · 본문 41.6 · 카드 424.1px).
 */
export function StatusSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="border-border bg-surface rounded-lg border">
        <div className="border-border flex h-[57px] items-center border-b px-4">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="border-border flex h-[38.5px] items-center gap-4 border-b px-4">
          {['w-10', 'w-14', 'w-16', 'w-16', 'w-12', null].map((w, i) => (
            <Skeleton key={i} className={`h-3 ${w ?? 'flex-1'}`} />
          ))}
        </div>
        {Array.from({ length: 8 }, (_, r) => (
          <div
            key={r}
            className="border-border flex h-[41.6px] items-center gap-4 border-b px-4 last:border-b-0"
          >
            {['w-10', 'w-14', 'w-16', 'w-16', 'w-12', null].map((w, i) => (
              <Skeleton key={i} className={`h-4 ${w ?? 'flex-1'}`} />
            ))}
          </div>
        ))}
      </div>

      {/* 항목별 코드 매칭 (실측 140.3px) */}
      <div className="border-border bg-surface rounded-lg border">
        <div className="border-border flex h-[57px] items-center border-b px-4">
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="flex flex-col gap-2.5 p-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-4 w-3/5" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** 구성 — 교안·개념·요구사항·삭제 네 구획 */
export function ConfigSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      {[2, 3, 1, 1].map((rows, i) => (
        <div key={i} className="border-border bg-surface rounded-lg border">
          <div className="border-border flex h-[57px] items-center justify-between border-b px-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-14" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            {Array.from({ length: rows }, (_, r) => (
              <Skeleton key={r} className="h-4 w-2/3" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
