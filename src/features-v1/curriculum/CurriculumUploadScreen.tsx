import { useRef, useState, type DragEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft, FileIcon, InfoIcon, UploadIcon, XIcon } from 'lucide-react'
import ManagerShell from '@/shells-v1/ManagerShell'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardFooter } from '@/components/ui/Card'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { CURRICULA } from './mockData'

/*
  SC-M12 · CUR-03 교안 등록. 목업 — 실제 업로드·API 호출 없이 폼 검증만 하고
  성공 시 목록으로 돌아간다. 저작 화면이라 총괄 전용(isLead 게이팅), 대시보드·
  목록과 같은 방식으로 역할은 화면에서 고정한다(인증 붙기 전까지).

  드롭존만 기본 HTML로 남긴다 — attachment 컴포넌트엔 drop 핸들러가 없다
  (docs/dev/input-inventory.md §4-1 G).
*/

const MAX_SIZE = 50 * 1024 * 1024
const PROJECT_OPTIONS = Array.from(new Set(CURRICULA.flatMap((c) => c.projects))).sort()
const PROJECT_ITEMS: Record<string, string> = {
  '': '비우면 기수 전체 자동 안내',
  ...Object.fromEntries(PROJECT_OPTIONS.map((p) => [p, p])),
}

interface UploadFormValues {
  name: string
  topic: string
  project: string
}

export default function CurriculumUploadScreen() {
  const isLead = true
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormValues>({ defaultValues: { name: '', topic: '', project: '' } })

  if (!isLead) {
    return (
      <ManagerShell user={{ name: '박지현', role: '담당 매니저' }} cohort="7기" isLead={isLead}>
        <p className="text-fg-muted text-sm">교안 등록은 총괄 매니저만 할 수 있습니다.</p>
      </ManagerShell>
    )
  }

  function applyFile(picked: File | undefined | null) {
    if (!picked) return
    if (picked.type !== 'application/pdf') {
      setFileError('PDF만 업로드할 수 있습니다.')
      return
    }
    if (picked.size > MAX_SIZE) {
      setFileError('최대 50MB까지 업로드할 수 있습니다.')
      return
    }
    setFileError(null)
    setFile(picked)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    applyFile(e.dataTransfer.files[0])
  }

  function onSubmit() {
    // 목업 — 실제 업로드·자동 분석 시작 대신 목록으로 돌아간다.
    navigate('/manager/curriculum')
  }

  return (
    <ManagerShell user={{ name: '박지현', role: '총괄 매니저' }} cohort="7기" isLead={isLead}>
      {/*
        PageHeader의 title은 문자열만 받아 배지를 title 옆에 붙일 슬롯이 없다.
        접근성 제목("교안 등록")은 PageHeader가 그대로 갖되 시각적으로만 숨기고
        (sr-only), 뒤로가기·제목·배지를 한 줄로 두는 화면 전용 표시 줄을 아래에 둔다.
        breadcrumb은 PageHeader 그대로 노출한다.
      */}
      <div className="[&_h1]:sr-only">
        <PageHeader breadcrumb="교안 목록 › 등록" title="교안 등록" />
      </div>
      <div className="mt-2 mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label="교안 목록으로 돌아가기"
          nativeButton={false}
          render={<Link to="/manager/curriculum" />}
          className="p-1.5"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <span aria-hidden="true" className="text-fg text-xl font-bold tracking-[-0.01em]">
          교안 등록
        </span>
        <Badge variant="warning">총괄</Badge>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <CardContent className="flex flex-col gap-6 pb-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                }}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed py-14 text-center transition-colors ${
                  dragOver ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-2'
                }`}
              >
                <UploadIcon className={`size-10 ${dragOver ? 'text-primary' : 'text-fg-subtle'}`} />
                <div>
                  <p className="text-sm font-semibold text-fg">PDF를 끌어다 놓거나 클릭해 선택</p>
                  <p className="text-fg-subtle mt-0.5 text-2xs">
                    현재 PDF만 지원 (pptx·docx·스캔본은 보류) · 최대 50MB
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => applyFile(e.target.files?.[0])}
                />
                {file && (
                  <div
                    className="border-border bg-surface mx-6 flex w-full max-w-sm items-center justify-between gap-3 rounded-md border p-3 text-left text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileIcon className="text-fg-subtle size-5 shrink-0" />
                      <span className="truncate">
                        {file.name}{' '}
                        <span className="text-fg-subtle">
                          · {(file.size / 1024 / 1024).toFixed(1)}MB
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label="파일 제거"
                      className="text-fg-subtle hover:text-fg shrink-0 cursor-pointer"
                      onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              {fileError && <p className="text-danger text-xs">{fileError}</p>}

              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="cur-name">
                  교안명 <span className="text-danger">*</span>
                </FieldLabel>
                <Input
                  id="cur-name"
                  aria-invalid={!!errors.name}
                  disabled={isSubmitting}
                  {...register('name', { required: '교안명을 입력해주세요.' })}
                />
                <FieldError>{errors.name?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="cur-topic">
                  주제 · 설명 <span className="text-fg-subtle font-normal">· 선택</span>
                </FieldLabel>
                <Input
                  id="cur-topic"
                  placeholder="예: K8s 아키텍처 · 컨테이너 배포 · Service/Ingress · CICD"
                  disabled={isSubmitting}
                  {...register('topic')}
                />
                <FieldDescription>
                  검색·목록 표시용. 비워도 됨(분석이 섹션·주제를 자동 추출).
                </FieldDescription>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>유형</FieldLabel>
                  <Input value="PDF" disabled readOnly />
                </Field>
                <Field>
                  <FieldLabel>버전</FieldLabel>
                  <Input value="자동 산정" disabled readOnly />
                  <FieldDescription>
                    같은 교안 재업로드 시 기존 버전 보존, 새 버전으로 등록.
                  </FieldDescription>
                </Field>
                <Field className="col-span-2">
                  <FieldLabel htmlFor="cur-project">
                    적용 프로젝트{' '}
                    <span className="text-fg-subtle font-normal">· 선택 · 지금 안 해도 됨</span>
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="project"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v ?? '')}
                        items={PROJECT_ITEMS}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger id="cur-project">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">비우면 기수 전체 자동 안내</SelectItem>
                          {PROJECT_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </Field>
              </div>

              <p className="bg-info-soft text-info flex items-center gap-2 rounded-md px-3.5 py-2.5 text-xs">
                <InfoIcon className="size-4 shrink-0" />
                등록 시 구조 추출이 자동 시작됩니다.
              </p>
            </CardContent>

            <CardFooter className="gap-2 py-6">
              <Button type="submit" disabled={!file || isSubmitting}>
                등록 · 자동 분석 시작
              </Button>
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link to="/manager/curriculum" />}
              >
                취소
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </ManagerShell>
  )
}
