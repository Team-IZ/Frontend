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
    cases: [
      { label: '미제출', to: '/trainee/home?state=todo' },
      { label: '분석 중', to: '/trainee/home?state=analyzing' },
      { label: '응시 가능', to: '/trainee/home?state=ready' },
      { label: '응시 완료', to: '/trainee/home?state=done' },
      { label: '다시 보기 대상', to: '/trainee/home?state=retry' },
      { label: '분석 실패', to: '/trainee/home?state=failed' },
      { label: '응시 창 마감', to: '/trainee/home?state=closed' },
      { label: '제출 마감 지남', to: '/trainee/home?state=missed' },
      { label: '진행 중인 회차 없음', to: '/trainee/home?state=none' },
      { label: '조회 실패', to: '/trainee/home?state=error' },
    ],
  },
  {
    title: 'TR-02 코드 제출',
    liveFlowTo: '/trainee/submission',
    cases: [
      { label: '작성 중(빈 폼)', to: '/trainee/submission?state=draft' },
      { label: '분석 중', to: '/trainee/submission?state=analyzing' },
      { label: '분석 완료 · 재제출 가능', to: '/trainee/submission?state=ready' },
      { label: '세션 시작 후 잠김', to: '/trainee/submission?state=locked' },
      { label: '분석 실패', to: '/trainee/submission?state=analysis_failed' },
      { label: '제출 마감 지남', to: '/trainee/submission?state=submission_closed' },
      { label: '조회 실패', to: '/trainee/submission?state=error' },
    ],
    manual: [
      '저장소 확인 실패 — draft에서 저장소 주소에 "notfound" 포함해 입력 후 포커스 아웃',
      'ZIP 용량 초과 — ZIP 업로드 탭에서 50MB 넘는 파일 선택',
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
    cases: [
      { label: '발행 · 다시 볼 문제 있음', to: '/trainee/report?state=locked' },
      { label: '다시 보기 마친 뒤', to: '/trainee/report?state=after' },
      { label: '발행 전', to: '/trainee/report?state=pre' },
      { label: '공개 범위 미지정', to: '/trainee/report?state=private' },
      { label: '미응시', to: '/trainee/report?state=missed' },
      { label: '무효 응시(확인 필요)', to: '/trainee/report?state=void' },
      { label: '중단', to: '/trainee/report?state=stopped' },
      { label: '조회 실패', to: '/trainee/report?state=error' },
      { label: '리포트 하나도 없음', to: '/trainee/report?state=empty' },
    ],
    manual: [
      '다시 볼 문제 없음(클리어) · 개념별 문답 펼치기는 locked 상태에서 레일의 미프 1·2차를 클릭',
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
