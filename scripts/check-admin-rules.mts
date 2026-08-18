/**
 * 운영 관리 규칙 — `npm run check:admin`
 *
 * 화면 렌더는 검사하지 않는다. 여기 있는 것은 **입력을 넣으면 답이 정해지는 규칙**뿐이다
 * (검사 방식은 check-project-rules.mts와 같다 — 러너를 따로 들이지 않는다).
 *
 * 이 셋이 깨지면 조용히 틀린다:
 *   · CSV 파싱   한 줄 때문에 전체가 막히거나, 오류 행 번호가 어긋난다
 *   · 정원       `22 → 24 / 25` 미리보기가 실제와 다르다
 *   · 최근 접속  `오늘`이 어제 것을 가리킨다
 *
 * 기관 도메인 제한은 8/18로 없앴다(백엔드도 동일하게 열었다) — 이메일은 형식만 본다.
 */
import assert from 'node:assert'
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '../src/api/uploadLimits.ts'
import {
  assignPolicy,
  canEditClasses,
  capacityPreview,
  checkEmail,
  checkRosterRows,
  classroomName,
  formatLastSeen,
  formatPeriod,
  formatUsd,
  parseRosterCsv,
  perTrainee,
  toIsoDate,
} from '../src/features/operator/admin/_/rules.ts'

// ── 이메일 ──────────────────────────────────────────────────
// 형식만 본다 — 기관 도메인 제한은 없다
assert.strictEqual(checkEmail('dohyun@green.com'), null)
assert.strictEqual(checkEmail('DoHyun@GREEN.COM'), null, '대소문자를 가리지 않는다')
assert.strictEqual(checkEmail('이름만'), 'INVALID_FORMAT')
assert.strictEqual(checkEmail('someone@gmail.com'), null, '도메인 제한 없음 — 형식만 맞으면 통과')

// ── CSV ────────────────────────────────────────────────────
{
  const csv = [
    '이름,이메일', // 머리글 — 오류로 세면 모든 파일이 오류 1건으로 시작한다
    '한도현,dohyun@green.com',
    '정하늘,haneul@green.com',
    '', // 빈 줄은 오류가 아니다 — 파일 끝 개행이 늘 붙는다
    '오류행,not-an-email',
    '외부인,someone@gmail.com', // 도메인 제한 없음 — 형식만 맞으면 유효 행이다
    '중복,dohyun@green.com',
  ].join('\n')

  const { entries, invalid } = parseRosterCsv(csv)

  // **한 줄 때문에 전체를 막지 않는다** — 유효 행은 그대로 등록 후보다
  assert.strictEqual(entries.length, 3, '유효 행만 남는다')
  assert.deepStrictEqual(
    entries.map((e) => e.name),
    ['한도현', '정하늘', '외부인'],
  )

  // **행 번호는 파일의 줄 번호다** — 편집기에서 그 줄을 찾을 수 있어야 한다
  assert.deepStrictEqual(invalid, [
    { line: 5, reason: 'INVALID_FORMAT' },
    { line: 7, reason: 'DUPLICATE_IN_FILE' },
  ])
}

{
  /*
    **머리글은 이름으로 찾는다 — 순서도 개수도 안 따진다.**

    한때 `이름,이메일` 두 열·그 순서만 받았다. 서버가 그것만 받았기 때문이다
    (`CSV_FORMAT_INVALID · "헤더는 '이름', '이메일' 두 열이어야 합니다"`).
    **서버가 넓어져서 같이 넓혔다**(29차 회신 Q1 · 2026-08-16 실측):

        번호,이메일,소속,이름 (CP949)  →  200
        이메일,이름           (UTF-8)  →  200

    사람들이 실제로 쓰는 파일이 그대로 올라간다.
  */
  const { entries, invalid } = parseRosterCsv(
    '번호,이메일,소속,이름\n1,dohyun@green.com,백엔드,한도현',
  )
  assert.deepStrictEqual(
    entries,
    [{ name: '한도현', email: 'dohyun@green.com' }],
    '열이 더 있어도 읽는다',
  )
  assert.deepStrictEqual(invalid, [])
}

{
  // 엑셀이 쉼표 뒤에 공백을 남기는 파일이 흔하다 — 머리글 칸도 trim 한다
  const { entries, invalid } = parseRosterCsv('이름, 이메일\n한도현, dohyun@green.com')
  assert.deepStrictEqual(entries, [{ name: '한도현', email: 'dohyun@green.com' }], '머리글 공백')
  assert.deepStrictEqual(invalid, [])
}

