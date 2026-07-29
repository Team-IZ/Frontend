import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, RotateCwIcon } from 'lucide-react'
import ManagerShell from '@/shells/ManagerShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TableFrame } from '@/components/common/TableFrame'
import { CURRICULA, CURRICULUM_DETAILS, type ExtractionStatus } from './mockData'
import { ExtractionStatusBadge } from './components/StatusBadges'
import SectionTopicTable from './components/SectionTopicTable'
import CoverageSummary from './components/CoverageSummary'

/*
  SC-M12 · CUR-01+CUR-02 교안 상세(D103 통합 1화면). 목록 행(교안명·"주제 확인 →")으로 진입.

  위→아래로 ①섹션·주제 표 ②커버리지 요약 ③범위 좁히기 안내 ④축→섹션 위치 고정
  규칙. 구 '교안 연결' 탭은 교안 구성과 중복이라 이 한 화면으로 합쳤다(D103).

  열람은 총괄·담당 둘 다, 저작(재분석·주제 편집)은 총괄만(D91) — isLead가 저작만
  가린다. 인증이 붙기 전까지 역할은 목록 화면과 같은 방식으로 고정한다.

  ★ 화면에 없는 것(D93 삭제): 추출 신뢰도 바·폴백 배지·"AI 제안" 표시·evidence
  덤프. 추출 내부(신뢰도·refine·청크)는 telemetry라 매니저 화면에 노출하지 않는다.

  레이아웃: 콘텐츠를 중앙 max-w-5xl로 모아 양옆 여백을 준다(넓은 모니터에서 오른쪽이
  휑해 보이지 않게). 뒤로가기는 등록 화면과 같은 큰 화살표 버튼 패턴을 재사용한다.
*/

// 축 → 섹션 내 위치 규칙. 고정값이고 편집 대상이 아니다(D94). 리포트 시점에 학생의
// 취약 (주제,축)으로 섹션 안 위치를 안내할 때 쓰는 규칙을 그대로 보여준다.
const AXIS_RULES: { axis: string; location: string }[] = [
  { axis: '반례대응', location: '주의 · 반례 부분' },
  { axis: '코드이해', location: '개념 설명 부분' },
  { axis: '대안비교', location: '비교 · 트레이드오프 부분' },
  { axis: '자기수정', location: '복구 · 수정 부분' },
  { axis: '의사소통', location: '교안 위치 안내 대상 아님(코드 설명 능력)' },
]

const COHORT_LABEL = '7기'
const USER = { name: '박지현', role: '총괄 매니저' }

