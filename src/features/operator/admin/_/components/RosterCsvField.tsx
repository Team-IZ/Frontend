import { useRef, useState } from 'react'
import { UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { parseRosterCsv, type ParsedRoster } from '../rules'

/*
  명단 CSV 고르기 — **열은 둘, 이름과 이메일**(목업 `#roster-add`).

  파일을 고르는 즉시 **그 자리에서 판정한다.** 형식·도메인·파일 안 중복은 서버를 안 거쳐도
  알 수 있고, 등록을 누른 뒤에 알려주면 수백 명짜리 파일을 다시 만들게 된다.
  서버만 아는 것(`이미 등록된 이메일`)은 부르는 쪽이 따로 물어본다.

  `<input type="file">`을 그대로 쓴다 — 브라우저 기본 파일 선택기가 접근성·키보드·
  모바일까지 이미 처리한다. 끌어다 놓기는 같은 input 위에 얹었다.

  **양식 내려받기**는 목업에 있는 링크다. 파일을 서버에서 받아오는 게 아니라 두 줄짜리
  CSV라 그 자리에서 만든다 — 없는 엔드포인트를 계약에 넣지 않는다.
*/
type Props = {
  domain: string
  /**
   * 고른 결과. **파일 자체도 같이 준다** — 화면은 파싱 결과로 판정하고, 서버에는
   * **원본 파일을 그대로** 보낸다(등록이 multipart다). 파싱한 결과를 다시 CSV로 만들어
   * 보내면 판정 규칙이 두 벌이 된다.
   */
  onChange: (parsed: ParsedRoster | null, fileName: string | null, file: File | null) => void
}

const TEMPLATE = '이름,이메일\n홍길동,gildong@example.com\n'

export default function RosterCsvField({ domain, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const take = async (file: File | undefined) => {
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    onChange(parseRosterCsv(text, domain), file.name, file)
  }

  return (
    <div>
      <div
        className={`border-border-strong rounded-md border border-dashed p-5 text-center ${
          dragging ? 'bg-primary-soft border-primary' : 'bg-surface-2'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void take(e.dataTransfer.files[0])
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => void take(e.target.files?.[0])}
        />
        <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          {fileName ?? 'CSV 파일 고르기'}
        </Button>
        <p className="text-fg-subtle mt-2 text-2xs">
          끌어다 놓아도 됩니다 · 열 = 이름, 이메일 (2열) ·{' '}
          <a
            className="underline"
            download="명단-양식.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
          >
            양식 내려받기
          </a>
        </p>
      </div>
    </div>
  )
}
