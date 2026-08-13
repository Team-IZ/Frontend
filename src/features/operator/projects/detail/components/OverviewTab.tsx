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
  ③ **측정 규칙도 펼쳐 둔다.** 한때 `<details>`로 접었는데(*"전 기수 공통이라 매번 볼 것이
     아니다"*), 위의 셋과 일정이 전부 펼쳐져 있는 화면에서 **이것만 접혀 있으면 「덜 중요한
     것」이 아니라 「숨겨진 것」으로 읽힌다.** 이 회차 학생이 실제로 치를 시험의 규칙이라
     오퍼레이터가 확인 없이 넘길 값이 아니다.

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
  /** 검증 개념·교안 카드를 눌렀을 때 — 둘 다 구성 탭이 갖는 값이다 */
  onGoConfig: () => void
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
  onGoConfig,
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
          label="기간 종료일"
          value={project.endDate ? formatDue(project.endDate) : '미설정'}
          // 색만으로 상태를 구분하지 않는다 — 남은 시간 텍스트가 같이 있다(F4)
          /*
            ⚠ **시각이 없다.** 서버 컬럼이 `DATE`라 「그날 몇 시까지」가 존재하지 않는다
            (18차 R5). 지어내지 않고 **날짜만 쓴다** — 화면이 `23:59`이라고 말하면
            학생은 그때까지 낼 수 있다고 믿는데 서버는 그 약속을 모른다.
          */
          note={due?.text ?? (project.endDate ? undefined : '회차가 언제 닫히는지 정해집니다')}
          tone={!project.endDate ? 'warn' : due?.urgent ? 'danger' : undefined}
        />
        {/*
          **개념·교안 카드는 누르면 구성 탭으로 간다.** 둘 다 *"무엇이 비었나"* 를 말하는데
          고치는 자리는 구성 탭이라, 값을 읽고 나서 탭을 손으로 찾아 가야 했다.
          마감은 안 넘긴다 — 바로 아래 일정 카드에 「수정」이 이미 있다.
        */}
        <Stat
          label="검증 개념"
          value={`${project.concepts.length} / ${CONCEPT_COUNT}건`}
          note={
            fixed
              ? project.concepts.map((c) => c.extractedName).join(' · ')
              : `후보 ${project.conceptCandidateCount}건에서 고릅니다`
          }
          tone={!fixed ? 'warn' : undefined}
          onClick={onGoConfig}
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
          onClick={onGoConfig}
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
          {/*
            ⚠ **이 값은 「기간의 끝」이지 「제출 마감 시각」이 아니다.** 서버가 둘을
            자동으로 연결하지 않는다(18차 R5 회신) — 실제로 9기 5차는 `endDate`가
            07-31인데 실제 마감은 **08-12 03:00 KST**로 12일 차이가 난다.

            실제 마감(`submissionDueAt`)은 지금 **읽을 곳이 없다** — 회차 상세 응답에
            없고, `class-progress`는 현황 탭 조회라 개념 3건 뒤에만 있으며 `PLANNED`
            회차에서는 아예 응답하지 않는다(22차 R2·R6).

            그래서 **마감이라고 단정하지 않는다.** 라벨을 「기간 종료일」로 두고, 실제
            마감 시각은 따로 있다는 사실을 그 자리에서 말한다 — 값이 오면 이 마디가
            실제 마감을 그리고 이 주석도 지운다.
          */}
          <Node
            label="기간 종료일"
            done={!!project.endDate}
            value={project.endDate ? formatDue(project.endDate) : '아직 정하지 않았습니다'}
            note="제출 마감 시각은 따로 정해집니다 — 이 날짜와 다를 수 있습니다"
            strong
          />
          <Node
            label="응시 창"
            done={!!project.endDate}
            value="코드 분석 완료 시점부터 24시간"
            // 이 한 줄만 남긴 설명 — 실제 오해를 막는다(14번 10-1)
            note="제출 시점이 아닙니다. 분석이 끝나야 응시할 문항이 생깁니다"
          />
          {/*
            ⚠ **순서가 뒤집혀 있었다.** 재시험 창을 리포트 발행 **앞**에 뒀는데,
            재시험은 **리포트가 있어야 성립한다** — 대상(0·1단)이 채점 결과에서 나오고
            학생은 리포트의 교안 위치를 보고 공부한다(14번 §11 — 3일을 둔 이유가
            *"리포트를 읽고 교안을 다시 보는 최소 시간"*). 발행 전에 열면 **뭘 틀렸는지
            모르는 채 같은 문항을 다시 푸는 것**이 된다.

            제출 마감 기준으로 재지 않는 이유도 같다 — 응시 창이 **개인별**이라
            마감 직전 제출자는 분석·응시에만 하루 이상 쓴다. 제출 마감 +3일로 자르면
            **응시가 끝나기 전에 재시험 창이 닫히는** 학생이 나온다.
          */}
          <Node
            label="리포트 발행"
            done={!!project.endDate}
            value={project.endDate ? '제출 마감 후 일괄' : '마감이 정해지면 그 뒤 일괄'}
            note="재시험 결과도 함께 실립니다 — 원점수는 바뀌지 않습니다"
          />
          {/*
            ⚠ **값은 TR-03·TR-04 확정본 + 사용자 확인(2026-08-12)을 따른다.**
            대상 0·1단 · 같은 문항을 1단부터 전부 다시 · 힌트 없음 · 1회만.

            **날짜를 못 쓴다** — 기산점인 리포트 발행일이 확정 날짜가 아니라(전원 응시
            완료를 기다린다) 서버도 그 값을 주지 않는다. 지어내지 않고 상대 표현으로 쓴다.
          */}
          <Node
            label="재시험 창"
            done={!!project.endDate}
            value="리포트 발행 후 3일 또는 다음 회차 제출일 중 빠른 쪽"
            note={[
              '도달 0·1단인 개념만 · 같은 문항을 1단부터 다시 · 힌트 없이 · 1회만',
              nextDueAt && nextProjectName
                ? `${nextProjectName}(${formatDue(nextDueAt, true)})이 먼저면 그날 닫힙니다`
                : '다음 회차가 없어 3일 규칙만 적용됩니다',
            ].join(' · ')}
            last
          />
        </ol>
      </Card>

      {/*
        **펼쳐 둔다.** 위의 셋·일정이 전부 열려 있는데 이것만 접히면 「숨겨진 것」으로
        읽힌다. 학생이 실제로 치를 시험의 규칙이다.

        ⚠ **값은 TR-03 확정 규칙을 따른다**(`docs/dev/screens/tr-03-session.md`).
        예전 값(`힌트 단계당 2회 · 재진술만 · 감점 없음`, `세션 70분 하드캡`)은
        기획이 바뀌기 전 것이라 **오퍼레이터가 틀린 규칙을 학생에게 안내**하고 있었다.
      */}
      <Card className="gap-0 p-0">
        <div className="border-border flex items-baseline gap-1.5 border-b p-4">
          <h2 className="text-sm font-bold">측정 규칙</h2>
          <span className="text-fg-subtle text-xs">· 전 기수 공통 · 여기서 바꾸지 않음</span>
        </div>
        <dl className="flex flex-col gap-2.5 p-4 text-sm">
          <Rule label="문항 수">
            <b className="font-semibold">3문제</b>
            <span className="text-fg-subtle"> = 검증 개념 3건</span>
          </Rule>
          <Rule label="단계">
            코드이해 → 설계논리 → 대안비교 → 반례대응
            <span className="text-fg-subtle"> · 단계마다 시도 최대 3회</span>
          </Rule>
          <Rule label="채점">
            <b className="font-semibold">0~5점</b>
            <span className="text-fg-subtle"> · 3점 미만이면 그 단계 실패</span>
          </Rule>
          <Rule label="힌트">
            <b className="font-semibold">질문당 2개</b>
            <span className="text-fg-subtle">
              {' '}
              · 3점 미만이면 자동 지급 + 학생이 요청도 가능 · 둘 다 쓰고 미달이면 다음 개념으로
            </span>
          </Rule>
          <Rule label="시간">
            <b className="font-semibold">세션 60분 · 문제당 20분</b>
            <span className="text-fg-subtle"> · 문제당 시간을 넘기면 그 시도는 실패다</span>
          </Rule>
          <Rule label="재시험">
            <b className="font-semibold">0·1단 개념만 · 1회</b>
            <span className="text-fg-subtle">
              {' '}
              · 같은 문항을 1단부터 다시 · 힌트 없음 · 원점수는 바뀌지 않음
            </span>
          </Rule>
          <Rule label="도달 단계">
            <b className="font-semibold">0~4단</b>
            <span className="text-fg-subtle"> · 마지막으로 통과한 단계 (0단 = L1 실패)</span>
          </Rule>
        </dl>
      </Card>
    </div>
  )
}

