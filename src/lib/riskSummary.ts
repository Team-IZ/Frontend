/**
 * 위험 판정식 앞에 붙어 오는 **심각도 태그를 벗긴다** — 실측:
 *
 * ```
 * [SEVERE] 최근 2개 유효 회차 점수 1.67 → 1.67 (기수 평균 대비 저점)
 * [WARN] 응시 기간 종료까지 세션을 시작하지 않음
 * ```
 *
 * 대괄호 태그는 개발자용 표기라 매니저 화면에 그대로 둘 수 없다. 심각도는 **옆의
 * 위험 배지가 이미 말한다**(`지속 저점`이 danger) — 같은 것을 두 번 말하면서
 * 한쪽만 사람 말이 아닌 상태가 된다.
 *
 * **코드가 아니라 옛 시드 데이터다**(30차 R8). 지금 판정 배치가 만드는 문장에는 태그가
 * 없고 스펙에도 「대괄호 태그는 붙지 않는다」가 명시됐다. 다만 **실서버 DB에 이미 적재된
 * 시드는 그 수정으로 안 바뀌므로**(시드 파일이 저장소 추적 대상이 아니다) 이 방어는
 * 남겨 둔다 — 백엔드도 남겨 두어도 무해하다고 했다.
 *
 * 태그는 `[SEVERE]` 하나가 아니라 `[WARN]`·`[RISK]`까지 **세 종류**다.
 *
 * ⚠ **판정식이 오는 곳마다 붙여야 한다.** 교육생 상세(MG-06)에만 붙였다가 면담
 * 목록(MG-03)에서 `[WARN]`이 그대로 노출되는 것을 렌더에서 잡았다 — 그래서 여기로
 * 올렸다.
 */
export function stripSeverityTag(summary: string): string
export function stripSeverityTag(summary: string | null): string | null
export function stripSeverityTag(summary: string | null): string | null {
  return summary?.replace(/^\s*\[[A-Z_]+\]\s*/, '') ?? null
}
