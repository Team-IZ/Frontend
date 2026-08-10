import { useState } from 'react'
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
import { useCreateCohort } from '@/api/academic/useAcademicMutations'
import { useGetCurrentMember } from '@/api/member/useMemberQueries'
import { toIsoDate } from '../../_/rules'
import RequiredMark from '../../_/components/RequiredMark'
import DateRangeField from './DateRangeField'

/*
  기수 생성 모달.

  기수명 중복(409)과 `시작 > 종료`(400)는 **서버가 막는 규칙**이라 화면 검증만 두지 않는다.
  다만 기간은 달력이 애초에 못 고르게 해서 그 상태가 만들어지지 않는다.

  ## ⚠ 초기 명단 칸을 뺐다
  목 단계에서는 여기서 CSV를 같이 받았다. 서버 스펙이 그 필드를 이렇게 적고 있다 —
  *"`initialTrainees`: ⚠ 요청에 넣어도 저장되지 않는다."*

  **보내도 아무 일이 안 일어나는 칸을 두면 화면이 거짓말을 한다** — 200을 받고 모달이
  닫히는데 명단은 비어 있다. 명단 탭이 CSV 등록과 사전 검증(드라이런)을 이미 갖고 있으므로
  진입점을 그쪽 하나로 모은다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CreateCohortDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [startAt, setStartAt] = useState<Date>()
  const [endAt, setEndAt] = useState<Date>()
  const [failed, setFailed] = useState(false)

  /*
    **기관은 세션이 안다.** 목일 때는 `getOrg()`를 따로 불렀는데, 서버가 `/members/me`에
    기관 id를 실어 주므로 조회가 하나 줄었다(로그인한 사람의 기관 밖에는 만들 수 없다 —
    다른 기관 id를 보내면 403).
  */
  const { data: me } = useGetCurrentMember()
  const create = useCreateCohort()

  const submittable =
    name.trim().length > 0 && !!startAt && !!endAt && !!me?.organizationId && !create.isPending

  const submit = async () => {
    if (!startAt || !endAt || !me?.organizationId) return
    setFailed(false)
    try {
      await create.mutateAsync({
        body: {
          organizationId: me.organizationId,
          name: name.trim(),
          startDate: toIsoDate(startAt),
          endDate: toIsoDate(endAt),
        },
      })
      onOpenChange(false)
      setName('')
      setStartAt(undefined)
      setEndAt(undefined)
    } catch {
      // 입력값을 유지한다 — 작업 중 저장 실패로 폼이 비면 처음부터 다시 해야 한다(F5)
      setFailed(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>기수 생성</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
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
              프로젝트 회차 마감이 이 기간 밖으로 나가지 않게 달력이 막습니다. 명단은 만든 뒤 명단
              탭에서 넣습니다.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            취소
          </Button>
          {/*
            흐린 버튼 게이팅(C1)과 다르다 — C1이 금지한 것은 **권한 때문에** 영원히 흐린
            버튼이고, 이것은 입력이 덜 찬 폼이라 채우면 켜진다.
          */}
          <Button disabled={!submittable} onClick={() => void submit()}>
            {create.isPending && <Spinner className="size-3.5" />}
            기수 생성
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
