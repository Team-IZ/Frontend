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
import type { AttemptView, HeatmapLevel, HeatmapView, RoundOption } from '../_/api/types'

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

  대신 **최초 응시 / 다시 보기** 토글이 생겼다 — 목에 없던 축인데 서버가 준다
  (`attemptView`). 다시 보기로 도달이 바뀐 것을 이 화면에서 볼 수 있다.
*/

const LEVELS: { value: HeatmapLevel; label: string }[] = [
  { value: 'CLASS', label: '반' },
  { value: 'TEAM', label: '팀' },
  { value: 'TRAINEE', label: '팀원' },
]

const ATTEMPTS: { value: AttemptView; label: string }[] = [
  { value: 'INITIAL', label: '최초 응시' },
  { value: 'REVIEW', label: '다시 보기' },
]

export default function HeatmapToolbar({
  round,
  rounds,
  level,
  attemptView,
  classroomId,
  teamId,
  navigation,
  onRoundChange,
  onLevelChange,
  onClassChange,
  onTeamChange,
  onAttemptViewChange,
}: {
  round: string
  rounds: RoundOption[]
  level: HeatmapLevel
  attemptView: AttemptView
  classroomId: string
  teamId: string
  /** 드릴다운 선택지 — 서버가 계층마다 채워 준다 */
  navigation: HeatmapView['navigation']
  onRoundChange: (assessmentRoundId: string) => void
  onLevelChange: (level: HeatmapLevel) => void
  onClassChange: (classroomId: string) => void
  onTeamChange: (teamId: string) => void
  onAttemptViewChange: (v: AttemptView) => void
}) {
  const roundItems = Object.fromEntries(rounds.map((r) => [r.assessmentRoundId, r.label]))
  const classItems = Object.fromEntries(
    navigation.classrooms.map((c) => [c.classroomId, `반 · ${c.classroomName}`]),
  )
  const teamItems = Object.fromEntries(
    navigation.teams.map((t) => [t.teamId, `팀 · ${t.teamName}`]),
  )

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
        {LEVELS.map((l) => (
          <Button
            key={l.value}
            size="sm"
            variant={level === l.value ? 'primary' : 'ghost'}
            aria-pressed={level === l.value}
            onClick={() => onLevelChange(l.value)}
          >
            {l.label}
          </Button>
        ))}
      </ButtonGroup>

      {/*
        반·팀 select는 **그 계층에 필요할 때만** 그린다. 서버가 `TEAM`·`TRAINEE`에서
        `classroomId`를 필수로 요구하므로(400) 없는 채로 부르지 않는다.
      */}
      {level !== 'CLASS' && navigation.classrooms.length > 0 && (
        <Select value={classroomId} onValueChange={(v) => v && onClassChange(v)} items={classItems}>
          <SelectTrigger className="h-9 w-32" aria-label="반 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {navigation.classrooms.map((c) => (
              <SelectItem key={c.classroomId} value={c.classroomId}>
                반 · {c.classroomName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {level === 'TRAINEE' && navigation.teams.length > 0 && (
        <Select value={teamId} onValueChange={(v) => v && onTeamChange(v)} items={teamItems}>
          <SelectTrigger className="h-9 w-32" aria-label="팀 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {navigation.teams.map((t) => (
              <SelectItem key={t.teamId} value={t.teamId}>
                팀 · {t.teamName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <ButtonGroup aria-label="응시 구분" className="ml-auto">
        {ATTEMPTS.map((a) => (
          <Button
            key={a.value}
            size="sm"
            variant={attemptView === a.value ? 'primary' : 'ghost'}
            aria-pressed={attemptView === a.value}
            onClick={() => onAttemptViewChange(a.value)}
          >
            {a.label}
          </Button>
        ))}
      </ButtonGroup>

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="ghost" size="sm" aria-label="히트맵 읽는 법">
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
    </div>
  )
}
