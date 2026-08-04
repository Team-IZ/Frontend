import { useCallback, useState } from 'react'
import { XIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useAsync } from '@/lib/useAsync'
import { addRoster, getOrg, previewRoster } from '../../_/api/api'
import { checkRosterRows, type ParsedRoster } from '../../_/rules'
import { ROSTER_ISSUE_LABEL } from '../../_/labels'
import { COHORT_ID } from '../../_/cohortScope'
import type { AddRosterResult, RosterEntry, RosterIssue } from '../../_/api/types'
import RosterCsvField from '../../_/components/RosterCsvField'
import RosterIssueList from '../../_/components/RosterIssueList'

/*
  명단 추가 — **두 가지 방식이 진짜 다른 상황을 위한 것이다**(OP-06 §3).

    CSV 일괄   최초 수십~수백 명. 유효 n · 중복 제외 n · 형식 오류 행 번호
    직접 입력   지각 등록 1~2명. 형식·중복을 그 자리에서

  탭으로 가른 이유는 **입력 형태가 다르기 때문**이지 같은 것의 변형이라서가 아니다.
  200명을 한 줄씩 치게 하거나, 두 명 때문에 CSV를 만들게 하면 둘 다 안 쓰인다.

  **한 줄 때문에 전체를 막지 않는다.** 유효 행은 등록하고 오류 행만 번호로 알린다 —
  수백 명 파일을 통째로 되돌리면 아무도 안 쓴다(OP-06 §6).

  **등록과 동시에 활성화 초대가 나간다.** 그래서 누르기 전에 몇 명에게 나가는지를 보여준다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdded: (result: AddRosterResult) => void
}

/** 직접 입력의 빈 행. 목업처럼 **한 줄은 늘 비어 있다** — `+ 행 추가`를 안 눌러도 칠 수 있다 */
const emptyRow = (): RosterEntry => ({ name: '', email: '' })

