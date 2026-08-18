import { Link, useNavigate } from 'react-router'
import ConsoleShell from '@/shells/ConsoleShell'
import PageHeader from '@/components/common/PageHeader'
import { TableFrame } from '@/components/common/TableFrame'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import TableSkeleton from '@/components/common/TableSkeleton'
import { SlowNotice } from '@/components/common/Loading'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { useManagerCohort } from '@/stores/cohortScope'
import { useLinkedCurricula } from './_/api/api'
import { analysisLabel, versionLabel } from './_/api/types'

/*
  MG-09 교안 목록. 이 기수 회차에 연결된 것만 보여준다 — 등록·재분석은
  오퍼레이터(OP-06) 소관이라 이 화면엔 쓰기 액션이 하나도 없다(정의서 §6).
  서버 조회(`linked-curricula`)도 정확히 그 범위다.

  검색·필터를 두지 않는다 — 기수당 교안이 3~5개라 목록으로 충분하다(§8).
  그래서 TableFrame의 툴바 슬롯 없이 표를 바로 붙인다(v1 CUR-03과 다른 점).

  ⚠ **페이지네이션이 없다.** 응답이 배열 하나라 페이지 개념 자체가 없다 — 그런데도
  「1」 한 칸짜리 페이저가 남아 있었고, 하드닝 2차에 걷어냈다(아래).

  🔴 **`섹션` 열을 뺐다.** 기수 연결 목록에 섹션 수가 없다(교안 상세에만 있다).
  행마다 상세를 부르면 교안 수만큼 콜이 되고, 그건 이 조회가 없애려던 모양
  그대로다(30차 Q2). 대신 `가르친 항목`(`teachesCount`)은 목록에 있어 그대로 쓴다.
  32차 요청서로 올린다.

  ⚠ **`쓰인 프로젝트`가 이제 링크다.** 목은 이름 문자열만 갖고 있었는데 서버가
  `projectId`를 함께 준다 — 교안에서 프로젝트로 바로 건너갈 수 있다.
*/

