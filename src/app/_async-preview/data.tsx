import type { ReactNode } from 'react'
import Badge from '@/components/ui/Badge'
import ProjectStatusBadge from '@/features/operator/projects/components/ProjectStatusBadge'
import type { ProjectStatus } from '@/features/operator/projects/types'

/*
  프리뷰용 더미 — **실제 응답과 같은 모양**으로 둔다. 필드 이름을 줄이거나 값을 예쁘게
  만들면 "실제로 이렇게 보이나"에 답하지 못한다(긴 이름·빈 값·경계 케이스가 진짜 문제다).

  `_async-preview/`는 dev 전용이라 실제 화면이 여기서 import하지 않는다 — 반대 방향
  (프리뷰가 실물 컴포넌트를 가져다 쓰는 것)만 있다.
*/

export type Col = { head: string; w: string | null; align?: 'right' }

/* ── 프로젝트 목록(OP-03) ─────────────────────────────────────── */

export const PROJECT_COLS: Col[] = [
  { head: '프로젝트', w: 'w-[200px]' },
  { head: '상태', w: 'w-[108px]' },
  { head: '기간', w: 'w-[168px]' },
  { head: '교안', w: 'w-[200px]' },
  { head: '검증 개념 3건', w: null },
]

type ProjectRow = {
  name: string
  status: ProjectStatus
  period: string
  due: string | null
  curriculum: string
  concepts: string
  urgent?: boolean
}

export const PROJECTS: ProjectRow[] = [
  {
    name: '미니프로젝트 5차',
    status: 'DONE',
    period: '07-20 ~ 07-31',
    due: '지남',
    curriculum: 'Spring 테스트와 운영 v1',
    concepts: '3건 확정',
  },
  {
    name: '미니프로젝트 6차',
    status: 'RUNNING',
    period: '08-03 ~ 08-21',
    due: '10일 남음',
    curriculum: 'Spring 테스트와 운영 v1',
    concepts: '3건 확정',
  },
  {
    name: '미니프로젝트투투',
    status: 'READY',
    period: '08-11 ~ 08-18',
    due: '7일 남음',
    curriculum: 'Spring 테스트와 운영 v1',
    concepts: '3건 확정',
  },
  {
    // 이 화면의 유일한 경고는 **조합**이다 — 마감 임박 + 준비 중
    name: '미니프로젝트 7차',
    status: 'PREP',
    period: '08-14 ~ 08-16',
    due: '2일 남음',
    curriculum: '교안 연결 안 됨',
    concepts: '⚠ 미확정',
    urgent: true,
  },
]

/*
  셀을 **함수 배열**로 준다 — JSX를 배열에 그대로 담으면 `DataTable`이 `key`를 붙여도
  린터(`jsx-key`)는 배열 리터럴만 보고 경고한다. 함수면 그 오해가 없다.
*/
export const projectCells = (p: ProjectRow): (() => ReactNode)[] => [
  () => <span className="text-fg font-semibold">{p.name}</span>,
  () => <ProjectStatusBadge status={p.status} />,
  () => (
    <span className="text-xs">
      {p.period}
      <span className={`block ${p.urgent ? 'text-danger font-semibold' : 'text-fg-subtle'}`}>
        {p.due}
      </span>
    </span>
  ),
  () => (
    <span className={`text-xs ${p.curriculum.includes('안 됨') ? 'text-fg-subtle' : ''}`}>
      {p.curriculum}
    </span>
  ),
  () => (
    <span className={`text-xs ${p.concepts.startsWith('⚠') ? 'text-warning' : 'text-fg-subtle'}`}>
      {p.concepts}
    </span>
  ),
]

/* ── 명단(OP-06 ③) ───────────────────────────────────────────── */

export const ROSTER_COLS: Col[] = [
  { head: '', w: 'w-10' },
  { head: '교육생', w: 'w-32' },
  { head: '이메일', w: 'w-56' },
  { head: '소속 반', w: 'w-32' },
  { head: '계정', w: 'w-28' },
  { head: '등록일', w: 'w-32' },
  { head: '비고', w: 'w-44' },
]

type Trainee = { name: string; email: string; room: string | null; active: boolean; note?: string }

export const ROSTER: Trainee[] = [
  { name: '강도윤', email: 'a002@green.com', room: null, active: true },
  { name: '강동하', email: 's015@algohouse.io', room: 'D반', active: true },
  { name: '강세림', email: 's029@devcamp.kr', room: 'D반', active: true },
  { name: '강승우', email: 's022@stackup.co.kr', room: 'F반', active: true },
  {
    name: '강시윤',
    email: 'b039@green.com',
    room: 'A반',
    active: false,
    note: '기타 · 장기 연락 두절로 수강 지속이 불가능하다고 판단함. · 2026-07-27',
  },
  { name: '강은우', email: 's038@techbridge.kr', room: 'B반', active: true },
  { name: '고다인', email: 'a027@green.com', room: 'H반', active: true },
  { name: '고서연', email: 's123@codeschool-b.kr', room: 'H반', active: true },
  {
    name: '고소율',
    email: 's041@algohouse.io',
    room: 'E반',
    active: false,
    note: '계약 종료 · 파견 기업과의 교육 위탁 계약이 종료되어 수강 자격이 만료됨. · 2026-06-08',
  },
  { name: '고유진', email: 's009@nextrunners.kr', room: 'A반', active: true },
]

export const rosterCells = (t: Trainee): (() => ReactNode)[] => [
  () => <span className="border-border-strong block size-3.5 rounded-[3px] border" />,
  () => <span className="text-fg font-semibold">{t.name}</span>,
  () => <span className="text-fg-subtle text-xs">{t.email}</span>,
  () =>
    t.room ? (
      <span className="text-xs">{t.room}</span>
    ) : (
      <span className="text-warning text-xs">미배정</span>
    ),
  () => <Badge variant={t.active ? 'success' : 'neutral'}>{t.active ? '활성' : '비활성'}</Badge>,
  () => <span className="text-fg-subtle text-xs">2026-03-01</span>,
  () => <span className="text-fg-subtle text-2xs leading-tight">{t.note ?? ''}</span>,
]

/* ── 매니저(OP-06 ④) ─────────────────────────────────────────── */

export const MANAGER_COLS: Col[] = [
  { head: '매니저', w: 'w-28' },
  { head: '이메일', w: 'w-52' },
  { head: '담당 반', w: 'w-36' },
  { head: '담당 인원', w: 'w-24', align: 'right' },
  { head: '상태', w: 'w-24' },
  { head: '최근 접속', w: 'w-32' },
]

export const MANAGERS = [
  { name: '김민준', email: 'manager01@green.com', rooms: 'A반 · B반', n: 46, active: true },
  { name: '박서연', email: 'manager02@green.com', rooms: 'C반', n: 23, active: true },
  { name: '이하람', email: 'manager03@green.com', rooms: '—', n: 0, active: false },
]

export const managerCells = (m: (typeof MANAGERS)[number]): (() => ReactNode)[] => [
  () => <span className="text-fg font-semibold">{m.name}</span>,
  () => <span className="text-fg-subtle text-xs">{m.email}</span>,
  () => <span className="text-xs">{m.rooms}</span>,
  () => <span className="block text-right text-xs">{m.n === 0 ? '—' : `${m.n}명`}</span>,
  () => <Badge variant={m.active ? 'success' : 'neutral'}>{m.active ? '활성' : '비활성'}</Badge>,
  () => <span className="text-fg-subtle text-xs">{m.active ? '2026-08-10' : '—'}</span>,
]
