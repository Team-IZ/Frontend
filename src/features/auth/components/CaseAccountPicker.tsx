import { ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import {
  CASE_ACCOUNT_GROUPS,
  CASE_ACCOUNT_MEASURED_AT,
  CASE_ACCOUNT_TOTAL,
  type CaseAccount,
} from '../quickLoginAccounts'

/*
  dev 전용 — 교육생 **상태별** 테스트 계정 고르개.

  ## 왜 접어 두나
  계정이 수십 개다. 펼쳐 둔 채로 로그인 화면에 놓으면 원래 있어야 할 것(역할 버튼 넷,
  입력 칸)이 밀려 내려간다. 이 목록은 **찾을 때만 필요하다.**

  ## 왜 케이스를 먼저 고르나
  `미응시`만 백 명이 넘어 한 목록에 다 넣으면 찾을 수 없다. 케이스를 좁힌 뒤 그 안에서
  고른다 — 테스트할 때 아는 것은 계정 이름이 아니라 **"무엇을 보고 싶다"** 다.

  ## 왜 케이스마다 설명이 붙나
  백엔드가 엑셀 요약에 *"이 계정들로 무엇을 보나"* 를 적어 준다. 그것을 그대로 보여준다 —
  계정 목록만 있고 무엇을 확인하는 자리인지 모르면 고를 수가 없다.

  ## 왜 반·팀·이름·상태까지 보여주나
  같은 케이스 계정이 여러 개 있는 이유는 **소모되기 때문**이다(세션을 시작하면 그 계정은
  돌아오지 않는다). 어느 것을 이미 썼는지 알아보려면 식별이 되어야 하고, 같은 케이스
  안에서도 화면이 갈리는 계정(`문제 2개`/`3개`)은 **그 차이가 보여야 고를 수 있다.**

  ## 왜 잰 날짜를 말하나
  **상태에 유효기간이 있다.** 개인 응시 창은 분석 완료 뒤 24시간이라 `응시 가능` 계정
  아홉이 하루 만에 전부 `창 닫힘`이 됐다(실측). 날짜를 숨기면 라벨을 믿고 눌렀다가
  다른 화면을 보게 되고, 그때 화면을 의심하게 된다.
*/
export default function CaseAccountPicker({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (email: string, password: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [groupIndex, setGroupIndex] = useState(0)

  if (CASE_ACCOUNT_GROUPS.length === 0) return null

  const group = CASE_ACCOUNT_GROUPS[groupIndex]
  const measuredLabel = CASE_ACCOUNT_MEASURED_AT
    ? new Date(CASE_ACCOUNT_MEASURED_AT).toLocaleDateString('ko-KR', {
        month: 'numeric',
        day: 'numeric',
      })
    : null

  return (
    <div className="mt-2 rounded-md bg-canvas">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-[11px] text-fg-muted transition-colors hover:text-fg"
      >
        <ChevronRightIcon
          aria-hidden="true"
          className={cn('size-3 shrink-0 transition-transform', open && 'rotate-90')}
        />
        <span className="flex-1 text-left">
          교육생 케이스별 계정 <span className="text-fg-subtle">{CASE_ACCOUNT_TOTAL}개</span>
        </span>
        <span>{open ? '접기' : '펼치기'}</span>
      </button>

      {open && (
        <div className="border-t border-border px-3 pt-2 pb-3">
          {measuredLabel && (
            <p className="mb-2 text-[11px] text-fg-subtle">
              {measuredLabel} 기준 상태입니다 — 응시 창은 24시간이라 지나면 <b>창 닫힘</b>이 됩니다.
            </p>
          )}
          {/*
            케이스 고르개 — 라벨이 길어 두 칸 격자로 둔다. 고른 것은 채움으로 표시한다:
            테두리만으로 구분하면 어느 케이스를 보고 있는지 놓친다.
          */}
          <div className="grid grid-cols-2 gap-1">
            {CASE_ACCOUNT_GROUPS.map((g, i) => (
              <button
                key={g.label}
                type="button"
                onClick={() => setGroupIndex(i)}
                aria-current={i === groupIndex}
                className={cn(
                  'rounded px-2 py-1.5 text-left text-[11px] transition-colors',
                  i === groupIndex
                    ? 'bg-primary text-primary-fg'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {g.label}
                {/* 고른 수와 실제 수가 다르면 둘 다 말한다 — 「9개뿐인가」로 읽히지 않게 */}
                <span className={cn('ml-1', i === groupIndex ? 'opacity-80' : 'text-fg-subtle')}>
                  {g.accounts.length < g.total
                    ? `${g.accounts.length}/${g.total}`
                    : `${g.accounts.length}`}
                </span>
              </button>
            ))}
          </div>

          {/* 이 케이스로 무엇을 보는지 — 백엔드가 엑셀에 적어 준 문장 그대로 */}
          {group.hint && <p className="mt-2 text-[11px] text-fg-muted">{group.hint}</p>}

          {/* 목록이 길어도 화면을 밀지 않게 스스로 스크롤한다 */}
          <ul className="mt-1 max-h-[196px] overflow-y-auto">
            {group.accounts.map((a) => (
              <li key={a.email}>
                <AccountRow account={a} disabled={disabled} onPick={onPick} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function AccountRow({
  account,
  disabled,
  onPick,
}: {
  account: CaseAccount
  disabled?: boolean
  onPick: (email: string, password: string) => void
}) {
  const { email, password, name, className: klass, teamName, note } = account
  const where = [klass, teamName].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(email, password)}
      className="w-full rounded px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-surface-2 disabled:opacity-50"
    >
      <span className="flex items-baseline gap-2">
        <span className="w-[92px] shrink-0 text-fg">
          {where && <span className="text-fg-subtle">{where} </span>}
          {name}
        </span>
        {/* 이메일이 길어 줄바꿈되면 행 높이가 흔들린다 — 한 줄로 잘라 둔다 */}
        <span className="min-w-0 flex-1 truncate text-fg-subtle">{email}</span>
      </span>
      {/*
        이 계정만 다른 점은 **아랫줄로 내린다.** 상태 코드 세 개(`WAIT_FOR_REPORT ·
        INTERRUPTED · 도달 2단`)가 이름·이메일과 한 줄에 들어가면 목록이 가로로 넘쳐
        이메일이 잘려 사라진다 — 실제로 그렇게 됐다.
      */}
      {note && <span className="mt-0.5 block truncate text-fg-muted">{note}</span>}
    </button>
  )
}
