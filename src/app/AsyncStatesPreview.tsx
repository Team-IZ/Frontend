import { Link, useSearchParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Step1, Step2, Step3, Step4, Step5, Step6 } from './_async-preview/steps'

/*
  dev 전용 — 비동기 상태 표준(`docs/dev/async-states.md`)을 **눈으로 확인하는 자리**다.

  ▸ **화면 한 벌을 통째로 그린다.** 컴포넌트만 따로 놓으면 *"우리 화면에서 이게 어떻게
    보이나"* 에 답하지 못한다 — 제목 줄·툴바·표·푸터가 같이 있어야 도착 전후로 무엇이
    움직이는지가 보인다. 더미는 실제 응답과 같은 모양이다(`_async-preview/data`).
  ▸ **`ConsoleShell` 안에서 그린다.** 실제 사이드바·여백(32px)·상한(1280px)을 거치므로
    **여기서 본 크기가 실제 크기**다.
  ▸ **실물 컴포넌트를 부른다.** `ErrorState`·`Empty`·`TableSkeleton`·`staleProps`가 앱과
    같은 코드다 — 그래서 이 페이지가 깨지면 앱도 깨져 있다.
  ▸ 단계는 `?step=`으로 갖는다. 링크를 붙여 넣어 같은 화면을 열 수 있어야 한다.

  실제 앱에는 이 페이지로 오는 링크가 없다(`/ui-preview`와 같은 관례). 라우트에
  직접 등록한다 — 라우트 글롭(`*.route.tsx`) 대상이 아니다. QA 도구이지 화면이 아니다.
*/

type Step = {
  no: number
  title: string
  /** 이 단계가 없앤 것 — 한 줄 */
  fixed: string
  render: () => React.ReactNode
}

const STEPS: Step[] = [
  {
    no: 1,
    title: '실패가 원인에 맞는 말을 한다',
    fixed: 'errorCopy · ErrorState · 렌더 예외 그물',
    render: () => <Step1 />,
  },
  {
    no: 2,
    title: '조건을 바꿔도 표가 사라지지 않는다',
    fixed: 'placeholderData · staleProps · 검색 디바운스',
    render: () => <Step2 />,
  },
  {
    no: 3,
    title: '「없는 것」 3종을 갈라 쓴다',
    fixed: 'Empty variant — pending · empty · failed',
    render: () => <Step3 />,
  },
  {
    no: 4,
    title: '첫 진입은 스켈레톤',
    fixed: 'TableSkeleton · Loading 공용화 · LoadFailed 삭제',
    render: () => <Step4 />,
  },
  {
    no: 5,
    title: '규칙을 CI가 지킨다',
    fixed: 'isLoading 일괄 · check:async 스캐너',
    render: () => <Step5 />,
  },
  {
    no: 6,
    title: '한 화면만 다른 길을 쓰지 않는다',
    fixed: 'OP-05를 생성 훅으로 · 기수를 스코프로',
    render: () => <Step6 />,
  },
]

export default function AsyncStatesPreview() {
  const [params, setParams] = useSearchParams()
  const active = STEPS.find((s) => s.no === Number(params.get('step'))) ?? STEPS[0]

  return (
    <ConsoleShell role="operator" cohort="9기">
      <PageHeader
        breadcrumb="dev › 비동기 상태 표준"
        title={`${active.no}단계 · ${active.title}`}
        breakdown={<span className="text-fg-subtle">{active.fixed}</span>}
        action={
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link to="/operator/projects" />}
          >
            실제 화면으로 →
          </Button>
        }
      />

      <div className="border-border mb-6 flex flex-wrap gap-1.5 border-b pb-4">
        {STEPS.map((s) => (
          <Button
            key={s.no}
            size="sm"
            variant={s.no === active.no ? 'primary' : 'ghost'}
            onClick={() => setParams({ step: String(s.no) })}
          >
            {s.no}. {s.title}
          </Button>
        ))}
      </div>

      {active.render()}
    </ConsoleShell>
  )
}
