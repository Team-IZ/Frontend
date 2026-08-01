import ManagerShell from '@/shells-v1/ManagerShell'

/*
  대시보드 — 아직 셸만 붙인 자리다. 본문은 명세·와이어를 보고 채운다.
  사용자·기수는 인증과 기수 스코프가 붙기 전까지 화면에서 넘긴다.
*/
export default function DashboardScreen() {
  return (
    <ManagerShell user={{ name: '박지현', role: '매니저' }} cohort="7기" isLead>
      <p className="text-fg-muted text-sm">본문은 아직 비어 있다.</p>
    </ManagerShell>
  )
}
