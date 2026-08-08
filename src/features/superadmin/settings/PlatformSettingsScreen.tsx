import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { Button } from '@/components/ui/Button'
import { useFindModelSettings } from '@/api/platform/usePlatformQueries'
import ModelPricingTab from './components/ModelPricingTab'
import SuperadminAccountsTab from './components/SuperadminAccountsTab'

/*
  SA-03 플랫폼 설정 — 탭 2(모델·단가 · 슈퍼어드민 계정).
  진입점은 네비가 아니라 Header 우상단 톱니다(정의서 §2 "화면이라기보다 설정 항목").

  **탭이 각자 조회한다.** 예전에는 이 화면이 스냅샷 하나를 읽어 두 탭에 내려주고
  변경 후 `refresh()`로 다시 읽었는데, 지금은 쓰기 훅이 성공하면 **그 도메인 조회가 전부
  무효화**되어 저절로 다시 읽힌다(생성 훅 기본 동작). 부모가 갱신을 중개할 이유가 없다.

  다만 모델·단가 탭은 **한 응답에 세 덩어리**(채점 정책·티어 매핑·단가)가 같이 오므로
  조회는 여기서 한 번만 한다 — 탭 안에서 또 부르면 같은 응답을 두 번 그린다.
*/

export default function PlatformSettingsScreen() {
  const { data, isPending, isError, refetch } = useFindModelSettings()

  return (
    <ConsoleShell role="superadmin">
      <PageHeader title="플랫폼 설정" />

      <Tabs defaultValue="model">
        <TabsList className="mb-4">
          <TabsTrigger value="model">모델 · 단가</TabsTrigger>
          <TabsTrigger value="accounts">슈퍼어드민 계정</TabsTrigger>
        </TabsList>

        <TabsContent value="model">
          {isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>설정을 불러오지 못했습니다</EmptyTitle>
                <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
              </EmptyHeader>
              <Button variant="ghost" onClick={() => refetch()}>
                다시 시도
              </Button>
            </Empty>
          ) : isPending ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <ModelPricingTab settings={data} />
          )}
        </TabsContent>

        <TabsContent value="accounts">
          <SuperadminAccountsTab />
        </TabsContent>
      </Tabs>
    </ConsoleShell>
  )
}
