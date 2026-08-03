import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Spinner } from '@/components/ui/Spinner'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { cn } from '@/lib/utils/cn'
import { conceptsFixed, CONCEPT_COUNT, formatDue } from '../../rules'
import type { Project, ProjectStatusReport } from '../../types'

/*
  현황 탭 — **오퍼레이터에게 이 탭이 필요한 이유는 개념 공백 하나다.**
  팀 전반에서 같은 항목이 비면 다음 회차에 **항목을 교체할 사람이 오퍼레이터**다.

  ▸ **이 탭은 자기가 왜 비었는지를 스스로 말한다.** 정의서 §6은 개념 3건 전까지 탭을
    잠그라고 했지만, 잠긴 탭은 **왜 잠겼는지도 어떻게 열리는지도** 말하지 못한다(C1).
    비어 있는 이유가 셋이고 사용자가 할 일이 각각 다르다 — 02-layout §4의 3종 구분:

      개념 미확정   `없음`(실선) · 기다려도 안 채워진다 → **구성 탭으로 보낸다**
      제출 전       `아직`(점선) · 기다리면 채워진다   → **언제 채워지는지만** 쓴다
      조회 실패     `실패`        · **다시 시도**

  ▸ **개념 공백은 학생 문제가 아니다.** 고른 개념이 학생 코드에 없으면 그 개념은 물을
    수 없다 — 화면이 *"학생 문제가 아니라 개념 선택이 맞지 않았을 수 있다"* 고 말한다.
    학생을 탓하는 문구로 쓰면 오퍼레이터가 **엉뚱한 곳을 고친다**(OP-04 §6).
  ▸ **응시 분모는 제출이 아니라 분석 완료다** — 응시 창이 분석 후 열리므로 분석에
    실패한 학생은 응시 대상이 아니다. `20/23`의 23이 그 값이다.
  ▸ **없음과 0을 다르게 쓴다**(F3). 분석 실패 0건은 `—`이지 `0`이 아니다.
*/
type Props = {
  project: Project
  report: ProjectStatusReport | undefined
  loading: boolean
  failed: boolean
  onRetry: () => void
  /** 개념이 없으면 여기서 할 수 있는 일이 없다 — 구성 탭으로 보낸다 */
  onGoConfig: () => void
}

