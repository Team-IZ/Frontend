import { BookOpenIcon, CircleSlashIcon, LockIcon, LockOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { REACH_LABEL, UNASKED_BODY, UNASKED_TITLE } from '../labels'
import type { ConceptReport, ReachedLevel } from '../types'
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
  묻지 않은 개념 — **못한 것과 반대로 읽히게 만든다.**

  0단(bg-reach-0, 빨강)과 나란히 놓이는 자리라 색을 쓰면 "나쁜 결과"로 읽힌다.
  중립 회색 + 점선으로 "판정 자체가 없다"를 형태로 말한다(해설 잠금 박스가 쓰는
  것과 같은 어법).
*/
function UnaskedBody({ name }: { name: string }) {
  return (
    <>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-fg-muted">{name}</span>
        <span className="shrink-0 rounded-full border border-dashed border-border-strong px-2.5 py-1 text-xs font-medium text-fg-subtle">
          문항 없음
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 p-3 text-sm">
        <CircleSlashIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <div>
          <b className="text-fg">{UNASKED_TITLE}</b>
          <p className="mt-0.5 text-fg-muted">{UNASKED_BODY}</p>
        </div>
      </div>
    </>
  )
}

function AskedBody({ concept }: { concept: Extract<ConceptReport, { asked: true }> }) {
  /*
    **잠금 판정을 화면이 하지 않는다.** 예전에는 `isRetryTarget && retryState==='PENDING'`을
    화면이 계산했는데, 지금은 서버가 준 `scope` 하나로 갈린다 — SUMMARY면 해설·문답이
    아예 오지 않으므로 "숨길" 것도 없다(안 보이게 하는 것과 안 보내는 것은 다르다).
  */
  const locked = concept.scope === 'SUMMARY'
  /** 재시험을 봤으면 시도가 2건 — 첫 응시가 정본이고 뒤가 기록이다 */
  const firstAttempt = concept.attempts?.[0]
  const retryAttempt = concept.attempts?.[1]

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
          */}
          {retryAttempt && retryAttempt.reachedLevel > concept.reachedLevel && (
            <span className="text-2xs text-fg-subtle">
              다시 봤을 때 {REACH_LABEL[retryAttempt.reachedLevel]}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg-muted">{concept.said}</p>

      {locked ? (
        // 잠김 — 중립 회색 + 점선. "아직 못 본다"는 상태 자체가 신호라 색을 안 쓴다.
        <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 p-3 text-sm">
          <LockIcon className="size-4 shrink-0 text-fg-subtle" />
          <b className="text-fg">자세한 해설은 다시 보기를 마치면 열려요</b>
        </div>
      ) : (
        concept.explanation && (
          // 열림 — 잠금 박스와 정반대로 보이게 한다: 회색 대신 primary 색, 점선 대신
          // 실선, 자물쇠 대신 열린 자물쇠. 무게(배경+테두리)는 같게 둬서 옆 잠금
          // 박스보다 오히려 흐려 보이는 일이 없게 한다(실사용 피드백으로 발견).
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
        )
      )}

      {concept.curriculumRef && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-subtle">
          <BookOpenIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            교안 {concept.curriculumRef.chapter} · {concept.curriculumRef.pages} ·{' '}
            {concept.curriculumRef.title}
          </span>
        </div>
      )}

      {/* SUMMARY면 문답 원문이 오지 않는다 — 없으면 목록 자체를 그리지 않는다 */}
      {firstAttempt && <QaList first={firstAttempt} retry={retryAttempt} />}
    </>
  )
}
