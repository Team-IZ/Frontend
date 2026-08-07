import { useState } from 'react'
import { ChevronRight, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
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
  type ProjectDetail,
  type Team,
} from '../mockData'
import NudgeDialog from './NudgeDialog'

/*
  MG-08 제출 현황 탭 — 팀 그룹 + 개인 행 2계층(정의서 §3). 팀이 한 명이라도
  내면 팀원 전원이 같은 코드를 쓰므로 제출·분석·요구사항은 **팀 행**에,
  응시·재응시는 **개인 행**에 붙는다.

  팀 편성이 안 끝났으면(편성 전·편성 중·전원 배정) 제출 자체가 안 열린다 —
  빈 상태로 그 이유를 말한다. 확정(④)부터 표가 나온다.

  요구사항 판정은 **팀 행을 펼쳐서** 본다(모달 아님) — `showReq`로 그 팀만 토글.

  ⚠ 렌더 비교 반영 — 독촉을 행마다 개별 버튼이 아니라 상단 "독촉 보내기"
  하나가 여는 **일괄 모달**(`NudgeDialog`)로 바꿨다(와이어프레임 #nudge 그대로).
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

export default function SubmissionTab({ projectId, detail, onReload }: Props) {
  const [expandedReq, setExpandedReq] = useState<Set<string>>(new Set())
  const [nudgeOpen, setNudgeOpen] = useState(false)

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
      <div className="flex items-center gap-2">
        <p className="text-fg-subtle text-xs">
          제출 {submittedCount}/{teams.length}팀
          {locked && <span className="ml-2">· 종료된 회차라 알림·팀 이동을 할 수 없습니다</span>}
        </p>
        {!locked && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setNudgeOpen(true)}>
            <Megaphone className="size-3.5" />
            알림 보내기
          </Button>
        )}
      </div>

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

      <NudgeDialog
        open={nudgeOpen}
        onOpenChange={setNudgeOpen}
        projectId={projectId}
        detail={detail}
        onSent={onReload}
      />
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
  const submitted = !!submission?.submittedAt
  const tally = submission ? requirementTally(submission.requirements) : null

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
          {!submission && <span className="text-fg-subtle text-xs">—</span>}
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
                아직 안 봤으면(AVAILABLE·NOT_STARTED·BLOCKED) 대시 — 응시 상태 자체는 옆 칸에 있다 */}
            <TableCell className="text-fg-muted text-xs">
              {attendance.completedAt ? (
                attendance.completedAt.replace('T', ' ')
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </TableCell>
            <TableCell />
            {/* 요구사항은 팀 전원이 같은 코드를 쓰는 팀 단위 값이라 위 팀 행에만 둔다 —
                여기 또 찍으면 사람마다 같은 값이 반복돼 무엇을 보라는 건지 헷갈린다 */}
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

function AttendanceCell({
  attendance,
}: {
  attendance: {
    status: 'DONE' | 'AVAILABLE' | 'NOT_STARTED' | 'BLOCKED'
    deadlineLabel: string | null
    completedAt: string | null
  }
}) {
  if (attendance.status === 'BLOCKED') return <span className="text-fg-subtle text-xs">—</span>
  const tone =
    attendance.status === 'DONE'
      ? 'text-success'
      : attendance.status === 'AVAILABLE'
        ? 'text-fg'
        : 'text-fg-subtle'
  return (
    <span className={cn('text-xs font-semibold', tone)}>
      {ATTENDANCE_LABEL[attendance.status]}
      {/* "D-2일"→"D-2"로 줄이면서 라벨과 헷갈리지 않게 "/"로 갈랐다(사용자 지시,
          "응시 가능 / D-2") — "19시간 남음"도 같은 구분자를 쓴다 */}
      {attendance.deadlineLabel && (
        <span className="ml-1 font-normal">/ {attendance.deadlineLabel}</span>
      )}
    </span>
  )
}
