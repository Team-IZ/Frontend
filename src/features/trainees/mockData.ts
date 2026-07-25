/*
  DASH-17 교육생 리스트 목업. API 연동 전까지 화면을 검증하기 위한 고정 배열이다.
  실 데이터가 붙으면 이 파일은 지운다.

  D104: 순수 디렉터리라 정체성(이름·반)과 계정 상태만 갖는다. 팀·회차·제출·점수는
  측정과 독립이라 여기 없다 — 그건 프로젝트 워크스페이스·대시보드·개별 상세 소관.
*/
export type AccountStatus = 'ACTIVE' | 'INVITED' | 'INACTIVE'

export type TraineeRow = {
  id: string
  name: string
  email: string
  className: string
  accountStatus: AccountStatus
  /** 비활성 사유·일자. INACTIVE일 때만 값이 있다 */
  inactiveReason?: string
  inactiveAt?: string
}

export const TRAINEES: TraineeRow[] = [
  { id: 't-1', name: '강민준', email: 'minjun@ex.com', className: 'A반', accountStatus: 'ACTIVE' },
  { id: 't-2', name: '김서연', email: 'seoyeon@ex.com', className: 'A반', accountStatus: 'ACTIVE' },
  { id: 't-3', name: '서지우', email: 'jiwoo@ex.com', className: 'B반', accountStatus: 'INVITED' },
  { id: 't-4', name: '한도현', email: 'dohyun@ex.com', className: 'A반', accountStatus: 'ACTIVE' },
  {
    id: 't-5',
    name: '오세훈',
    email: 'sehun@ex.com',
    className: 'C반',
    accountStatus: 'INACTIVE',
    inactiveReason: '이탈',
    inactiveAt: '08.02',
  },
  { id: 't-6', name: '이하은', email: 'haeun@ex.com', className: 'B반', accountStatus: 'ACTIVE' },
  { id: 't-7', name: '박지민', email: 'jimin@ex.com', className: 'C반', accountStatus: 'ACTIVE' },
  { id: 't-8', name: '최윤서', email: 'yoonseo@ex.com', className: 'B반', accountStatus: 'ACTIVE' },
  { id: 't-9', name: '정우진', email: 'woojin@ex.com', className: 'A반', accountStatus: 'INVITED' },
  {
    id: 't-10',
    name: '신아린',
    email: 'arin@ex.com',
    className: 'C반',
    accountStatus: 'INACTIVE',
    inactiveReason: '휴식',
    inactiveAt: '07.20',
  },
  { id: 't-11', name: '윤도윤', email: 'doyoon@ex.com', className: 'B반', accountStatus: 'ACTIVE' },
  { id: 't-12', name: '임서준', email: 'seojun@ex.com', className: 'C반', accountStatus: 'ACTIVE' },
]
