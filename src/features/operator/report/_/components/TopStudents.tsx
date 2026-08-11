import { useState } from 'react'
import { StarIcon } from 'lucide-react'
import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/Pagination'
import { getPageRange } from '@/components/ui/paginationRange'
import type { TopStudent } from '../api/types'
import { TOP_STUDENTS_PAGE_SIZE } from '../rules'
import ReportToolbar, { ToolbarSelect } from './ReportToolbar'

/** Select는 빈 문자열을 값으로 못 쓴다 — "전체"에 실제 값을 준다 */
const ALL = '__all__'

/**
 * 우수 횟수를 **초록 농도**로 바꾼다. 많이 든 사람일수록 진하다.
 *
 * 눈금은 `우수 횟수 / 전체 회차`라는 **실제 값의 연속 사상**이지, "몇 회부터 최상위"
 * 같은 컷이 아니다 — 그래서 화면이 기준을 만들지 않는다는 규칙(E8)에 안 걸린다.
 * 단계를 셋으로 끊은 건 색 차이가 눈에 보이게 하려는 것뿐이고, 정확한 값은 늘 옆에
 * 숫자로 같이 있다.
 */
function intensity(count: number, totalRounds: number) {
  const ratio = count / Math.max(totalRounds, 1)
  if (ratio >= 0.6) return 'bg-success'
  if (ratio >= 0.35) return 'bg-success/70'
  return 'bg-success/40'
}

/**
 * 회차 눈금 — 1회차부터 마지막까지 칸을 늘어놓고 **우수였던 회차만 칠한다.**
 *
 * 전에는 `1 · 2 · 3 · 5 · 6차`라는 글자였다. 글자는 사람끼리 비교가 안 된다 — 두
 * 사람의 문자열을 눈으로 파싱해야 "누가 더 꾸준했나"를 알 수 있었다. 칸을 고정
 * 위치에 두면 **칠해진 칸 수가 곧 우수 횟수**이고 **칠해진 위치가 곧 시점**이라,
 * 한 열에서 두 가지를 동시에 읽는다.
 *
 * **칸 안의 숫자는 뺐다.** 24행 × 6칸이면 숫자 144개가 표에 흩뿌려져 정작 봐야 할
 * 색 패턴을 덮었다(사용자 지적: *"정신이 좀 없다"*). 회차 번호는 **열 머리글에 한 줄만**
 * 두고 같은 폭으로 정렬한다 — 어느 칸이 몇 차인지는 위를 한 번 보면 되고, 그 다음부터는
 * 색만 훑으면 된다.
 */
function RoundMarks({
  rounds,
  totalRounds,
  count,
}: {
  rounds: number[]
  totalRounds: number
  count: number
}) {
  const hit = new Set(rounds)
  const fill = intensity(count, totalRounds)
  return (
    // 칸이 열 폭을 나눠 가지므로 **모든 행에서 같은 회차가 같은 x 위치**에 온다 —
    // 그래야 위아래로 훑으며 "누가 후반에 올라왔나"를 읽을 수 있다.
    <span className="flex max-w-[420px] items-center gap-1" aria-label={`${rounds.join(', ')}차`}>
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((n) => (
        <span
          key={n}
          aria-hidden="true"
          title={`${n}차`}
          className={`h-[18px] flex-1 rounded-sm ${hit.has(n) ? fill : 'bg-surface-2 border-border border'}`}
        />
      ))}
    </span>
  )
}

