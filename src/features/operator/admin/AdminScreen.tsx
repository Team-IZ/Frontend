import { useLocation, useNavigate, useParams } from 'react-router'
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
  /* 탭을 옮겨도 `?cohort=`를 그대로 들고 간다 — 아래 `onValueChange` 참고 */
  const { search } = useLocation()
  const active: AdminTab = isAdminTab(tab) ? tab : DEFAULT_ADMIN_TAB
  const scope = useCohortScope()

  /*
    ⚠ **탭 이름 옆 개수를 걷어냈다.**

    각 탭이 자기 목록을 받은 김에 수를 알리는(`onCount`) 방식이었다. 서버에 합계 API가
    없어서 그렇게 했는데, 그 구조가 **답할 수 없는 값을 답하는 척**하고 있었다.

    ▸ **안 연 탭은 영원히 빈칸이다.** 여섯 중 하나만 차 있는 줄이 늘 있었다
    ▸ **기수를 바꾸면 연 탭만 갱신된다.** 9기 명단 258을 보고 8기로 옮기면, 명단 탭에
      다시 들어가기 전까지 배지는 **9기의 수를 그대로 달고 있다** — 틀린 값이다

    제대로 하려면 여섯 조회를 상시 돌려야 하는데, 그건 **안 연 탭은 안 부른다**는 이
    화면의 설계를 뒤집는다(진입 요청 1건 → 6건).

    배지가 답하던 질문(*"명단이 몇 명이지"*)은 **그 탭에 들어가면 머리가 크게 말한다**
    (`SectionHeader`의 `count`). 값어치는 낮고 오답 위험은 큰 자리라 없앤다.
  */

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
        /*
          ⚠ **쿼리를 같이 들고 간다.** 전에는 경로만 넘겨서 탭을 누르는 순간 `?cohort=`가
          사라졌고, `useCohortScope`가 *"고른 기수가 없다"* 로 읽어 **기본값(진행 중
          기수)으로 되돌렸다.** 개강 전 기수를 골라 반을 만들려던 사람이 탭을 옮기면
          9기 화면을 보게 됐고, 화면은 그 사실을 말해 주지 않았다(실측 — 스위처는
          10기인데 조회는 9기로 나갔다).

          `?cohort=`를 쓰는 이유 자체가 **링크 하나가 「10기의 반 탭」을 가리키게**
          하려는 것인데, 탭 이동이 그 절반을 지우고 있었다.
        */
        onValueChange={(v) =>
          navigate(`/operator/admin/${v as string}${search}`, { replace: true })
        }
      >
        <TabsList className="mb-4">
          {ADMIN_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/*
          **활성 탭만 마운트한다.** 패널은 접근성(aria-controls)을 위해 여섯 개 다 두되,
          내용은 조건부로 넣는다 — 전부 마운트되면 열지도 않은 탭이 조회를 보낸다.
        */}
        {ADMIN_TABS.map(({ value, Panel }) => (
          <TabsContent key={value} value={value}>
            {active === value && <Panel />}
          </TabsContent>
        ))}
      </Tabs>
    </ConsoleShell>
  )
}
