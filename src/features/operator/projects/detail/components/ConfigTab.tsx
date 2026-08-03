import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { canDelete, canEditConfig, lockedReason } from '../../rules'
import type { Curriculum, Project } from '../../types'

/*
  구성 탭 — **고치는 자리**다. 무엇이 붙어 있는지는 헤더가 이미 말한다.

  헤더와 갈리는 지점: 헤더는 **값**(개념 이름·교안 이름), 여기는 **출처와 근거**
  (등록일 · 어느 교안 몇 쪽에서 왔는지)와 **편집 버튼**이다. 같은 것을 두 번 그리면
  한쪽만 고쳐질 때 두 곳이 다른 말을 한다(D1).

  블록 셋을 세로로 쌓는다. 5~6개면 탭이나 마스터-디테일로 가야 하지만(H1) 셋이라
  스크롤로 찾을 일이 없고, **교안 → 개념 → 요구사항이 의존 순서**라 나란히 보여야 한다.

  ▸ **교안과 검증 개념을 갈라 놓는다.** 오퍼레이터는 교안 연결과 개념 선택을 각각 하는
    사람이라 두 작업이 갈린다(목록에서 열을 나눈 것과 같은 이유).
  ▸ **확정된 개념은 출처를 달고 다닌다** — 리포트의 교안 위치와 면담 브리프가 그 값을
    읽으므로, 출처가 없으면 `3장 p.55`를 어느 문서에서 펼지 알 수 없다.
  ▸ **요구사항은 교안과 별개다.** 과제 문서에서 나와 **구현 P/F에만** 쓴다(14번 6-3).
    같은 자리에 두면 이해도 측정과 섞인다.
*/
type Props = {
  project: Project
  curricula: Curriculum[]
  onPickConcepts: () => void
  onChangeCurricula: () => void
  onEditRequirements: () => void
  onDelete: () => void
}

