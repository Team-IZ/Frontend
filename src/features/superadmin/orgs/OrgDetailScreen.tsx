import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { getOrgDetail, orgStatusBadge } from './mockData'
import OverviewTab from './components/detail/OverviewTab'
import OperatorsTab from './components/detail/OperatorsTab'
import UsageTab from './components/detail/UsageTab'
import SettingsTab from './components/detail/SettingsTab'

/*
  SA-02 기관 상세 — 탭 4(개요·오퍼레이터·사용량 · 비용·설정). 정의서
  (SA-02-org-detail.md) · 와이어프레임(superadmin/console.html#page-overview
  이하)만 보고 새로 짰다(v1 원본 없음, SA-01과 같은 사정). 케이스별 판단은
  mockData.ts의 "SA-02 기관 상세" 섹션 주석에 몰아뒀다.

  탭들이 mockData.detailStore를 직접 mutate하는 mock API(초대·정지·설정 변경·삭제
  요청)를 쓰기 때문에, 이 화면은 그 변경을 React state로 들고 있지 않고 "다시
  읽어오기"로 반영한다 — refresh()가 getOrgDetail을 재호출해 org·detail을 새
  객체로 세팅한다(SA-01 OrgListScreen의 setOrgs([...ORGS])와 같은 패턴).
*/

export default function OrgDetailScreen() {
  const { id = '' } = useParams()
  const [snapshot, setSnapshot] = useState(() => getOrgDetail(id))

  function refresh() {
    setSnapshot(getOrgDetail(id))
  }

  if (!snapshot) {
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
          </Card>
        </div>
      </ConsoleShell>
    )
  }

  const { org, detail } = snapshot
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
          <OverviewTab org={org} detail={detail} />
        </TabsContent>
        <TabsContent value="operators">
          <OperatorsTab org={org} detail={detail} onChange={refresh} />
        </TabsContent>
        <TabsContent value="usage">
          <UsageTab org={org} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab org={org} detail={detail} onChange={refresh} />
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
