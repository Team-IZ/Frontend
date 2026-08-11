import { Skeleton } from '@/components/ui/Skeleton'

/*
  블록이 조회 중일 때 **그 블록 모양으로** 자리를 잡는다.

  ▸ **회색 막대 하나로 때우지 않는다.** 셋 다 모양이 정해져 있는데(4단계 · 최대 4행 ·
    반 수만큼) 한 줄로 그리면 도착할 때 그만큼 자란다 — 실측 CLS 0.0445, 마지막 이동이
    **8.7초**였다. 사용자가 이미 조치 필요를 읽고 있을 때 위에서 파이프라인이 자라며
    읽던 줄을 밀어냈다(op-01-situations 문제 1).
  ▸ **높이는 실제 블록에서 잰 값이다** — 이번 회차 80px · 조치 필요 260px · 반 비교
    325px. 눈대중으로 맞추면 그만큼 튀고, 그러면 스켈레톤을 쓴 이유가 없어진다
    (`TableSkeleton`에서 같은 실수를 한 번 했다 — 133px 어긋났다).
  ▸ **`aria-hidden`이다.** 자리표시자라 읽어 줄 것이 없다 — 로딩은 `Spinner`의
    `role="status"`가 이미 알린다.
*/

/** 이번 회차 — 단계 4개가 화살표로 이어진다. 오른쪽 메타 두 줄까지 같이 잡는다 */
export function PipelineSkeleton() {
  return (
    <div aria-hidden className="flex flex-wrap items-center px-6 py-2.5">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="flex items-center">
          <span className="flex flex-col gap-1 pr-6">
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-5 w-14" />
            <span className="mt-px min-h-4" />
          </span>
          {/* 마지막 단계 뒤에는 화살표가 없다 — 자리도 잡지 않는다 */}
          {i < 3 && (
            <span className="pr-6">
              <Skeleton className="h-3 w-3" />
            </span>
          )}
        </span>
      ))}
      <span className="ml-auto flex flex-col items-end gap-1.5">
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-3 w-32" />
      </span>
    </div>
  )
}

/**
 * 조치 필요 — **행 수를 4로 잡는다.** 서버가 유형별로 가장 나쁜 한 건씩만 올리므로
 * (`loadTodos`) 4가 상한이고, 실제로도 대개 4건이다. 적게 잡으면 도착할 때 자란다.
 */
export function TodoSkeleton() {
  return (
    <ul aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        /* 높이를 실제 행에서 재서 박는다 — 4행 260px이므로 65px (§문제 1) */
        <li
          key={i}
          className="border-border flex h-[65px] items-start gap-3 px-6 py-3 not-first:border-t"
        >
          <Skeleton className="size-[22px] shrink-0 rounded-full" />
          <span className="w-[92px] shrink-0 pt-px">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="mt-1 h-2.5 w-10" />
          </span>
          <span className="min-w-0 flex-1">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="mt-1.5 h-3 w-5/6" />
          </span>
          <Skeleton className="mt-0.5 h-3 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  )
}

/**
 * 반 비교 — **행 수를 안다.** 반 목록은 `risk` 응답에 있고 그게 2.2초에 오므로,
 * 8.8초짜리 파이프라인을 기다리는 동안 이 블록은 **정확한 행 수**로 자리를 잡는다.
 *
 * ⚠ **첫 진입에는 반 수를 알 수 없다.** 반 목록과 반 비교 값이 **같은 응답**에서
 * 오므로(`risk`), 이 스켈레톤이 보이는 동안은 아직 그 응답이 안 온 것이다 — 캐시가
 * 있는 재진입에서만 정확해진다. 실측 기수들이 8~9반이라 기본값을 8로 둔다.
 *
 * @param rows 반 수. 모르면 기본값.
 */
export function ClassCompareSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden className="px-6 py-3">
      {/* 기준선 라벨 줄 — 실제 블록에도 있어서 빼면 그만큼 어긋난다 */}
      <p className="mb-2 flex h-4 items-end gap-3">
        <span className="w-[42px] shrink-0" />
        <Skeleton className="h-2.5 w-24" />
      </p>
      {Array.from({ length: rows }, (_, i) => (
        /* 실제 행 높이 — 9행 + 머리줄이 325px이므로 31px */
        <div key={i} className="flex h-[31px] items-center gap-3">
          <Skeleton className="h-3 w-[42px] shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3 w-24 shrink-0" />
        </div>
      ))}
    </div>
  )
}
