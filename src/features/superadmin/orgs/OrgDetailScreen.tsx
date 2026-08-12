import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { useFindOrganization } from '@/api/organization/useOrganizationQueries'
import { orgStatusBadge } from './labels'
import OverviewTab from './components/detail/OverviewTab'
import OperatorsTab from './components/detail/OperatorsTab'
import UsageTab from './components/detail/UsageTab'
import SettingsTab from './components/detail/SettingsTab'

/*
  SA-02 기관 상세 — 탭 4(개요·오퍼레이터·사용량 · 비용·설정).

  ## 이 화면은 헤더에 필요한 것만 조회한다
  기관 이름과 상태 배지가 전부다. **탭 데이터는 각 탭이 자기 것을 조회한다** —
  SA-03 플랫폼 설정과 같은 구조다(SuperadminAccountsTab이 자기 목록을 직접 읽는다).

  화면이 4탭 데이터를 다 받아 내려주면 **첫 진입에 조회가 4건 나가는데 사용자가 보는
  것은 1건**이다(mock-first-screens.md §6-1: "화면 진입당 조회 수는 화면이 실제로
  그리는 데이터 수와 같아야 한다"). 탭을 눌러야 그 탭이 조회한다.

  ## refresh()가 없어진 이유
  목일 때는 탭들이 detailStore를 직접 고치고 이 화면이 다시 읽어 내려줬다. 지금은
  **쓰기 훅이 성공하면 그 도메인 조회가 자동으로 무효화**되므로 화면이 중개하지 않는다.
*/

export default function OrgDetailScreen() {
  const { id = '' } = useParams()
  const {
    data: org,
    isPending,
    isError,
    refetch,
  } = useFindOrganization({ path: { organizationId: id } })

  if (isPending) {
    return (
      <ConsoleShell role="superadmin">
        <div className="[&_h1]:sr-only">
          <PageHeader breadcrumb="기관" title="기관 상세" />
        </div>
        <div className="mb-4 flex items-center gap-2.5">
          <BackButton />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </ConsoleShell>
    )
  }

  /*
    404와 그 밖의 실패를 가르지 않는다 — `isError`는 원인을 안 가른다. 문구는 "없는 기관"
    가정 그대로 두되(대부분 그 경우다), 일시적 5xx·네트워크 장애도 같은 분기를 타므로
    재시도 수단은 다른 탭들과 똑같이 둔다(SA-02 하드닝 2라운드 A2 — 렌더 확인 결과 실제로
    새로고침 말고는 복구할 방법이 없었다).
  */
  if (isError) {
    return (
      <ConsoleShell role="superadmin">
        <div className="mx-auto max-w-3xl">
          <div className="[&_h1]:sr-only">
            <PageHeader breadcrumb="기관" title="기관 상세" />
          </div>
          <div className="mb-4 flex items-center gap-2.5">
            <BackButton />
            <span className="text-fg text-xl font-bold tracking-[-0.01em]">기관 상세</span>
          </div>
          <Card className="items-center gap-2 p-10 text-center">
            <p className="text-lg font-semibold">기관을 찾을 수 없습니다</p>
            <p className="text-fg-subtle text-sm">삭제되었거나 잘못된 주소일 수 있습니다.</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          </Card>
        </div>
      </ConsoleShell>
    )
  }

  const badge = orgStatusBadge(org)

  return (
    <ConsoleShell role="superadmin">
      <div className="[&_h1]:sr-only">
        <PageHeader breadcrumb={`기관 › ${org.name}`} title="기관 상세" />
      </div>

      <div className="mb-4 flex items-center gap-2.5">
        <BackButton />
        <span className="text-fg text-xl font-bold tracking-[-0.01em]">{org.name}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="operators">오퍼레이터</TabsTrigger>
          <TabsTrigger value="usage">사용량 · 비용</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab org={org} />
        </TabsContent>
        <TabsContent value="operators">
          <OperatorsTab org={org} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab org={org} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab org={org} />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  )
}

function BackButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="기관 목록으로 돌아가기"
      nativeButton={false}
      render={<Link to="/superadmin/orgs" />}
      className="p-1.5"
    >
      <ArrowLeft className="size-5" />
    </Button>
  )
}