export default function AddRosterDialog({ open, onOpenChange, onAdded }: Props) {
  const [mode, setMode] = useState('csv')
  const [parsed, setParsed] = useState<ParsedRoster | null>(null)
  const [preview, setPreview] = useState<AddRosterResult | null>(null)
  const [rows, setRows] = useState<RosterEntry[]>([emptyRow()])
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  const loadOrg = useCallback(() => getOrg(), [])
  const org = useAsync(loadOrg, open)
  const domain = org.data?.domain

  /*
    **판정은 rules.ts가 한다** — CSV와 같은 규칙을 같은 순서로 돌린다(`checkRosterRows`).
    여기서 한 줄씩 `checkEmail`을 돌렸을 때 CSV가 잡는 것 둘을 놓쳤다: 빈 행이 앞에
    있으면 줄 번호가 밀렸고, 입력칸 사이 중복을 아예 안 봤다.
  */
  const typedIssues: RosterIssue[] = domain ? checkRosterRows(rows, domain) : []
  /** 걸리지 않은 행만 등록 후보다. 번호가 칸과 맞으므로 그 번호로 걸러낸다 */
  const typedValid = rows.filter(
    (r, i) => r.email.trim().length > 0 && !typedIssues.some((x) => x.line === i + 1),
  )

  const entries = mode === 'csv' ? (parsed?.entries ?? []) : typedValid
  const issues = mode === 'csv' ? (parsed?.invalid ?? []) : typedIssues
  const submittable = entries.length > 0 && issues.length === 0 && !submitting

  const askPreview = async (next: RosterEntry[]) => {
    if (next.length === 0) return setPreview(null)
    // 파일 안에서 알 수 없는 것 하나 — **이미 등록된 이메일**. 서버가 센다
    setPreview(await previewRoster({ cohortId: COHORT_ID, entries: next }))
  }

  const submit = async () => {
    setSubmitting(true)
    setFailed(false)
    try {
      const result = await addRoster({ cohortId: COHORT_ID, entries })
      onAdded(result)
      close(false) // 닫기가 비우는 일까지 한다 — 성공·취소가 같은 길로 나간다
    } catch {
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setParsed(null)
    setPreview(null)
    setRows([emptyRow()])
    setFailed(false)
  }

  /*
    **닫으면 비운다.** 성공했을 때만 비우고 있어서, 파일을 올리다 취소하고 다시 열면
    그때의 판정이 그대로 떠 있었다 — 특히 `이미 등록된 이메일 n명`은 **서버가 그 시점에
    센 수**라 그 사이 명단이 바뀌면 틀린 수를 보여준다. 등록은 이어 하는 작업이 아니다.
  */
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            명단 추가 <span className="text-fg-subtle text-xs font-normal">· 7기</span>
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>등록하지 못했습니다. 잠시 후 다시 시도해 주세요.</AlertTitle>
            </Alert>
          )}

          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as string)
              setPreview(null)
            }}
          >
            <TabsList>
              <TabsTrigger value="csv">CSV 일괄 업로드</TabsTrigger>
              <TabsTrigger value="manual">직접 입력</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="pt-3">
              {domain && (
                <RosterCsvField
                  domain={domain}
                  onChange={(next) => {
                    setParsed(next)
                    void askPreview(next?.entries ?? [])
                  }}
                />
              )}
              <p className="text-fg-subtle mt-2 text-2xs">
                수십~수백 명을 한 번에 넣을 때 씁니다. 기관 도메인 밖 주소는 등록되지 않습니다. 반
                배정은 등록한 뒤 배정 모드에서 합니다.
              </p>
            </TabsContent>

            <TabsContent value="manual" className="pt-3">
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                    <Input
                      value={row.name}
                      placeholder="이름"
                      aria-label={`${i + 1}번째 이름`}
                      onChange={(e) => setRows(patch(rows, i, { name: e.target.value }))}
                    />
                    <Input
                      value={row.email}
                      placeholder={domain ? `name@${domain}` : '이메일'}
                      aria-label={`${i + 1}번째 이메일`}
                      onChange={(e) => {
                        setRows(patch(rows, i, { email: e.target.value }))
                        setPreview(null)
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`${i + 1}번째 행 삭제`}
                      // 마지막 한 줄은 남긴다 — 다 지우면 칠 곳이 사라진다
                      disabled={rows.length === 1}
                      onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    >
                      <XIcon />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setRows([...rows, emptyRow()])}
              >
                + 행 추가
              </Button>
              <p className="text-fg-subtle mt-2 text-2xs">
                이메일 형식과 중복을 그 자리에서 확인합니다. 등록하면 활성화 초대가 나갑니다.
              </p>
            </TabsContent>
          </Tabs>

          {/* 판정 결과 — **누르기 전에** 무엇이 등록되고 무엇이 걸리는지 보여준다 */}
          {(entries.length > 0 || issues.length > 0) && (
            <div className="border-border bg-surface-2 rounded-md border p-3">
              {/* 유효가 0이면 이 줄을 쓰지 않는다 — `✓ 유효 0명`은 체크 표시가 거짓말을 한다 */}
              {entries.length > 0 && (
                <p className="text-success text-xs">
                  ✓ 유효 <b className="font-semibold">{preview?.added ?? entries.length}명</b> —
                  등록하면 활성화 초대가 나갑니다
                </p>
              )}
              {preview !== null && preview.skipped > 0 && (
                <p className="text-warning mt-0.5 text-xs">
                  ⚠ 이미 등록된 이메일 <b className="font-semibold">{preview.skipped}명</b> —
                  건너뜁니다
                </p>
              )}
              {mode === 'csv' ? (
                <RosterIssueList issues={issues} />
              ) : (
                issues.map((x) => (
                  <p key={x.line} className="text-danger mt-0.5 text-xs">
                    ✗ {x.line}번째 줄 — {ROSTER_ISSUE_LABEL[x.reason]}
                  </p>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={submitting}>
            취소
          </Button>
          {/*
            오류 행이 있으면 막는다. **CSV는 한 줄 때문에 전체를 막지 않는다**는 규칙과
            어긋나 보이지만 다른 이야기다 — 그 규칙은 *서버가 유효 행만 등록한다*는 뜻이고,
            화면은 **고칠 수 있는 것을 고치게** 한다. 여기서 그냥 보내면 오류 행이 조용히
            사라져 몇 명이 빠졌는지 모른 채 끝난다.
          */}
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            등록 · 초대 발송
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function patch(rows: RosterEntry[], i: number, next: Partial<RosterEntry>): RosterEntry[] {
  return rows.map((row, j) => (i === j ? { ...row, ...next } : row))
}
