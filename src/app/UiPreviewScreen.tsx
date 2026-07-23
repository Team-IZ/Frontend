import { useState, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '@/components/ui/Card'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Switch } from '@/components/ui/Switch'
import { Label } from '@/components/ui/Label'
import { Kbd } from '@/components/ui/Kbd'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/Pagination'
import { getPageRange } from '@/components/ui/paginationRange'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Separator } from '@/components/ui/Separator'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { Progress } from '@/components/ui/Progress'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'
import InputCompositionsPreview from './InputCompositionsPreview'

/*
  개발용 컴포넌트 쇼케이스. 실제 화면이 아니라 "디자인이 와이어와 맞는지" 눈으로
  확인하는 자리다. 그래서 마스터-디테일 규칙(program-admin 형식)을 따르지 않는다.

  탭은 컴포넌트 하나당 하나가 아니라 성격별로 묶는다 — 20개를 나열하면 무엇을
  비교해야 하는지 안 보인다.
*/

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-fg-subtle text-xs font-semibold">{title}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

function FormPreview() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <Row title="input · 40px · radius-md · surface-2">
        <div className="w-full">
          <Label htmlFor="p-in">기관명</Label>
          <Input id="p-in" placeholder="예: 그린컴퍼니 부트캠프" className="mt-1.5" />
        </div>
      </Row>
      <Row title="input — disabled / invalid">
        <Input placeholder="비활성" disabled />
        <Input placeholder="오류" aria-invalid />
      </Row>
      <Row title="textarea">
        <Textarea placeholder="메모를 입력하세요" className="w-full" />
      </Row>
      {/*
        닫힘·열림을 나란히 둔다. 팝업은 포털로 body에 붙어 화면 어디든 뜰 수 있어서,
        닫힌 것만 보면 트리거와 팝업의 폭·정렬·모서리가 맞는지 확인할 수 없다.

        Base UI Select는 `items` 없이는 트리거에 **value 문자열**을 그대로 찍는다("all").
        라벨을 보이려면 value→라벨 매핑을 Root에 준다. 이 화면이 그 사용법의 예시다.
      */}
      <Row title="select · 36px · 흰 면(입력칸과 구분) — 닫힘 / 열림">
        <div className="flex items-start gap-8">
          <div>
            <p className="text-fg-subtle mb-1.5 text-2xs">닫힘</p>
            <Select
              defaultValue="all"
              items={{ all: '상태 전체', active: '활성', suspended: '정지' }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상태 전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-fg-subtle mb-1.5 text-2xs">열림(기본 펼침)</p>
            {/*
              modal={false} — 기본값(모달)은 열려 있는 동안 페이지 전체에 백드롭을 깔아
              다른 곳을 못 누르게 한다. 실제 화면에서는 맞는 동작이지만, 이 프리뷰는
              팝업을 **띄워둔 채** 다른 탭도 눌러야 해서 비모달로 둔다.
            */}
            <Select
              defaultValue="active"
              defaultOpen
              modal={false}
              items={{ all: '상태 전체', active: '활성', suspended: '정지' }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">상태 전체</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="suspended">정지</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Row>
      <Row title="checkbox">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox defaultChecked /> 이용약관에 동의합니다
        </label>
      </Row>
      <Row title="switch · 42×24 · 켜짐=primary">
        <Switch defaultChecked />
        <Switch />
        <Switch size="sm" defaultChecked />
        <Switch disabled />
      </Row>
      <Row title="kbd — Caps Lock 경고에 쓰인다(SC-A01 비밀번호 필드)">
        <p className="text-warning flex items-center gap-1.5 text-xs">
          <Kbd>⇪ Caps Lock</Kbd> 켜짐 — 대문자로 입력됩니다.
        </p>
      </Row>
    </div>
  )
}