export default function StatusTab({
  project,
  report,
  loading,
  failed,
  onRetry,
  onGoConfig,
}: Props) {
  /*
    개념 미확정 — **`없음`이지 `아직`이 아니다.** 기다린다고 문항이 만들어지지 않고
    오퍼레이터가 개념을 정해야 하므로, 실선 + 액션이다(02-layout §4 유형 2).
  */
  if (!conceptsFixed(project.concepts.length)) {
    return (
      <Empty className="border-solid bg-surface">
        <EmptyHeader>
          <EmptyTitle>아직 집계할 것이 없습니다</EmptyTitle>
          <EmptyDescription>
            검증 개념 {CONCEPT_COUNT}건이 정해져야 학생에게 낼 문항이 만들어지고, 그때부터
            제출·분석·응시가 집계됩니다. 지금은 {project.concepts.length}건입니다.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={onGoConfig}>구성 탭에서 개념 정하기</Button>
      </Empty>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="현황을 불러오는 중" />
      </div>
    )
  }

  if (failed || !report) {
    return (
      <Empty className="bg-danger-soft border-solid">
        <EmptyHeader>
          <EmptyTitle>현황을 불러오지 못했습니다</EmptyTitle>
        </EmptyHeader>
        <Button variant="ghost" onClick={onRetry}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  /*
    **반이 없는 것과 제출이 없는 것은 다르다.** 빈 배열에 `every`는 참이라, 아래 분기가
    반 0개를 *"아직 제출한 학생이 없습니다"* 로 삼켰다 — 반 편성부터 안 된 기수인데
    학생을 기다리라고 말하는 셈이다(F3 · 없음과 0은 다르다).

    ⚠ 반 편성 전에 회차가 있을 수 있는지는 **기획에 없다.** 여기서 정하지 않고, 일어나면
    사실만 쓴다 — 다음 행동(반 만들기)은 OP-06 소관이라 링크도 걸지 않는다(C4).
  */
  if (report.classes.length === 0) {
    return (
      <Empty className="border-solid bg-surface">
        <EmptyHeader>
          <EmptyTitle>이 기수에 반이 없습니다</EmptyTitle>
          <EmptyDescription>
            반이 있어야 학생이 배정되고 제출이 시작됩니다. 운영 관리에서 반을 먼저 만드세요.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  /*
    개념은 정해졌는데 아직 아무도 안 냈다 — **`아직`이다.** 마감까지 기다리면 채워지므로
    액션이 없고, **언제 채워지는지**를 쓴다(유형 1 · 점선이 기본값).
  */
  if (report.classes.every((c) => c.submitted === 0)) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>아직 제출한 학생이 없습니다</EmptyTitle>
          <EmptyDescription>
            {project.dueAt
              ? `제출이 시작되면 반별 진행이 여기에 쌓입니다. 제출 마감은 ${formatDue(project.dueAt)}입니다.`
              : '제출 마감이 정해지지 않아 학생에게 아직 열리지 않았습니다 — 개요 탭에서 일정을 정하세요.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  /*
    팀 전원이 미매칭인 개념 — 이 탭이 존재하는 이유다.

    **`find`가 아니라 `filter`다.** 하나만 집으면 둘째 개념이 같이 비어도 화면에 안 나오고,
    오퍼레이터는 **하나만 고치면 되는 줄 안다.** 3건 중 2건이 비는 것은 실제로 생긴다 —
    교안과 과제가 어긋난 회차에서는 대체로 한 개만 빗나가지 않는다.
  */
  const gaps = report.matches.filter((m) => m.unmatchedTeams > 0)

  return (
    <div className="flex flex-col gap-4">
      {gaps.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>
            {gaps.length === 1
              ? `“${gaps[0].conceptName}”가 학생 코드에서 발견되지 않습니다`
              : `검증 개념 ${gaps.length}건이 학생 코드에서 발견되지 않습니다`}
          </AlertTitle>
          <AlertDescription>
            {/*
              개념이 둘 이상이면 **각각 몇 팀인지**를 줄로 나눈다. 한 문장에 몰면 어느
              숫자가 어느 개념 것인지 읽어내야 한다.
            */}
            {gaps.length > 1 && (
              <ul className="mb-1.5 flex flex-col gap-0.5">
                {gaps.map((g) => (
                  <li key={g.conceptId}>
                    <b className="text-fg-muted font-semibold">{g.conceptName}</b> —{' '}
                    {report.totalTeams}개 팀 중{' '}
                    <b className="font-semibold">{g.unmatchedTeams}개</b>
                  </li>
                ))}
              </ul>
            )}
            {gaps.length === 1 && (
              <>
                {report.totalTeams}개 팀 중{' '}
                <b className="text-fg-muted font-semibold">{gaps[0].unmatchedTeams}개</b>
                입니다.{' '}
              </>
            )}
            학생 문제가 아니라 개념 선택이 이 프로젝트와 맞지 않았을 수 있습니다.{' '}
            {/*
              **몇 문제로 진행되는지는 공백이 하나일 때만 셀 수 있다**(A4).
              둘 이상이면 미매칭 팀이 서로 다르고(12개 팀 · 31개 팀) 겹치는지 아닌지가
              이 응답에 없다 — 어떤 팀은 하나만, 어떤 팀은 둘 다 빠진다. `3 - 공백 수`로
              쓰면 **모든 팀이 전부 놓쳤다고 주장**하는 셈이다.
            */}
            {gaps.length === 1 ? (
              <>
                해당 학생은{' '}
                <b className="text-fg-muted font-semibold">{report.matches.length - 1}문제</b>로
                진행됩니다.
              </>
            ) : (
              <>해당 팀의 학생은 매칭된 개념의 문항만 받습니다.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 p-0">
        <h2 className="border-border border-b p-4 text-sm font-bold">
          반별 진행 <span className="text-fg-subtle text-xs font-normal">· 제출 → 분석 → 응시</span>
        </h2>
        <Table className="table-fixed rounded-none border-0">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-24">반</TableHead>
              <TableHead className="w-24">제출</TableHead>
              <TableHead className="w-24">분석 완료</TableHead>
              <TableHead className="w-24">분석 실패</TableHead>
              <TableHead className="w-24">응시</TableHead>
              <TableHead>담당</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.classes.map((c) => (
              <TableRow key={c.className} className="hover:bg-transparent">
                <TableCell className="font-semibold">{c.className}</TableCell>
                <TableCell className="tabular-nums">
                  {c.submitted}/{c.total}
                </TableCell>
                <TableCell className="tabular-nums">{c.analyzed}</TableCell>
                <TableCell
                  className={cn(
                    'tabular-nums',
                    c.analysisFailed > 0 && 'text-danger font-semibold',
                  )}
                >
                  {/* 0은 `—`로 쓴다 — 없는 것과 0인 것을 구분한다(F3) */}
                  {c.analysisFailed > 0 ? (
                    c.analysisFailed
                  ) : (
                    <span className="text-fg-subtle">—</span>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  {c.attended}/{c.attendable}
                </TableCell>
                <TableCell className="text-xs">
                  {c.manager ?? <span className="text-warning font-semibold">담당 없음</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="gap-3 p-4">
        <h2 className="text-sm font-bold">
          항목별 코드 매칭{' '}
          <span className="text-fg-subtle text-xs font-normal">
            · 코드 분석 결과 · 문항이 만들어졌는가
          </span>
        </h2>
        <dl className="flex flex-col gap-2.5">
          {report.matches.map((m) => {
            const short = m.unmatchedTeams > 0
            return (
              /*
                **이름이 남는 폭을 갖는다.** `w-32`(128px) 고정이었을 때 긴 이름이
                줄바꿈되면서 오른쪽 900px가 통째로 비었다 — 표에서 서술 열이 흡수해야
                하는 자리다(H13). 수치는 길이가 일정하므로 오른쪽 끝에 고정한다.
              */
              <div key={m.conceptId} className="flex items-baseline gap-3 text-sm">
                <dt className="min-w-0 flex-1 text-xs font-semibold">{m.conceptName}</dt>
                <dd className="shrink-0 text-right">
                  {m.total}명 중{' '}
                  <b className={cn('font-bold tabular-nums', short && 'text-danger')}>
                    {m.matched}명
                  </b>{' '}
                  매칭
                  {short && (
                    <span className="text-fg-muted"> · {m.unmatchedTeams}개 팀 전원 미매칭</span>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </Card>
    </div>
  )
}
