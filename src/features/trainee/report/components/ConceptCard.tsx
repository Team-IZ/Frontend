import { BookOpenIcon, CircleSlashIcon, LockIcon, LockOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { REACH_LABEL, UNASKED_BODY, UNASKED_TITLE } from '../labels'
import { clampLevel } from '../_/api/types'
import type { ConceptReport, ReachedLevel } from '../_/api/types'
import QaList from './QaList'

/*
  레일 핀과 레벨 배지가 같은 --color-reach-0~4를 쓴다(둘 다 같은 레벨을 말하므로
  색도 하나여야 한다 — 실사용 피드백으로 발견). 5단 그라디언트를 그대로 쓰기로
  확정했다 — 매니저 쪽 도달단계 배지(MG-05)가 이미 쓰는 원색 스케일이라 도메인
  교차 import 없이 같은 전역 토큰만 가져다 쓴다.

  0·4단은 배경이 진해 흰 글자, 1~3단은 밝아 어두운 글자다(index.css 주석과 같은 규칙).
*/
const PIN_CLASS: Record<ReachedLevel, string> = {
  0: 'bg-reach-0',
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}

const BADGE_CLASS: Record<ReachedLevel, string> = {
  0: 'bg-reach-0 text-white',
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

type Props = {
  concept: ConceptReport
  /** 마지막 카드는 선이 다음 카드로 안 이어지니 꼬리를 남기지 않는다 */
  isLast: boolean
}

/*
  개념 하나 — 번호가 아니라 좌측 레일 점으로 구분한다(정의서 §3 "번호가 아니라 레일").

  핀(원)과 선의 중심이 실제로 맞도록 수치를 맞춘다 — 핀 10px(size-2.5)이 left-0에서
  시작하면 중심은 5px, 선은 left-1(4px) 위치에 2px 폭(w-0.5)이면 중심도 5px로 같다.

  선은 각 카드 "자신의" 아래쪽 padding(pb-8) 안까지 뻗어 다음 카드 핀까지 이어진다
  — flex gap은 형제 사이 공간이라 어느 카드도 그 구간의 선을 못 그린다. 마지막
  카드는 다음 핀이 없어 padding도 짧고(pb-3) 선도 그 안에서 멈춘다.
*/
export default function ConceptCard({ concept, isLast }: Props) {
  return (
    <div className={cn('relative pl-5', isLast ? 'pb-3' : 'pb-8')}>
      {/* top-[11px] = 핀(top-1.5=6px, size-2.5=10px)의 세로 중심 — 선이 핀 가운데서 뻗어나온다 */}
      <span
        aria-hidden="true"
        className={cn('absolute top-[11px] bottom-0 left-1 w-0.5 bg-border', isLast && 'bottom-3')}
      />
      {concept.asked ? (
        <span
          className={cn(
            'absolute top-1.5 left-0 size-2.5 rounded-full',
            PIN_CLASS[concept.reachedLevel],
          )}
        />
      ) : (
        // 문항 없음은 도달 단계가 없다 — 색을 주면 어느 단계인 것처럼 읽힌다.
        // 매니저 화면의 해치 무늬와 같은 뜻을 여기서는 빈 원(테두리만)으로 낸다.
        <span className="absolute top-1.5 left-0 size-2.5 rounded-full border-2 border-border-strong bg-canvas" />
      )}

      {concept.asked ? <AskedBody concept={concept} /> : <UnaskedBody name={concept.name} />}
    </div>
  )
}

/*
  묻지 않은 개념 — **잠금 카드와 정반대로 보여야 한다.**

  둘 다 회색 점선 박스였더니 구분이 안 됐다(실사용 피드백으로 발견). 뜻이 반대인데
  같은 옷을 입고 있었던 것이다.

    잠금       — 안에 내용이 **있는데** 아직 못 본다. 해당 카드에서 자물쇠로 말한다
    문항 없음 — 안에 내용이 **없다.** 열릴 것도, 학생이 할 일도 없다

  그래서 **박스를 아예 그리지 않는다.** 박스가 있으면 "여기 뭔가 담겨 있다"로 읽히고,
  그게 잠금과 헷갈린 원인이다. 대신 카드 전체를 한 톤 죽이고(제목까지 fg-subtle)
  설명을 평문 한 줄로 둔다 — 이 자리는 결과가 아니라 각주다.
*/
function UnaskedBody({ name }: { name: string }) {
  return (
    <>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-fg-subtle">{name}</span>
        <span className="shrink-0 text-xs text-fg-subtle">문항 없음</span>
      </div>
      <div className="flex items-start gap-2 text-sm text-fg-subtle">
        <CircleSlashIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          <b className="font-medium">{UNASKED_TITLE}</b> {UNASKED_BODY}
        </p>
      </div>
    </>
  )
}

function AskedBody({ concept }: { concept: Extract<ConceptReport, { asked: true }> }) {
  return (
    <>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-fg">{concept.name}</span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-bold',
              BADGE_CLASS[concept.reachedLevel],
            )}
          >
            {REACH_LABEL[concept.reachedLevel]}
          </span>
          {/*
            다시 봐서 올라간 단계는 **배지를 덮어쓰지 않는다** — 배지는 정본(첫 응시)이고
            성적에 반영되는 값이다. 올라간 것은 그 아래 한 줄로만 말한다.

            서버는 문답을 두 벌로 주지 않고 전후 단계(`comparedReach`)만 준다 — 올라간
            경우에만 말하면 되므로 그것으로 충분하다.
          */}
          {concept.comparedReach && concept.comparedReach.after > concept.reachedLevel && (
            <span className="text-2xs text-fg-subtle">
              다시 봤을 때 {REACH_LABEL[clampLevel(concept.comparedReach.after)]}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg-muted">{concept.said}</p>

      {/*
        🔴 **잠금이 리포트 단위에서 개념 단위로 바뀌었다.** 예전엔 매니저의
        `disclosureScope`가 리포트 하나를 통째로 열고 닫았다. 지금은 그 개념이
        `isRetryTarget`(도달 2단 미만)인데 다시 보기를 아직 안 마쳤을 때만 서버가
        `explanation`·`qa`를 가려서 보낸다 — 그래서 안내도 카드마다 각자 그린다.
      */}
      {concept.explanation ? (
        // 열림 — 회색 대신 primary 색, 점선 대신 실선, 열린 자물쇠. 무게(배경+테두리)를
        // 카드 안 다른 박스와 같게 둬서 흐려 보이지 않게 한다(실사용 피드백으로 발견).
        <div className="mt-3 rounded-md border border-primary-border bg-primary-soft p-3 text-sm">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
            <LockOpenIcon className="size-3.5 shrink-0" />
            어디서 막혔나
          </div>
          {concept.explanation.map((p, i) => (
            <p key={i} className={cn('leading-relaxed text-fg', i > 0 && 'mt-2')}>
              {p}
            </p>
          ))}
        </div>
      ) : (
        concept.isRetryTarget && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm text-fg-muted">
            <LockIcon className="size-4 shrink-0" />
            다시 보기를 마치면 자세한 해설과 문답을 볼 수 있어요
          </div>
        )
      )}

      {/*
        교안 위치 — **안내 정보**다. 아래 [내 답변] 토글과 둘 다 회색 알약이라 형제처럼
        보였는데(실사용 피드백), 하나는 *읽는 것*이고 하나는 *누르는 것*이라 같은 옷을
        입으면 안 된다. info 톤(파랑)으로 "참고하세요"라고 말하고, 누르는 것은 아래처럼
        흰 면 + 테두리로 남긴다 — 색이 아니라 **역할**로 갈린다.
      */}
      {concept.curriculumRef && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-info-border bg-info-soft px-2.5 py-1 text-xs text-info">
          <BookOpenIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            교안 {concept.curriculumRef.chapter} · {concept.curriculumRef.pages} ·{' '}
            {concept.curriculumRef.title}
          </span>
        </div>
      )}

      {/* 잠긴 개념이면 문답 원문이 오지 않는다 — 없으면 목록 자체를 그리지 않는다 */}
      {concept.qa && <QaList entries={concept.qa} />}
    </>
  )
}
