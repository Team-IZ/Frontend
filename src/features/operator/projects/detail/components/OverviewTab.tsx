import { ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils/cn'
import { CONCEPT_COUNT, canEditSchedule, canOnlyExtendDue, dueLabel, formatDue } from '../../rules'
import type { ProjectDetail } from '../../types'

/*
  개요 탭 — **이 회차가 무엇인가.** 첫 탭이자 기본 탭이다.

  ─── 한 번 갈아엎었다 ────────────────────────────────────────────
  처음에는 `라벨-값` 12행을 세로로 쌓았다. 전부 같은 시각 무게(회색 라벨 + 검정 값)라
  **어느 것이 중요한지가 안 읽혔고**, 설명이 값보다 길어서 본문을 덮었다. 셋을 고쳤다.

  ① **핵심 셋을 위로 뽑는다** — 마감·검증 개념·교안. 되돌릴 수 없는 마감이 화면에서
     가장 커야 한다(B1). 나머지 값과 같은 크기면 그 규칙이 무너진다. 셋을 고른 근거는
     OP-03 목업 doc-head — *"교안 1개 이상 · 검증 개념 3건 · 제출 마감"* 이 회차가
     굴러가기 위한 조건이고, **빈 칸이 곧 할 일**이다.
  ② **일정을 타임라인으로.** 다섯은 나열이 아니라 **시간 순서**다(시작 → 마감 → 응시 창
     → 재시험 창 → 리포트). `dl`로 쌓으면 그 순서가 사라지는데, H3이 *"같은 시간축의
     이벤트를 갈라 놓으면 순서가 사라진다"* 고 한 것과 같은 문제다.
  ③ **측정 규칙은 접는다.** *"전 기수 공통 · 여기서 바꾸지 않음"* 이라 매번 볼 것이
     아니다. 네이티브 `<details>`라 키보드·스크린리더가 기본으로 따라온다.

  설명(hint)은 **응시 창 하나만** 남겼다. `제출 시점이 아닙니다`는 실제 오해를 막는
  문장이고(14번 10-1 — 분석에 2시간 걸린 학생과 20분 걸린 학생의 실제 시간이 다르다),
  나머지는 값이 이미 말하고 있었다.
  ───────────────────────────────────────────────────────────────

  ▸ **잠그지 않고 말한다.** 비어 있는 칸이 무엇을 기다리는지 그 자리에 쓴다(C1).
  ▸ **측정 규칙은 읽기 전용이다** — 입력 필드로 만들면 안 된다(목업 명시).
*/
/*
  ─── 연동하며 바뀐 것 ───────────────────────────────────────────
  **교안 목록을 따로 받지 않는다** — 상세 응답이 연결 교안을 이름과 함께 준다(9차 R1).
  **마감에 시각이 없다** — 서버 컬럼이 `date`이고, 화면이 붙이던 `23:59`을 서버가
  뒷받침하지 않는다(`rules.ts` 상단). 그래서 타임라인도 날짜만 쓴다.
*/
type Props = {
  project: ProjectDetail
  /** 남은 일수 기준일. 화면이 넘긴다 */
  now: string
  /** 다음 회차 제출 마감 — 재시험 창이 이 값을 참조한다. 없으면 3일 규칙만 적용된다 */
  nextDueAt: string | null
  nextProjectName: string | null
  onEditSchedule: () => void
}

export default function OverviewTab({
  project,
  now,
  nextDueAt,
  nextProjectName,
  onEditSchedule,
}: Props) {
  const due = project.endDate ? dueLabel(project.endDate, now) : null
  const fixed = project.concepts.length === CONCEPT_COUNT
  const linked = project.curricula

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="제출 마감"
          value={project.endDate ? formatDue(project.endDate) : '미설정'}
          // 색만으로 상태를 구분하지 않는다 — 남은 시간 텍스트가 같이 있다(F4)
          note={due?.text ?? (project.endDate ? undefined : '학생이 언제까지 낼지 정해집니다')}
          tone={!project.endDate ? 'warn' : due?.urgent ? 'danger' : undefined}
        />
        <Stat
          label="검증 개념"
          value={`${project.concepts.length} / ${CONCEPT_COUNT}건`}
          note={fixed ? '학생 문항 3개' : `후보 ${project.conceptCandidateCount}건에서 고릅니다`}
          tone={!fixed ? 'warn' : undefined}
        />
        <Stat
          label="교안"
          value={linked.length > 0 ? `${linked.length}개` : '없음'}
          note={
            linked.length > 0
              ? linked.map((c) => c.originalFileName ?? '이름 없음').join(' · ')
              : '검증 개념이 여기서 나옵니다'
          }
          tone={linked.length === 0 ? 'warn' : undefined}
        />
      </div>

      <Card className="gap-0 p-0">
        <div className="border-border flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-bold">일정</h2>
          <Button
            variant={project.endDate ? 'ghost' : 'primary'}
            size="sm"
            onClick={onEditSchedule}
            disabled={!canEditSchedule(project.status)}
          >
            {project.endDate ? '수정' : '일정 설정'}
          </Button>
        </div>

        {/*
          **일정만 진행 중에도 열려 있다.** 장애·공지 지연으로 미루는 것은 실무에 있어서
          전부 막으면 회차를 다시 만들게 된다. 다만 **당기는 것은 막는다** — 학생은 이미
          "언제까지"를 알고 있고, 앞당기면 그 기회가 조용히 사라진다.
        */}
        {canOnlyExtendDue(project.status) && (
          <p className="border-border text-fg-muted border-b px-4 py-2 text-xs">
            응시가 시작돼 <b className="font-semibold">마감을 미루는 것만</b> 됩니다 — 앞당기면 낼
            수 있다고 알고 있던 학생의 기회가 사라집니다.
          </p>
        )}
        {project.status === 'DONE' && (
          <p className="border-border text-fg-muted border-b px-4 py-2 text-xs">
            종료된 회차라 일정을 바꿀 수 없습니다.
          </p>
        )}

        {/*
          **타임라인이다.** 다섯이 시간 순서로 이어지고 앞의 것이 뒤의 기산점이 된다 —
          마감이 없으면 뒤 셋을 계산할 수 없다는 사실이 빈 점으로 그대로 읽힌다.
        */}
        <ol className="flex flex-col p-4">
          <Node
            label="시작"
            done={!!project.startDate}
            value={project.startDate ? formatDue(project.startDate) : '미설정'}
          />
          <Node
            label="제출 마감"
            done={!!project.endDate}
            value={project.endDate ? formatDue(project.endDate) : '아직 정하지 않았습니다'}
            strong
          />
          <Node
            label="응시 창"
            done={!!project.endDate}
            value="코드 분석 완료 시점부터 24시간"
            // 이 한 줄만 남긴 설명 — 실제 오해를 막는다(14번 10-1)
            note="제출 시점이 아닙니다. 분석이 끝나야 응시할 문항이 생깁니다"
          />
          <Node
            label="재시험 창"
            done={!!project.endDate}
            value="3일 또는 다음 회차 제출일 중 빠른 쪽"
            note={
              !project.endDate
                ? undefined
                : nextDueAt && nextProjectName
                  ? `${nextProjectName}(${formatDue(nextDueAt).slice(0, 5)})이 먼저면 그날 닫힙니다`
                  : '다음 회차가 없어 3일 규칙만 적용됩니다'
            }
          />
          <Node
            label="리포트 발행"
            done={!!project.endDate}
            value={project.endDate ? '제출 마감 후 일괄' : '마감이 정해지면 그 뒤 일괄'}
            last
          />
        </ol>
      </Card>

      {/*
        **접어 둔다.** 전 기수 공통이라 매번 볼 것이 아니다. `<details>`는 네이티브라
        키보드 조작·펼침 상태 읽기를 브라우저가 처리한다 — 직접 만들 이유가 없다.
      */}
      <details className="group border-border bg-surface-2 rounded-md border">
        <summary className="flex cursor-pointer items-center gap-1.5 p-3 text-sm font-bold">
          <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" />
          측정 규칙
          <span className="text-fg-subtle text-xs font-normal">
            · 전 기수 공통 · 여기서 바꾸지 않음
          </span>
        </summary>
        <dl className="flex flex-col gap-2 px-3 pt-1 pb-3 text-sm">
          <Rule label="문항 수">
            <b className="font-semibold">3문제</b>
            <span className="text-fg-subtle"> = 검증 개념 3건</span>
          </Rule>
          <Rule label="단계">
            코드이해 → 설계논리 → 대안비교 → 반례대응
            <span className="text-fg-subtle"> · 앞 둘 필수</span>
          </Rule>
          <Rule label="힌트">
            단계당 2회 · 재진술만<span className="text-fg-subtle"> · 감점 없음</span>
          </Rule>
          <Rule label="세션 상한">
            <b className="font-semibold">70분</b>
            <span className="text-fg-subtle"> · 안내만 하고 강제로 끊지 않음</span>
          </Rule>
        </dl>
      </details>
    </div>
  )
}

