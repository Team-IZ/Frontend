import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/Table'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import {
  ATTENDANCE_LABEL,
  ROSTER,
  requirementTally,
  type PersonAttendance,
  type ProjectDetail,
  type Team,
} from '../mockData'

/*
  MG-08 제출 현황 탭 — 팀 그룹 + 개인 행 2계층(정의서 §3). 팀이 한 명이라도
  내면 팀원 전원이 같은 코드를 쓰므로 제출·분석·요구사항은 **팀 행**에,
  응시·다시 보기는 **개인 행**에 붙는다.

  팀 편성이 안 끝났으면(편성 전·편성 중·전원 배정) 제출 자체가 안 열린다 —
  빈 상태로 그 이유를 말한다. 확정(④)부터 표가 나온다.

  요구사항 판정은 **팀 행을 펼쳐서** 본다(모달 아님) — `showReq`로 그 팀만 토글.

  ⚠ [연락함] 제거(사용자 지적, 2026-08-08) — D56 D절에서 상단 일괄 모달
  (`NudgeDialog`)을 행마다 [연락함] 버튼으로 바꿨었는데, 다시 검토해 아예
  없앴다. 대시보드의 [연락함]과 달리 이 탭은 "지난 방문 이후" 같은 스코프
  분리가 없는 한 프로젝트짜리 좁은 명단(팀 몇 개·인원 수십 명)이라, 누구를
  이미 연락했는지는 바로 옆 "제출"·"응시" 열(제출 시각·"응시 전 / D-2" 등)만
  봐도 충분히 판단된다 — 대시보드는 여러 날에 걸친 여러 유형의 백로그를
  다뤄서 "이미 손댔다" 표시가 따로 필요했지만, 이 탭은 그 정도로 오래 쌓이지
  않는다. 미제출 팀에 연락함을 누르면 빈 제출 레코드를 만들어 상태만 얹는
  구조(`markTeamContacted`)도 이 화면 하나를 위해 치르기엔 비용이 커
  보였다 — 실제 제출·응시가 반영되면 그 자체로 "확인됐다"는 신호가 된다.

  요구사항 펼침에도 파일:줄 근거(`evidence`)를 한 줄 더 붙였다 — 이 화면
  제목 자체가 "구현 근거"라 판정이 어느 코드에서 나왔는지 보여야 한다.

  ⚠ 컬럼 재구성(사용자 지시) — "제출 · 분석"·"응시" 2개 헤더가 실제로는
  "제출 시각"과 "분석 결과"라는 서로 다른 축을 한 헤더에 욱여넣고 있었다.
  **"제출"**(팀 행=제출 시각, 개인 행=그 사람이 응시를 마친 시각)과
  **"분석 · 응시"**(팀 행=분석 배지, 개인 행=응시 상태)로 갈랐다 — 팀 행의
  이름 칸에 colSpan으로 붙어 있던 제출 시각·분석 배지를 각자 칸으로 뺐다.
  "레포 · 제출자"처럼 고유 칸을 가지니 줄도 맞는다(전엔 이름 칸에 텍스트로
  욱여넣어 왼쪽으로 쏠려 보였다).
*/

type Props = {
  projectId: string
  detail: ProjectDetail
  onReload: () => void
}

const ROSTER_NAME: Record<string, string> = Object.fromEntries(ROSTER.map((p) => [p.id, p.name]))

const REQ_ICON: Record<string, string> = { MET: '✓', UNUSED: '✗', EMPTY: '✗', NOMATCH: '✗' }

