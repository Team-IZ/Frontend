// ─────────────────────────────────────────────────────────────
// ⚠️ Mock 전용 계정 저장소 — 백엔드 연동 시 이 파일을 통째로 삭제하세요.
// 로그인(authApi)과 가입·활성화(inviteApi)가 같은 데이터를 보도록 하는 임시 DB입니다.
// 실제로는 서버 DB의 accounts 테이블이 이 역할을 합니다.
// ─────────────────────────────────────────────────────────────
import type { Role } from './authTypes'

export interface MockAccount {
  email: string
  name: string
  role: Role
  /** null = 아직 비밀번호 미설정 (명단만 등록된 상태) */
  password: string | null
  /** false = 활성화 전 → 로그인 차단 (AUTH-03 case4 AUTH_UNVERIFIED) */
  active: boolean
}

export const accounts: Record<string, MockAccount> = {
  // 이미 가입·활성화 완료된 계정 (로그인 시연용)
  'manager@org.com': {
    email: 'manager@org.com',
    name: '박매니저',
    role: 'MANAGER',
    password: 'pass1234',
    active: true,
  },
  'trainee@org.com': {
    email: 'trainee@org.com',
    name: '김교육생',
    role: 'TRAINEE',
    password: 'pass1234',
    active: true,
  },
  'admin@iz-get.com': {
    email: 'admin@iz-get.com',
    name: '슈퍼어드민',
    role: 'SUPERADMIN',
    password: 'pass1234',
    active: true,
  },
  'operator@iz-get.com': {
    email: 'operator@iz-get.com',
    name: '오퍼레이터',
    role: 'OPERATOR',
    password: 'pass1234',
    active: true,
  },

  // 매니저가 명단(ORG-01)에 등록만 해둔 교육생 — 활성화 전이라 로그인 불가
  'newtrainee@org.com': {
    email: 'newtrainee@org.com',
    name: '이신입',
    role: 'TRAINEE',
    password: null,
    active: false,
  },
}

/** 매니저 회원가입 → 계정 생성 (AUTH-01) */
export function createManagerAccount(email: string, name: string, password: string) {
  accounts[email] = { email, name, role: 'MANAGER', password, active: true }
}

/** 교육생 활성화 → 비밀번호 설정 + status=ACTIVE (AUTH-06) */
export function activateTraineeAccount(email: string, password: string) {
  const account = accounts[email]
  if (!account) return
  account.password = password
  account.active = true
}

/** 비밀번호 재설정 → 비밀번호만 교체 (AU-03) */
export function resetAccountPassword(email: string, password: string) {
  const account = accounts[email]
  if (!account) return
  account.password = password
}