{
  // 두 열 중 하나라도 없으면 그 파일로는 아무것도 못 한다 — 서버도 400이다
  const { entries, invalid } = parseRosterCsv('이메일\ndohyun@green.com')
  assert.strictEqual(entries.length, 0, '이름 열이 없으면 파일 오류')
  assert.deepStrictEqual(invalid, [{ line: 1, reason: 'HEADER_NOT_FOUND' }])
}

{
  // 머리글이 없으면 **파일을 못 읽는다** — 행 오류가 아니라 파일 오류다
  const { entries, invalid } = parseRosterCsv('한도현,dohyun@green.com')
  assert.strictEqual(entries.length, 0)
  assert.deepStrictEqual(invalid, [{ line: 1, reason: 'HEADER_NOT_FOUND' }])
}

{
  // BOM 은 첫 열 이름을 가린다 — 떼고 읽는다(서버도 BOM 파일은 받는다)
  const { entries } = parseRosterCsv('\uFEFF이름,이메일\n한도현,dohyun@green.com')
  assert.deepStrictEqual(entries, [{ name: '한도현', email: 'dohyun@green.com' }], 'BOM')
}

{
  // 따옴표 안의 쉼표를 안 자른다 — 엑셀이 이름에 쉼표를 넣으면 그렇게 내보낸다
  const { entries } = parseRosterCsv('이름,이메일\n"한, 도현",dohyun@green.com')
  assert.deepStrictEqual(
    entries,
    [{ name: '한, 도현', email: 'dohyun@green.com' }],
    '따옴표 안 쉼표',
  )
}

{
  /*
    이름이 비면 **오류 행이다.**

    한때 이메일 앞부분(`dohyun`)으로 채워 유효로 셌다 — *"초대는 나가야 하고 이름은
    받는 사람이 고친다"* 가 근거였다. 그런데 **서버는 그 행 하나로 파일 전체를 거절한다**
    (`400 TRAINEE_NAME_INVALID · "5행의 이름을 입력해야 합니다"` — 실측).
    화면만 관대하면 `✓ 유효 2명`이라 해 놓고 아무도 안 들어간다.
  */
  const { entries, invalid } = parseRosterCsv('이름,이메일\n한도현,a@green.com\n,dohyun@green.com')
  assert.strictEqual(entries.length, 1, '이름 있는 행만 유효')
  assert.deepStrictEqual(invalid, [{ line: 3, reason: 'NAME_REQUIRED' }])
}

{
  // 따옴표로 감싼 값도 읽는다(엑셀이 그렇게 내보낸다)
  const { entries } = parseRosterCsv('"이름","이메일"\n"한도현","dohyun@green.com"')
  assert.deepStrictEqual(entries, [{ name: '한도현', email: 'dohyun@green.com' }])
}

// ── 직접 입력 ───────────────────────────────────────────────
// **줄 번호가 입력칸 번호와 같아야 한다.** 빈 행을 걸러낸 뒤의 인덱스를 쓰면
// 1행을 비우고 2행을 틀렸을 때 `1번째 줄 오류`라고 말한다 — 그 칸은 멀쩡한 빈 칸이다
assert.deepStrictEqual(
  checkRosterRows([
    { name: '', email: '' },
    { name: '박', email: '나쁜주소' },
  ]),
  [{ line: 2, reason: 'INVALID_FORMAT' }],
)

// 입력칸 사이 중복 — 안 잡으면 `유효 2명`이라 해 놓고 서버가 1명만 등록한다
assert.deepStrictEqual(
  checkRosterRows([
    { name: 'a', email: 'x@green.com' },
    { name: 'b', email: 'X@GREEN.COM' },
  ]),
  [{ line: 2, reason: 'DUPLICATE_IN_FILE' }],
  '대소문자를 가리지 않는다',
)

// 안 친 칸은 오류가 아니다 — 마지막 빈 줄은 늘 있다
assert.deepStrictEqual(checkRosterRows([{ name: '', email: '  ' }]), [])

// ── 반 편집 잠금(D30-②) ────────────────────────────────────
// **개강일 하루 전까지만** 열린다. 시작일 당일은 이미 시작한 것이라 잠긴다
assert.strictEqual(canEditClasses('2026-03-02', '2026-03-01'), true, '개강 전날 — 열림')
assert.strictEqual(canEditClasses('2026-03-02', '2026-03-02'), false, '개강 당일 — 잠김')
assert.strictEqual(canEditClasses('2026-03-02', '2026-07-16'), false, '개강 후 — 잠김')

