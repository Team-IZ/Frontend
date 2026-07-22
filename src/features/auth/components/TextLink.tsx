import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface Props {
  children: ReactNode
  to?: string
  onClick?: () => void
}

/** SC-A01 §4 · TextLink (보조 링크) */
export default function TextLink({ children, to, onClick }: Props) {
  const cls = 'text-[13px] font-medium text-primary underline-offset-2 hover:underline'

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
