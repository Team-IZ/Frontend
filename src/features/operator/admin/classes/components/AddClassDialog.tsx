import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field, FieldLabel, FieldDescription } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/InputGroup'
import { Spinner } from '@/components/ui/Spinner'
import { errorCopy } from '@/lib/errorCopy'
import { useCreateClassroom } from '@/api/academic/useAcademicMutations'
import { useFindManagers } from '@/api/member/useMemberQueries'
import { DEFAULT_CLASS_CAPACITY, classroomName } from '../../_/rules'
import { useCohortScope } from '../../_/cohortScope'
import { FilterSelect } from '../../_/components/AdminFilters'
import { ALL } from '../../_/filterState'
import RequiredMark from '../../_/components/RequiredMark'

/*
  반 추가.

  **담당 매니저는 선택이다.** 비우면 `담당 없음`으로 만들어지고 목록에 경고가 붙는다 —
  반을 먼저 만들고 사람을 나중에 정하는 순서가 실제로 있다. 배정이 **기간형 이력**이라
  나중에 바꿔도 지난 기수의 담당 기록은 남는다(OP-06 §3).

  ⚠ **정원 칸은 목업에 없다.** 그런데 배정 모드의 레일이 `22 → 24 / 25`를 그리므로 값이
  어디선가 정해져야 하고, 반마다 다를 수 있다(중도 합류·통폐합). 기본값을 25로 두고
  고칠 수 있게 했다 — 17번이 스코프를 `250명 · 10반`으로 잡은 그 값이다.
  **정원 초과를 막지는 않는다** — 서버도 막지 않는다(스펙 명시 · 표시용 값이다).

  ## 담당 매니저는 **선택**이다
  비우면 `담당 없음`으로 만들어지고 목록에 경고가 붙는다 — 반을 먼저 만들고 사람을
  나중에 정하는 순서가 실제로 있다.

  ⚠ 한때 이 칸을 지웠었다. 스펙이 `managerIds`를 *"지금은 서버가 사용하지 않는다"* 고
  적고 있어서인데, **설명이 사실과 달랐다**(11차 Q3-② — 원래부터 동작했다). 반 생성과
  **같은 트랜잭션**에서 배정되므로 "반만 있고 담당은 없는" 상태가 남지 않는다.

  **가입 전 매니저는 후보에 없다** — 로그인을 못 해 그 반의 면담·독촉을 처리할 수 없는데
  반에 id가 박히면 `담당 없음` 경고에 안 잡힌다. 그래서 `status=ACTIVE`만 받는다.
*/
type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AddClassDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState(String(DEFAULT_CLASS_CAPACITY))
  const [managerId, setManagerId] = useState(ALL)
  /** 실패 **원인**을 들고 있는다 — 있고 없고만 알면 화면이 이유를 지어내게 된다 */
  const [failure, setFailure] = useState<unknown>(null)

  const scope = useCohortScope()
  const create = useCreateClassroom()
  /*
    **이 기수의 활성 매니저만 후보다.**

    ⚠ 두 가지를 같이 건다.
    ▸ `status: 'ACTIVE'` — 초대 대기·정지는 담당을 맡을 수 없다
    ▸ `cohortId` — 없이 부르면 **기관 전체 38명**이 온다(실측 · 7·8·9기가 섞인다).
      9기 반을 만들면서 7기 매니저를 고를 수 있다는 것 자체가 틀린 말이다.

    담당 변경 모달(`ClassManagersDialog`)을 같은 이유로 먼저 고쳤는데 **여기를 놓쳤다** —
    매니저를 고르게 하는 자리는 둘이다.
  */
  const managers = useFindManagers(
    { query: { status: 'ACTIVE', size: 100, cohortId: scope.cohortId } },
    { enabled: open && !!scope.cohortId },
  )

  const options = [
    { value: ALL, label: '나중에 배정' },
    ...(managers.data?.content ?? []).map((m) => ({
      value: m.managerId,
      label: m.name ?? m.email,
    })),
  ]

  const size = Number(capacity)
  const submittable =
    name.trim().length > 0 &&
    Number.isFinite(size) &&
    size > 0 &&
    !!scope.cohortId &&
    !create.isPending

  const submit = async () => {
    if (!scope.cohortId) return
    setFailure(null)
    try {
      await create.mutateAsync({
        path: { cohortId: scope.cohortId },
        body: {
          name: classroomName(name),
          capacity: size,
          // 안 고르면 키를 뺀다 — 빈 배열은 "담당 전체 해제"라 뜻이 다르다
          ...(managerId !== ALL && { managerIds: [managerId] }),
        },
      })
      onOpenChange(false)
      setName('')
      setCapacity(String(DEFAULT_CLASS_CAPACITY))
      setManagerId(ALL)
    } catch (e) {
      setFailure(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            반 추가{' '}
            <span className="text-fg-subtle text-xs font-normal">· {scope.current?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/*
            ⚠ **원인을 추측하지 않는다.** 한때 실패를 하나로 묶어
            *"같은 이름의 반이 있는지 확인해 주세요"* 를 고정으로 띄웠는데, 인증이
            끊겼거나 네트워크가 죽어도 같은 말을 했다 — 사용자가 엉뚱한 것을 고치게 된다.
            `errorCopy`가 코드·상태를 보고 문구를 정한다.
          */}
          {failure !== null &&
            (() => {
              const copy = errorCopy(failure, { subject: '반', action: '추가' })
              return (
                <Alert variant="danger">
                  <AlertTitle>{copy.title}</AlertTitle>
                  <AlertDescription>{copy.description}</AlertDescription>
                </Alert>
              )
            })()}

          <div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field>
                <FieldLabel htmlFor="class-name">
                  반 이름 <RequiredMark />
                </FieldLabel>
                {/*
                  **「반」은 우리가 붙인다.** 자리표시자가 `K반`이던 동안 사용자가 그 글자를
                  같이 쳤고, 빠뜨리면 `A`라는 반이 생겨 목록에서 혼자 다른 모양이 됐다.
                  칸 오른쪽에 붙는 글자를 **보여 주면서** 받는다 — 저장될 이름이 눈에 있다.
                */}
                <InputGroup className="h-9">
                  <InputGroupInput
                    id="class-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="K"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>반</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              <Field className="w-24">
                <FieldLabel htmlFor="class-capacity">
                  정원 <RequiredMark />
                </FieldLabel>
                <Input
                  id="class-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </Field>
            </div>
            <FieldDescription className="mt-1.5">
              같은 기수 안에서 반 이름은 중복될 수 없습니다. 정원은 넘겨서 배정할 수도 있습니다 —
              넘으면 알려만 줍니다.
            </FieldDescription>
          </div>

          <Field>
            <FieldLabel>
              담당 매니저 <span className="text-fg-subtle text-xs font-normal">· 선택</span>
            </FieldLabel>
            <FilterSelect
              label="담당"
              value={managerId}
              options={options}
              onChange={setManagerId}
              className="w-full"
            />
            {/*
              **후보가 없으면 그 이유를 말한다.** 기수를 새로 만들면 매니저가 0명이라
              드롭다운에 `나중에 배정` 하나만 남는데, 그것만 보면 **고장인지 없는 건지**
              알 수 없다 — 「알려 주고 못 찾게 두지 않는다」(검토 기준 ④).
            */}
            <FieldDescription>
              {managers.data && managers.data.content.length === 0
                ? '이 기수에 활성 매니저가 없습니다 — 매니저 탭에서 초대하면 여기서 고를 수 있습니다.'
                : '비우면 담당 없음으로 만들어지고 목록에 경고가 붙습니다. 나중에 목록에서 배정할 수 있고, 배정은 기간형 이력이라 바꿔도 지난 기록은 남습니다.'}
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            취소
          </Button>
          <Button disabled={!submittable} onClick={() => void submit()}>
            {create.isPending && <Spinner className="size-3.5" />}반 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
