import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { SearchIcon, XIcon } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/InputGroup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import {
  TRAINEES,
  ROUND_OPTIONS,
  ROUND_CONCEPTS,
  countLowLevels,
  aceSummary,
  type AccountStatus,
  type RoundId,
  type RoundRecord,
  type RoundBadgeKind,
  type TraineeRow,
} from './mockData'
import { AccountStatusBadge } from './components/AccountStatusBadge'
import { RoundBadge } from './components/RoundBadge'
import { maskEmail } from '@/lib/utils/mask'
import { cn } from '@/lib/utils/cn'

/*
  MG-05 교육생 명부 — 목업 API 연동 없이 고정 배열(mockData)을 화면에서 직접
  검색·필터·정렬한다. 실 연동 시 이 필터 로직은 쿼리 파라미터로 옮겨간다.

  회차별 개념 도달·위험/우수 배지·우수 누적은 v1(SC-M11 · "찾아서 상세로 가는
  통로")에는 없었다 — v2 상세(MG-06)가 타임라인 하나로 얇아지며 명부가 고유 가치
  (우수 프로필·팀 배치 판단)를 져야 해서 들어왔다(MG-05 §4). 팀·제출 현황은 여전히
  없다 — MG-08 소관.
*/

const ACCOUNT_OPTIONS: { value: 'ALL' | AccountStatus; label: string }[] = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'ALL', label: '전체' },
  { value: 'INVITED', label: '초대 대기' },
  { value: 'INACTIVE', label: '비활성' },
]
const ACCOUNT_ITEMS = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, `계정 · ${o.label}`]))
const ACCOUNT_LABEL = Object.fromEntries(ACCOUNT_OPTIONS.map((o) => [o.value, o.label]))

const ROUND_ITEMS = Object.fromEntries(ROUND_OPTIONS.map((o) => [o.value, `회차 · ${o.label}`]))

const SORT_OPTIONS = [
  { value: 'NAME', label: '이름' },
  { value: 'CLASS', label: '반' },
  { value: 'ACE_COUNT', label: '우수 누적' },
  { value: 'LOW_COUNT', label: '2단 이하' },
] as const
const SORT_ITEMS = Object.fromEntries(SORT_OPTIONS.map((o) => [o.value, `정렬 · ${o.label}`]))

/** 도달 단계 배경색(0~4단) — MG-02 히트맵과 같은 5단 스케일. 0·4단은 배경이 진해 흰 글자 */
const REACH_STYLE: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-reach-0 text-white',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

/** 문항 없음(코드에 그 개념이 없어 못 물었다) 해치 무늬 — 회색 두 톤 반복 대각선 */
const NA_PATTERN = {
  background:
    'repeating-linear-gradient(45deg, var(--color-reach-na-bg), var(--color-reach-na-bg) 4px, var(--color-border) 4px, var(--color-border) 8px)',
}

/** 그 회차 배지 종류 — 응시상태 3종은 record.status를, ATTENDED는 record.badge를 그대로 쓴다 */
function roundBadgeKind(record: RoundRecord | undefined): RoundBadgeKind | null {
  if (!record) return null
  if (record.status !== 'ATTENDED') return record.status
  return record.badge ?? null
}

function ConceptReachCell({ round, record }: { round: RoundId; record: RoundRecord | undefined }) {
  if (!record || record.status !== 'ATTENDED') {
    return <span className="text-fg-subtle">아직 없음</span>
  }
  const concepts = ROUND_CONCEPTS[round]
  return (
    <span className="flex gap-[3px]">
      {record.levels.map((level, i) =>
        level === null ? (
          <span
            key={i}
            title={concepts[i]}
            style={NA_PATTERN}
            className="text-fg-subtle flex h-[22px] w-[26px] items-center justify-center rounded-[4px] text-2xs"
          >
            ―
          </span>
        ) : (
          <span
            key={i}
            title={concepts[i]}
            className={cn(
              'flex h-[22px] w-[26px] items-center justify-center rounded-[4px] text-2xs font-bold tabular-nums',
              REACH_STYLE[level],
            )}
          >
            {level}
          </span>
        ),
      )}
    </span>
  )
}

