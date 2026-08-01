import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/Drawer'
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import { InterventionCard } from './InterventionCard'
import type { RecordCard, RecordKind } from '../mockData'

/*
  면담 탭(D43) — 면담·관찰 기록을 하나의 평평한 카드 목록으로 다룬다. "일반 메모"
  라는 별도 개념은 없다 — 시그널과 무관한 관찰도 그냥 관찰 카드 하나다.
  스코프 축소: 멘토링 유형 제외 — 이슈 #40. 기록 유형은 면담/관찰만 다룬다.

  면담 준비(RPT-03)는 별도 버튼이 아니라 [＋ 면담·관찰 기록 추가]에서 유형이 면담일
  때 요약·체크리스트가 프리필된다(자동 생성 아님, 사람이 채워 저장).

  툴바(검색·필터·정렬은 왼쪽) 규약은 TableFrame.tsx와 같다 — 주 액션(추가)만 오른쪽.
*/
const MEETING_PREFILL =
  '상황 요약: (코드 용어 없이 한 줄 요약)\n\n확인 체크리스트\n- 학습 페이스는 버겁지 않은지\n- 막힐 때 도움을 요청하는지\n- 이번 회차 계기가 있었는지\n- 지속 의지가 있는지'

const KIND_FILTER_OPTIONS: { value: 'ALL' | RecordKind; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: '면담', label: '면담' },
  { value: '관찰', label: '관찰' },
]
const KIND_FILTER_ITEMS = Object.fromEntries(
  KIND_FILTER_OPTIONS.map((o) => [o.value, `유형 · ${o.label}`]),
)

const ORDER_OPTIONS: { value: 'NEWEST' | 'OLDEST'; label: string }[] = [
  { value: 'NEWEST', label: '최신순' },
  { value: 'OLDEST', label: '오래된순' },
]
const ORDER_ITEMS = Object.fromEntries(ORDER_OPTIONS.map((o) => [o.value, `정렬 · ${o.label}`]))

function todayLabel() {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 정렬 전용 키. startedAt("MM.DD")엔 연도가 없어 문자열 비교만으론 연말·연초가 뒤집힌다 */
function todaySortKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function InterventionTab({
  records,
  onChangeRecords,
}: {
  records: RecordCard[]
  onChangeRecords: (next: RecordCard[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<RecordKind>('면담')
  const [content, setContent] = useState(MEETING_PREFILL)
  const [kindFilter, setKindFilter] = useState<'ALL' | RecordKind>('ALL')
  const [order, setOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST')

  // 필터·정렬은 원본 records를 바꾸지 않고 렌더 직전에 파생 배열을 만든다.
  const visibleRecords = useMemo(() => {
    const filtered = kindFilter === 'ALL' ? records : records.filter((r) => r.kind === kindFilter)
    return [...filtered].sort((a, b) =>
      order === 'NEWEST' ? b.sortAt.localeCompare(a.sortAt) : a.sortAt.localeCompare(b.sortAt),
    )
  }, [records, kindFilter, order])

  function openAdd() {
    setKind('면담')
    setContent(MEETING_PREFILL)
    setOpen(true)
  }

  function changeKind(next: RecordKind) {
    setKind(next)
    setContent(next === '면담' ? MEETING_PREFILL : '')
  }

  function saveNewRecord() {
    if (content.trim().length === 0) return
    const next: RecordCard = {
      id: `r-${records.length + 1}`,
      kind,
      author: '박지현',
      startedAt: todayLabel(),
      sortAt: todaySortKey(),
      content: content.trim(),
      ...(kind === '면담' ? { status: 'progress' as const } : {}),
    }
    onChangeRecords([...records, next])
    setOpen(false)
  }

  function toggleStatus(id: string) {
    onChangeRecords(
      records.map((r) =>
        r.id === id ? { ...r, status: 'done' as const, endedAt: todayLabel() } : r,
      ),
    )
  }

  function editRecord(id: string, nextContent: string) {
    onChangeRecords(
      records.map((r) =>
        r.id === id ? { ...r, content: nextContent, editedAt: todayLabel() } : r,
      ),
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        {records.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select
              value={kindFilter}
              onValueChange={(v) => setKindFilter(v as typeof kindFilter)}
              items={KIND_FILTER_ITEMS}
            >
              <SelectTrigger className="h-9 min-w-28" aria-label="기록 유형 필터">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_FILTER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    유형 · {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={order}
              onValueChange={(v) => setOrder(v as typeof order)}
              items={ORDER_ITEMS}
            >
              <SelectTrigger className="h-9 min-w-28" aria-label="정렬 순서">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    정렬 · {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={openAdd}>
          ＋ 면담·관찰 기록 추가
        </Button>
      </div>

      {records.length === 0 ? (
        <Empty className="mb-4">
          <EmptyTitle>면담 이력 없음</EmptyTitle>
          <EmptyDescription>
            이 교육생에게 진행 중이거나 완료된 면담·관찰 기록이 없습니다(D-6).
          </EmptyDescription>
        </Empty>
      ) : visibleRecords.length === 0 ? (
        <Empty className="mb-4">
          <EmptyTitle>조건에 맞는 기록이 없습니다</EmptyTitle>
          <EmptyDescription>선택한 유형 필터를 "전체"로 바꿔보세요.</EmptyDescription>
        </Empty>
      ) : (
        visibleRecords.map((r) => (
          <InterventionCard
            key={r.id}
            record={r}
            onToggleStatus={() => toggleStatus(r.id)}
            onEditSave={(next) => editRecord(r.id, next)}
          />
        ))
      )}

      <p className="mt-3 text-[11px] text-fg-subtle">
        · 면담 기록은 이 학생 맥락(M06)에서 관리한다. 효과 판정은 완료 후 다음 회차에만. 작성자·시각
        보존, 학생 비공개.
      </p>

      <Drawer open={open} onOpenChange={setOpen} swipeDirection="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>면담·관찰 기록 추가</DrawerTitle>
            <DrawerDescription>
              면담 유형은 확인 체크리스트가 자동으로 프리필됩니다(RPT-03 · 온디맨드).
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex flex-col gap-3 p-4">
            <Select value={kind} onValueChange={(v) => changeKind(v as RecordKind)}>
              <SelectTrigger className="h-9" aria-label="기록 유형">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="면담">면담</SelectItem>
                <SelectItem value="관찰">관찰</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="기록 내용"
              className="min-h-40"
            />
          </div>
          <DrawerFooter className="flex-row justify-end gap-2">
            <DrawerClose className="rounded-md border border-border-strong bg-surface px-3.5 py-2 text-xs font-semibold text-fg-muted">
              취소
            </DrawerClose>
            <Button size="sm" disabled={content.trim().length === 0} onClick={saveNewRecord}>
              저장
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