export default function SubmissionTab({ detail }: Props) {
  const [expandedReq, setExpandedReq] = useState<Set<string>>(new Set())

  const { teamPhase, teams, locked } = detail
  const opened = teamPhase === 'LOCKED' || teamPhase === 'SUBMITTING'

  if (!opened) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>팀 편성이 끝나면 제출 현황이 열립니다</EmptyTitle>
          <EmptyDescription>
            아직 팀 편성 중이에요 — 팀 탭에서 편성을 마치면 이 탭이 채워집니다.
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

  const submittedCount = teams.filter((t) => detail.submissions[t.id]?.submittedAt).length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-fg-subtle text-xs">
        제출 {submittedCount}/{teams.length}팀
        {locked && <span className="ml-2">· 종료된 회차라 팀 이동을 할 수 없습니다</span>}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">팀 · 이름</TableHead>
            <TableHead>제출</TableHead>
            <TableHead>레포 · 제출자</TableHead>
            <TableHead>요구사항</TableHead>
            {/* "응시 가능 19시간 남음"처럼 시간 단위 잔여값이 "D-N일"보다 길어서 w-32(128px)로는
                실측 오버플로가 났다(D22 기준 — px을 짐작하지 않고 실측) */}
            <TableHead className="w-40">분석 · 응시</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TeamRows
              key={team.id}
              team={team}
              detail={detail}
              reqExpanded={expandedReq.has(team.id)}
              onToggleReq={() => toggleReq(team.id)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TeamRows({
  team,
  detail,
  reqExpanded,
  onToggleReq,
}: {
  team: Team
  detail: ProjectDetail
  reqExpanded: boolean
  onToggleReq: () => void
}) {
  const submission = detail.submissions[team.id]
  // 레코드 존재가 아니라 `submittedAt`으로 판정한다 — 제출 전이면 아직 아무 값도
  // 없다는 뜻이라 "제출됨"으로 오판하면 안 된다.
  const submitted = !!submission?.submittedAt
  const tally = submitted ? requirementTally(submission!.requirements) : null

  return (
    <>
      <TableRow className="bg-surface-2">
        <TableCell className="font-bold">
          <div className="flex items-center gap-2">
            <span>{team.name}</span>
            {!submitted && <Badge variant="warning">미제출 ⚠</Badge>}
          </div>
        </TableCell>
        <TableCell className="text-fg-muted text-xs">
          {submitted ? (
            submission!.submittedAt!.replace('T', ' ')
          ) : (
            <span className="text-fg-subtle">—</span>
          )}
        </TableCell>
        {/* 레포 URL이 길어서 무제한으로 두면 표 전체가 컨테이너보다 넓어져(실측 712px vs
            669px) "응시" 열의 잔여 시간 라벨이 가로 스크롤 밖으로 밀려 잘렸다(D22 기준,
            실측 후 조정). URL만 줄이고 제출자 이름은 끝까지 보이게 flex로 나눴다 —
            통째로 자르면 이름까지 같이 잘려서 누가 냈는지 안 보였다 */}
        <TableCell className="text-fg-muted max-w-40 text-xs">
          {submission?.repoUrl ? (
            <span className="flex min-w-0 items-center">
              <span className="min-w-0 truncate" title={submission.repoUrl}>
                {submission.repoUrl}
              </span>
              <span className="shrink-0">&nbsp;· {submission.submitterName}</span>
            </span>
          ) : (
            <span className="text-fg-subtle">아직 아무도 제출하지 않았어요</span>
          )}
        </TableCell>
        <TableCell>
          {tally ? (
            <button
              type="button"
              onClick={onToggleReq}
              className="text-fg inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            >
              ✓ {tally.met} · ✗ {tally.unmet}
              <ChevronRight
                className={cn('size-3 transition-transform', reqExpanded && 'rotate-90')}
              />
            </button>
          ) : (
            <span className="text-fg-subtle text-xs">—</span>
          )}
        </TableCell>
        <TableCell>
          {submission?.analysisStatus === 'FAILED' && <Badge variant="danger">분석 실패</Badge>}
          {submission?.analysisStatus === 'DONE' && <Badge variant="success">분석 완료</Badge>}
          {/* 위 `tally`와 같은 이유 — 레코드 존재가 아니라 `analysisStatus` 유무로 판정한다.
              존재로 판정하면 미제출 팀에 [연락함]을 누른 뒤 이 칸이 "—"도 배지도 없는
              빈 칸이 된다(분석 결과가 사라진 것처럼 보인다) */}
          {!submission?.analysisStatus && <span className="text-fg-subtle text-xs">—</span>}
        </TableCell>
      </TableRow>

      {reqExpanded && submission && submission.requirements.length > 0 && (
        <TableRow className="bg-primary-soft hover:bg-primary-soft">
          <TableCell colSpan={5}>
            <div className="flex flex-col gap-2.5 py-1">
              {submission.requirements.map((r) => (
                <div key={r.name} className="flex gap-2 text-xs">
                  <span
                    className={cn(
                      'flex-none font-bold',
                      r.status === 'MET' ? 'text-success' : 'text-danger',
                    )}
                  >
                    {REQ_ICON[r.status]}
                  </span>
                  <div className="flex-1">
                    <p>
                      <b className="font-semibold">{r.name}</b>{' '}
                      <span className="text-fg-muted">{r.detail}</span>
                    </p>
                    <p className="text-fg-subtle mt-0.5 font-mono text-2xs">{r.evidence}</p>
                  </div>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}

      {team.memberIds.map((id) => {
        const attendance = detail.attendance[id] ?? {
          status: 'BLOCKED' as const,
          deadlineLabel: null,
          completedAt: null,
        }
        return (
          <TableRow key={id}>
            <TableCell className="pl-8 text-sm">{ROSTER_NAME[id] ?? id}</TableCell>
            {/* "제출" 열 — 팀 행은 제출 시각, 개인 행은 그 사람이 응시를 마친 시각(사용자 지시).
                아직 안 봤으면(OPEN·MISSED·BLOCKED) 대시 — 응시 상태 자체는 옆 칸에 있다 */}
            <TableCell className="text-fg-muted text-xs">
              {attendance.completedAt ? (
                attendance.completedAt.replace('T', ' ')
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </TableCell>
            <TableCell />
            {/* 요구사항은 팀 전원이 같은 코드를 쓰는 팀 단위 값이라 위 팀 행에만 둔다 —
                여기 또 찍으면 사람마다 같은 값이 반복돼 무엇을 보라는 건지 헷갈린다.
                개인 행에선 원래 항상 비던 칸이다([연락함]을 없애며 다시 원래대로) */}
            <TableCell />
            <TableCell>
              <AttendanceCell attendance={attendance} />
            </TableCell>
          </TableRow>
        )
      })}
    </>
  )
}

function AttendanceCell({ attendance }: { attendance: PersonAttendance }) {
  if (attendance.status === 'BLOCKED') return <span className="text-fg-subtle text-xs">—</span>
  const tone =
    attendance.status === 'DONE'
      ? 'text-success'
      : attendance.status === 'OPEN'
        ? 'text-fg'
        : 'text-fg-subtle'
  return (
    <span className={cn('text-xs font-semibold', tone)}>
      {ATTENDANCE_LABEL[attendance.status]}
      {/* "D-2일"→"D-2"로 줄이면서 라벨과 헷갈리지 않게 "/"로 갈랐다(사용자 지시,
          "응시 전 / D-2") — "19시간 남음"도 같은 구분자를 쓴다. 기한은 `OPEN`에만
          붙는다 — 마감 후(`MISSED`)는 `deadlineLabel`이 null이라 "미응시" 한 마디로
          끝나고, 그 유무가 마감 전/후를 라벨 없이도 갈라 준다(결정 로그 D56 B절) */}
      {attendance.deadlineLabel && (
        <span className="ml-1 font-normal">/ {attendance.deadlineLabel}</span>
      )}
    </span>
  )
}
