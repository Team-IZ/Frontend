import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { ADMIN_TABS, DEFAULT_ADMIN_TAB, isAdminTab, type AdminTab } from './adminTabs'
import { useCohortScope } from './_/cohortScope'
import { COHORT_STATUS_LABEL } from './_/labels'

/*
  OP-06 운영 관리 — **조직을 세팅한다.** 기수·반·명단·매니저·교안·비용.

  ▸ **헤더의 기수 스위처가 범위를 정한다.** 셸이 원래 그 자리를 갖고 있었는데(스코프
    선택기) 값이 `7기` 자리값 하나였다 — 실제 목록을 여기서 넘겨 동작하게 만든다.
    화면 안에 또 하나를 두지 않는다: 같은 축이 두 개면 어느 쪽이 이기는지 안 보인다.
    반·명단·비용이 이 범위를 따르고, **매니저와 교안만 기관 전체다** — 매니저는 기수를
    옮겨 다니고 교안은 여러 기수가 같이 쓴다.
  ▸ **`반`과 `명단`이 갈려 있다.** 반을 만드는 것과 명단을 넣는 것은 한 흐름이지만 두 표가
    한 뷰포트에 안 들어갔다.
  ▸ **오퍼레이터 계정은 여기 없다.** 초대·정지는 슈퍼어드민(SA-02) 소관이고, 이 화면은
    매니저까지만 다룬다.

  **이 파일은 조립만 한다.** 탭 내용은 각 탭 컴포넌트가 갖는다.
*/

/*
  탭이 경로에 있다 — OP-01 `조치 필요`가 **서로 다른 탭으로 딥링크**한다(미배정·면담
  적체 → 매니저 / 비용 → 비용). useState 탭이면 그 링크를 만들 수 없다.
  모르는 탭으로 들어오면 첫 탭으로 보낸다. 기수는 `?cohort=`로 같이 실린다(cohortScope).
*/
export default function AdminScreen() {
  const { tab } = useParams()
  const navigate = useNavigate()
  const active: AdminTab = isAdminTab(tab) ? tab : DEFAULT_ADMIN_TAB
  const scope = useCohortScope()

  /*
    탭 이름 옆 개수 — **연 탭만 채운다.**

    전에는 `GET /admin/counts` 하나가 여섯 개를 한 번에 줬는데 **서버에 그런 API가 없다.**
    대신 만들려면 화면 진입에 목록 조회 다섯 건이 나가는데, 그건 열지도 않은 탭 때문에
    요청을 보내는 것이라 이 화면이 이미 한 번 고친 문제다(활성 탭만 마운트하는 이유).

    그래서 **각 탭이 자기 목록을 받은 김에 그 수를 알린다.** 안 연 탭은 자리가 빈다 —
    `0`으로 쓰면 없는 사실을 주장한다.
  */
  const [counts, setCounts] = useState<Partial<Record<AdminTab, number | null>>>({})
  const reportCount = useCallback(
    (value: AdminTab) => (count: number | null) =>
      setCounts((prev) => (prev[value] === count ? prev : { ...prev, [value]: count })),
    [],
  )

  return (
    <ConsoleShell
      role="operator"
      /* 목록이 오기 전에는 스코프 자리를 비운다 — 자리값(`7기`)을 그리면 실제 기수인 척한다 */
      cohort={scope.cohortId ?? ''}
      cohorts={scope.cohorts.map((c) => ({
        value: c.cohortId,
        label: c.name,
        detail: COHORT_STATUS_LABEL[c.status],
      }))}
      onCohortChange={scope.setCohort}
    >
      <PageHeader title="운영 관리" />

      <Tabs
        value={active}
        onValueChange={(v) => navigate(`/operator/admin/${v as string}`, { replace: true })}
      >
        <TabsList className="mb-4">
          {ADMIN_TABS.map((t) => {
            /** 아직 안 왔으면 자리를 비운다 — `0`으로 쓰면 없는 사실을 주장한다 */
            const badge = counts[t.value]
            return (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
                {badge != null && (
                  <span className="text-fg-subtle ml-1.5 text-2xs font-normal">{badge}</span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {/*
          **활성 탭만 마운트한다.** 패널은 접근성(aria-controls)을 위해 여섯 개 다 두되,
          내용은 조건부로 넣는다 — 전부 마운트되면 열지도 않은 탭이 조회를 보낸다.
        */}
        {ADMIN_TABS.map(({ value, Panel }) => (
          <TabsContent key={value} value={value}>
            {active === value && <Panel onCount={reportCount(value)} />}
          </TabsContent>
        ))}
      </Tabs>
    </ConsoleShell>
  )
}
