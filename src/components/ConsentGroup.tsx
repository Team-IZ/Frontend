import { useState } from 'react'
import type { ConsentItem } from '@/auth/consents'

interface Props {
  items: ConsentItem[]
  /** 동의한 항목 코드 목록 */
  checked: string[]
  onChange: (codes: string[]) => void
  /** 필수 미동의 항목을 강조 (CS1) */
  highlightMissing?: boolean
  disabled?: boolean
}

/**
 * SC-A02 §3·§8 · 동의 그룹
 * 구분선 리스트 · 항목별 [필수]/[선택] 배지 · 전문 보기 펼침
 * 필수 전체 동의 전에는 제출 불가(CS1) — 판정은 부모가 수행
 */
export default function ConsentGroup({
  items,
  checked,
  onChange,
  highlightMissing,
  disabled,
}: Props) {
  const [opened, setOpened] = useState<string | null>(null)

  const allChecked = items.every((item) => checked.includes(item.code))

  function toggleAll() {
    onChange(allChecked ? [] : items.map((item) => item.code))
  }

  function toggleOne(code: string) {
    onChange(checked.includes(code) ? checked.filter((c) => c !== code) : [...checked, code])
  }

  return (
    <div className="rounded-md border border-border bg-canvas">
      {/* 전체 동의 */}
      <label className="flex cursor-pointer items-center gap-2.5 px-3.5 py-3">
        <input
          type="checkbox"
          checked={allChecked}
          onChange={toggleAll}
          disabled={disabled}
          className="h-4 w-4 accent-primary"
        />
        <span className="text-[13px] font-semibold text-fg">전체 동의</span>
      </label>

      {items.map((item) => {
        const isChecked = checked.includes(item.code)
        const missing = highlightMissing && item.required && !isChecked

        return (
          <div key={item.code} className="border-t border-border">
            <div className={`px-3.5 py-2.5 ${missing ? 'bg-danger-soft' : ''}`}>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleOne(item.code)}
                  disabled={disabled}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                        item.required ? 'bg-primary-soft text-primary' : 'bg-border text-fg-subtle'
                      }`}
                    >
                      {item.required ? '필수' : '선택'}
                    </span>
                    <span className="text-[13px] text-fg-muted">{item.title}</span>
                    {item.note && <span className="text-[12px] text-danger">· {item.note}</span>}
                  </div>
                  {item.subNote && (
                    <p className="mt-1 text-[11px] text-fg-subtle">{item.subNote}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpened(opened === item.code ? null : item.code)}
                  className="shrink-0 text-[11px] text-fg-subtle underline underline-offset-2 hover:text-fg-muted"
                >
                  전문 보기
                </button>
              </div>

              {opened === item.code && (
                <p className="mt-2 rounded-sm border border-border bg-white px-3 py-2 text-[11px] leading-relaxed text-fg-subtle">
                  [{item.title}] 약관 전문이 표시되는 영역입니다. 수집 항목 · 이용 목적 · 보유 기간
                  · 제3자 제공 대상이 이곳에 게시됩니다.
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