/** 우수 누적 칸 — 그 회차 응시상태 3종이면 특이 문구가 우선한다(와이어프레임 prof) */
function AceOrNoteCell({
  trainee,
  record,
}: {
  trainee: TraineeRow
  record: RoundRecord | undefined
}) {
  if (record?.status === 'INVALID') {
    return <span className="text-fg-subtle">이번 회차 채점하지 않음</span>
  }
  if (record?.status === 'ABSENT') {
    return <span className="text-fg-subtle">응시 창을 놓침</span>
  }
  if (record?.status === 'DROPPED') {
    return <span className="text-fg-subtle">{record.note}</span>
  }
  const ace = aceSummary(trainee)
  if (ace.count === 0) {
    return <span className="text-fg-subtle">—</span>
  }
  return (
    <span>
      <b className="text-success font-bold">우수 {ace.count}회</b>
      <span className="text-fg-subtle"> · {ace.rounds.join('·')}차</span>
    </span>
  )
}

export default function TraineeListScreen() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [accountFilter, setAccountFilter] = useState<'ALL' | AccountStatus>('ACTIVE')
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]['value']>('NAME')
  const [round, setRound] = useState<RoundId>(ROUND_OPTIONS[ROUND_OPTIONS.length - 1].value)

  const classOptions = useMemo(
    () => Array.from(new Set(TRAINEES.map((t) => t.className))).sort(),
    [],
  )
  const classItems = useMemo(() => {
    const items: Record<string, string> = { ALL: '반 · 전체' }
    for (const c of classOptions) items[c] = `반 · ${c}`
    return items
  }, [classOptions])

  // 헤더 브레이크다운은 전체 모집단 기준 — 계정 필터를 바꿔도 안 바뀐다(범위 개수와 다른 값)
  const accountCounts = useMemo(() => {
    const counts: Record<AccountStatus, number> = { ACTIVE: 0, INVITED: 0, INACTIVE: 0 }
    for (const t of TRAINEES) counts[t.accountStatus]++
    return counts
  }, [])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = TRAINEES.filter((t) => {
      // 검색은 원본 이메일 기준 매칭 — 표시만 가리고(마스킹) 매니저가 이메일로
      // 찾는 실무 동작은 막지 않는다.
      if (q && !`${t.name} ${t.email}`.toLowerCase().includes(q)) return false
      if (classFilter !== 'ALL' && t.className !== classFilter) return false
      if (accountFilter !== 'ALL' && t.accountStatus !== accountFilter) return false
      return true
    })
    // 미응시 등 그 회차 데이터가 없는 사람은 -1로 둬서 "많은 순"에서 항상 뒤로 밀린다.
    const lowCount = (t: TraineeRow) => {
      const r = t.rounds?.[round]
      return r?.status === 'ATTENDED' ? countLowLevels(r.levels) : -1
    }
    return filtered.sort((a, b) => {
      if (sort === 'CLASS') {
        return a.className.localeCompare(b.className, 'en') || a.name.localeCompare(b.name, 'ko')
      }
      if (sort === 'ACE_COUNT') {
        return aceSummary(b).count - aceSummary(a).count || a.name.localeCompare(b.name, 'ko')
      }
      if (sort === 'LOW_COUNT') {
        return lowCount(b) - lowCount(a) || a.name.localeCompare(b.name, 'ko')
      }
      return a.name.localeCompare(b.name, 'ko')
    })
  }, [search, classFilter, accountFilter, sort, round])

  // #noroster — 반에 배정된 교육생이 아예 0명(기수 세팅 중). 명단은 오퍼레이터가
  // 등록하므로 생성 유도를 넣지 않는다(F6). #noresult(검색·필터로 0건)와는 원인이
  // 달라 문구를 분리한다 — 하나로 묶으면 매니저가 무엇을 기다려야 하는지 모른다.
  const isRosterEmpty = TRAINEES.length === 0

  return (
    <ConsoleShell role="manager">
      <PageHeader
        breadcrumb="교육생 › 7기 › 담당 반"
        title="교육생"
        count={`${TRAINEES.length}명`}
        breakdown={
          <>
            활성 <b className="text-fg font-bold">{accountCounts.ACTIVE}</b>
            <span className="text-fg-subtle">
              {' '}
              · 초대 대기 <b className="text-fg font-bold">{accountCounts.INVITED}</b> · 비활성{' '}
              <b className="text-fg font-bold">{accountCounts.INACTIVE}</b>
            </span>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={round}
          onValueChange={(v) => setRound((v as RoundId) ?? round)}
          items={ROUND_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-32 text-sm font-semibold" aria-label="회차 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROUND_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                회차 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <InputGroup className="h-9 w-60">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 · 이메일 검색"
            aria-label="교육생 검색"
          />
          {search && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                aria-label="검색어 지우기"
                onClick={() => setSearch('')}
              >
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>

        <Select
          value={classFilter}
          onValueChange={(v) => setClassFilter(v ?? 'ALL')}
          items={classItems}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="반 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">반 · 전체</SelectItem>
            {classOptions.map((c) => (
              <SelectItem key={c} value={c}>
                반 · {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={accountFilter}
          onValueChange={(v) => setAccountFilter(v as typeof accountFilter)}
          items={ACCOUNT_ITEMS}
        >
          <SelectTrigger className="h-9 min-w-32" aria-label="계정 필터">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                계정 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)} items={SORT_ITEMS}>
          <SelectTrigger className="h-9 min-w-32" aria-label="정렬">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                정렬 · {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isRosterEmpty ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>이 반에 등록된 교육생이 없습니다</EmptyTitle>
            <EmptyDescription>
              기수 명단과 반 배정이 끝나면 여기에 나타납니다.
              <br />
              명단은 <b className="text-fg-muted">오퍼레이터가 등록</b>합니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              {search ? `"${search}"와 맞는 사람이 없습니다` : '조건에 맞는 교육생이 없습니다'}
            </EmptyTitle>
            <EmptyDescription>
              담당 반 {classOptions.length}개 · {TRAINEES.length}명에서 찾았습니다.
              {accountFilter !== 'ALL' && (
                <>
                  <br />
                  계정 필터가 <b className="text-fg-muted">{ACCOUNT_LABEL[accountFilter]}</b>으로
                  걸려 있어요 — 초대 대기나 비활성일 수 있습니다.
                </>
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TableFrame>
            <Table className="table-fixed border-0 bg-transparent rounded-none">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-64">교육생</TableHead>
                  <TableHead className="w-36">개념 3건 도달</TableHead>
                  <TableHead className="w-24">2단 이하</TableHead>
                  <TableHead className="w-28 text-center">이번 회차</TableHead>
                  <TableHead className="w-64 pl-8">우수 누적</TableHead>
                  <TableHead className="w-28">계정</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const record = t.rounds?.[round]
                  const low = record?.status === 'ATTENDED' ? countLowLevels(record.levels) : null
                  const hot = low !== null && low >= 2
                  return (
                    <TableRow
                      key={t.id}
                      className="hover:bg-surface-2 cursor-pointer"
                      onClick={() => navigate(`/manager/trainees/${t.id}`)}
                    >
                      <TableCell className="w-64">
                        <div className="flex items-center gap-3">
                          <Avatar aria-hidden="true">
                            <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                              {t.name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="flex items-center gap-1.5">
                              <Link
                                to={`/manager/trainees/${t.id}`}
                                aria-label={`${t.name} 상세 보기`}
                                className="text-fg hover:text-primary font-semibold hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {t.name}
                              </Link>
                              <span className="text-fg-subtle text-2xs">{t.className}</span>
                            </span>
                            <p className="text-fg-subtle text-2xs">{maskEmail(t.email)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-36 text-xs">
                        <ConceptReachCell round={round} record={record} />
                      </TableCell>
                      <TableCell className="w-24 text-xs tabular-nums">
                        {low === null ? (
                          <span className="text-fg-subtle">—</span>
                        ) : (
                          <span className={hot ? 'text-warning' : 'text-fg-muted'}>
                            <b className={cn('font-bold', hot ? 'text-warning' : 'text-fg')}>
                              {low}
                            </b>
                            /3
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-28 text-center">
                        <RoundBadge kind={roundBadgeKind(record)} />
                      </TableCell>
                      <TableCell className="w-64 pl-8 text-xs">
                        <AceOrNoteCell trainee={t} record={record} />
                      </TableCell>
                      <TableCell className="w-28">
                        <AccountStatusBadge status={t.accountStatus} />
                        {t.accountStatus === 'INACTIVE' && t.inactiveReason && (
                          <p className="text-fg-subtle mt-0.5 text-2xs">
                            {t.inactiveReason} · {t.inactiveAt}
                          </p>
                        )}
                      </TableCell>
                      <TableCell aria-hidden="true" className="w-8 text-fg-subtle text-right">
                        ›
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableFrame>

          <div className="mt-3 grid grid-cols-3 items-center">
            <p className="text-fg-subtle text-xs">{`${rows.length}개 중 1–${rows.length}`}</p>
            <div className="flex justify-center">
              <Pagination className="mx-0 w-auto">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink isActive aria-label="1쪽">
                      1
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
            <div />
          </div>
        </>
      )}
    </ConsoleShell>
  )
}