function DisplayPreview() {
  return (
    <div className="flex flex-col gap-6">
      <Row title="badge">
        <Badge variant="success">활성</Badge>
        <Badge variant="warning">주의</Badge>
        <Badge variant="danger">위험</Badge>
        <Badge variant="info">정보</Badge>
        <Badge variant="neutral">비활성</Badge>
      </Row>
      <Row title="avatar">
        <Avatar>
          <AvatarFallback>박</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>운</AvatarFallback>
        </Avatar>
      </Row>
      {/* Progress는 Track·Indicator를 스스로 렌더한다 — 직접 넣으면 바가 두 줄로 겹친다 */}
      <Row title="progress">
        <Progress value={69} className="w-64" />
      </Row>
      <Row title="skeleton · spinner">
        <Skeleton className="h-4 w-40" />
        <Spinner />
      </Row>
      <Row title="separator">
        <div className="w-64">
          <Separator />
        </div>
      </Row>
      <Row title="alert · Badge와 같은 의미 색 어휘">
        <div className="flex max-w-md flex-col gap-2">
          <Alert variant="warning">
            <AlertTitle>사용량 집계에 실패했습니다</AlertTitle>
            <AlertDescription>
              기관 정보는 정상 표시됩니다. 이 영역만 다시 시도하세요.
            </AlertDescription>
          </Alert>
          <Alert variant="danger">
            <AlertTitle>보존기간 전 파기 불가</AlertTitle>
          </Alert>
          <Alert variant="info">
            <AlertTitle>이메일 인증이 필요합니다.</AlertTitle>
          </Alert>
          <Alert variant="success">
            <AlertTitle>총괄 매니저 초대를 발송했습니다.</AlertTitle>
          </Alert>
        </div>
      </Row>
      <Row title="empty">
        <Empty className="max-w-md">
          <EmptyHeader>
            <EmptyTitle>아직 개설된 기수가 없습니다</EmptyTitle>
            <EmptyDescription>기수 개설은 매니저 앱(SC-M02)에서 합니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Row>
      <Row title="card">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>카드 제목</CardTitle>
            <CardDescription>설명 텍스트가 들어가는 자리</CardDescription>
            <CardAction>
              <Button size="sm" variant="ghost">
                액션
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>본문 내용</CardContent>
          <CardFooter>푸터 영역</CardFooter>
        </Card>
      </Row>
    </div>
  )
}

/*
  200행을 20개씩 = 10쪽. 정렬·페이징 계산은 이미 설치돼 있는 `@tanstack/react-table`이
  하고, 우리 컴포넌트는 그리기만 한다. Material React Table처럼 표 컴포넌트가 기능까지
  들고 있는 방식과 다른 점이다 — 엔진과 껍데기가 분리돼 있어서 디자인을 우리가 쥔다.

  이 함수가 표를 쓰는 화면의 참고 구현이다.
*/
const ROLES = ['총괄', '담당'] as const
const STATES = ['활성', '초대됨', '비활성'] as const

// 데모 데이터는 렌더마다 새로 만들지 않는다(정렬이 매번 뒤집힌다)
const DEMO_ROWS = Array.from({ length: 200 }, (_, i) => ({
  name: `교육생 ${String(i + 1).padStart(3, '0')}`,
  role: ROLES[i % 2],
  score: ((i * 37) % 100) + 1,
  state: STATES[i % 3],
}))

type DemoRow = (typeof DEMO_ROWS)[number]

const COLUMNS: ColumnDef<DemoRow>[] = [
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'role', header: '권한' },
  { accessorKey: 'score', header: '점수' },
  { accessorKey: 'state', header: '상태' },
]