/**
 * 요약 한 칸. `tone`은 **값에만** 붙인다 — 라벨까지 물들이면 무엇이 문제인지 흐려진다.
 *
 * `onClick`이 있으면 **버튼으로 그린다** — `div`에 핸들러만 달면 키보드로 닿지 못하고
 * 스크린리더가 누를 수 있는 것인지 말하지 못한다.
 */
function Stat({
  label,
  value,
  note,
  tone,
  onClick,
}: {
  label: string
  value: string
  note?: string
  tone?: 'warn' | 'danger'
  onClick?: () => void
}) {
  /*
    `Card`가 `div`라 누르게 하려면 **버튼으로 감싼다** — `div`에 핸들러만 달면 Tab으로
    닿지 못하고 스크린리더가 누를 수 있는 것인지 말하지 못한다(완료 정의 — git-convention §6).
    감싸는 버튼은 `contents`가 아니라 실제 상자여야 포커스 링이 카드 모양으로 그려진다.
  */
  const inner = (
    <>
      <p className="text-fg-subtle flex items-center gap-1 text-xs">
        {label}
        {onClick && <ChevronRightIcon className="size-3" />}
      </p>
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
    </>
  )

  if (!onClick) return <Card className="gap-1 p-4">{inner}</Card>
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-visible:ring-ring rounded-lg text-left focus-visible:ring-2 focus-visible:outline-none"
    >
      <Card className="hover:border-border-strong h-full gap-1 p-4 transition-colors">{inner}</Card>
    </button>
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
