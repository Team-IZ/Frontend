import { useNavigate } from 'react-router'
import { LogOutIcon, UserCogIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { useSignIn, useSignOut } from '@/features/auth/useSession'
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
            <DropdownMenuItem
              key={email}
              className="cursor-pointer"
              onClick={() => handleQuickLogin(email, password)}
            >
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** 성 한 글자 동그라미 — 메뉴 트리거일 때와 아닐 때가 같은 그림이어야 한다 */
function UserAvatar({ name }: { name: string }) {
  return (
    <Avatar size="sm">
      <AvatarFallback className="bg-primary-soft text-primary font-semibold">
        {name.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  )
}

/*
  아바타를 눌러 여는 계정 메뉴 — 내용은 전부 `/me`에서 온 값이다(헤더가 prop으로 받는다).

  로그아웃은 `useSignOut()`을 그대로 쓴다 — 서버 세션(쿠키) 폐기 + 캐시 비우기가 이미
  그 안에 있다. 비운 뒤 라우터를 직접 돌리는 이유는, 가만히 둬도 RequireRole이 결국
  로그인 화면으로 보내지만 그 사이 `/me` 재조회 한 번(+401·재발급 실패)만큼 스피너가
  뜨기 때문이다. 나가겠다고 누른 사람에게는 그 대기가 고장으로 보인다.
*/
function AccountMenu({ user }: { user: Props['user'] }) {
  const navigate = useNavigate()
  const signOut = useSignOut()

  async function handleSignOut() {
    await signOut()
    navigate('/shared/login', { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="text-fg-muted flex cursor-pointer items-center gap-3 rounded-full text-sm"
            aria-label="내 계정"
          >
            <span className="hidden sm:inline">
              {user.name} · {user.role}
            </span>
            <UserAvatar name={user.name} />
          </button>
        }
      />
      {/*
        폭 — 기본이 트리거 폭(--anchor-width)이라 아바타에 맞춰 24px이 된다. 고정폭을 주면
        이메일이 짧은 사람에게 빈 여백만 남으므로 내용에 맞추고(w-auto) 아래위 경계만 잡는다.
      */}
      <DropdownMenuContent align="end" className="w-auto max-w-64 min-w-44 p-1.5">
        <div className="px-2 py-1.5">
          {/* 역할은 값만으로 무엇인지 안다 — `역할:` 같은 라벨을 붙이지 않는다 */}
          <div className="flex items-center gap-2">
            <p className="text-fg truncate text-sm font-medium">{user.name}</p>
            {user.role && <Badge>{user.role}</Badge>}
          </div>
          {user.email && <p className="text-fg-subtle mt-1 truncate text-xs">{user.email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer px-2 py-1.5"
          onClick={handleSignOut}
        >
          <LogOutIcon aria-hidden="true" />
          로그아웃
        </DropdownMenuItem>
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
  /** `role`은 이미 한글 라벨(ConsoleShell이 서버 코드를 옮겨 준다). `email`은 계정 메뉴에만 쓴다 */
  user: { name: string; role: string; email?: string }
  scope?: {
    label: string
    /**
     * 지금 값. `options`를 주면 그 `value`들 중 하나여야 한다 — 안 맞으면 목록에서
     * 어느 것이 골라져 있는지 표시되지 않는다.
     * `options`가 없으면 이 문자열이 곧 표시 문구다(자리만 잡는 상태).
     */
    value: string
    /**
     * 고를 수 있는 것 전부. **화면이 실제 목록을 받으면 여기로 넘긴다** — 그 전까지는
     * 현재 값 하나뿐이라 눌러도 바뀌지 않는다.
     */
    options?: readonly { value: string; label: string; detail?: string }[]
    /** 고른 값을 화면이 받는다. 없으면 헤더가 자기 상태로만 들고 있는다 */
    onChange?: (value: string) => void
  }
}

export default function Header({ user, scope }: Props) {
  /*
    선택은 **화면이 갖는 것이 맞다** — 기수는 URL에 실려 새로고침·공유를 견뎌야 한다
    (`stores/cohortScope.ts`). `onChange`를 준 화면이 그 값의 주인이다.

    **헤더는 고른 값을 자기 상태로 들지 않는다.** 한때 `useState(scope?.value)`로 들었는데
    그것은 **첫 렌더 값에서 얼어붙는다** — 화면들이 하드코딩된 `'7기'`를 넘기던 동안에는
    드러나지 않았고, 실제로 조회해 온 기수 이름을 넘기는 화면이 생기자 **본문은 `9기`인데
    이 스위처만 `7기`** 인 상태가 됐다. 같은 화면이 두 기수를 말한다.

    `onChange`가 없는 화면은 선택지도 하나뿐이라 눌러도 바뀔 것이 없다 — 그래서 값을
    들어 둘 이유가 아예 없고, 프롭을 그대로 그리면 얼어붙지도 않는다.
  */
  return (
    <header className="bg-surface border-border flex h-[54px] w-full shrink-0 items-center justify-between overflow-x-auto border-b px-6">
      <div className="flex items-center gap-4">
        <Wordmark />

        {scope && (
          <Select
            value={scope.value}
            onValueChange={(v) => scope.onChange?.((v as string | null) ?? scope.value)}
            items={Object.fromEntries(
              (scope.options ?? [{ value: scope.value, label: scope.value }]).map((o) => [
                o.value,
                o.label,
              ]),
            )}
          >
            <SelectTrigger
              className="rounded-full bg-surface-2 py-[5px] text-sm"
              aria-label={scope.label}
            >
              <span className="text-fg-subtle">{scope.label}</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(scope.options ?? [{ value: scope.value, label: scope.value }]).map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                  {/* 닫힌 트리거는 이름만 쓴다 — 목록에서만 상태를 붙여 무엇을 고르는지 돕는다 */}
                  {'detail' in o && o.detail && (
                    <span className="text-fg-subtle text-xs"> · {o.detail}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="text-fg-muted flex shrink-0 items-center gap-3 text-sm">
        {SHOW_DEV_ROLE_SWITCHER && <DevRoleSwitcher />}
        {/*
          이름·역할 글자까지 트리거에 넣었다 — 24px 동그라미만 누르게 하는 것보다 과녁이
          크고, 그 글자가 계정 조작의 일부라는 것이 눌러 보기 전에 드러난다.
          세션이 오기 전에는 이름·역할이 빈 문자열이고 메뉴도 빈 채로 열린다 — 자리만 지킨다.
        */}
        {user.name ? <AccountMenu user={user} /> : <UserAvatar name="" />}
      </div>
    </header>
  )
}
