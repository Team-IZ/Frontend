import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 클래스 이름을 합친다.
 *
 * 두 가지를 한다.
 * - 조건부 클래스 정리 — `cn('a', cond && 'b')` 에서 false를 버린다 (clsx)
 * - **충돌하는 Tailwind 클래스 중 뒤에 온 것만 남긴다** (tailwind-merge)
 *
 * 두 번째가 핵심이다. 컴포넌트에 기본 여백을 두고 쓰는 쪽에서 다른 여백을 주면
 * 문자열로 이으면 둘 다 남아 순서에 따라 결과가 달라진다.
 *
 *   'px-3' + 'px-6'        →  px-3 px-6   (CSS 순서에 좌우된다)
 *   cn('px-3', 'px-6')     →  px-6        (쓰는 쪽이 이긴다)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
