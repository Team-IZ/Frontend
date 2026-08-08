import { useState } from 'react'
import { useNavigate } from 'react-router'
import { UserCogIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import Wordmark from '@/components/common/Wordmark'
import { initialScreenFor } from '@/features/auth/authStore'
import { useSignIn } from '@/features/auth/useSession'
import { login } from '@/api/auth/authApi'
import { QUICK_LOGIN_ACCOUNTS } from '@/features/auth/quickLoginAccounts'

// dev 전용 역할 전환(헤더) — import.meta.env.DEV는 프로덕션 빌드(vite build)에서
// 항상 false라 develop Vercel 프리뷰 배포도 걸러진다. __GIT_BRANCH__(vite.config.ts
// define, sidebarConfig.ts와 같은 패턴)로 "로컬이거나 develop 배포"일 때만 보이고
// main 배포에서는 숨긴다.
// 계정이 없으면(.env.local 미설정) 드롭다운을 열어도 항목이 없다 — 아예 안 그린다
const SHOW_DEV_ROLE_SWITCHER =
  (import.meta.env.DEV || __GIT_BRANCH__ === 'develop') && QUICK_LOGIN_ACCOUNTS.length > 0

function DevRoleSwitcher() {
  const navigate = useNavigate()
  const signIn = useSignIn()

  async function handleQuickLogin(email: string, password: string) {
    try {
      const res = await login({ body: { email, password } })
      await signIn(res)
      navigate(initialScreenFor(res.role))
    } catch (err) {
      // dev 전용 지름길이라 실패해도 화면에 알릴 알림 자리가 없다 — 콘솔로 충분
      console.error('quick login failed', err)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" aria-label="역할 전환 (dev)">
            <UserCogIcon className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>역할 전환 (dev)</DropdownMenuLabel>
          {QUICK_LOGIN_ACCOUNTS.map(({ label, email, password }) => (
            <DropdownMenuItem key={email} onClick={() => handleQuickLogin(email, password)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/*
  상단바 — 브랜드 + 스코프 선택기 + 사용자. 54px 고정 높이(목업 `.topbar{height:54px}`
  와 같은 값). ConsoleShell에서 분리한 이유는 셸 프레임(높이 계산·스크롤 경계)과
  상단바 내용(브랜드·스코프·사용자)이 서로 다른 이유로 바뀌기 때문이다.

  브랜드는 손으로 다시 그리지 않는다 — components/common/Wordmark가 인증 화면
  (BrandPanel)과 같은 로고다. 스코프 선택기는 component-page-map.md가 이 자리를
  `select`(필터·정렬 드롭다운 ▾)로 매핑해 둔 것을 그대로 쓴다 — 손으로 만든
  버튼+화살표 흉내를 내지 않는다.

  scope — 역할마다 스코프가 다르므로(슈퍼어드민은 없음 · 오퍼레이터/매니저는
  기수 · 교육생은 자기 자신) 없으면 자리 자체를 렌더하지 않는다. 지금은 옵션이
  현재 값 하나뿐이다 — 실제 기수 목록은 화면 이식 때 API에서 받는다.

  우상단 톱니(⚙)는 없앴다 — SA-03이 사이드바 `플랫폼 관리`로 내려갔다. 정의서는
  "네비 자리를 주지 않는다"고 했지만 만들고 보니 탭 두 개짜리 화면이라, 오퍼레이터의
  `운영 관리`와 같은 자리(구분선 아래 별도 그룹)로 옮겼다(sidebarConfig.ts 참고).
*/
type Props = {
  user: { name: string; role: string }
  scope?: { label: string; value: string }
}

export default function Header({ user, scope }: Props) {
  const [value, setValue] = useState(scope?.value)

  return (
    <header className="bg-surface border-border flex h-[54px] w-full shrink-0 items-center justify-between overflow-x-auto border-b px-6">
      <div className="flex items-center gap-4">
        <Wordmark />

        {scope && (
          <Select value={value} onValueChange={(v) => setValue(v ?? scope.value)}>
            <SelectTrigger
              className="rounded-full bg-surface-2 py-[5px] text-sm"
              aria-label={scope.label}
            >
              <span className="text-fg-subtle">{scope.label}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={scope.value}>{scope.value}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="text-fg-muted flex shrink-0 items-center gap-3 text-sm">
        {SHOW_DEV_ROLE_SWITCHER && <DevRoleSwitcher />}
        <span className="hidden sm:inline">
          {user.name} · {user.role}
        </span>
        <Avatar aria-hidden="true" size="sm">
          <AvatarFallback className="bg-primary-soft text-primary font-semibold">
            {user.name.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
