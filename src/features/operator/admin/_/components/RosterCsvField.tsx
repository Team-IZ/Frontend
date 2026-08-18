import { useRef, useState } from 'react'
import { UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { parseRosterCsv, type ParsedRoster } from '../rules'

/*
  명단 CSV 고르기 — **열은 둘, 이름과 이메일**(목업 `#roster-add`).

  파일을 고르는 즉시 **그 자리에서 판정한다.** 형식·파일 안 중복은 서버를 안 거쳐도
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
 * 내려받는 양식. **도메인은 그 기관 것을 쓴다** — 실제로 등록할 주소와 같은 모양을
 * 보여주려는 것뿐이고, 다른 도메인을 채워 넣어도 더는 걸리지 않는다(8/18 결정). 이름
 * 칸은 **비우면 서버가 파일 전체를 거절**하므로(`TRAINEE_NAME_INVALID`) 예시 줄이
 * 그것을 보여 준다.
 */
const template = (domain: string) => `이름,이메일\n홍길동,gildong@${domain || 'example.com'}\n`

/*
  파일을 글자로 읽는다 — **`file.text()`를 안 쓴다.**

  `File.text()`는 무조건 UTF-8로 디코딩하고, **깨져도 조용히 성공한다**(`�`가 섞인
  문자열이 나온다). 그러면 화면은 머리글을 못 찾은 이유를 *"이름 열이 없다"* 로 잘못
  말한다 — 진짜 이유는 **인코딩**이다.

  ⚠ **윈도우 엑셀의 「CSV(쉼표로 분리)」는 CP949다.** 한때 서버가 UTF-8만 받아서 여기서도
  막았는데(*"미리보기는 멀쩡한데 등록이 튕긴다"*), **서버가 둘 다 받게 됐다**(29차 회신
  Q1 「나」). 그래서 지금은 UTF-8 → CP949 순으로 **엄격 모드로 두 번 시도한다.**
*/
async function readSheet(file: File): Promise<string | null> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    /*
      **UTF-8이 아니면 CP949로 읽는다** — 서버가 둘 다 받게 됐다(29차 회신 Q1).

      전에는 여기서 `null`을 돌려 「UTF-8이 아님」이라고 막았다. 서버가 UTF-8만 받던
      때라 **euc-kr로 읽어서 통과시키면 미리보기는 멀쩡한데 등록이 튕겼기** 때문이다.
      그 이유가 사라졌다 — 실측으로 CP949 파일이 그대로 200이다.

      ⚠ **정규화하지 않는다.** 여기서 읽는 것은 **미리보기용**이고, 서버로는 고른
      `File`이 그대로 간다(`AddRosterDialog`). 우리가 UTF-8로 다시 인코딩해 보낼
      필요가 없다 — 서버가 원본을 읽는다.

      `fatal`을 켠 채로 시도한다. 둘 다 실패하면 우리가 모르는 인코딩이라, 그때는
      **추측해서 깨진 글자를 보여주지 않고** 그 사실을 말한다.
    */
    try {
      return new TextDecoder('euc-kr', { fatal: true }).decode(buf)
    } catch {
      return null
    }
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
    onChange(parseRosterCsv(text), file.name, file)
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
          {/*
            **안내가 규칙보다 좁으면 사람들이 안 되는 줄 안다.** 「(2열)」은 서버가 두 열만
            받던 때의 문구다 — 지금은 `이름`·`이메일`만 있으면 순서도 다른 열도 상관없고,
            엑셀이 그냥 「CSV」로 저장한 CP949도 받는다(29차 회신 Q1). 그래서 **엑셀에서
            바로 저장해도 된다**는 것을 여기서 말한다.
          */}
          끌어다 놓아도 됩니다 · 「이름」·「이메일」 열만 있으면 됩니다(순서·다른 열 무관) ·{' '}
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
