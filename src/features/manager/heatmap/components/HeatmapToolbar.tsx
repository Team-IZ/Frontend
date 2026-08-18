import { CircleHelp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/Popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { cn } from '@/lib/utils/cn'
import type { HeatmapLevel, RoundOption, ScopeOption } from '../_/api/types'

/*
  툴바 — 프로젝트 select가 이 화면의 변수라 맨 왼쪽·크게 둔다(정의서 "회차 비교
  토글 자리에 프로젝트 select"). 계층(반·팀·팀원)은 3지라 ButtonGroup을 3버튼으로
  쓴다 — OP-02 `RoundToolbar`의 2지 토글과 같은 조립.

  각 계층마다 필요한 선택 필터만 보인다(정의서 §3 표) — 팀은 반 select가, 팀원은
  반·팀 select가 붙는다. 서버가 그 값을 **필수로 요구**하기 때문이기도 하다
  (`HEATMAP_SCOPE_INVALID`).

  ⚠ 버튼 라벨은 "반별/팀/개인"이었다가 "반/팀/팀원"으로 바꿨다(렌더 확인 후 사용자
  지시) — 셋 다 명사형으로 맞추고, "개인"은 그 계층에서 실제로 보여주는 단위를
  더 직접적으로 가리키게 했다.

  🔴 **정렬·문제만·위험만 세 필터를 뺐다.** 목에 있었는데 **서버에 그 파라미터가
  없다.** 화면이 정렬하고 거르면 서버가 준 순서를 화면이 뒤집는 것이고, 계층을
  오갈 때마다 규칙이 갈린다(api-boundary §1-②). 필요하면 요청서로 올린다.

  🔴 **다시 보기 토글도 뺐다**(사용자 지시). 서버에 `attemptView`가 있어 한때 그렸는데,
  이 화면은 **최초 성적만** 본다 — 다시 보기를 반·팀 평균에 섞으면 같은 격자가 두 가지
  뜻을 갖는다. 파라미터를 안 보내면 서버 기본값이 `INITIAL`이다.
*/

const LEVELS: { value: HeatmapLevel; label: string }[] = [
  { value: 'CLASS', label: '반' },
  { value: 'TEAM', label: '팀' },
  { value: 'TRAINEE', label: '팀원' },
]

export default function HeatmapToolbar({
  round,
  rounds,
  level,
  classroomId,
  teamId,
  classrooms,
  teams,
  onRoundChange,
  onLevelChange,
  onClassChange,
  onTeamChange,
}: {
  round: string
  rounds: RoundOption[]
  level: HeatmapLevel
  classroomId: string
  teamId: string
  /** 본 적 있는 반·팀 — 화면이 기억한다(`HeatmapScreen`의 주석 참고) */
  classrooms: ScopeOption[]
  teams: ScopeOption[]
  onRoundChange: (assessmentRoundId: string) => void
  onLevelChange: (level: HeatmapLevel) => void
  onClassChange: (classroomId: string) => void
  onTeamChange: (teamId: string) => void
}) {
  const roundItems = Object.fromEntries(rounds.map((r) => [r.assessmentRoundId, r.label]))
  const classItems = Object.fromEntries(classrooms.map((c) => [c.id, `반 · ${c.name}`]))
  const teamItems = Object.fromEntries(teams.map((t) => [t.id, `팀 · ${t.name}`]))

  /*
    🔴 **갈 수 없는 계층은 잠근다**(하드닝 실측). 서버가 `TEAM`에 반을, `TRAINEE`에
    반과 팀을 **필수로** 요구한다(`HEATMAP_SCOPE_INVALID`). 팀 목록은 반 격자를
    한 번 봐야 생기므로, 그 전에는 「팀원」을 눌러도 400밖에 안 나온다.
    막는 대신 왜인지 말한다(integration-process §7과 같은 원칙).

    🔴 **이유를 `title`로만 두면 화면에 없는 것과 같다**(하드닝에서 잡았다). 잠긴
    버튼은 hover도 잘 안 먹어서, 눌러도 아무 일이 없는 것으로만 보였다 — 화면 규칙
    E7(누를 수 없는 컨트롤은 장식이다)이 말하는 상태다. **툴바 아래 한 줄로 말한다.**
  */
  const blocked = (l: HeatmapLevel) =>
    l !== 'CLASS' && classrooms.length === 0
      ? '반 격자를 먼저 불러와야 합니다'
      : l === 'TRAINEE' && !teamId && teams.length === 0
        ? '팀을 먼저 고르세요 — 팀 격자에서 팀을 누르면 열립니다'
        : undefined

  /* 지금 잠긴 계층이 있으면 그 이유 — 하나만 보여준다(둘이 겹치면 위쪽이 먼저다) */
  const blockedReason = LEVELS.filter((l) => l.value !== level)
    .map((l) => blocked(l.value))
    .find(Boolean)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Select value={round} onValueChange={(v) => v && onRoundChange(v)} items={roundItems}>
        <SelectTrigger
          className="h-9 min-w-52 text-sm font-semibold"
          aria-label="회차 선택"
          disabled={rounds.length === 0}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {rounds.map((r) => (
            <SelectItem key={r.assessmentRoundId} value={r.assessmentRoundId}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ButtonGroup aria-label="계층">
        {LEVELS.map((l) => {
          const why = blocked(l.value)
          return (
            <Button
              key={l.value}
              size="sm"
              variant={level === l.value ? 'primary' : 'ghost'}
              aria-pressed={level === l.value}
              disabled={!!why && level !== l.value}
              title={why}
              onClick={() => onLevelChange(l.value)}
            >
              {l.label}
            </Button>
          )
        })}
      </ButtonGroup>

      {/*
        반·팀 select는 **그 계층에 필요할 때만** 그린다. 서버가 `TEAM`·`TRAINEE`에서
        `classroomId`를 필수로 요구하므로(400) 없는 채로 부르지 않는다.
      */}
      {level !== 'CLASS' && classrooms.length > 0 && (
        <Select value={classroomId} onValueChange={(v) => v && onClassChange(v)} items={classItems}>
          <SelectTrigger className="h-9 w-32" aria-label="반 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classrooms.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                반 · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {level === 'TRAINEE' && teams.length > 0 && (
        <Select value={teamId} onValueChange={(v) => v && onTeamChange(v)} items={teamItems}>
          <SelectTrigger className="h-9 w-32" aria-label="팀 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                팀 · {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" className="ml-auto" aria-label="히트맵 읽는 법">
              <CircleHelp className={cn('size-4')} aria-hidden="true" />
            </Button>
          }
        />
        <PopoverContent className="max-w-sm">
          <PopoverHeader>
            <PopoverTitle>이 표를 읽는 법</PopoverTitle>
          </PopoverHeader>
          <PopoverDescription className="space-y-1.5 text-xs leading-relaxed">
            <p>
              칸의 숫자는 <b className="font-semibold text-fg">도달 단계</b>입니다. 반·팀은 평균이라
              소수로, 팀원은 그 사람의 단계로 나옵니다.
            </p>
            <p>
              열 이름 앞의 <span className="text-warning">⚠</span>는{' '}
              <b className="font-semibold text-fg">집단 미달</b> — 그 개념에서 절반 이상이 막혔다는
              뜻이라 개인 문제가 아닙니다.
            </p>
            <p>
              빗금 친 칸은 <b className="font-semibold text-fg">셀 수 있는 결과가 없는 것</b>
              입니다. 칸에 마우스를 올리면 미응시·무효·중단 인원이 나옵니다.
            </p>
          </PopoverDescription>
        </PopoverContent>
      </Popover>

      {blockedReason && <p className="text-fg-subtle w-full text-xs">{blockedReason}</p>}
    </div>
  )
}