export default function ConfigTab({
  project,
  curricula,
  onPickConcepts,
  onChangeCurricula,
  onEditRequirements,
  onDelete,
}: Props) {
  /*
    **정책은 `rules.ts`가 갖는다.** 여기서 `status === 'RUNNING'`을 쓰면 상태가 하나
    늘 때 화면마다 조건이 갈리고, 버튼은 막혔는데 모달은 열리는 상태가 생긴다.
  */
  const editable = canEditConfig(project.status)
  const locked = lockedReason(project.status)
  const linked = curricula.filter((c) => project.curriculumIds.includes(c.id))
  const fixed = project.concepts.length > 0
  const requirements = project.requirements

  return (
    <div className="flex flex-col gap-4">
      {/*
        **왜 흐린지를 맨 위에서 한 번 말한다.** 버튼마다 툴팁을 달면 hover해야 알 수 있고
        키보드 사용자는 못 읽는다 — C1이 금지한 것은 *"이유를 말하지 않는 게이팅"* 이다.
      */}
      {locked && (
        <p className="border-border-strong text-fg-muted rounded-md border border-dashed px-4 py-2.5 text-xs">
          {locked} — 교안·검증 개념·요구사항은 그 회차의 <b className="font-semibold">측정 기준</b>
          이라, 응시가 시작된 뒤 바꾸면 학생마다 다른 시험이 됩니다.
        </p>
      )}

      <Section
        title="교안 연결"
        note={`· ${linked.length}개 · 검증 개념의 출처`}
        action={
          <Button variant="ghost" size="sm" onClick={onChangeCurricula} disabled={!editable}>
            변경
          </Button>
        }
      >
        {linked.length === 0 ? (
          <Empty>연결된 교안이 없습니다</Empty>
        ) : (
          <ol className="flex flex-col gap-2">
            {linked.map((c, i) => {
              /*
                이 교안에서 나온 확정 개념 수. **`변경`이 왜 막히는지를 미리 말한다** —
                모달을 열어서야 알면 되돌아 나와 개념부터 바꿔야 한다(canUnlinkCurriculum).

                아래 검증 개념 섹션이 같은 관계를 반대 방향(개념 → 출처 교안)으로 그리지만
                D1 중복이 아니다. 한 배열에서 그 자리에서 파생되므로 두 값이 갈릴 수 없고,
                묻는 것이 다르다 — 저쪽은 *"이 개념이 어디서 왔나"*, 여기는 *"이 교안을 뺄 수 있나"*.
              */
              const used = project.concepts.filter((x) => x.curriculumId === c.id).length
              return (
                <Row key={c.id} index={i + 1}>
                  <b className="font-semibold">{c.name}</b>{' '}
                  <span className="text-fg-subtle">{c.version}</span>
                  <span className="text-fg-subtle text-xs"> · 등록 {c.registeredAt}</span>
                  {used > 0 && (
                    <span className="text-fg-subtle text-xs"> · 검증 개념 {used}건 사용 중</span>
                  )}
                </Row>
              )
            })}
          </ol>
        )}
      </Section>

      <Section
        title="검증 개념"
        note={fixed ? '· 3건 고정 · 문항 3개' : '· 3건 고정'}
        action={
          <Button
            variant={fixed ? 'ghost' : 'primary'}
            size="sm"
            onClick={onPickConcepts}
            // 교안이 없으면 후보 자체가 없다 — 고를 수 있는 것이 없는 버튼은 열지 않는다
            disabled={linked.length === 0 || !editable}
          >
            {fixed ? '변경' : '개념 선택'}
          </Button>
        }
      >
        {fixed ? (
          <ol className="flex flex-col gap-2">
            {project.concepts.map((concept, i) => {
              const owner = curricula.find((c) => c.id === concept.curriculumId)
              const teach = owner?.teaches.find((t) => t.id === concept.id)
              return (
                <Row key={concept.id} index={i + 1}>
                  <b className="font-semibold">{concept.name}</b>
                  {owner && (
                    // 출처를 달고 다닌다 — 리포트·브리프가 이 값으로 교안 위치를 가리킨다
                    <span className="text-fg-subtle">
                      {' '}
                      · {owner.name} {owner.version}
                      {teach && ` · ${teach.page}`}
                    </span>
                  )}
                </Row>
              )
            })}
          </ol>
        ) : (
          <Empty>
            {linked.length === 0 ? (
              '교안을 먼저 연결해야 후보가 나옵니다'
            ) : (
              <>
                아직 정하지 않았습니다
                <span className="mt-0.5 block text-2xs">
                  3건이 정해져야 학생에게 낼 문항이 만들어집니다 · 현황도 그때부터 집계됩니다
                </span>
              </>
            )}
          </Empty>
        )}
      </Section>

      <Section
        title="요구사항"
        note={
          requirements.length > 0
            ? `· ${requirements.length}건 · 구현 P/F 전용`
            : '· 교안과 별개 · 구현 P/F 전용'
        }
        action={
          <Button variant="ghost" size="sm" onClick={onEditRequirements} disabled={!editable}>
            편집
          </Button>
        }
      >
        {requirements.length === 0 ? (
          /*
            **`유형 2 · 없음`이지 `아직`이 아니다**(02-layout §4). 요구사항 없이 끝나는
            회차가 실제로 있어서(빅프) 기다릴 것이 없다 — 그래서 "언제 채워지는지"가
            아니라 **0건이 무슨 뜻인지**를 쓴다.
          */
          <Empty>요구사항 없이 진행하는 회차입니다 — 구현 P/F를 판정하지 않습니다</Empty>
        ) : (
          <ol className="flex flex-col gap-2">
            {requirements.map((line, i) => (
              // 중복은 입력에서 막으므로(addRequirements) 문자열이 곧 키다
              <Row key={line} index={i + 1}>
                {line}
              </Row>
            ))}
          </ol>
        )}
      </Section>
      {/*
        **위험 구역은 맨 아래다.** 파괴적 액션을 위에 두면 다른 작업 중에 눈에 걸리고,
        스크롤 아래에 있으면 우발적 클릭이 줄어든다. 목록 행에 두지 않은 이유도 같다 —
        거기서는 **이름만 보고** 누르지만 여기까지 왔다는 건 내용을 봤다는 뜻이다.

        **되돌릴 수 없으므로 무엇이 사라지는지 먼저 쓴다**(B5와 같은 원칙).
      */}
      <Card className="border-danger/30 gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-bold">회차 삭제</h2>
            <p className="text-fg-subtle mt-0.5 text-xs">
              {canDelete(project.status)
                ? '교안 연결·검증 개념·요구사항·일정이 함께 사라집니다. 되돌릴 수 없습니다.'
                : '제출·분석·응시 결과가 이 회차에 매달려 있어 지울 수 없습니다 — 끝난 회차는 기록입니다.'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger shrink-0"
            onClick={onDelete}
            disabled={!canDelete(project.status)}
          >
            삭제
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Section({
  title,
  note,
  action,
  children,
}: {
  title: string
  note: string
  action: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">
          {title} <span className="text-fg-subtle text-xs font-normal">{note}</span>
        </h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

/** 번호가 붙는 줄. 교안·개념·요구사항이 같은 모양이라 한 번만 만든다 */
function Row({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-sm">
      <span className="text-fg-subtle bg-surface-2 flex size-5 shrink-0 items-center justify-center rounded text-2xs font-semibold">
        {index}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-border-strong text-fg-subtle rounded-md border border-dashed p-4 text-center text-xs">
      {children}
    </p>
  )
}
