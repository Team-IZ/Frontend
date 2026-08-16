import {
  ArrowRightIcon,
  BanIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LockOpenIcon,
  Maximize2Icon,
  MessageCircleIcon,
  PenLineIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import type { SessionMode } from '../types'

/*
  되돌릴 수 없는 행동 앞 — 무엇을·얼마나·나갈 수 있는지 먼저 말한다(체크리스트 B5).
  목업 `.intro`는 흰 카드다(border+shadow) — 캔버스 위에 맨 텍스트만 뜨면 "아직 안
  채워진 자리"처럼 보인다(H10 카드 규칙: 이 화면은 입력·확인이 오가는 폼 성격이라
  카드가 필요한 쪽).

  마지막 체크박스는 목업에서 이미 체크된 아이콘(`<span class="bx">✓</span>`)으로
  그려져 있어 정적 목업은 상태를 확정할 수 없다 — 30~40분·중간이탈불가라는 되돌릴
  수 없는 약속 앞이라, 실제로는 사용자가 "준비됐다"를 확인해야 시작 버튼이 열리는
  게이트로 해석해 구현한다(그냥 장식이면 이 약속이 읽히지 않고 넘어간다).

  7줄을 전부 같은 굵기·같은 간격으로 늘어놓으면(이전 버전) 매 줄에 볼드가 1~2개씩
  붙어도 정작 "이 중 뭐가 제일 중요한지"가 안 읽힌다 — 볼드가 많을수록 볼드의
  신호값이 떨어진다(실사용 피드백으로 발견). 세 묶음(꼭 알아둘 것 · 작성 규칙 ·
  평가 방식)으로 나누고, **묶음당 굵은 구간을 하나씩만** 남긴다 — 나머지는 평문이라
  그 하나가 실제로 눈에 띈다.

  아이콘은 lucide-react로 통일한다(sidebarConfig.ts 근거 — 유니코드 글리프는
  폰트마다 다르게 그려지고 접근성 트리에도 의미 없는 문자로 잡힌다). 짝이 되는
  개념은 같은 아이콘 계열을 쓴다: 숨김=EyeOff ↔ 공개=Eye, 잠김=Lock ↔ 열림=LockOpen.
*/
type Group = { label: string; rows: { icon: LucideIcon; body: React.ReactNode }[] }

export default function IntroScreen({
  mode,
  problemTotal,
  onStart,
}: {
  mode: SessionMode
  /**
   * 실제로 출제된 문제 수. **`3`으로 가정하지 않는다** — 코드에 근거가 없는 개념은
   * 문항이 만들어지지 않아 세션에 나오지 않는다(스펙 명시). 모르면 수를 빼고 말한다.
   */
  problemTotal: number | null
  onStart: () => void
}) {
  const [ready, setReady] = useState(false)

  const groups: Group[] =
    mode === 'FIRST'
      ? [
          {
            label: '꼭 알아두세요',
            rows: [
              /*
                다섯 줄이던 것을 셋으로 줄였다(실사용 피드백 — "너무 많다").
                한 줄 = 한 가지 되돌릴 수 없는 사실로 묶는다:
                  ① 얼마나 걸리나  ② 나갈 수 있나·고칠 수 있나(둘 다 "앞으로만")
                  ③ 무엇이 기록되나
                "문제 3개를 봐요"는 바로 위 제목 문장이 이미 말하므로 지웠다.
              */
              {
                icon: ClockIcon,
                body: (
                  <>
                    <b className="text-fg">문제마다 20분, 전체 1시간</b>까지 쓸 수 있어요. 잘
                    답할수록 더 깊은 질문으로 이어집니다.
                  </>
                ),
              },
              {
                icon: ArrowRightIcon,
                body: (
                  <>
                    <b className="text-fg">시작하면 나갈 수 없고, 낸 답은 고칠 수 없어요.</b>{' '}
                    앞으로만 갑니다.
                  </>
                ),
              },
              {
                icon: Maximize2Icon,
                body: (
                  <>
                    전체화면으로 바뀌고, <b className="text-fg">다른 창을 열면 기록에 남습니다.</b>
                  </>
                ),
              },
            ],
          },
          {
            label: '작성할 때',
            rows: [
              {
                icon: PenLineIcon,
                body: (
                  <>
                    답변은 <b className="text-fg">3~5문장</b>이면 충분해요.
                  </>
                ),
              },
              {
                icon: BanIcon,
                body: (
                  <>
                    <b className="text-fg">붙여넣기는 막혀 있어요.</b> 직접 써 주세요.
                  </>
                ),
              },
            ],
          },
          {
            label: '평가는 이렇게 돼요',
            rows: [
              {
                icon: MessageCircleIcon,
                body: (
                  <>
                    모르겠으면 다시 설명해 달라고 할 수 있어요.{' '}
                    <b className="text-fg">써도 불이익이 없어요.</b>
                  </>
                ),
              },
              {
                icon: EyeOffIcon,
                body: (
                  <>
                    <b className="text-fg">점수는 표시되지 않아요.</b> 결과는 리포트에서 확인합니다.
                  </>
                ),
              },
              {
                icon: EyeIcon,
                body: (
                  <>
                    주고받은 대화는 <b className="text-fg">매니저가 볼 수 있어요.</b>
                  </>
                ),
              },
            ],
          },
        ]
      : [
          {
            label: '꼭 알아두세요',
            rows: [
              {
                icon: ClockIcon,
                body: (
                  <>
                    문제 하나를 처음 단계부터 다시 봐요. 20분까지 쓸 수 있고{' '}
                    <b className="text-fg">시작하면 중간에 나갈 수 없어요.</b>
                  </>
                ),
              },
            ],
          },
          {
            label: '작성할 때',
            rows: [
              {
                icon: PenLineIcon,
                body: (
                  <>
                    답변은 <b className="text-fg">3~5문장</b>이면 충분해요.
                  </>
                ),
              },
              {
                icon: BanIcon,
                body: (
                  <>
                    <b className="text-fg">붙여넣기는 막혀 있어요.</b> 직접 써 주세요.
                  </>
                ),
              },
            ],
          },
          {
            label: '지난번과 다른 점',
            rows: [
              {
                icon: XCircleIcon,
                body: (
                  <>
                    막혔던 문제를 <b className="text-fg">1단계부터 전부 다시</b> 봐요. 기회는 한
                    번입니다.
                  </>
                ),
              },
              {
                icon: InfoIcon,
                body: (
                  <>
                    지금 결과는 그대로예요. <b className="text-fg">성적에 반영되지 않아요.</b>
                  </>
                ),
              },
              {
                icon: LockOpenIcon,
                body: (
                  <>
                    마치면 리포트에 <b className="text-fg">자세한 해설이 열려요.</b>
                  </>
                ),
              },
            ],
          },
        ]

  return (
    <div className="flex h-full items-center justify-center p-8">
      <Card className="w-full max-w-[640px] gap-5 p-8 shadow-card">
        <div>
          <h2 className="text-2xl font-bold text-fg">
            {mode === 'REVIEW' ? '다시 보기 시작하기 전에' : '시작하기 전에'}
          </h2>
          <p className="mt-2 text-fg-muted">
            {mode === 'FIRST' ? (
              <>
                내가 쓴 코드{' '}
                {problemTotal ? <b className="text-fg">{problemTotal}군데</b> : '몇 군데'}에 대해 왜
                그렇게 했는지 이야기하는 시간이에요.
              </>
            ) : (
              <>
                지난번에 막혔던 곳을 다시 봐요. 리포트에서 안내한 교안을 보고 왔다면 시작해도
                좋아요.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 text-xs font-semibold text-fg-subtle">{group.label}</div>
              <div className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
                {group.rows.map((row, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-fg-muted">
                    <row.icon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                    />
                    <span>{row.body}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-fg">
          <Checkbox checked={ready} onCheckedChange={(v) => setReady(v === true)} />
          지금 {mode === 'FIRST' ? '1시간' : '20분'} 동안 방해받지 않을 수 있어요
        </label>

        <div className="flex items-center justify-end gap-3">
          {!ready && (
            <span className="text-xs text-fg-subtle">준비되면 위 항목을 확인해 주세요</span>
          )}
          <Button onClick={onStart} disabled={!ready}>
            전체화면으로 시작하기
          </Button>
        </div>
      </Card>
    </div>
  )
}
