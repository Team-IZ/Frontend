/**
 * 운영 관리 규칙 — `npm run check:admin`
 *
 * 화면 렌더는 검사하지 않는다. 여기 있는 것은 **입력을 넣으면 답이 정해지는 규칙**뿐이다
 * (검사 방식은 check-project-rules.mts와 같다 — 러너를 따로 들이지 않는다).
 *
 * 이 넷이 깨지면 조용히 틀린다:
 *   · CSV 파싱   한 줄 때문에 전체가 막히거나, 오류 행 번호가 어긋난다
 *   · 도메인     기관 밖 주소가 등록되고 초대가 나간다
 *   · 정원       `22 → 24 / 25` 미리보기가 실제와 다르다
 *   · 최근 접속  `오늘`이 어제 것을 가리킨다
 */
import assert from 'node:assert'
import {
  canEditClasses,
  capacityPreview,
  checkEmail,
  checkRosterRows,
  formatLastSeen,
  formatPeriod,
  formatUsd,
  needsManager,
  parseRosterCsv,
  perTrainee,
  toIsoDate,
} from '../src/features/operator/admin/_/rules.ts'
import type { ClassRoom } from '../src/features/operator/admin/_/api/types.ts'

const DOMAIN = 'green.com'

// ── 이메일 ──────────────────────────────────────────────────
// 두 실패를 갈라야 한다 — 형식은 그 줄을, 도메인은 주소 자체를 고쳐야 한다
assert.strictEqual(checkEmail('dohyun@green.com', DOMAIN), null)
assert.strictEqual(checkEmail('DoHyun@GREEN.COM', DOMAIN), null, '대소문자를 가리지 않는다')
assert.strictEqual(checkEmail('이름만', DOMAIN), 'INVALID_FORMAT')
assert.strictEqual(checkEmail('someone@gmail.com', DOMAIN), 'DOMAIN_NOT_ALLOWED')
// 도메인이 뒤에 붙기만 하면 되는 게 아니다 — `@`까지 맞아야 한다
assert.strictEqual(checkEmail('a@evilgreen.com', DOMAIN), 'DOMAIN_NOT_ALLOWED')

// ── CSV ────────────────────────────────────────────────────
{
  const csv = [
    '이름,이메일', // 머리글 — 오류로 세면 모든 파일이 오류 1건으로 시작한다
    '한도현,dohyun@green.com',
    '정하늘,haneul@green.com',
    '', // 빈 줄은 오류가 아니다 — 파일 끝 개행이 늘 붙는다
    '오류행,not-an-email',
    '외부인,someone@gmail.com',
    '중복,dohyun@green.com',
  ].join('\n')

  const { entries, invalid } = parseRosterCsv(csv, DOMAIN)

  // **한 줄 때문에 전체를 막지 않는다** — 유효 행은 그대로 등록 후보다
  assert.strictEqual(entries.length, 2, '유효 행만 남는다')
  assert.deepStrictEqual(
    entries.map((e) => e.name),
    ['한도현', '정하늘'],
  )

  // **행 번호는 파일의 줄 번호다** — 편집기에서 그 줄을 찾을 수 있어야 한다
  assert.deepStrictEqual(invalid, [
    { line: 5, reason: 'INVALID_FORMAT' },
    { line: 6, reason: 'DOMAIN_NOT_ALLOWED' },
    { line: 7, reason: 'DUPLICATE_IN_FILE' },
  ])
}

{
  // 머리글이 없는 파일도 첫 줄을 잃지 않는다 — 규칙이 어휘가 아니라 주소 모양이다
  const { entries } = parseRosterCsv('한도현,dohyun@green.com', DOMAIN)
  assert.strictEqual(entries.length, 1, '머리글 없는 파일의 첫 줄')
}

{
  // 이름이 비면 이메일 앞부분을 쓴다 — 초대는 나가야 하고 이름은 받는 사람이 고친다
  const { entries } = parseRosterCsv(',dohyun@green.com', DOMAIN)
  assert.strictEqual(entries[0].name, 'dohyun')
}

{
  // 따옴표로 감싼 CSV도 읽는다(엑셀이 그렇게 내보낸다)
  const { entries } = parseRosterCsv('"한도현","dohyun@green.com"', DOMAIN)
  assert.deepStrictEqual(entries, [{ name: '한도현', email: 'dohyun@green.com' }])
}

