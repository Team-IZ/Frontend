import { PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { addRequirements } from '../rules'

/*
  요구사항 입력 — **행 목록이다.** 항목 하나가 입력칸 하나이고, `+ 항목 추가`로 늘린다.

  ── 왜 이 모양인가 ────────────────────────────────────────────────

  세 번 바뀐 자리라 지나온 것을 다 적어 둔다.

  **① `Textarea` + 한 줄에 하나** — 개행이 구분자라는 계약이 화면에 안 보였다. 몇 건이
  될지 저장해야 알고, 빈 줄이 조용히 사라지고 중복이 그대로 들어갔다. 무엇보다 상세
  화면은 번호 붙은 목록인데 편집은 덩어리 텍스트라 **같은 것을 두 모양으로 배웠다.**

  **② 칩(`Enter`로 확정)** — ①의 문제는 풀었지만 둘이 남았다.
    · **Enter를 쳐야 담긴다는 것을 아무도 몰랐다.** 안내 문구는 있었는데 읽히지 않았다.
    · **긴 값에서 레이아웃이 깨졌다** — 문장 하나를 넣으니 칩 폭이 606px가 되어 컨테이너
      (513px)를 넘쳤다(실측). 칩은 짧은 토큰을 위한 모양이다.
    · 수정하려면 **지우고 전체를 다시 쳐야 했다.** 40자짜리를 오타 하나 때문에 다시 친다.

  **③ 지금 — 행 목록.** `명단 추가`의 직접 입력과 같은 방식이다.
    · **확정 단계가 없다.** 친 것이 곧 값이라 *"Enter를 쳐야 한다"* 는 문제 자체가 사라진다.
    · **길이에 안 깨진다.** 한 항목이 한 줄을 다 쓰므로 문장이 들어와도 그대로다.
    · **그 자리에서 고친다.** 오타는 클릭해서 고치면 된다.

  요구사항은 **짧은 토큰일 수도 문장일 수도 있다.** 판정이 `이름 매칭 + 동작 연결`이라
  (MG-08) 짧은 편이 잘 걸리지만, 화면이 그것을 강제할 근거는 없다 — **둘 다 받는 모양**
  이어야 한다.

  **저장 모양은 배열 그대로다.** MG-08이 항목마다 `✓`/`✗`와 이유를 붙이므로(`✓ 2 · ✗ 1`)
  요구사항은 문장 덩어리가 아니라 **항목의 목록**이다.
*/
type Props = {
  value: string[]
  onChange: (next: string[]) => void
  /** 첫 입력칸 id — 바깥 `FieldLabel`이 이 값을 가리킨다 */
  id?: string
}

export default function RequirementsField({ value, onChange, id }: Props) {
  /*
    **빈 칸 하나는 늘 남긴다**(명단 직접 입력과 같은 규칙). 다 지우면 칠 곳이 사라진다.
    저장할 때는 빈 칸이 걸러지므로(`rules.addRequirements`) 화면의 이 한 줄이 값을 만들지 않는다.
  */
  const rows = value.length > 0 ? value : ['']

  const setRow = (i: number, text: string) => onChange(rows.map((r, j) => (i === j ? text : r)))

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            id={i === 0 ? id : undefined}
            value={row}
            placeholder={i === 0 ? '예: 좋아요 버튼' : '항목'}
            aria-label={`요구사항 ${i + 1}`}
            onChange={(e) => setRow(i, e.target.value)}
            /*
              여러 줄을 붙여 넣으면 그 자리에서 나눈다 — 과제 문서에서 통째로 복사하는
              것이 실제 동선이라, 한 덩어리가 되면 무엇이 항목이었는지 복구할 수 없다.
              **빈 칸에 붙여 넣을 때만** 나눈다: 이미 쓴 줄 가운데에 붙이는 것은 수정이다.
            */
            onPaste={(e) => {
              const text = e.clipboardData.getData('text')
              if (!text.includes('\n') || row.trim()) return
              e.preventDefault()
              onChange(addRequirements(rows.slice(0, i).concat(rows.slice(i + 1)), text))
            }}
          />
          {/*
            **마지막 한 줄은 못 지운다** — 지우면 칠 곳이 사라진다(명단과 같은 판단).
            못 하는 일을 흐리게 두지 않는 것(C1)과 어긋나 보이지만, 여기서는 흐린 것이
            *"줄이 하나뿐이라 지울 게 없다"* 는 사실을 그대로 말한다.
          */}
          <Button
            variant="ghost"
            size="sm"
            aria-label={`요구사항 ${i + 1} 삭제`}
            disabled={rows.length === 1 && !row}
            onClick={() => onChange(rows.length === 1 ? [] : rows.filter((_, j) => j !== i))}
          >
            <XIcon />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        {/*
          **마지막 줄이 비어 있으면 더 못 늘린다** — 빈 칸이 쌓이면 무엇을 쳐야 할지
          흐려진다. 명단 추가는 두 필드라 빈 행이 눈에 띄지만 여기는 한 칸이라 더 그렇다.
        */}
        <Button
          variant="ghost"
          size="sm"
          disabled={rows[rows.length - 1].trim() === ''}
          onClick={() => onChange([...rows, ''])}
        >
          <PlusIcon className="size-3.5" />
          항목 추가
        </Button>

        {/* 센 결과만 쓴다 — 빈 줄은 저장에서 걸러지므로 지금 유효한 것만 센다 */}
        <p className="text-fg-subtle text-2xs">{value.filter((r) => r.trim()).length}건</p>
      </div>
    </div>
  )
}
