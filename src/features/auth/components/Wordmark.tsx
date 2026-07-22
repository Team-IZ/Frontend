export default function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-[15px] font-bold ${light ? 'text-white' : 'text-fg'}`}
    >
      <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-sm bg-primary text-[13px] text-white">
        ◆
      </span>
      IZ-Get
    </div>
  )
}
