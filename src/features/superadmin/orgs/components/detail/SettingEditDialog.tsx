import { useEffect, useState, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useUpdateOrganizationOperationSettings } from '@/api/usage/useUsageMutations'
import type { updateOrganizationOperationSettings_Body } from '@/api/usage/usageTypes'

/*
  운영 설정 모달의 공통 껍데기 — 열림·초안 상태·저장·에러를 맡는다.
  안에 무엇을 그릴지는 호출부가 `children`으로 준다(SA-03 모달들과 같은 형태).

  ## 왜 모달마다 자기 필드만 보내나
  `PATCH`라 **보내지 않은 키는 직전 값을 승계**한다. 예산 모달이 예산만 보내면
  다른 설정은 서버가 그대로 둔다 — 전체를 되돌려 보내면 **그 사이 남이 바꾼 것을
  옛 값으로 덮어쓴다**(6차 요청 R1의 근거).

  ## ⚠️ `null`과 "키를 뺀다"가 다르다
  스펙 명시 — *"`null`을 보내면 무제한으로 푼다. **유지하려면 키를 빼세요.**"*
  그래서 초안에서 **바뀐 키만** 골라 보낸다. `undefined`를 넣어 두면 JSON에서 사라지므로
  "안 건드림"이 되고, 명시적으로 `null`을 넣어야 "무제한"이 된다.
*/

export type SettingsPatch = updateOrganizationOperationSettings_Body

export default function SettingEditDialog<T extends object>({
  open,
  onOpenChange,
  organizationId,
  title,
  description,
  initial,
  toPatch,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  title: string
  description?: ReactNode
  /** 열 때마다 이 값으로 초안을 새로 만든다 — 취소하고 다시 열면 서버 값에서 시작한다 */
  initial: T
  /** 초안 → 보낼 것. **바뀐 키만** 담는다 */
  toPatch: (draft: T, initial: T) => SettingsPatch
  children: (draft: T, set: (patch: Partial<T>) => void) => ReactNode
}) {
  const [draft, setDraft] = useState<T>(initial)
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateOrganizationOperationSettings()

  // 다이얼로그는 닫아도 언마운트되지 않는다 — 열 때 서버 값으로 되돌린다
  useEffect(() => {
    if (open) {
      setDraft(initial)
      setError(null)
    }
    // initial은 매 렌더 새 객체일 수 있어 의존성에 넣지 않는다. 여는 순간의 값이면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const patch = toPatch(draft, initial)
  const changed = Object.keys(patch).length > 0

  async function handleSave() {
    setError(null)
    try {
      await update.mutateAsync({ path: { organizationId }, body: patch })
      onOpenChange(false)
    } catch {
      setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && <Alert variant="danger">{error}</Alert>}
          {children(draft, (p) => setDraft((d) => ({ ...d, ...p })))}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          {/* 바꾼 게 없으면 막는다 — 빈 저장은 정책 버전만 하나 늘린다(append-only) */}
          <Button disabled={!changed || update.isPending} onClick={() => void handleSave()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
