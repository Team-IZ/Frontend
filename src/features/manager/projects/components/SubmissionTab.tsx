import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { formatDateTime, formatCoarse } from '@/lib/format'
import {
  ATTENDANCE_LABEL,
  type AttendanceStatus,
  type ClassProgressView,
  type SubmissionMember,
  type SubmissionStatus,
  type SubmissionTeam,
} from '../_/api/types'

/*
  MG-08 제출 현황 탭 — 팀 그룹 + 개인 행 2계층(정의서 §3). 팀이 한 명이라도
  내면 팀원 전원이 같은 코드를 쓰므로 제출·분석·요구사항은 **팀 행**에,
  응시는 **개인 행**에 붙는다. 서버 응답이 정확히 그 모양이다.

  팀 편성이 안 끝났으면 제출 자체가 안 열린다 — 빈 상태로 그 이유를 말한다.
  **`submissionOpened` 하나로 판정한다**(스펙 명시) — 목은 단계 이름 둘을 화면이
  다시 봤다.

  요구사항 판정은 **팀 행을 펼쳐서** 본다(모달 아님).

  ⚠ **분석 상태가 5종이다**(`QUEUED·RUNNING·SUCCEEDED·PARTIAL·FAILED`). 목은
  3종(`PENDING·DONE·FAILED`)이었다. **`PARTIAL`을 완료로 접지 않는다** — 스펙이
  「실패도 완료도 아닌 팀이 어느 열에도 안 잡히고 사라진다」고 못박았다.

  ⚠ **요구사항 판정이 3종이다**(`PENDING·PASS·FAIL`). 목의 `UNUSED·EMPTY·NOMATCH`
  구분(왜 못 채웠는가)은 서버에 없고, 대신 `evidence` 한 줄과 `judgedByAi`가 온다.

  ⚠ **잔여 기한 문구는 화면이 만든다** — 서버는 `assessmentCloseAt`(ISO)만 준다.
  스펙에 「`D-2`·`19시간 남음` 같은 표시 문구는 화면이 만듭니다」라고 적혀 있다.

  ⚠ **반별 진행 줄이 생겼다** — `class-progress`가 반마다 제출→분석→응시 깔때기를
  준다. 목에는 이 조회가 없어 팀 표만 있었다.
*/

type Props = {
  query: UseQueryResult<SubmissionStatus>
  classProgress: ClassProgressView | undefined
}

