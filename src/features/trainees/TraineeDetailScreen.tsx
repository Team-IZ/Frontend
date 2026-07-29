import { useState } from 'react'
import { useParams } from 'react-router'
import ManagerShell from '@/shells/ManagerShell'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { DetailHeader } from './components/DetailHeader'
import { OverviewTab } from './components/OverviewTab'
import { SessionTab } from './components/SessionTab'
import { InterventionTab } from './components/InterventionTab'
import { getTraineeDetail, type RecordCard, type TraineeDetail } from './mockData'

/*
  SC-M06 · DASH-16 개별 교육생 상세. 3탭(종합·세션·면담) — 정의서 §3 D107 재설계
  기준. 종합 탭은 고정 컴포넌트 스택 + 학생 데이터에 따른 값만 다르다(화면 자체를
  분기하지 않는다).

  D-1(조회 권한 없는 교육생): 이 목업엔 서버 권한 판정이 없어 "id가 존재하는가"만
  클라이언트에서 판별한다 — 존재하지 않는 id는 상세 차단 안내로 대체한다.
*/
export default function TraineeDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const trainee = id ? getTraineeDetail(id) : undefined

  return (
    <ManagerShell user={{ name: '박지현', role: '총괄 매니저' }} cohort="7기" isLead>
      {trainee ? (
        // key=id — 교육생을 바꿔 들어오면 면담·관찰 기록 로컬 상태를 새로 초기화한다.
        <TraineeDetailContent key={trainee.id} trainee={trainee} />
      ) : (
        <Alert variant="danger">
          <AlertTitle>조회 권한 없는 교육생입니다</AlertTitle>
          <AlertDescription>존재하지 않거나 접근 권한이 없는 교육생입니다(D-1).</AlertDescription>
        </Alert>
      )}
    </ManagerShell>
  )
}

function TraineeDetailContent({ trainee }: { trainee: TraineeDetail }) {
  const [tab, setTab] = useState('overview')
  const [records, setRecords] = useState<RecordCard[]>(trainee.records)

  const liveTrainee: TraineeDetail = { ...trainee, records }

  return (
    <>
      <DetailHeader trainee={liveTrainee} />
      <Tabs value={tab} onValueChange={(v) => typeof v === 'string' && setTab(v)}>
        <TabsList>
          <TabsTrigger value="overview">종합</TabsTrigger>
          <TabsTrigger value="session">세션</TabsTrigger>
          <TabsTrigger value="intervention">면담</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="pt-5">
          <OverviewTab trainee={liveTrainee} onGoToInterventions={() => setTab('intervention')} />
        </TabsContent>
        <TabsContent value="session" className="pt-5">
          <SessionTab sessions={trainee.sessions} />
        </TabsContent>
        <TabsContent value="intervention" className="pt-5">
          <InterventionTab records={records} onChangeRecords={setRecords} />
        </TabsContent>
      </Tabs>
    </>
  )
}
