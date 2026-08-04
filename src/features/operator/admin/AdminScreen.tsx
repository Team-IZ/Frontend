import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useAsync } from '@/lib/useAsync'
import { getAdminCounts } from './_/api/api'
import { ADMIN_TABS, DEFAULT_ADMIN_TAB, isAdminTab, type AdminTab } from './adminTabs'
import { COHORT_ID } from './_/cohortScope'

/*
  OP-06 운영 관리 — **조직을 세팅한다.** 기수·반·명단·매니저·교안·비용.

  ▸ **상단 기수 스위처가 범위를 정한다.** 반·명단·비용은 "지금 고른 기수"이고, 매니저와
    교안만 기관 전체다 — 매니저는 기수를 옮겨 다니고 교안은 여러 기수가 같이 쓴다.
    그래서 탭 이름 옆 개수의 범위도 갈린다(`getAdminCounts` 주석).
  ▸ **`반`과 `명단`이 한 탭이다.** 반을 만드는 것과 명단을 넣는 것은 한 흐름인데 탭이
    갈리면 계속 오간다 — 반 하나를 추가하고 바로 그 반에 사람을 넣는 것이 실제 동선이다.
  ▸ **오퍼레이터 계정은 여기 없다.** 초대·정지는 슈퍼어드민(SA-02) 소관이고, 이 화면은
    매니저까지만 다룬다.

  **이 파일은 조립만 한다.** 탭 내용은 각 탭 컴포넌트가, 조회는 `api`가 갖는다.
*/

/*
  탭이 경로에 있다 — OP-01 `조치 필요`가 **서로 다른 탭으로 딥링크**한다(미배정·면담
  적체 → 매니저 / 비용 → 비용). useState 탭이면 그 링크를 만들 수 없다.
  모르는 탭으로 들어오면 첫 탭으로 보낸다.
*/
export default function AdminScreen() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const active: AdminTab = isAdminTab(tab) ? tab : DEFAULT_ADMIN_TAB

  const loadCounts = useCallback(() => getAdminCounts(COHORT_ID), [])
  const counts = useAsync(loadCounts)

  return (
    <ConsoleShell role="operator">
      <PageHeader title="운영 관리" />

      <Tabs
        value={active}
        onValueChange={(v) => navigate(`/operator/admin/${v as string}`, { replace: true })}
      >
        <TabsList className="mb-4">
          {ADMIN_TABS.map((t) => {
            /** 아직 안 왔으면 자리를 비운다 — `0`으로 쓰면 없는 사실을 주장한다 */
            const badge = t.badge(counts.data)
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {badge && (
                  <span className="text-fg-subtle ml-1.5 text-2xs font-normal">{badge}</span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/*
          **활성 탭만 마운트한다.** 패널은 접근성(aria-controls)을 위해 다섯 개 다 두되,
          내용은 조건부로 넣는다 — 다섯 탭이 전부 마운트되면 열지도 않은 탭이 조회를
          보낸다. 개수는 위에서 한 번에 받았으므로 목록까지 미리 부를 이유가 없다.
        */}
        {ADMIN_TABS.map(({ value, Panel }) => (
          <TabsContent key={value} value={value}>
            {active === value && <Panel onCountsChange={counts.reload} />}
          </TabsContent>
        ))}
      </Tabs>
    </ConsoleShell>
  )
}
