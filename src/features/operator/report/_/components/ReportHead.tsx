import { LockIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/*
  리포트 제목줄 — "발행 시점 고정" 캡션이 필요해 공용 `PageHeader`를 안 썼다.
  `PageHeader`는 title+count+breadcrumb+action 시맨틱이라 얼린 시점 문구가 들어갈
  자리가 없다. 억지로 `breakdown`에 넣으면 다른 화면이 그 슬롯을 볼 때 "왜 시점
  고정 문구가 여기 있지"로 헷갈린다 — 처음부터 도메인 전용으로 둔다(architecture §7).

  제목·고정 문구는 인쇄에도 남긴다(문서 자체의 표지 줄이다) — 버튼 줄만
  `print:hidden`. PDF 내보내기가 `window.print()`(브라우저 내장 인쇄)라 실행
  자체가 동기고, 진행 중 상태를 보여줄 자리가 브라우저의 인쇄 다이얼로그라
  화면에 별도 로딩 스피너가 필요 없다.
*/
export default function ReportHead({
  title,
  frozenLabel,
  exportDisabled,
  onExport,
  onExportCsv,
}: {
  title: string
  /** 예: "2026-08-25 미니프로젝트 6차 발행 시점으로 고정" · "미니프로젝트 진행 중 · 아직 확정 전" */
  frozenLabel: string
  exportDisabled: boolean
  onExport: () => void
  /**
   * CSV도 PDF와 **같은 문서 전체**를 뽑는다 — 지금 보고 있는 섹션이 무엇이든
   * 결과는 같다. 한때 섹션마다 다른 CSV를 주도록 했었는데, 그러면 버튼의 뜻이
   * 화면 상태에 따라 달라져(= 같은 자리 같은 라벨이 다른 걸 준다) 받는 쪽이
   * 무엇을 받았는지 파일을 열어봐야 안다.
   */
  onExportCsv: () => void
}) {
  return (
    /*
      인쇄에서는 이 줄이 **문서의 표지**가 된다(화면 `PageHeader`는 인쇄에서 빠진다) —
      그래서 종이에서만 제목을 키우고 아래 여백을 넉넉히 준다. 화면에선 위에 이미
      `PageHeader`가 있어 같은 크기로 두 번 외칠 이유가 없다.
    */
    <div className="border-border mb-5 flex items-start gap-4 border-b pb-4 print:mb-7 print:pb-3">
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-base font-bold print:mb-1.5 print:text-xl">{title}</h3>
        <div className="text-fg-subtle flex items-center gap-1.5 text-xs">
          <span
            className="bg-fg-subtle inline-block size-[5px] rounded-full print:hidden"
            aria-hidden="true"
          />
          <span className="text-fg-muted font-bold">{frozenLabel}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 print:hidden">
        <Button variant="ghost" size="sm" disabled={exportDisabled} onClick={onExportCsv}>
          CSV 내보내기
        </Button>
        <Button
          variant={exportDisabled ? 'ghost' : 'primary'}
          size="sm"
          disabled={exportDisabled}
          onClick={onExport}
        >
          {exportDisabled ? (
            <>
              <LockIcon className="size-3.5" aria-hidden="true" />
              PDF 내보내기
            </>
          ) : (
            'PDF 내보내기'
          )}
        </Button>
      </div>
    </div>
  )
}
