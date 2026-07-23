import { useRef, useState, type DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import ManagerShell from '@/shells/ManagerShell'
import PageHeader from '@/components/common/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { CURRICULA } from './mockData'

/*
  SC-M12 · CUR-03 교안 등록. 목업 — 실제 업로드·API 호출 없이 폼 검증만 하고
  성공 시 목록으로 돌아간다. 저작 화면이라 총괄 전용(isLead 게이팅), 대시보드·
  목록과 같은 방식으로 역할은 화면에서 고정한다(인증 붙기 전까지).

  파일 드롭존·입력·select는 팀 UI 컴포넌트가 나오기 전까지 기본 HTML 요소로
  임시 구현한다(목록 화면 필터와 같은 방식) — 각 자리에 교체 주석을 남긴다.
*/

const MAX_SIZE = 50 * 1024 * 1024
const FIELD =
  'border-border-strong rounded-md border bg-surface px-3 py-2 text-sm text-fg w-full disabled:text-fg-subtle'
const PROJECT_OPTIONS = Array.from(new Set(CURRICULA.flatMap((c) => c.projects))).sort()

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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
        {/* 팀 UI 컴포넌트(드롭존) 나오면 교체 */}
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
          className={`border-border-strong bg-surface-2 cursor-pointer rounded-md border-2 border-dashed p-6 text-center ${dragOver ? 'border-primary' : ''}`}
        >
          <p className="text-sm font-semibold text-fg">PDF를 끌어다 놓거나 클릭해 선택</p>
          <p className="text-fg-subtle mt-0.5 text-2xs">
            현재 PDF만 지원 (pptx·docx·스캔본은 보류) · 최대 50MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => applyFile(e.target.files?.[0])}
          />
          {file && (
            <div
              className="border-border bg-surface mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <span>
                📄 {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button
                type="button"
                aria-label="파일 제거"
                className="text-fg-subtle cursor-pointer"
                onClick={() => {
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        {fileError && <p className="text-danger text-xs">{fileError}</p>}

        <div>
          <label className="text-fg-muted mb-1 block text-xs font-semibold" htmlFor="cur-name">
            교안명 <span className="text-danger">*</span>
          </label>
          {/* 팀 UI 컴포넌트(텍스트 입력) 나오면 교체 */}
          <input
            id="cur-name"
            className={FIELD}
            disabled={isSubmitting}
            {...register('name', { required: '교안명을 입력해주세요.' })}
          />
          {errors.name && <p className="text-danger mt-1 text-xs">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-fg-muted mb-1 block text-xs font-semibold" htmlFor="cur-topic">
            주제 · 설명 <span className="text-fg-subtle font-normal">· 선택</span>
          </label>
          {/* 팀 UI 컴포넌트(텍스트 입력) 나오면 교체 */}
          <input
            id="cur-topic"
            placeholder="예: K8s 아키텍처 · 컨테이너 배포 · Service/Ingress · CICD"
            className={FIELD}
            disabled={isSubmitting}
            {...register('topic')}
          />
          <p className="text-fg-subtle mt-1 text-2xs">
            검색·목록 표시용. 비워도 됨(분석이 섹션·주제를 자동 추출).
          </p>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-fg-muted mb-1 block text-xs font-semibold">유형</label>
            <p className={`${FIELD} bg-surface-2`}>PDF</p>
          </div>
          <div className="flex-1">
            <label className="text-fg-muted mb-1 block text-xs font-semibold">버전</label>
            <p className={`${FIELD} bg-surface-2`}>자동 산정</p>
            <p className="text-fg-subtle mt-1 text-2xs">
              같은 교안 재업로드 시 기존 버전 보존, 새 버전으로 등록.
            </p>
          </div>
        </div>

        <div>
          <label className="text-fg-muted mb-1 block text-xs font-semibold" htmlFor="cur-project">
            적용 프로젝트{' '}
            <span className="text-fg-subtle font-normal">· 선택 · 지금 안 해도 됨</span>
          </label>
          {/* 팀 UI 컴포넌트(select) 나오면 교체 */}
          <select
            id="cur-project"
            className={FIELD}
            disabled={isSubmitting}
            {...register('project')}
          >
            <option value="">비우면 기수 전체 자동 안내</option>
            {PROJECT_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <p className="bg-info-soft text-info rounded-md px-3.5 py-2.5 text-xs">
          ℹ 등록 시 구조 추출이 자동 시작됩니다.
        </p>

        <div className="border-border flex items-center gap-2 border-t pt-4">
          <Button type="submit" disabled={!file || isSubmitting}>
            등록 · 자동 분석 시작
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link to="/manager/curriculum" />}>
            취소
          </Button>
        </div>
      </form>
    </ManagerShell>
  )
}