// ── 담당 변경 정책(D38) ────────────────────────────────────
// 반 편집과 달리 **진행 중에도 바꿀 수 있다** — 대신 확인을 받는다(매니저 퇴사·교체)
const running = (startAt: string) => ({ status: 'RUNNING' as const, startAt })
assert.strictEqual(assignPolicy(running('2026-03-02'), '2026-03-01'), 'FREE', '개강 전')
assert.strictEqual(assignPolicy(running('2026-03-02'), '2026-03-02'), 'CONFIRM', '개강 당일')
assert.strictEqual(assignPolicy(running('2026-03-02'), '2026-07-16'), 'CONFIRM', '운영 중')
// 끝난 기수는 시작일과 무관하게 잠긴다 — 이력이다
assert.strictEqual(
  assignPolicy({ status: 'CLOSED', startAt: '2025-08-04' }, '2026-07-16'),
  'LOCKED',
)

// ── 정원 ────────────────────────────────────────────────────
const room = (size: number, capacity = 25) => ({
  capacity,
  size,
})

// 목업 레일의 `22 → 24 / 25 · 1자리 남음`이 이 계산이다
assert.deepStrictEqual(capacityPreview(room(22), 2), { next: 24, over: false, remaining: 1 })
assert.deepStrictEqual(capacityPreview(room(25), 0), { next: 25, over: false, remaining: 0 })
// **정원 초과를 막지 않는다** — 넘는다는 사실만 알린다(중도 합류·반 통폐합)
assert.deepStrictEqual(capacityPreview(room(24), 3), { next: 27, over: true, remaining: -2 })

/*
  ⚠ `needsManager` 검사를 뺐다 — **서버가 판정해 준다**(`ClassroomResponse
  .managerAssignmentRequired`). 목일 때는 `managerId === null`과 1:1이라 화면이 셌는데,
  실제로는 반 하나에 매니저가 **여럿**일 수 있어 그 등가가 성립하지 않는다.
*/

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

// ── 반 이름 — **「반」은 화면이 붙인다** ──────────────────────────
{
  /*
    입력칸 자리표시자가 `K반`이던 동안 사용자가 그 글자를 같이 쳤다. 빠뜨리면 `A`라는
    반이 생겨 목록에서 혼자 다른 모양이 된다. **저장값은 `A반` 그대로**이고 입력만
    `A`로 받는다 — 서버 계약도 다른 화면(매니저·교육생)도 안 건드린다.
  */
  assert.strictEqual(classroomName('A'), 'A반')
  assert.strictEqual(classroomName(' B '), 'B반', '앞뒤 공백')
  assert.strictEqual(classroomName('1'), '1반', '숫자도 같다')
  assert.strictEqual(classroomName('심화'), '심화반', '한 글자가 아니어도')
  // 이미 붙어 있으면 그대로 — 안 그러면 `A반반`이 된다
  assert.strictEqual(classroomName('A반'), 'A반')
  assert.strictEqual(classroomName(''), '', '빈 값은 빈 값이다(제출은 다른 데서 막는다)')
}

{
  /*
    **업로드 상한은 계산값이다 — 눈으로 적은 숫자가 아니다.**

    앞단(Lambda Function URL)이 요청 6,291,456바이트에서 자르고, 바이너리 본문을
    base64로 감싸므로(×4/3) 실을 수 있는 바이트는 그 3/4다. 거기서 multipart
    경계·헤더·파일명 몫을 뺀다.

    실측(이분 탐색 · 2026-08-16 · 짧은 파일명):

        4,715,625 B  →  통과        4,717,187 B  →  413

    **상한이 이 사이에 있어야 한다.** 위로 새면 사용자가 413을 보고, 너무 아래로
    내리면 올릴 수 있는 파일을 막는다. 사람이 보는 문구(`MAX_UPLOAD_LABEL`)도 같은
    값에서 나오므로 둘이 어긋날 수 없다.
  */
  assert.ok(MAX_UPLOAD_BYTES < 4_717_187, '상한이 실측 차단선을 넘으면 사용자가 413을 본다')
  assert.ok(MAX_UPLOAD_BYTES > 4_600_000, '너무 낮으면 올릴 수 있는 파일을 막는다')
  assert.strictEqual(MAX_UPLOAD_LABEL, '4.5MB', '문구도 같은 값에서 나온다')
}
