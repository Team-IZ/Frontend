import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

/*
  dev 전용 — 트레이니 4화면(TR-01~04)의 목 상태를 전부 한 번에 클릭해서 재현하는
  체크리스트다. 목업의 `#cases` 표(케이스 계약 · 클릭하면 그 상태로)와 같은 역할을
  실제 앱 URL에 대해 한다 — 화면마다 `?state=` 문법이 달라(대소문자·파라미터 조합)
  손으로 치면 실수하기 쉽다.

  `/ui-preview`처럼 라우트에 직접 등록한다(features/*.route.tsx 글롭 대상이 아니다
  — 실제 화면이 아니라 QA 도구다).
*/

type CaseLink = { label: string; to: string; note?: string }
type ScreenSection = { title: string; liveFlowTo: string; cases: CaseLink[]; manual?: string[] }

const SECTIONS: ScreenSection[] = [
  {
    title: 'TR-01 홈',
    liveFlowTo: '/trainee/home',
    /*
      **실서버에 붙어서 ?state= 케이스가 없다.** 상태는 서버가 정하므로 목처럼 눌러서
      재현할 수 없다 — 지금 계정이 실제로 어느 회차에 있는지가 그대로 나온다.
      다른 상태를 보려면 백엔드 데이터를 바꾸거나 다른 계정으로 들어가야 한다.
    */
    cases: [],
    manual: [
      '실서버 연동됨 — 서버가 대표 상태(representativeStatus 10종)를 정한다',
      '경고 배지는 배열이라 여러 개가 동시에 뜰 수 있다(마감 지남 + 분석 실패)',
    ],
  },
  {
    title: 'TR-02 코드 제출',
    liveFlowTo: '/trainee/submission',
    // 실서버 연동됨 — 상태는 서버가 정하므로 ?state=로 눌러 재현할 수 없다
    cases: [],
    manual: [
      '실서버 연동됨 — status 6종(DRAFT·ANALYZING·READY·LOCKED·ANALYSIS_FAILED·SUBMISSION_CLOSED)을 서버가 정한다',
      'GitHub 탭은 잠겨 있다 — 서버는 GITHUB_URL을 허용한다고 하는데 POST /submissions가 사용 불가라 화면이 막아 뒀다(SubmissionForm 주석)',
      'ZIP 용량 초과 — 50MB(52,428,800바이트) 넘는 파일을 고르면 업로드 전에 막힌다',
    ],
  },
  {
    title: 'TR-03 검증 세션 (전체화면)',
    liveFlowTo: '/trainee/session',
    cases: [
      { label: '시작 전 안내', to: '/trainee/session?state=intro' },
      { label: '개념 진입 · 1단계 질문', to: '/trainee/session?state=ask' },
      { label: '1단계 통과 → 2단계', to: '/trainee/session?state=thread' },
      { label: '미달 1회 · 힌트 1개', to: '/trainee/session?state=again' },
      { label: '미달 2회 · 힌트 소진', to: '/trainee/session?state=hintgone' },
      { label: '다음 질문 대기', to: '/trainee/session?state=waiting' },
      { label: '3단계(대안 비교)까지 진행', to: '/trainee/session?state=deeper' },
      { label: '마지막 개념의 마지막 단계', to: '/trainee/session?state=last' },
      { label: '개념 종료 · 접힘(STOP)', to: '/trainee/session?state=stop' },
      { label: '다음 개념 예고', to: '/trainee/session?state=next' },
      { label: '정상 종료', to: '/trainee/session?state=end' },
      { label: '세션 1시간 초과 종료', to: '/trainee/session?state=timeout' },
      { label: '다시 보기 · 시작 전 안내', to: '/trainee/session?retry=1&state=intro' },
      { label: '다시 보기 · 1단계부터', to: '/trainee/session?retry=1&state=ask' },
      { label: '다시 보기 · 종료', to: '/trainee/session?retry=1&state=end' },
    ],
    manual: [
      '힌트 고리 — ?state=ask 에서 짧은 답(25자 미만)을 세 번 제출하면 힌트 2개 뒤 개념이 닫힌다',
      '통과 — 100자 넘게 쓰면 다음 단계로 올라간다(길이 휴리스틱, api.ts 주석 참고)',
      '창 이탈 토스트 — 세션 진입 후 다른 탭으로 갔다가 2초 뒤 돌아오기',
      '네트워크 끊김 오버레이 — 개발자 도구 › Network › Throttling을 Offline으로',
    ],
  },
  {
    title: 'TR-04 내 리포트',
    liveFlowTo: '/trainee/report',
    // 실서버 연동됨 — 상태는 서버가 정하므로 ?state=로 눌러 재현할 수 없다
    cases: [],
    manual: [
      '실서버 연동됨 — 좌측 레일에서 회차를 바꾸면 상태 6종을 실제 데이터로 볼 수 있다(요청은 한 번뿐, 나머지는 캐시)',
      '공개 범위는 리포트 단위다 — SUMMARY 회차는 전 개념에서 문답·해설이 통째로 빠진다(서버가 안 보낸다)',
      '재시험은 문답이 두 벌로 오지 않는다 — 전후 도달 단계(comparedReach)만 오고 배지 옆 한 줄로 나온다',
    ],
  },
]

export default function TraineeCaseIndex() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-1 text-2xl font-bold text-fg">트레이니 화면 케이스 인덱스</h1>
      <p className="mb-6 text-sm text-fg-subtle">
        dev 전용. 실제 화면엔 이 페이지로 오는 링크가 없다 — 주소를 기억해 두거나 즐겨찾기에 둔다.
        연동 시 각 화면의 <code className="rounded bg-surface-2 px-1">?state=</code> 분기와 함께
        지운다.
      </p>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {section.title}
                <Link
                  to={section.liveFlowTo}
                  className="text-xs font-normal text-primary hover:underline"
                >
                  실제 흐름으로 열기 →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {section.cases.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-fg hover:border-primary hover:bg-primary-soft hover:text-primary"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
              {section.manual && (
                <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
                  {section.manual.map((m) => (
                    <div key={m} className="flex items-start gap-2 text-xs text-fg-subtle">
                      <Badge variant="warning" className="shrink-0">
                        수동
                      </Badge>
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
