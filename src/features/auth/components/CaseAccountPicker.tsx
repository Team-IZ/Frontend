import { SearchIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { CASE_ACCOUNT_GROUPS, ROLES, type CaseAccount, type Role } from '../quickLoginAccounts'

/*
  dev 전용 계정 고르개.

  ## 무엇이 달라졌나 — **여섯 명이 아니라 수백 명이 본다**

  종전 구조는 팀원 여섯이 *자기 담당 계정*을 찾는 자리였다(`owner` 필터 · 케이스 13개
  격자 · 접힌 목록). 그 전제가 바뀌었다. 시연에서 이 화면을 수백 명이 동시에 연다.

  그때 종전 구조는 **한 계정으로 몰린다.** 위에 크게 놓인 역할 버튼 넷이 곧바로
  로그인시키고, 270명 명부는 접혀 있어 아무도 안 연다. 결국 전원이 같은 `t001`로
  들어가 같은 세션을 밀어 댄다.

  ## 그래서 두 가지를 바꿨다

  **① 역할을 「로그인」이 아니라 「갈림길」로.** 역할을 누르면 들어가지지 않고 아래
  목록이 바뀐다. 누를 수 있는 공용 계정이 화면에서 사라지므로 몰릴 대상이 없다.

  **② 교육생은 반 → 이름으로 좁힌다.** 각자 **자기 이름**을 고르면 252명이 252개로
  자연히 흩어진다. 배정표도, 서버 조율도 필요 없다 — 이름이 곧 배정이다.

  ## 왜 `owner` 필터를 뺐나

  지금 데이터에 `owner`가 하나도 없다(`owners: []`). 팀 배정은 엑셀에서 끊겼고, 화면만
  빈 필터 줄을 그리고 있었다. 다시 배정이 생기면 역할 탭 옆에 되살리면 된다.
*/

/** 한 사람. `groups`가 복수인 이유는 아래 dedupe 주석에 있다 */
type Row = Omit<CaseAccount, 'className'> & { role: Role; groups: string[] }

const roleOf = (group: string, note: string | null): Role =>
  group === '슈퍼 어드민'
    ? '슈퍼 어드민'
    : group === '오퍼레이터'
      ? '오퍼레이터'
      : /매니저/.test(note ?? '')
        ? '매니저'
        : '교육생'

/*
  ## 같은 사람이 여러 그룹에 들어 있다 — **이메일로 합친다**

  🔴 매니저 셋이 두 반을 겸한다(박지현 A·F · 이도윤 B·D · 강민서 E·G). 엑셀이 반마다
  한 줄씩 적어 오므로 **같은 이메일이 두 그룹에 나온다** — 270행인데 사람은 267명이다.

  합치지 않고 그대로 그리면 그 셋이 목록에 두 번 나오고, `key`가 겹쳐 React가
  *"두 자식이 같은 키를 씁니다 — 중복되거나 누락될 수 있습니다"* 를 던진다. 실제로
  탭을 오갈 때마다 카드가 **세 개씩 쌓였다**(실측: 10 → 28 → 31 → 34).

  그래서 이메일로 묶고 담당 반을 배열로 모은다. 화면에는 `A반 · F반`으로 한 줄에 나온다.
*/
const ALL_ROWS: Row[] = Object.values(
  CASE_ACCOUNT_GROUPS.reduce<Record<string, Row>>((acc, g) => {
    for (const a of g.accounts) {
      const prev = acc[a.email]
      if (prev) {
        prev.groups.push(g.label)
        continue
      }
      acc[a.email] = {
        email: a.email,
        password: a.password,
        name: a.name,
        teamName: a.teamName,
        note: a.note,
        owner: a.owner,
        groups: [g.label],
        role: roleOf(g.label, a.note),
      }
    }
    return acc
  }, {}),
)

const countOf = (role: Role) => ALL_ROWS.filter((r) => r.role === role).length

/*
  매니저를 **화면에 보여줄 것이 많은 순**으로 세우는 데 쓴다.

  매니저 화면(대시보드·히트맵)은 담당 반에 데이터가 없으면 빈 화면이다. 시연에서
  아무나 골라 들어가면 그 빈 화면을 보여주게 된다.

  ## 응시 인원이 아니라 화면에 실제로 차는 것으로 잰다

  🔴 처음엔 4차 응시자 수로 세웠는데 **틀렸다.** `강민서`(E·G반)는 응시 50명으로 1위인데
  **4차 히트맵이 개념 0개·빈 격자**다. 응시했다고 히트맵이 차는 것이 아니다.

  그래서 두 화면의 실제 응답을 재서 넣는다.

  ```
  inbox  GET /cohorts/{7기}/analytics/signals            → signals[] 길이
  heat   GET /cohorts/{7기}/analytics/heatmap            → concepts[] 길이
         (projectId·assessmentRoundId = 미프 4차, level=CLASS)
  ```

  히트맵을 4차로 재는 이유는 **그 화면이 4차를 기본으로 열기** 때문이다
  (`heatmap/_/api/api.ts`의 `currentRound()` — `OPEN` 중 마지막). 로그인 직후 보이는
  것이 그 회차라 그것으로 재야 맞다.

  ⚠️ **로그인 전에는 이 값을 물어볼 수 없다**(두 API 모두 인증을 요구한다). 2026-08-25
  실측값을 적어 둔다 — 회차가 넘어가면 위 두 요청을 다시 돌려 갱신한다. 틀려도 순서만
  어긋나고 로그인 자체에는 영향이 없다.
*/
const MANAGER_DATA: Record<string, { inbox: number; heat: number }> = {
  이도윤: { inbox: 96, heat: 5 },
  임하늘: { inbox: 49, heat: 5 },
  박지현: { inbox: 97, heat: 4 },
  최유진: { inbox: 48, heat: 3 },
  조은비: { inbox: 49, heat: 1 },
  강민서: { inbox: 100, heat: 0 },
  윤서준: { inbox: 49, heat: 0 },
}

/**
 * 정렬 점수 — **히트맵이 비면 인박스가 아무리 많아도 뒤로 보낸다.**
 *
 * 인박스는 담당 반 수에 거의 비례해(겸임이면 두 배) 변별력이 낮고, 히트맵은 비면
 * 시연 중에 "여긴 왜 아무것도 없죠"가 나온다. 그래서 히트맵에 가중치를 크게 준다.
 */
const dataScore = (name: string) => {
  const d = MANAGER_DATA[name]
  return d ? d.heat * 100 + d.inbox : -1
}

/** 교육생 반 목록 — 데이터 순서를 그대로 쓴다(A~J · 반 없음) */
const CLASSES = [...new Set(ALL_ROWS.filter((r) => r.role === '교육생').flatMap((r) => r.groups))]

export default function CaseAccountPicker({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (email: string, password: string) => void
}) {
  const [role, setRole] = useState<Role>(ROLES[0])
  const [klass, setKlass] = useState<string>(CLASSES[0] ?? '')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = ALL_ROWS.filter((r) => {
      if (r.role !== role) return false
      // 검색 중에는 반을 넘어 찾는다 — 자기 반을 모르는 사람이 이름만 치는 경우가 잦다
      if (role === '교육생' && !q && !r.groups.includes(klass)) return false
      if (!q) return true
      return `${r.name} ${r.groups.join(' ')} ${r.teamName} ${r.email}`.toLowerCase().includes(q)
    })
    /*
      매니저만 데이터 많은 순으로 세운다. 나머지 역할은 데이터 순서를 그대로 둔다 —
      교육생은 어차피 한 반 안이라 전원 같은 값이고, 이름 순서가 흔들리면 자기 이름을
      찾던 사람이 매번 다른 자리를 봐야 한다.
    */
    return role === '매니저'
      ? [...found].sort((a, b) => dataScore(b.name) - dataScore(a.name))
      : found
  }, [role, klass, query])

  if (ALL_ROWS.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-border bg-canvas p-2.5">
      {/*
        역할 탭 — **누르면 로그인되지 않는다.** 아래 목록이 바뀔 뿐이다.
        이 화면에서 공용 계정으로 몰리는 것을 막는 장치가 이것 하나다.
      */}
      <div role="tablist" aria-label="역할" className="flex flex-wrap gap-1">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={r === role}
            onClick={() => {
              setRole(r)
              setQuery('')
            }}
            className={cn(
              'rounded px-2.5 py-1 text-xs transition-colors',
              r === role
                ? 'bg-primary font-medium text-white'
                : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
            )}
          >
            {r} <span className={r === role ? 'opacity-70' : 'text-fg-subtle'}>{countOf(r)}</span>
          </button>
        ))}
      </div>

      {role === '교육생' && (
        <>
          {/* 반 → 이름. 252명을 한 목록에 두면 자기 이름을 못 찾는다 */}
          <div className="mt-2 flex flex-wrap gap-1 border-t border-border pt-2">
            {CLASSES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setKlass(c)
                  setQuery('')
                }}
                aria-current={c === klass && !query}
                className={cn(
                  'rounded px-2 py-1 text-xs transition-colors',
                  c === klass && !query
                    ? 'bg-primary-soft font-medium text-primary'
                    : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 이름을 아는 사람에게는 검색이 제일 빠르다 — 반을 몰라도 찾아진다 */}
      <div className="mt-2 flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-1.5">
        <SearchIcon aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={role === '교육생' ? '이름으로 찾기 (반 전체에서)' : '이름으로 찾기'}
          aria-label="계정 이름 검색"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-fg-subtle"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="shrink-0 text-[11px] text-fg-subtle hover:text-fg"
          >
            지우기
          </button>
        )}
      </div>

      {/*
        이름 격자 — 목록(1열)이 아니라 격자다. 25명이 1열이면 스크롤이 길어져
        자기 이름이 화면 밖에 있고, 그러면 맨 위 것을 그냥 누른다(= 다시 몰린다).
      */}
      <ul className="mt-1.5 grid max-h-[188px] grid-cols-2 gap-1 overflow-y-auto sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.email}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(r.email, r.password)}
              className="w-full rounded border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:border-primary-border hover:bg-primary-soft disabled:opacity-50"
            >
              <span className="block truncate text-xs font-medium text-fg">{r.name}</span>
              {/* 두 반을 겸하는 매니저는 `A반 · F반`으로 한 줄에 나온다(위 dedupe) */}
              <span className="block truncate text-[11px] text-fg-subtle">
                {[r.groups.join(' · '), r.teamName].filter(Boolean).join(' · ') ||
                  r.note ||
                  r.email}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* 「비어 있다」와 「고장났다」는 다르다 — 왜 없는지 말한다 */}
      {rows.length === 0 && (
        <p className="mt-2 text-[11px] text-fg-subtle">
          {query ? `「${query}」와 맞는 계정이 없어요.` : `${role} 계정이 없어요.`}
        </p>
      )}
    </div>
  )
}
