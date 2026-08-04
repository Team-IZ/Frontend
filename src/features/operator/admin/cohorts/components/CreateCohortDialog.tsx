import { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useAsync } from '@/lib/useAsync'
import { createCohort, getOrg } from '../../_/api/api'
import { toIsoDate, type ParsedRoster } from '../../_/rules'
import DateRangeField from './DateRangeField'
import RosterCsvField from '../../_/components/RosterCsvField'
import RosterIssueList from '../../_/components/RosterIssueList'

/*
  기수 생성 모달.

  **초기 명단은 선택이다.** 지금 넣으면 등록과 동시에 활성화 초대가 나가고, 안 넣으면
  나중에 `반 · 명단` 탭에서 추가한다 — **반 배정은 어느 쪽이든 생성 뒤**에 한다.

  기수명 중복과 `시작 > 종료`는 **서버도 막는 규칙**이라 화면 검증만 두지 않는다
  (api.ts `createCohort`). 다만 기간은 달력이 애초에 못 고르게 해서 그 상태가
  만들어지지 않는다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export default function CreateCohortDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState('')
  const [startAt, setStartAt] = useState<Date>()
  const [endAt, setEndAt] = useState<Date>()
  const [roster, setRoster] = useState<ParsedRoster | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [failed, setFailed] = useState(false)

  // 도메인 검증에 기관 정보가 필요하다 — 프론트 상수로 두면 기관이 둘이 되는 순간 틀린다
  const loadOrg = useCallback(() => getOrg(), [])
  const org = useAsync(loadOrg, open)

  const submittable = name.trim().length > 0 && !!startAt && !!endAt && !submitting

  const reset = () => {
    setName('')
    setStartAt(undefined)
    setEndAt(undefined)
    setRoster(null)
    setFailed(false)
  }

  const submit = async () => {
    if (!startAt || !endAt) return
    setSubmitting(true)
    setFailed(false)
    try {
      await createCohort({
        name,
        startAt: toIsoDate(startAt),
        endAt: toIsoDate(endAt),
        roster: roster?.entries,
      })
      onCreated()
      onOpenChange(false)
      reset()
    } catch {
      // 입력값을 유지한다 — 작업 중 저장 실패로 폼이 비면 처음부터 다시 해야 한다(F5)
      setFailed(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        모달 전체를 스크롤시키면 `생성`이 화면 밖으로 밀린다 — 제목·푸터는 고정하고
        본문만 스크롤한다.
      */}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            기수 생성
            {org.data && (
              <span className="text-fg-subtle text-xs font-normal"> · {org.data.name}</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1">
          {failed && (
            <Alert variant="danger">
              <AlertTitle>만들지 못했습니다. 기수명이 이미 있는지 확인해 주세요.</AlertTitle>
            </Alert>
          )}

          <Field>
            <FieldLabel htmlFor="cohort-name">
              기수명 <RequiredMark />
            </FieldLabel>
            <Input
              id="cohort-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="9기"
            />
            <FieldDescription>같은 기관 안에서 중복될 수 없습니다.</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>
              기간 <RequiredMark />
            </FieldLabel>
            <DateRangeField
              startAt={startAt}
              endAt={endAt}
              onChange={(patch) => {
                if ('startAt' in patch) setStartAt(patch.startAt)
                if ('endAt' in patch) setEndAt(patch.endAt)
              }}
            />
            <FieldDescription>
              프로젝트 회차 마감이 이 기간 밖으로 나가지 않게 달력이 막습니다.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>
              초기 명단{' '}
              <span className="text-fg-subtle text-xs font-normal">· 선택 · 이름 + 이메일</span>
            </FieldLabel>
            {org.data && (
              <RosterCsvField domain={org.data.domain} onChange={(parsed) => setRoster(parsed)} />
            )}
            {roster && (
              <div className="mt-2">
                <p className="text-success text-xs">
                  ✓ 유효 <b className="font-semibold">{roster.entries.length}명</b> — 등록하면
                  활성화 초대가 나갑니다
                </p>
                <RosterIssueList issues={roster.invalid} />
              </div>
            )}
            <FieldDescription>
              지금 넣지 않아도 됩니다 — 반 · 명단 탭에서 나중에 추가할 수 있고, 반 배정은 어느
              쪽이든 생성 뒤에 합니다.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          {/*
            흐린 버튼 게이팅(C1)과 다르다 — C1이 금지한 것은 **권한 때문에** 영원히 흐린
            버튼이고, 이것은 입력이 덜 찬 폼이라 채우면 켜진다.
          */}
          <Button disabled={!submittable} onClick={submit}>
            {submitting && <Spinner className="size-3.5" />}
            기수 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RequiredMark({ children = '필수' }: { children?: string }) {
  return <span className="text-danger text-2xs font-semibold">{children}</span>
}
