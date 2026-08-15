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

/**
 * 내려받는 양식. **도메인은 그 기관 것을 쓴다** — `example.com`을 예시로 두면 그대로
 * 채워 올리고 「기관 도메인 밖 주소」로 전부 튕긴다. 이름 칸은 **비우면 서버가 파일
 * 전체를 거절**하므로(`TRAINEE_NAME_INVALID`) 예시 줄이 그것을 보여 준다.
 */
const template = (domain: string) => `이름,이메일\n홍길동,gildong@${domain || 'example.com'}\n`

/*
  파일을 글자로 읽는다 — **`file.text()`를 안 쓴다.**

  `File.text()`는 무조건 UTF-8로 디코딩하고, **깨져도 조용히 성공한다**(`�`가 섞인
  문자열이 나온다). 그러면 화면은 머리글을 못 찾은 이유를 *"이름 열이 없다"* 로 잘못
  말한다 — 진짜 이유는 **인코딩**이다.

  ⚠ **윈도우 엑셀의 「CSV(쉼표로 분리)」는 CP949다.** 그리고 **서버는 UTF-8만 받는다**
  (실측 — `CSV_FORMAT_INVALID · "CSV 파일은 UTF-8 인코딩이어야 합니다"`). 그래서 여기서
  euc-kr로 **읽어서 통과시키면 안 된다** — 미리보기는 멀쩡한데 등록이 튕긴다.

  엄격 모드로 UTF-8을 시도해 **아니라는 것만 알아내고**, 그 사실을 그대로 알린다.
  나중에 프런트가 UTF-8로 정규화해 보내게 되면 그때 euc-kr을 실제로 읽으면 된다.
*/
async function readSheet(file: File): Promise<string | null> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return null // UTF-8이 아니다 — 서버도 안 받는다
  }
}

export default function RosterCsvField({ domain, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const take = async (file: File | undefined) => {
    if (!file) return
    const text = await readSheet(file)
    if (text === null) {
      onChange(
        { entries: [], invalid: [{ line: 1, reason: 'ENCODING_NOT_UTF8' }] },
        file.name,
        file,
      )
      return
    }
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
            download="교육생-양식.csv"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(template(domain))}`}
          >
            양식 내려받기
          </a>
        </p>
      </div>
    </div>
  )
}
