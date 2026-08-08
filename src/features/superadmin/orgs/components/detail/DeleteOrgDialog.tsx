import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { useDeleteOrganization } from '@/api/organization/useOrganizationMutations'
import type { findOrganization_Response } from '@/api/organization/organizationTypes'

type Org = findOrganization_Response

/*
  SA-02 §7 "기관 삭제 — 즉시 파기가 아니다". 기관명을 정확히 입력해야 버튼이
  풀린다 — 소속 오퍼레이터·매니저·교육생 전원이 로그인할 수 없게 되는 액션이라
  버튼 한 번으로 끝나면 안 된다(정의서 "기관명 입력을 요구하는 이유").
*/

export default function DeleteOrgDialog({
  open,
  onOpenChange,
  org,
  retentionDays,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  org: Org
  retentionDays: number
}) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  /*
    이름 대조는 화면에서도 하지만 **서버가 최종 판정한다** — 스펙: *"저장된 기관명과 다르면
    거절된다."* 화면 검사는 버튼을 잠그는 용도이고, 실패 처리를 따로 두는 이유는
    다이얼로그를 연 뒤 다른 사람이 기관명을 바꿀 수 있기 때문이다.
  */
  const matches = typed.trim() === org.name
  const remove = useDeleteOrganization()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!matches) return
    setError(null)
    try {
      await remove.mutateAsync({
        path: { organizationId: org.organizationId },
        body: { confirmName: typed.trim() },
      })
      onOpenChange(false)
    } catch {
      setError('삭제하지 못했습니다. 기관명이 바뀌었을 수 있습니다.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-danger">{org.name}를 삭제할까요?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="danger">
            <AlertTitle>지금 바로 지워지지 않습니다</AlertTitle>
            <AlertDescription>
              보존기간({retentionDays}일)이 지난 뒤 파기됩니다. 그전까지는 복구할 수 있습니다.
            </AlertDescription>
          </Alert>

          <Field>
            <FieldLabel htmlFor="delete-org-confirm">확인을 위해 기관명을 입력하세요</FieldLabel>
            <Input
              id="delete-org-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={org.name}
              autoComplete="off"
            />
            <FieldDescription>
              삭제하면 소속 오퍼레이터 · 매니저 · 교육생이 모두 로그인할 수 없습니다
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter className="-mx-4 -mb-4 mt-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="danger" disabled={!matches} onClick={handleDelete}>
            삭제
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