export default function SubmissionTab({ query, classProgress }: Props) {
  const [expandedReq, setExpandedReq] = useState<Set<string>>(new Set())

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" aria-label="제출 현황을 불러오는 중" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>제출 현황을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </Empty>
    )
  }

  const d = query.data

  /*
    🔴 **서버가 자기모순일 때의 방어**(하드닝 실측, 32차로 올린다).

    스펙은 「화면은 `submissionOpened`만 보고 표를 그릴지 빈 상태를 보여줄지 정한다」고
    했고 그대로 따랐는데, 실제 응답이 자기 자신과 어긋난다:

        submissionOpened   false   (teamFormationStage = READY_TO_CONFIRM)
        submittedTeamCount 5 / 7   ← 이미 제출했다
        analysis           5팀 SUCCEEDED
        개인 응시          DONE 18 · OPEN 2 · MISSED 1 · BLOCKED 5

    그 말을 그대로 믿으면 화면이 「아직 팀 편성 중이에요」라고 하면서 **제출 5건과
    응시 18명을 통째로 숨긴다.** 매니저가 이 탭을 여는 이유가 그 값들인데.

    그래서 **그릴 것이 실제로 있으면 그린다.** 판정 규칙을 다시 만드는 것이 아니라
    (여전히 `submissionOpened`를 본다) 그 값이 데이터와 어긋날 때만 데이터를 택한다.
    서버가 맞춰 주면 이 분기는 저절로 안 타므로 그때 지운다.
  */
  const hasSubmissionData = d.teams.some((t) => t.submission || t.members.length > 0)

  if (!d.submissionOpened && !hasSubmissionData) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>팀 편성이 끝나면 제출 현황이 열립니다</EmptyTitle>
          <EmptyDescription>
            {d.unassignedMemberCount > 0
              ? `미배정 ${d.unassignedMemberCount}명이 남아 있어요 — 팀 탭에서 배정을 마치면 이 탭이 채워집니다.`
              : '아직 팀 편성 중이에요 — 팀 탭에서 편성을 마치면 이 탭이 채워집니다.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  function toggleReq(teamId: string) {
    const next = new Set(expandedReq)
    if (next.has(teamId)) next.delete(teamId)
    else next.add(teamId)
    setExpandedReq(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-fg-subtle text-xs">
        제출 {d.summary.submittedTeamCount}/{d.summary.teamCount}팀
        {d.summary.analysisFailedTeamCount > 0 && (
          <span className="text-danger ml-2">
            · 분석 실패 {d.summary.analysisFailedTeamCount}팀
          </span>
        )}
        {d.locked && <span className="ml-2">· 종료된 회차라 팀 이동을 할 수 없습니다</span>}
      </p>

      {classProgress && classProgress.classes.length > 0 && (
        <div className="border-border flex flex-wrap gap-x-6 gap-y-1.5 rounded-md border p-3 text-xs">
          {classProgress.classes.map((c) => (
            <span key={c.classId} className="text-fg-subtle">
              <b className="text-fg font-bold">{c.className}</b> 제출 {c.submittedCount}/
              {c.targetTraineeCount} · 분석 {c.analysisSucceededCount} · 응시 {c.assessedCount}
              {c.analysisFailedCount > 0 && (
                <span className="text-danger"> · 실패 {c.analysisFailedCount}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">팀 · 이름</TableHead>
            <TableHead>제출</TableHead>
            <TableHead>레포 · 제출자</TableHead>
            <TableHead>요구사항</TableHead>
            {/* "19시간 남음"처럼 시간 단위 잔여값이 "D-N일"보다 길어 w-32(128px)로는
                실측 오버플로가 났다(D22 기준 — px을 짐작하지 않고 실측) */}
            <TableHead className="w-40">분석 · 응시</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {d.teams.map((team) => (
            <TeamRows
              key={team.teamId}
              team={team}
              reqExpanded={expandedReq.has(team.teamId)}
              onToggleReq={() => toggleReq(team.teamId)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TeamRows({
  team,
  reqExpanded,
  onToggleReq,
}: {
  team: SubmissionTeam
  reqExpanded: boolean
  onToggleReq: () => void
}) {
  /* 레코드 존재가 아니라 `submission`이 null인지로 판정한다(스펙 명시) */
  const submitted = !!team.submission
  const judged = team.requirementResults.filter((r) => r.result !== 'PENDING')
  const met = judged.filter((r) => r.result === 'PASS').length

  return (
    <>
      <TableRow className="bg-surface-2">
        <TableCell className="font-bold">
          <div className="flex items-center gap-2">
            {/* 반이 여럿이면 팀 번호가 겹친다(30차 R4) — 반 이름을 함께 적는다 */}
            <span>
              {team.className} {team.teamName}
            </span>
            {!submitted && <Badge variant="warning">미제출 ⚠</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-fg-muted text-xs">
          {team.submission ? (
            formatDateTime(team.submission.submittedAt)
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </TableCell>
        {/* 레포 URL이 길어 무제한으로 두면 표가 컨테이너보다 넓어져 오른쪽 열이 잘렸다
            (D22 기준, 실측 후 조정). URL만 줄이고 제출자 이름은 끝까지 보이게 나눴다 */}
        <TableCell className="text-fg-muted max-w-40 text-xs">
          {team.submission ? (
            <span className="flex min-w-0 items-center">
              <span className="min-w-0 truncate" title={team.submission.repositoryUrl ?? ''}>
                {team.submission.repositoryUrl ?? 'ZIP 제출'}
              </span>
              <span className="shrink-0">&nbsp;· {team.submission.submittedByName}</span>
            </span>
          ) : (
            <span className="text-fg-subtle">아직 아무도 제출하지 않았어요</span>
          )}
        </TableCell>
        <TableCell>
          {judged.length > 0 ? (
            <button
              type="button"
              onClick={onToggleReq}
              className="text-fg inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              ✓ {met} · ✗ {judged.length - met}
              <ChevronRight
                className={cn('size-3 transition-transform', reqExpanded && 'rotate-90')}
              />
            </button>
          ) : (
            <span className="text-fg-subtle text-xs">—</span>
          )}
        </TableCell>
        <TableCell>
          <AnalysisBadge status={team.analysis?.status} />
        </TableCell>
      </TableRow>

      {reqExpanded && team.requirementResults.length > 0 && (
        <TableRow className="bg-primary-soft hover:bg-primary-soft">
          <TableCell colSpan={5}>
            <div className="flex flex-col gap-2.5 py-1">
              {team.requirementResults.map((r) => (
                <div key={r.requirementId} className="flex gap-2 text-xs">
                  <span
                    className={cn(
                      'flex-none font-bold',
                      r.result === 'PASS'
                        ? 'text-success'
                        : r.result === 'FAIL'
                          ? 'text-danger'
                          : 'text-fg-subtle',
                    )}
                  >
                    {r.result === 'PASS' ? '✓' : r.result === 'FAIL' ? '✗' : '…'}
                  </span>
                  <div className="flex-1">
                    <p>
                      <b className="font-semibold">{r.title}</b>
                      {/* 사람이 뒤집은 판정인지 밝힌다 — AI 판정과 같은 무게로 읽히면 안 된다 */}
                      {!r.judgedByAi && (
                        <span className="text-fg-subtle ml-1.5 text-2xs">직접 판정</span>
                      )}
                    </p>
                    {r.evidence && (
                      <p className="text-fg-subtle mt-0.5 font-mono text-2xs">{r.evidence}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}

      {team.members.map((m) => (
        <TableRow key={m.userId}>
          <TableCell className="pl-8 text-sm">{m.name}</TableCell>
          {/* "제출" 열 — 팀 행은 제출 시각, 개인 행은 그 사람이 응시를 마친 시각 */}
          <TableCell className="text-fg-muted text-xs">
            {m.completedAt ? (
              formatDateTime(m.completedAt)
            ) : (
              <span className="text-fg-subtle">—</span>
            )}
          </TableCell>
          <TableCell />
          {/* 요구사항은 팀 전원이 같은 코드를 쓰는 팀 단위 값이라 위 팀 행에만 둔다 */}
          <TableCell />
          <TableCell>
            <AttendanceCell member={m} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

/** 5종을 접지 않는다 — `PARTIAL`은 실패도 완료도 아니다(스펙 🔴) */
function AnalysisBadge({ status }: { status: string | undefined }) {
  if (!status) return <span className="text-fg-subtle text-xs">—</span>
  if (status === 'FAILED') return <Badge variant="danger">분석 실패</Badge>
  if (status === 'SUCCEEDED') return <Badge variant="success">분석 완료</Badge>
  if (status === 'PARTIAL') return <Badge variant="warning">일부만 분석됨</Badge>
  return <Badge variant="neutral">분석 중</Badge>
}

function AttendanceCell({ member }: { member: SubmissionMember }) {
  const status = member.attendanceStatus as AttendanceStatus
  if (status === 'BLOCKED') return <span className="text-fg-subtle text-xs">—</span>

  const tone = status === 'DONE' ? 'text-success' : status === 'OPEN' ? 'text-fg' : 'text-fg-subtle'

  /* 기한은 `OPEN`에만 붙는다 — 마감 후(`MISSED`)엔 붙일 값이 없다(D56 B절) */
  const remain =
    status === 'OPEN' && member.assessmentCloseAt
      ? formatCoarse(new Date(member.assessmentCloseAt).getTime() - Date.now())
      : null

  return (
    <span className={cn('text-xs font-semibold', tone)}>
      {ATTENDANCE_LABEL[status]}
      {remain && <span className="ml-1 font-normal">/ {remain} 남음</span>}
    </span>
  )
}