// ── 직접 입력 ───────────────────────────────────────────────
// **줄 번호가 입력칸 번호와 같아야 한다.** 빈 행을 걸러낸 뒤의 인덱스를 쓰면
// 1행을 비우고 2행을 틀렸을 때 `1번째 줄 오류`라고 말한다 — 그 칸은 멀쩡한 빈 칸이다
assert.deepStrictEqual(
  checkRosterRows(
    [
      { name: '', email: '' },
      { name: '박', email: '나쁜주소' },
    ],
    DOMAIN,
  ),
  [{ line: 2, reason: 'INVALID_FORMAT' }],
)

// 입력칸 사이 중복 — 안 잡으면 `유효 2명`이라 해 놓고 서버가 1명만 등록한다
assert.deepStrictEqual(
  checkRosterRows(
    [
      { name: 'a', email: 'x@green.com' },
      { name: 'b', email: 'X@GREEN.COM' },
    ],
    DOMAIN,
  ),
  [{ line: 2, reason: 'DUPLICATE_IN_FILE' }],
  '대소문자를 가리지 않는다',
)

// 안 친 칸은 오류가 아니다 — 마지막 빈 줄은 늘 있다
assert.deepStrictEqual(checkRosterRows([{ name: '', email: '  ' }], DOMAIN), [])

// ── 반 편집 잠금(D30-②) ────────────────────────────────────
// **개강일 하루 전까지만** 열린다. 시작일 당일은 이미 시작한 것이라 잠긴다
assert.strictEqual(canEditClasses('2026-03-02', '2026-03-01'), true, '개강 전날 — 열림')
assert.strictEqual(canEditClasses('2026-03-02', '2026-03-02'), false, '개강 당일 — 잠김')
assert.strictEqual(canEditClasses('2026-03-02', '2026-07-16'), false, '개강 후 — 잠김')

// ── 정원 ────────────────────────────────────────────────────
const room = (size: number, capacity = 25): ClassRoom => ({
  id: 'c-f',
  cohortId: '7',
  name: 'F반',
  capacity,
  size,
  managerId: null,
  managerName: null,
  assignedAt: null,
  assignedBy: null,
})

// 목업 레일의 `22 → 24 / 25 · 1자리 남음`이 이 계산이다
assert.deepStrictEqual(capacityPreview(room(22), 2), { next: 24, over: false, remaining: 1 })
assert.deepStrictEqual(capacityPreview(room(25), 0), { next: 25, over: false, remaining: 0 })
// **정원 초과를 막지 않는다** — 넘는다는 사실만 알린다(중도 합류·반 통폐합)
assert.deepStrictEqual(capacityPreview(room(24), 3), { next: 27, over: true, remaining: -2 })

// 담당 없음은 필드 하나로 판정한다 — 서버 플래그를 따로 두면 목록과 경고가 어긋난다
assert.strictEqual(needsManager(room(22)), true)
assert.strictEqual(needsManager({ ...room(22), managerId: 'm-1', managerName: '박지현' }), false)

// ── 표시값 ──────────────────────────────────────────────────
const NOW = '2026-07-16T14:20'
assert.strictEqual(formatLastSeen('2026-07-16T09:41', NOW), '오늘 09:41')
assert.strictEqual(formatLastSeen('2026-07-15T18:02', NOW), '어제 18:02')
assert.strictEqual(formatLastSeen('2026-05-02T10:00', NOW), '2026-05-02')
assert.strictEqual(formatLastSeen(null, NOW), null, '접속 기록 없음')
// 달을 넘겨도 `어제`가 맞아야 한다(문자열 비교로는 안 되는 자리)
assert.strictEqual(formatLastSeen('2026-06-30T09:00', '2026-07-01T10:00'), '어제 09:00')

// 해가 같으면 뒤쪽 연도를 접는다 — 표에서 같은 글자가 반복된다
assert.strictEqual(formatPeriod('2026-03-02', '2026-09-30'), '2026-03 ~ 09')
assert.strictEqual(formatPeriod('2025-08-04', '2026-02-27'), '2025-08 ~ 2026-02')

// 금액은 소수점을 만들지 않는다(A4). 1인당처럼 나눈 값만 소수 둘째 자리까지
assert.strictEqual(formatUsd(412), '$412')
assert.strictEqual(formatUsd(1234), '$1,234')
assert.strictEqual(perTrainee(268, 250), '$1.07')
assert.strictEqual(perTrainee(144, 252), '$0.57')
assert.strictEqual(perTrainee(100, 0), '—', '0으로 나누지 않는다')

// 로컬 날짜여야 한다 — toISOString()은 UTC로 밀려 오전 9시 이전이면 하루가 어긋난다
assert.strictEqual(toIsoDate(new Date(2026, 9, 5, 1, 0)), '2026-10-05')

console.warn('✓ 운영 관리 규칙 통과 — CSV · 도메인 · 정원 · 표시값')