/** 요약 한 칸. `tone`은 **값에만** 붙인다 — 라벨까지 물들이면 무엇이 문제인지 흐려진다 */
function Stat({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string
  note?: string
  tone?: 'warn' | 'danger'
}) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-fg-subtle text-xs">{label}</p>
      <p
        className={cn(
          'text-lg font-bold tabular-nums',
          tone === 'danger' && 'text-danger',
          tone === 'warn' && 'text-warning',
        )}
      >
        {value}
      </p>
      {note && <p className="text-fg-subtle truncate text-2xs">{note}</p>}
    </Card>
  )
}

/**
 * 타임라인 한 마디. **점과 선으로 순서를 그린다** — `done`이 false면 빈 점이라
 * *"아직 정해지지 않아 여기부터는 계산할 수 없다"* 가 색으로도 읽힌다(F4 — 색만으로
 * 구분하지 않으므로 값 문구도 같이 바뀐다).
 */
function Node({
  label,
  value,
  note,
  done,
  strong,
  last,
}: {
  label: string
  value: string
  note?: string
  done: boolean
  strong?: boolean
  last?: boolean
}) {
  return (
    <li className="flex gap-3">
      {/* 점 + 세로선. 마지막 마디는 선을 그리지 않는다 */}
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'mt-1.5 size-2 shrink-0 rounded-full',
            done ? 'bg-primary' : 'border-border-strong border bg-transparent',
          )}
        />
        {!last && <span className="bg-border w-px flex-1" />}
      </div>
      <div className={cn('min-w-0 flex-1', last ? 'pb-0' : 'pb-4')}>
        <p className="text-fg-subtle text-xs">{label}</p>
        <p className={cn('text-sm', strong && 'font-semibold', !done && 'text-fg-muted')}>
          {value}
        </p>
        {note && <p className="text-fg-subtle mt-0.5 text-2xs">{note}</p>}
      </div>
    </li>
  )
}

function Rule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="text-fg-subtle w-20 shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}
