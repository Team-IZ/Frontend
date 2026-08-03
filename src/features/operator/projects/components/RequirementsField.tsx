import { useState } from 'react'
import { XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/InputGroup'
import { addRequirements } from '../rules'

/*
  요구사항 입력 — **칩이다.** 처음엔 `Textarea` + `한 줄에 하나`였는데 셋이 틀렸다.

  ▸ **읽기 화면과 다르게 생겼다.** 상세는 번호 붙은 목록인데 편집은 덩어리 텍스트라,
    같은 것을 두 모양으로 배운다.
  ▸ **계약이 눈에 안 보인다.** 개행이 구분자라는 것을 화면이 말하지 않아 몇 건이 될지
    저장해야 안다. 빈 줄이 조용히 사라지고 중복이 그대로 들어간다.
  ▸ **판정 단위와 안 맞는다.** MG-08이 항목마다 `✓`/`✗`와 이유를 붙인다(`✓ 2 · ✗ 1`) —
    요구사항은 문장 덩어리가 아니라 **항목의 목록**이다. 그래서 저장 모양도 배열이다.

  **손으로 만들지 않았다.** `input-inventory.md` F 범주가 칩 입력을
  `InputGroup + Badge` + 배열 상태로 확정해 뒀고(`Enter` 추가 · `✕` 삭제 · 빈 칸
  `Backspace`로 마지막 삭제), `InputCompositionsPreview.tsx`에 그 조합이 조립돼 있다.
  여기서는 그것을 도메인 규칙(`addRequirements`)에 붙이기만 한다.

  **여러 줄 붙여넣기를 받는다.** 과제 문서에서 통째로 복사하는 것이 실제 동선이라,
  그때 한 덩어리 칩이 되면 항목이 아니게 된다 — `addRequirements`가 나눈다.
*/
type Props = {
  value: string[]
  onChange: (next: string[]) => void
  /** 입력창 id — 바깥 `FieldLabel`이 이 값을 가리킨다 */
  id?: string
}

export default function RequirementsField({ value, onChange, id }: Props) {
  const [draft, setDraft] = useState('')

  const commit = (text: string) => {
    onChange(addRequirements(value, text))
    setDraft('')
  }

  return (
    <InputGroup>
      <InputGroupAddon align="block-start" className="flex-wrap gap-1">
        {value.map((r) => (
          <Badge key={r} variant="info" className="gap-1">
            {r}
            <button
              type="button"
              aria-label={`${r} 제거`}
              onClick={() => onChange(value.filter((x) => x !== r))}
              className="cursor-pointer"
            >
              <XIcon className="size-3" />
            </button>
          </Badge>
        ))}
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        value={draft}
        placeholder={value.length ? '항목 추가 후 Enter' : '좋아요 버튼'}
        aria-label="요구사항 추가"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          /*
            **조합 중 키는 IME 것이다.** 한글은 `ㅂㅂㅂ`를 치는 동안 조합이 안 끝난
            상태인데, 그때 Enter를 누르면 브라우저가 keydown을 **두 번** 보낸다 —
            조합을 확정하는 것 하나, 확정된 뒤 하나. 막지 않으면 `ㅂㅂㅂㅇㅇㅇ`와
            `ㅇ`이 각각 칩이 된다(실제로 그렇게 나왔다).

            `isComposing`은 표준 필드이고 조합이 없는 입력(영문·붙여넣기)에서는 늘
            `false`라, IME만 예외로 빼는 것이 아니라 **모든 입력에 같은 규칙**이다.
          */
          if (e.nativeEvent.isComposing) return

          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
          // 빈 칸에서 Backspace = 마지막 항목 삭제(입력창의 관습)
          if (e.key === 'Backspace' && draft === '') onChange(value.slice(0, -1))
        }}
        /*
          여러 줄을 붙여 넣으면 그 자리에서 나눈다. 기본 동작(한 줄로 이어 붙기)에
          맡기면 개행이 사라진 한 덩어리가 되어 무엇이 항목이었는지 복구할 수 없다.
        */
        onPaste={(e) => {
          const text = e.clipboardData.getData('text')
          if (!text.includes('\n')) return
          e.preventDefault()
          commit(text)
        }}
        /*
          포커스를 잃을 때도 담는다 — 치고 나서 Enter를 안 누르고 `저장`을 누르는 것이
          흔한데, 그때 방금 친 항목이 조용히 사라지면 무엇이 빠졌는지 모른다.
        */
        onBlur={() => draft.trim() && commit(draft)}
      />
    </InputGroup>
  )
}
