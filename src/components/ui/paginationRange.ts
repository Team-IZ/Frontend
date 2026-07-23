/**
 * 페이저에 실제로 그릴 항목을 계산한다.
 *
 * 페이지가 많아지면 번호를 전부 늘어놓을 수 없다. 200개를 20개씩 보면 10쪽이라
 * 아슬아슬하게 되지만, 필터를 풀면 금방 50쪽·100쪽이 된다. 그래서 항상 같은 규칙으로
 * 자른다 — **첫 쪽 · 마지막 쪽 · 현재 쪽 주변**만 남기고 사이를 `'…'`로 접는다.
 *
 *   총 10쪽, 현재 1   →  1 2 3 4 … 10
 *   총 10쪽, 현재 5   →  1 … 4 5 6 … 10
 *   총 10쪽, 현재 10  →  1 … 7 8 9 10
 *   총 4쪽            →  1 2 3 4          (접을 게 없으면 그대로)
 *
 * 첫·마지막을 항상 남기는 이유: "맨 앞으로"와 "맨 끝으로"는 목록에서 가장 잦은 이동인데,
 * 접어버리면 화살표를 여러 번 눌러야 닿는다.
 *
 * **가장자리 보정이 있다.** 현재 쪽이 1이면 왼쪽 이웃이 없어 그냥 두면 번호가 하나 줄고,
 * 그만큼 페이저 폭이 좁아진다. 페이지를 넘길 때마다 버튼들이 좌우로 움직이면 같은 자리를
 * 연속으로 누르기 어렵다 — 잘린 쪽만큼 반대편을 늘려 개수를 유지한다.
 *
 * @param current  현재 쪽(1부터)
 * @param total    전체 쪽 수
 * @param siblings 현재 쪽 양옆으로 몇 개를 더 보일지(기본 1)
 */
export function getPageRange(current: number, total: number, siblings = 1): (number | '…')[] {
  if (total <= 0) return []

  // 현재 쪽이 범위를 벗어나면 잘라 맞춘다 — 호출하는 쪽에서 실수해도 페이저가 깨지지 않게
  const page = Math.min(Math.max(current, 1), total)

  // 항상 보이는 것: 1 · total · 현재 주변(siblings*2+1) · 양쪽 '…' 자리 2개
  // 이 개수보다 총 쪽이 적으면 접을 이유가 없다.
  const alwaysVisible = siblings * 2 + 5
  if (total <= alwaysVisible) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  // 현재 쪽 양옆 창. 첫·마지막은 따로 그리므로 창은 2 ~ total-1 안에서만 움직인다.
  let left = page - siblings
  let right = page + siblings

  // 한쪽이 잘리면 그만큼 반대편을 늘린다(폭 유지)
  if (left < 2) {
    right = Math.min(total - 1, right + (2 - left))
    left = 2
  }
  if (right > total - 1) {
    left = Math.max(2, left - (right - (total - 1)))
    right = total - 1
  }

  const showLeftEllipsis = left > 2
  const showRightEllipsis = right < total - 1

  // 한쪽만 접히면 '…' 한 칸이 남는다. 그만큼 번호를 하나 더 보여 **항상 같은 칸 수**를
  // 유지한다. 페이저는 가운데 정렬이라 칸 수가 변하면 좌우로 움직이는데, 다음 쪽을
  // 연속으로 누를 때 버튼이 손가락 밑에서 이동해버린다.
  if (!showLeftEllipsis && showRightEllipsis) right = Math.min(right + 1, total - 1)
  if (showLeftEllipsis && !showRightEllipsis) left = Math.max(left - 1, 2)

  const range: (number | '…')[] = [1]
  if (showLeftEllipsis) range.push('…')
  for (let p = Math.max(left, 2); p <= Math.min(right, total - 1); p++) range.push(p)
  if (showRightEllipsis) range.push('…')
  range.push(total)

  return range
}
