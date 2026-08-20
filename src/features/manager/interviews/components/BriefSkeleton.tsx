import { Skeleton } from '@/components/ui/Skeleton'

/*
  브리프가 처음 오기 전 자리를 잡아 둔다.

  **스피너를 안 쓰는 이유는 높이다**(async-states §1-2). 스피너 자리(`py-16` 128px)와
  실제 브리프(머리 + 블록 4개 = 700px 남짓)가 달라, AI 생성이 20초 넘게 걸리는 이
  화면에서는 도착하는 순간 본문이 통째로 밀린다.

  ⚠ **높이는 실제 화면에서 잰 값이다**(9기 4차 · 백은우 · 질문 4개).

      블록 머리   45px  (번호 배지 + 제목, 네 블록 모두 같다)
      ① 여는 말  135px
      ② 질문     279px
      ③ 원인     158px
      ④ 조치     130px

      ⑤ 기록    149px  (상세 사유 · 조치 · 추후 계획)
      액션 줄    34px
      바깥 폭   mx-auto max-w-[820px] · pb-8  (본문과 **같은 틀** — 안 맞추면 도착에서 좌우로 튄다)

  ⚠ 질문 수는 사람마다 다르다(4~7개 관측). **직전에 본 개수를 넘길 수 없는 화면**이라
  ②만 평균값으로 두고, 나머지는 내용 길이가 고정에 가까워 그대로 박는다.

  ⚠ **처음에 ⑤와 액션 줄을 빼먹어 305px이 어긋났다**(810 vs 실제 1115). 블록만 세고
  그 아래를 안 봤다 — 스켈레톤을 쓰는 이유가 없어지는 크기라 실측을 다시 했다.
*/

/** 블록 하나 — 머리(45px)는 항상 같고 본문 높이만 다르다 */
function Block({ bodyH, children }: { bodyH: number; children: React.ReactNode }) {
  return (
    <div className="bg-surface border-border mb-4 overflow-hidden rounded-md border">
      <div className="border-border bg-surface-2 flex h-[45px] items-center gap-2 border-b px-5">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="px-5 py-4" style={{ height: bodyH }}>
        {children}
      </div>
    </div>
  )
}

export default function BriefSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[820px] pb-8">
      {/* 머리 — 이름 · 기수 · 반 · 위험 배지 (34px + mb-5) */}
      <div className="mb-5 flex h-[34px] items-center gap-3">
        <Skeleton className="size-8 rounded-md" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* ① 여는 말 — 두 줄 */}
      <Block bodyH={90}>
        <Skeleton className="mb-2 h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </Block>

      {/* ② 질문 — 네 줄(관측 4~7개 중 가운데) */}
      <Block bodyH={234}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <Skeleton className="mb-1.5 h-3.5 w-11/12" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </Block>

      {/* ③ 원인 — 칩 일곱 */}
      <Block bodyH={113}>
        <div className="flex flex-wrap gap-1.5">
          {[24, 20, 24, 26, 20, 16, 22].map((w, i) => (
            <Skeleton key={i} className="h-9 rounded-full" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </Block>

      {/* ④ 조치 — 원인을 고르기 전에는 안내 한 줄이다 */}
      <Block bodyH={85}>
        <Skeleton className="h-3.5 w-64" />
      </Block>

      {/* ⑤ 기록 — 블록과 달리 머리가 없다(제목 줄 + 필드 둘) */}
      <div className="border-border bg-surface h-[149px] rounded-md border p-4">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-3.5 w-10" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="mb-3 h-9 w-full" />
        <Skeleton className="h-3 w-28" />
      </div>

      {/* 액션 줄 — 취소 · 저장 */}
      <div className="mt-4 flex h-[34px] items-center justify-end gap-2">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  )
}
