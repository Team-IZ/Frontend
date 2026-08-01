import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import Wordmark from '@/components/common/Wordmark'

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

      <div className="text-fg-muted flex shrink-0 items-center gap-2 text-sm">
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
