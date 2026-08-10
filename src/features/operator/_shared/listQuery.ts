import { keepPreviousData } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'

/*
  **목록 조회의 정책.** 필터·검색·정렬·페이지처럼 *"같은 것의 다른 조각"* 을 보는 조회가
  이것을 쓴다.

  ─── 왜 전역 기본값이 아닌가 ────────────────────────────────────
  `main.tsx`에 한 줄 넣으면 전부 적용되지만 **상세에서 틀린다.** 회차 A → B로 이동하면
  B의 주소에 A의 내용이 남는다 — 목록에서는 친절이지만 상세에서는 **다른 회차의 값을 그
  회차 것처럼 보여주는 것**이고, 데이터 화면에서 그건 불편이 아니라 사고다.

      같은 것의 다른 조각 (목록의 필터·페이지)  → 유지한다   ○
      다른 것            (상세의 id, 다른 기수) → 유지 안 한다 ✗

  그래서 정책이 **목록에만** 붙는다(async-states-plan §2).
*/

/**
 * 조건이 바뀌어도 **이전 결과를 남긴다.** 새 결과가 오면 갈아 끼운다.
 *
 * 쿼리 키가 바뀌면 그 키에는 캐시가 없어서 `isPending`이 참이 되고 화면이 빈다 —
 * 실측: 명단 2쪽을 누르면 표가 통째로 사라졌다(행 10 → 0, 본문 869 → 808px).
 *
 * ```ts
 * const res = useFindProjects(params, { enabled: !!q, ...listQueryOptions })
 * ```
 *
 * 값이 옛 것인 동안은 **그 사실을 숨기지 않는다** — 화면이 `isPlaceholderData`로
 * 흐리게 그린다(async-states §1-4).
 */
export const listQueryOptions = { placeholderData: keepPreviousData } as const

/**
 * 옛 값을 그리는 동안 표에 다는 것 — `<div {...staleProps(q.isPlaceholderData)}>`.
 *
 * **값이 옛 것이라는 사실을 숨기지 않는다.** 비우는 것(깜빡임)과 그냥 두는 것(거짓말)
 * 사이의 답이라, `listQueryOptions`와 **짝으로만 뜻이 있다** — 그래서 같은 파일에 둔다.
 *
 * `aria-busy`가 보조 기술에도 같은 것을 알린다 — 흐림은 눈으로만 보이는 신호다.
 */
export const staleProps = (stale: boolean) => ({
  'aria-busy': stale,
  className: cn('transition-opacity', stale && 'opacity-60'),
})