function TablePreview() {
  const [sorting, setSorting] = useState<SortingState>([])
  const table = useReactTable({
    data: DEMO_ROWS,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const total = DEMO_ROWS.length
  const from = pageIndex * 20 + 1
  const to = Math.min(from + 19, total)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-fg-subtle text-xs">
        200개 · 20개씩 · {pageCount}쪽 — 헤더를 눌러 정렬. 정렬 계산은 @tanstack/react-table
      </p>

      {/* maxHeight를 주면 헤더가 스크롤에 붙는다 */}
      <Table maxHeight="24rem">
        <TableHeader>
          <TableRow>
            {table.getHeaderGroups()[0].headers.map((header) => {
              const sorted = header.column.getIsSorted()
              return (
                <TableHead
                  key={header.id}
                  sortable
                  sortDirection={sorted === false ? false : sorted}
                  onSort={header.column.getToggleSortingHandler()}
                  className={header.column.id === 'score' ? 'text-right' : undefined}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-surface-2 cursor-pointer">
              <TableCell className="font-semibold">{row.original.name}</TableCell>
              <TableCell>
                <Badge variant={row.original.role === '총괄' ? 'info' : 'neutral'}>
                  {row.original.role}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{row.original.score}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    row.original.state === '활성'
                      ? 'success'
                      : row.original.state === '초대됨'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {row.original.state}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 표 푸터 표준 — 범위 개수(좌) + 페이저(중앙) + 우측 비움 */}
      <div className="flex items-center">
        <span className="text-fg-subtle flex-1 text-xs">
          {from}–{to} / {total}개
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                aria-label="이전 쪽"
                aria-disabled={!table.getCanPreviousPage()}
                className={
                  !table.getCanPreviousPage() ? 'pointer-events-none opacity-40' : undefined
                }
                onClick={() => table.previousPage()}
              >
                ‹
              </PaginationLink>
            </PaginationItem>

            {/* 10쪽이든 100쪽이든 최대 7칸 — 첫·마지막·현재 주변만 남기고 접는다 */}
            {getPageRange(pageIndex + 1, pageCount).map((p, i) =>
              p === '…' ? (
                <PaginationItem key={`gap-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === pageIndex + 1}
                    aria-label={`${p}쪽`}
                    onClick={() => table.setPageIndex(p - 1)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationLink
                aria-label="다음 쪽"
                aria-disabled={!table.getCanNextPage()}
                className={!table.getCanNextPage() ? 'pointer-events-none opacity-40' : undefined}
                onClick={() => table.nextPage()}
              >
                ›
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
        <span className="flex-1" />
      </div>
    </div>
  )
}

function OverlayPreview() {
  return (
    <div className="flex flex-col gap-6">
      <Row title="dialog">
        <Dialog>
          <DialogTrigger render={<Button>다이얼로그 열기</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>기관 생성</DialogTitle>
              <DialogDescription>생성 직후 총괄 매니저 미배정 상태가 됩니다.</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="d-in">기관명</Label>
              <Input id="d-in" placeholder="예: 그린컴퍼니 부트캠프" className="mt-1.5" />
            </div>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </Row>
      <Row title="popover — SC-M10 코치마크 · SC-M04 셀 근거">
        <Popover>
          <PopoverTrigger render={<Button variant="ghost">팝오버 열기</Button>} />
          <PopoverContent>
            <p className="font-semibold">채점 근거</p>
            <p className="text-fg-muted">이 셀의 점수가 어디서 나왔는지 보여주는 자리다.</p>
          </PopoverContent>
        </Popover>
      </Row>
    </div>
  )
}

function ButtonPreview() {
  return (
    <div className="flex flex-col gap-6">
      <Row title="variant">
        <Button variant="primary">Primary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </Row>
      <Row title="size">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
      </Row>
      <Row title="size=lg (전체 폭 · 폼 제출)">
        <Button size="lg">로그인</Button>
      </Row>
      <Row title="disabled">
        <Button disabled>Primary</Button>
        <Button variant="ghost" disabled>
          Ghost
        </Button>
      </Row>
      <Row title="tabs">
        <Tabs defaultValue="a">
          <TabsList>
            <TabsTrigger value="a">개요</TabsTrigger>
            <TabsTrigger value="b">설정</TabsTrigger>
          </TabsList>
          <TabsContent value="a" className="pt-2 text-sm">
            개요 내용
          </TabsContent>
          <TabsContent value="b" className="pt-2 text-sm">
            설정 내용
          </TabsContent>
        </Tabs>
      </Row>
    </div>
  )
}

const GROUPS = [
  { value: 'form', label: '폼', render: FormPreview },
  { value: 'compose', label: '입력 조합', render: InputCompositionsPreview },
  { value: 'display', label: '표시', render: DisplayPreview },
  { value: 'table', label: '표 · 페이저', render: TablePreview },
  { value: 'overlay', label: '오버레이', render: OverlayPreview },
  { value: 'action', label: '버튼 · 탭', render: ButtonPreview },
]

export default function UiPreviewScreen() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-lg font-semibold">UI 컴포넌트 프리뷰</h1>
        <p className="text-fg-subtle mt-1 text-xs">
          와이어프레임 값과 맞는지 확인하는 화면이다. 근거는 docs/dev/component-page-map.md
        </p>
      </div>
      <Tabs defaultValue={GROUPS[0].value}>
        <TabsList>
          {GROUPS.map(({ value, label }) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
        {GROUPS.map(({ value, render: Render }) => (
          <TabsContent key={value} value={value} className="pt-5">
            <Render />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