export default function CurriculumScreen() {
  const navigate = useNavigate()
  const { cohortId, cohortName, failed, cohorts, selectCohort } = useManagerCohort()
  const query = useLinkedCurricula(cohortId)

  /* 아래 분기가 `!data`를 먼저 걸러 주므로 이 자리에서는 값이 있다 */
  const list = query.data

  const shell = (children: React.ReactNode) => (
    <ConsoleShell
      role="manager"
      cohort={cohortName ?? ''}
      cohorts={cohorts}
      onCohortChange={selectCohort}
    >
      <PageHeader
        breadcrumb={['교안', cohortName].filter(Boolean).join(' › ')}
        title="교안"
        count={list ? `${list.length}개` : undefined}
        breakdown={
          <>
            이 기수 프로젝트에 연결된 것만{' '}
            {/* <b className="text-fg-muted font-bold">등록·재분석은 오퍼레이터</b> */}
          </>
        }
      />
      {children}
    </ConsoleShell>
  )

  if (failed) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>담당 기수가 없습니다</EmptyTitle>
          <EmptyDescription>반 배정이 끝나면 그 기수의 교안이 나타납니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>,
    )
  }

  if (!list && !query.isError) {
    /*
      ⚠ `isPending`으로 판정하지 않는다 — 기수를 아직 못 받아 `enabled: false`인 동안
      `isPending`이 거짓이라 빈 화면이 스친다(규칙 E). **값이 있나 없나**로 가른다.

      **높이는 이 표에서 쟀다** — 헤더 38.5 · 행 42.7 · 열 폭 비율 21.5/6.7/6.7/9.4/
      나머지/9.4. 페이저를 걷어냈으므로 푸터 자리는 0이다.

      ⚠ **행 수만은 알 수 없다.** 이 목록은 페이지가 없어(응답이 배열 하나) 「페이지
      크기와 맞춘다」는 기준을 쓸 자리가 없다. 9기는 **2개**인데 3으로 둔다 — 한 기수의
      씨앗에 맞추면 다른 기수에서 더 크게 어긋난다. 그래서 이 화면은 도착할 때
      **약 43px 위로 당겨진다**(실측). 남은 오차이고, 없앨 방법이 지금은 없다.

      `SlowNotice`는 그대로 둔다 — 이 조회가 1.5초인데 없는 교안 id는 30초를 넘겨
      무응답이라(아래 실측) 12초에 그 사실을 말해 주는 편이 낫다.
    */
    return shell(
      <>
        <TableSkeleton
          rows={3}
          cols={['w-[21.5%]', 'w-[6.7%]', 'w-[6.7%]', 'w-[9.4%]', null, 'w-[9.4%]']}
          rowH={42.7}
          footerH={0}
        />
        <SlowNotice />
      </>,
    )
  }

  if (query.isError || !list) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>교안을 불러오지 못했습니다</EmptyTitle>
          <EmptyDescription>잠시 후 다시 시도해 주세요.</EmptyDescription>
        </EmptyHeader>
        <Button variant="ghost" onClick={() => void query.refetch()}>
          다시 시도
        </Button>
      </Empty>,
    )
  }

  if (list.length === 0) {
    return shell(
      <Empty>
        <EmptyHeader>
          <EmptyTitle>이 기수 프로젝트에 연결된 교안이 없습니다</EmptyTitle>
          <EmptyDescription>
            프로젝트가 만들어지고 교안이 연결되면 여기에 나타납니다.
            <br />
            <b className="text-fg-muted">등록은 오퍼레이터가 합니다.</b>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>,
    )
  }

  return shell(
    <>
      <TableFrame>
        <Table className="table-fixed rounded-none border-0 bg-transparent">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-64">교안</TableHead>
              <TableHead className="w-20">버전</TableHead>
              <TableHead className="w-20 text-right">쪽</TableHead>
              <TableHead className="w-28 text-right">가르친 항목</TableHead>
              <TableHead>쓰인 프로젝트</TableHead>
              <TableHead className="w-28">분석</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const analysis = analysisLabel(c.analysisStatus)
              /* 상세 조회 셋은 전부 `materialId`를 받는다 — `versionId`가 아니다 */
              const detailPath = `/manager/curriculum/${c.materialId}`
              return (
                <TableRow
                  key={c.versionId}
                  className="hover:bg-surface-2 cursor-pointer"
                  onClick={() => navigate(detailPath)}
                >
                  <TableCell className="w-64 font-bold">
                    <Link
                      to={detailPath}
                      className="text-fg hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {c.originalFileName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-fg-muted w-20 font-mono text-xs">
                    {versionLabel(c.versionNo)}
                  </TableCell>
                  {/* 분석 전이면 쪽수가 아직 없다 — 0이 아니라 모른다는 뜻이라 대시로 */}
                  <TableCell className="w-20 text-right tabular-nums">
                    {c.pageCount ?? <span className="text-fg-subtle">―</span>}
                  </TableCell>
                  <TableCell className="w-28 text-right tabular-nums">{c.teachesCount}</TableCell>
                  {/*
                    🔴 **프로젝트 이름을 다 늘어놓지 않는다**(렌더에서 잡았다). 목은 이 칸에
                    프로젝트 1~2개만 있었는데 실데이터는 한 교안이 **프로젝트 여덟 개 이상**에
                    걸린다 — 그대로 이으니 표가 컨테이너를 넘겨 오른쪽 `분석` 열이
                    통째로 잘렸다. 앞 둘만 링크로 두고 나머지는 개수로 접는다.
                    전체 목록은 상세의 `쓰인 프로젝트` 탭이 이미 갖고 있다.
                  */}
                  <TableCell className="text-fg-muted truncate text-xs">
                    {c.linkedProjects.slice(0, 2).map((p, i) => (
                      <span key={p.projectId}>
                        {i > 0 && ' · '}
                        <Link
                          to={`/manager/projects/${p.projectId}`}
                          className="hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.projectName}
                        </Link>
                      </span>
                    ))}
                    {c.linkedProjects.length > 2 && (
                      <span
                        className="text-fg-subtle"
                        title={c.linkedProjects.map((p) => p.projectName).join(' · ')}
                      >
                        {' '}
                        외 {c.linkedProjects.length - 2}개
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-28">
                    <Badge variant={analysis.variant}>{analysis.text}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableFrame>

      {/*
        🔴 **페이저를 걷어냈다.** 파일 머리 주석은 「페이지네이션이 없다」고 적어 두고도
        UI는 **늘 「1」 한 칸짜리 페이저**를 그리고 있었다 — 눌러도 아무 일이 없다.
        누를 수 없는 컨트롤은 장식이고(규칙 E7), 장식이 페이저 모양이면 **더 있을지도
        모른다**고 거짓말한다. 응답이 배열 하나라 2쪽이 생길 수 없다.

        범위 개수도 `1–2 / 2개`가 될 뿐이라 머리의 「2개」와 같은 말을 두 번 하는 것이라
        총계만 남긴다(규칙 D 「머리가 이미 말한 값을 반복하지 않는다」).
      */}
    </>,
  )
}
