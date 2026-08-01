import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/Empty'

/*
  v2 스켈레톤 자리표시 — 화면 이식 전까지 라우트만 살아있게 한다.
  25장 전부를 따로 만들지 않고 하나로 돌려 쓴다(코드·제목만 다르다) — 실제
  화면이 들어오면 이 컴포넌트 자체가 지워진다, 지금 정교하게 만들 이유가 없다.

  Empty를 쓴다 — 이 자리 자체가 "아직 채워지지 않은 자리"라는 뜻이라
  component-page-map.md의 빈 상태 패턴과 정확히 같다. 손으로 점선 박스를 새로
  그리지 않는다.
*/
type Props = {
  code: string
  title: string
}

export default function PlaceholderScreen({ code, title }: Props) {
  return (
    <Empty>
      <EmptyHeader>
        <p className="text-fg-subtle font-mono text-xs">{code}</p>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>화면 이식 예정 — v2 뼈대만 서 있는 자리다.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
