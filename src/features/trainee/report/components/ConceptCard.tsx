import { BookOpenIcon, LockIcon, LockOpenIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { REACH_LABEL } from '../labels'
import type { ConceptReport, LadderLevel } from '../types'
import QaList from './QaList'

/*
  레일 핀과 레벨 배지가 같은 --color-reach-1~4를 쓴다(둘 다 같은 레벨을 말하므로
  색도 하나여야 한다 — 실사용 피드백으로 발견). 5단 그라디언트를 그대로 쓰기로
  확정했다 — 매니저 쪽 도달단계 배지(MG-05)가 이미 쓰는 원색 스케일이라 도메인
  교차 import 없이 같은 전역 토큰만 가져다 쓴다. text-reach-fg/white 페어링도
  그쪽과 같다(index.css "1~3단 위 어두운 글자. 0·4단은 흰 글자").
*/
const PIN_CLASS: Record<LadderLevel, string> = {
  1: 'bg-reach-1',
  2: 'bg-reach-2',
  3: 'bg-reach-3',
  4: 'bg-reach-4',
}

const BADGE_CLASS: Record<LadderLevel, string> = {
  1: 'bg-reach-1 text-reach-fg',
  2: 'bg-reach-2 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

type Props = {
  concept: ConceptReport
  /** isRetryTarget && retryState==='PENDING' — 화면이 계산해서 넘긴다 */
  locked: boolean
  /** 마지막 카드는 선이 다음 카드로 안 이어지니 꼬리를 남기지 않는다 */
  isLast: boolean
}

/*
  개념 하나 — 번호가 아니라 좌측 레일 점으로 구분한다(정의서 §3 "번호가 아니라 레일").
  4단 전부 다른 reach 색을 쓴다(BADGE_CLASS 참고).

  핀(원)과 선의 중심이 실제로 맞도록 수치를 맞춘다 — 핀 10px(size-2.5)이 left-0에서
  시작하면 중심은 5px, 선은 left-1(4px) 위치에 2px 폭(w-0.5)이면 중심도 5px로 같다.
  이전엔 선을 부모 wrapper의 border-l로(카드마다 다른 pl 기준과 안 맞음) 그려서
  핀과 어긋났다(실제로 발견된 문제).

  선은 각 카드 "자신의" 아래쪽 padding(pb-8) 안까지 뻗어 다음 카드 핀까지 이어진다
  — flex gap은 형제 사이 공간이라 어느 카드도 그 구간의 선을 못 그린다. 마지막
  카드는 다음 핀이 없어 padding도 짧고(pb-3) 선도 그 안에서 멈춘다.

  다시 보기 전/후 레벨은 예전엔 explain 박스 안에 별도 2열 박스로 또 있었다 — 카드
  맨 위 레벨 배지와 같은 정보(레벨)를 두 자리에서 다른 모양으로 보여줘서 같은 걸
  말하는지 재차 확인해야 했다(실사용 피드백으로 발견). 배지 바로 아래 "처음엔 …"
  한 줄로 합친다 — L2·L3 같은 내부 등급 표기는 화면에 쓰지 않는다는 규칙(세션
  정의서)을 그대로 따라 REACH_LABEL 사람 말만 쓴다.
*/
export default function ConceptCard({ concept, locked, isLast }: Props) {
  return (
    <div className={cn('relative pl-5', isLast ? 'pb-3' : 'pb-8')}>
      {/* top-[11px] = 핀(top-1.5=6px, size-2.5=10px)의 세로 중심 — 선이 핀 가운데서 뻗어나온다 */}
      <span
        aria-hidden="true"
        className={cn('absolute top-[11px] bottom-0 left-1 w-0.5 bg-border', isLast && 'bottom-3')}
      />
      <span
        className={cn('absolute top-1.5 left-0 size-2.5 rounded-full', PIN_CLASS[concept.level])}
      />

      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-fg">{concept.name}</span>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn('rounded-full px-2.5 py-1 text-xs font-bold', BADGE_CLASS[concept.level])}
          >
            {REACH_LABEL[concept.level]}
          </span>
          {concept.comparedReach && (
            <span className="text-2xs text-fg-subtle">
              처음엔 {REACH_LABEL[concept.comparedReach.before]}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg-muted">{concept.said}</p>

      {concept.explain &&
        (locked ? (
          // 잠김 — 중립 회색 + 점선. "아직 못 본다"는 상태 자체가 신호라 색을 안 쓴다.
          <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border-strong bg-surface-2 p-3 text-sm">
            <LockIcon className="size-4 shrink-0 text-fg-subtle" />
            <b className="text-fg">자세한 해설은 다시 보기를 마치면 열려요</b>
          </div>
        ) : (
          // 열림 — 잠금 박스와 정반대로 보이게 한다: 회색 대신 primary 색, 점선 대신
          // 실선, 자물쇠 대신 열린 자물쇠. 무게(배경+테두리)는 같게 둬서 옆 잠금
          // 박스보다 오히려 흐려 보이는 일이 없게 한다(실사용 피드백으로 발견 —
          // 왼쪽 포인트 선만 있던 이전 버전은 잠금 박스보다 존재감이 약했다).
          <div className="mt-3 rounded-md border border-primary-border bg-primary-soft p-3 text-sm">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-primary">
              <LockOpenIcon className="size-3.5 shrink-0" />
              어디서 막혔나
            </div>
            {concept.explain.map((p, i) => (
              <p key={i} className={cn('leading-relaxed text-fg', i > 0 && 'mt-2')}>
                {p}
              </p>
            ))}
          </div>
        ))}

      {concept.curriculumRef && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg-subtle">
          <BookOpenIcon aria-hidden="true" className="size-3.5 shrink-0" />
          <span>
            교안 {concept.curriculumRef.chapter} · {concept.curriculumRef.pages} ·{' '}
            {concept.curriculumRef.title}
          </span>
        </div>
      )}

      <QaList qa={concept.qa} />
    </div>
  )
}