export default function CurriculumDetailScreen() {
  const { id = '' } = useParams()
  const isLead = true

  const curriculum = CURRICULA.find((c) => c.id === id)
  const detail = CURRICULUM_DETAILS[id]

  if (!curriculum) {
    return (
      <ManagerShell user={USER} cohort={COHORT_LABEL} isLead={isLead}>
        <div className="mx-auto max-w-5xl">
          <BackRow title="교안 상세" />
          <Card className="items-center gap-2 p-10 text-center">
            <p className="text-lg font-semibold">교안을 찾을 수 없습니다</p>
            <p className="text-fg-subtle text-sm">삭제되었거나 잘못된 주소일 수 있습니다.</p>
          </Card>
        </div>
      </ManagerShell>
    )
  }

  const status = curriculum.extractionStatus
  // 추출이 끝나 섹션·주제 데이터가 있을 때만 표·커버리지·규칙을 보여준다.
  const showStructure = status === 'EXTRACTED' && !!detail

  return (
    <ManagerShell user={USER} cohort={COHORT_LABEL} isLead={isLead}>
      <div className="mx-auto max-w-5xl">
        {/* 뒤로가기 + 교안명(제목) + 버전 + 상태 — 등록 화면과 같은 큰 버튼 패턴 */}
        <BackRow title={curriculum.name}>
          <span className="text-fg-muted font-mono text-sm font-normal">{curriculum.version}</span>
          <ExtractionStatusBadge status={status} />
          {detail && (
            <span className="text-fg-subtle text-sm">· {detail.sections.length}개 섹션</span>
          )}
          {isLead && (status === 'EXTRACTED' || status === 'EXTRACTION_FAILED') && (
            <Button variant="ghost" size="sm" className="ml-auto">
              <RotateCwIcon />
              재분석
            </Button>
          )}
        </BackRow>
        <p className="text-fg-subtle mb-6 text-sm">
          {curriculum.type} · 최종 수정 {curriculum.updatedAt}
        </p>

        {showStructure ? (
          <div className="flex flex-col gap-8">
            {/* 안내 — 프로젝트 연결 없이도 기수 전체에서 위치를 찾는다는 것을 알린다(D103) */}
            <p className="text-fg-muted text-base">
              주제는 자동으로 추출됩니다. 이 기수 학생이 그 주제에서 막히면 이 교안 위치가
              안내됩니다 — 프로젝트 연결은 필요 없습니다. 틀린 주제만 고치세요.
            </p>

            {/* ① 섹션·주제 표 */}
            <TableFrame>
              <SectionTopicTable sections={detail.sections} editable={isLead} />
            </TableFrame>

            {/* ② 커버리지 요약 */}
            <CoverageSummary
              cohortLabel={COHORT_LABEL}
              total={detail.cohortTopicTotal}
              covered={detail.coveredCount}
              uncovered={detail.uncoveredTopics}
            />

            {/* ③ 범위 좁히기 안내 — 기본은 기수 전체, 링크는 선택적 좁히기(D103) */}
            <p className="text-fg-subtle text-sm">
              특정 프로젝트만 이 교안으로 한정하려면{' '}
              <b className="text-fg-muted">[프로젝트] → 개요 → 적용 교안</b>에서 지정하세요.
              지정하지 않으면 기수 전체 교안에서 자동으로 가장 맞는 위치를 찾습니다.
            </p>

            {/* ④ 축 → 섹션 내 위치 고정 규칙 */}
            <div className="border-border bg-surface-2 rounded-md border p-6">
              <div className="mb-4 flex items-center gap-2">
                <h4 className="text-base font-semibold">축 → 섹션 내 위치 규칙</h4>
                <span className="border-border-strong text-fg-subtle rounded-full border bg-white px-2.5 py-0.5 text-xs font-semibold">
                  고정 · 편집 대상 아님
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {AXIS_RULES.map((r) => (
                  <span
                    key={r.axis}
                    className="border-border text-fg-muted inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-sm"
                  >
                    <b className="text-fg">{r.axis}</b>→<span>{r.location}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <StructurePending status={status} isLead={isLead} />
        )}
      </div>
    </ManagerShell>
  )
}

/*
  뒤로가기(큰 화살표) + 제목 한 줄. 등록 화면(CurriculumUploadScreen)의 패턴을
  그대로 따른다 — PageHeader의 h1은 접근성용으로 sr-only, 시각 제목은 이 줄에 둔다.
*/
function BackRow({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <div className="[&_h1]:sr-only">
        <PageHeader breadcrumb="교안 목록 › 교안 상세" title="교안 상세" />
      </div>
      <div className="mt-2 mb-2 flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          aria-label="교안 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to="/manager/curriculum" />}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">{title}</span>
        {children}
      </div>
    </>
  )
}

// 추출이 끝나지 않았거나(대기·진행) 실패했거나, 추출은 됐지만 상세 데이터를 못 불러온
// 교안 — 표 대신 상태별 안내만 보여준다.
function StructurePending({ status, isLead }: { status: ExtractionStatus; isLead: boolean }) {
  const COPY: Record<ExtractionStatus, { title: string; body: string }> = {
    UPLOADED: {
      title: '구조 분석 대기 중',
      body: '업로드가 끝났습니다. 곧 구조 추출이 시작되면 섹션과 주제가 표시됩니다.',
    },
    EXTRACTING: {
      title: '구조 분석 중…',
      body: '교안에서 섹션 경계를 추출하고 있습니다. 완료되면 섹션·주제 표가 나타납니다.',
    },
    EXTRACTION_FAILED: {
      title: '구조 추출 실패',
      body: '이 교안은 구조를 추출하지 못했습니다. 재분석하거나 목록에서 삭제할 수 있습니다.',
    },
    // 추출은 완료됐는데 섹션 데이터를 못 불러온 경우(정상 흐름에선 발생하지 않음).
    EXTRACTED: {
      title: '섹션 정보를 불러올 수 없습니다',
      body: '추출은 완료됐지만 섹션·주제 데이터를 불러오지 못했습니다. 잠시 후 다시 시도하세요.',
    },
  }
  const { title, body } = COPY[status]

  return (
    <Card className="items-center gap-2 p-10 text-center">
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-fg-subtle max-w-md text-sm">{body}</p>
      {status === 'EXTRACTION_FAILED' && isLead && (
        <Button variant="ghost" size="sm" className="mt-2">
          <RotateCwIcon />
          재분석
        </Button>
      )}
    </Card>
  )
}
