import { useState } from 'react'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { getPlatformSettings } from './mockData'
import ModelPricingTab from './components/ModelPricingTab'
import SuperadminAccountsTab from './components/SuperadminAccountsTab'

/*
  SA-03 플랫폼 설정 — 탭 2(모델·단가 · 슈퍼어드민 계정). 정의서
  (SA-03-platform-settings.md) · 와이어프레임(superadmin/console.html#page-model
  이하)만 보고 새로 짰다(v1 원본 없음, SA-01·SA-02와 같은 사정). 진입점은 네비가
  아니라 Header.tsx 우상단 톱니다(정의서 §2 "화면이라기보다 설정 항목").

  탭들이 mockData.ts를 직접 mutate하는 mock API를 쓰기 때문에, SA-02
  OrgDetailScreen과 같은 패턴으로 React state 대신 "다시 읽어오기"로 반영한다.
*/

export default function PlatformSettingsScreen() {
  const [snapshot, setSnapshot] = useState(() => getPlatformSettings())

  function refresh() {
    setSnapshot(getPlatformSettings())
  }

  return (
    <ConsoleShell role="superadmin">
      <PageHeader title="플랫폼 설정" />

      <Tabs defaultValue="model">
        <TabsList className="mb-4">
          <TabsTrigger value="model">모델 · 단가</TabsTrigger>
          <TabsTrigger value="accounts">슈퍼어드민 계정</TabsTrigger>
        </TabsList>

        <TabsContent value="model">
          <ModelPricingTab snapshot={snapshot} onChange={refresh} />
        </TabsContent>
        <TabsContent value="accounts">
          <SuperadminAccountsTab accounts={snapshot.accounts} onChange={refresh} />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  )
}
