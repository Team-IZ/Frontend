import { useState } from 'react'
import { XIcon, PlusIcon } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import type { Section } from '../mockData'

/*
  SC-M12 · CUR-01+CUR-02 교안 상세의 섹션·주제 표.

  주제 칩은 D102 "AI 기본값 + 사람 편집" 모델이다 — AI가 추출 키워드로 초안을
  채워두고, 총괄이 훑어 틀린 칩만 ✕ 하거나 + 로 더한다. 신뢰도·"AI 제안" 배지는
  화면에 절대 노출하지 않는다(GOV-03·D102). 그래서 이 컴포넌트는 topics를 그냥
  문자열 배열로만 다루고, 어느 것이 AI 초안인지 구분하지 않는다.

  API 연동 전이라 편집은 로컬 상태(useState)로만 유지된다. 실 연동 시 추가/삭제는
  POST/DELETE /curriculum/{cid}/sections/{sid}/topics 로 즉시 저장된다(별도 확정
  액션 없음 — §7). 열람은 양쪽이지만 편집(저작)은 총괄만(D91)이라 editable로 가린다.

  중복 주제는 저장 차단(CUR-02 case 7). 판정은 대소문자를 무시한다("Pod"와 "pod"는
  같은 주제). 중복이면 입력을 지우지 않고 그대로 둔 채 빨간 테두리 + 안내를 띄우고,
  한 글자라도 바뀌면 다시 평상 상태로 돌린다.
*/
type Props = {
  sections: Section[]
  /** 저작 권한(총괄). false면 칩은 읽기 전용 — ✕·+ 미표시 */
  editable: boolean
}

export default function SectionTopicTable({ sections, editable }: Props) {
  // 섹션별 주제 목록을 로컬로 들고 편집한다. 초기값은 목업 props.
  const [topicsBySection, setTopicsBySection] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, s.topics])),
  )
  // 지금 +입력창이 열린 섹션 id. null이면 모두 닫힘.
  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  // 중복 입력 상태 — true면 빨간 테두리 + 안내. 입력이 바뀌면 false로 되돌린다.
  const [duplicate, setDuplicate] = useState(false)

  function isDuplicate(sectionId: string, value: string) {
    const norm = value.trim().toLowerCase()
    return topicsBySection[sectionId].some((t) => t.toLowerCase() === norm)
  }

  function removeTopic(sectionId: string, topic: string) {
    setTopicsBySection((prev) => ({
      ...prev,
      [sectionId]: prev[sectionId].filter((t) => t !== topic),
    }))
  }

  function openAdd(sectionId: string) {
    setDraft('')
    setDuplicate(false)
    setAddingFor(sectionId)
  }

  function closeAdd() {
    setDraft('')
    setDuplicate(false)
    setAddingFor(null)
  }

  function commitAdd(sectionId: string) {
    const value = draft.trim()
    if (!value) {
      closeAdd()
      return
    }
    // 대소문자 무시 중복이면 지우지 않고 안내만 — 사용자가 값을 고칠 수 있게 연다.
    if (isDuplicate(sectionId, value)) {
      setDuplicate(true)
      return
    }
    setTopicsBySection((prev) => ({
      ...prev,
      [sectionId]: [...prev[sectionId], value],
    }))
    closeAdd()
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-56 text-sm">섹션</TableHead>
          <TableHead className="w-40 pr-10 text-sm">페이지</TableHead>
          <TableHead className="pl-2 text-sm">다루는 주제</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sections.map((section) => {
          const topics = topicsBySection[section.id]
          const isAdding = addingFor === section.id
          return (
            <TableRow key={section.id} className="hover:bg-transparent">
              <TableCell className="text-fg align-top text-base font-semibold whitespace-normal">
                {section.name}
              </TableCell>
              <TableCell className="text-fg-muted pr-10 align-top font-mono text-sm tabular-nums">
                {section.pageRange}
              </TableCell>
              <TableCell className="pl-2 whitespace-normal">
                <div className="flex flex-wrap items-start gap-2">
                  {topics.length === 0 && !isAdding && (
                    <span className="text-fg-subtle py-1 text-sm">
                      아직 지정된 주제가 없습니다.
                    </span>
                  )}

                  {topics.map((topic) => (
                    <span
                      key={topic}
                      className="border-border-strong bg-surface-2 text-fg inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
                    >
                      {topic}
                      {editable && (
                        <button
                          type="button"
                          aria-label={`${topic} 주제 삭제`}
                          onClick={() => removeTopic(section.id, topic)}
                          className="text-fg-subtle hover:text-danger cursor-pointer leading-none"
                        >
                          <XIcon className="size-3.5" />
                        </button>
                      )}
                    </span>
                  ))}

                  {editable &&
                    (isAdding ? (
                      <div className="flex flex-col gap-1">
                        <Input
                          autoFocus
                          value={draft}
                          aria-invalid={duplicate}
                          onChange={(e) => {
                            setDraft(e.target.value)
                            // 한 글자라도 바뀌면 중복 경고를 푼다(파란 테두리 복귀).
                            if (duplicate) setDuplicate(false)
                          }}
                          onBlur={() => commitAdd(section.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitAdd(section.id)
                            if (e.key === 'Escape') closeAdd()
                          }}
                          placeholder="주제 입력 후 Enter"
                          aria-label={`${section.name} 주제 추가`}
                          className="h-8 w-44 text-sm"
                        />
                        {duplicate && (
                          <span role="alert" className="text-danger text-xs">
                            같은 이름의 주제가 있습니다.
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAdd(section.id)}
                        className="border-border-strong text-primary hover:bg-canvas inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed bg-white px-3 py-1.5 text-sm"
                      >
                        <PlusIcon className="size-3.5" />
                        추가
                      </button>
                    ))}
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