function StudentRows({ students, totalRounds }: { students: TopStudent[]; totalRounds: number }) {
  return (
    <>
      {students.map((s, i) => (
        <TableRow
          key={s.id}
          /*
            우수 횟수가 바뀌는 자리에만 굵은 선을 넣는다 — 명단이 횟수 내림차순이라
            이 선이 곧 등급 경계다. "상위 N명" 같은 화면이 지어낸 컷이 아니라 값이
            바뀌는 지점이라 E8에 걸리지 않는다.
          */
          className={
            i > 0 && students[i - 1].miniTopCount !== s.miniTopCount
              ? 'border-border-strong border-t'
              : undefined
          }
        >
          <TableCell className="font-semibold">{s.name}</TableCell>
          {/* 반을 이름 옆 첨자에서 열로 올렸다 — 열이면 세로로 훑으며 "어느 반에 몰렸나"가 보인다 */}
          <TableCell className="text-fg-muted text-xs">{s.className}</TableCell>
          <TableCell>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold text-white ${intensity(
                s.miniTopCount,
                totalRounds,
              )}`}
            >
              <StarIcon className="size-3" fill="currentColor" strokeWidth={0} />
              {s.miniTopCount}회
            </span>
          </TableCell>
          <TableCell>
            <RoundMarks rounds={s.miniTopRounds} totalRounds={totalRounds} count={s.miniTopCount} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function StudentsTableHead({ totalRounds }: { totalRounds: number }) {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[180px]">교육생</TableHead>
        <TableHead className="w-[80px]">반</TableHead>
        <TableHead className="w-[104px]">우수 횟수</TableHead>
        <TableHead>
          우수한 회차
          {/* 아래 칸들과 같은 폭·같은 간격이라 번호가 칸 위에 정확히 선다 */}
          <span className="mt-1 flex max-w-[420px] items-center gap-1 font-normal">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((n) => (
              <span key={n} className="text-fg-subtle flex-1 text-center text-2xs tabular-nums">
                {n}
              </span>
            ))}
          </span>
        </TableHead>
      </TableRow>
    </TableHeader>
  )
}

/**
 * 우수 교육생 — 명단 + 내보내기. **컷을 두지 않는다**(잘라 보여주면 그 컷이 만든
 * 임계값이 된다, E8) — 대신 페이지네이션. 41명(기획 예시)은 회차×반마다 1~2명이
 * 쌓인 결과라 미리 정한 상한이 아니다. CSV 내보내기는 헤더(ReportHead)에 있다 —
 * `exportTopStudentsCsv`(labels.ts)를 부른다.
 *
 * ⚠ "빅프로젝트 최저 도달" 열이 있었으나 빅프로젝트가 제품에서 빠지면서(사용자
 * 결정) 삭제됐다 — 이 명단은 원래도 순수 미프 판정(9-3)이라 그 열 하나만 없어질
 * 뿐 나머지 로직은 그대로다.
 *
 * **화면용(페이지네이션)과 인쇄용(전체) 표가 따로 있다.** 정의서 §6 "PDF에는
 * 페이지네이션 없이 전부 들어간다"를 지키려면 인쇄 시점에 현재 페이지만
 * DOM에 있으면 안 된다 — 두 표를 같이 두고 `print:` 변형으로 화면/인쇄를 가른다.
 */
export default function TopStudents({
  students,
  totalRounds,
}: {
  students: TopStudent[]
  totalRounds: number
}) {
  const [page, setPage] = useState(1)
  const [cls, setCls] = useState(ALL)
  const [round, setRound] = useState(ALL)

  /*
    **화면에서만 거른다.** 인쇄용 표(아래 `print:block`)와 CSV는 늘 전체 명단이다 —
    발행된 문서의 내용이 화면 조작에 따라 달라지면 "값이 얼어 있는 문서"(§4)가 아니다.
    거른 상태는 툴바가 말로 남긴다.
  */
  const shown = students.filter(
    (s) =>
      (cls === ALL || s.className === cls) &&
      (round === ALL || s.miniTopRounds.includes(Number(round))),
  )

  /** 반 목록은 명단에 실제로 있는 반만 — 없는 반을 고르면 빈 표가 나온다 */
  const classNames = [...new Set(students.map((s) => s.className))].sort()

  const totalPages = Math.max(1, Math.ceil(shown.length / TOP_STUDENTS_PAGE_SIZE))
  // 필터로 목록이 짧아지면 지금 페이지가 범위 밖일 수 있다 — 마지막 페이지로 당긴다
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * TOP_STUDENTS_PAGE_SIZE
  const pageItems = shown.slice(start, start + TOP_STUDENTS_PAGE_SIZE)

  const filtered = cls !== ALL || round !== ALL

  return (
    <div>
      {students.length === 0 ? (
        // 「없음」(다 봤고 0건) — 아무도 반 상위 1~2명에 못 들었다는 것도 사실이다
        <Empty variant="empty">
          <EmptyHeader>
            <EmptyTitle>이번 기수엔 우수 교육생이 없습니다</EmptyTitle>
            <EmptyDescription>
              회차마다 반 상위 1~2명을 표시하는데, 아무도 들지 못했습니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <ReportToolbar
            note={
              filtered
                ? `${students.length}명 중 ${shown.length}명만 보고 있습니다 · PDF·CSV에는 전체가 들어갑니다`
                : undefined
            }
          >
            <ToolbarSelect
              label="반"
              value={cls}
              onChange={(v) => {
                setCls(v)
                setPage(1)
              }}
              options={[
                { value: ALL, label: `전체 ${classNames.length}개` },
                ...classNames.map((c) => ({ value: c, label: c })),
              ]}
            />
            <ToolbarSelect
              label="회차"
              value={round}
              onChange={(v) => {
                setRound(v)
                setPage(1)
              }}
              options={[
                { value: ALL, label: `전체 ${totalRounds}회` },
                ...Array.from({ length: totalRounds }, (_, i) => `${i + 1}`).map((n) => ({
                  value: n,
                  label: `${n}차 우수`,
                })),
              ]}
            />
          </ReportToolbar>

          <TableFrame className="print:hidden">
            <Table className="table-fixed rounded-none border-0">
              <StudentsTableHead totalRounds={totalRounds} />
              <TableBody>
                <StudentRows students={pageItems} totalRounds={totalRounds} />
              </TableBody>
            </Table>

            {/*
              범위(좌) + 페이저(중앙), 오른쪽은 비운다(E3). 페이지가 하나면 화살표를
              그리지 않는다(E7) — `admin/_/components/TableFooterBar.tsx`와 같은 패턴이다
              (도메인 경계상 import는 못 하지만 구조는 그대로 따른다).
            */}
            <div className="border-border grid grid-cols-3 items-center border-t p-3">
              <p className="text-fg-subtle text-xs whitespace-nowrap">
                {`${start + 1}–${start + pageItems.length} / ${shown.length}명`}
              </p>
              <Pagination>
                <PaginationContent>
                  {totalPages > 1 && (
                    <PaginationItem>
                      <PaginationPrevious
                        text="이전"
                        href="#"
                        aria-disabled={safePage === 1}
                        className={safePage === 1 ? 'pointer-events-none opacity-40' : undefined}
                        onClick={(e) => {
                          e.preventDefault()
                          if (safePage > 1) setPage(safePage - 1)
                        }}
                      />
                    </PaginationItem>
                  )}
                  {getPageRange(safePage, totalPages).map((p, i) =>
                    p === '…' ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === safePage}
                          onClick={(e) => {
                            e.preventDefault()
                            setPage(p)
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  {totalPages > 1 && (
                    <PaginationItem>
                      <PaginationNext
                        text="다음"
                        href="#"
                        aria-disabled={safePage === totalPages}
                        className={
                          safePage === totalPages ? 'pointer-events-none opacity-40' : undefined
                        }
                        onClick={(e) => {
                          e.preventDefault()
                          if (safePage < totalPages) setPage(safePage + 1)
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
              <div />
            </div>
          </TableFrame>

          {/* 인쇄 전용 — 전체 {students.length}명, 페이지네이션 없이 */}
          <Table className="hidden table-fixed rounded-none border-0 print:block">
            <StudentsTableHead totalRounds={totalRounds} />
            <TableBody>
              <StudentRows students={students} totalRounds={totalRounds} />
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}
