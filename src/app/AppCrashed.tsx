import { useRouteError } from 'react-router'
import { Button } from '@/components/ui/Button'
import { errorCopy } from '@/lib/errorCopy'

/*
  화면이 렌더 도중 터졌을 때의 마지막 그물. **이게 없으면 화면이 아니라 앱이 사라진다** —
  응답의 옵셔널 필드 하나가 `null`로 와도 흰 화면이 되고, 사용자는 무엇을 해야 할지는커녕
  무슨 일이 났는지도 모른다(async-states §3-6).

  ▸ **라우트마다 두지 않는다.** 부모 라우트 하나에 걸면 자식 전부의 예외가 여기로 올라온다.
  ▸ **여기서 복구를 시도하지 않는다.** 이미 예외가 난 상태라 같은 화면을 다시 그리면 또
    터진다 — 새로고침(같은 주소를 처음부터)과 목록으로 나가기, 둘만 준다.
  ▸ 문구는 `errorCopy`가 정한다 — 여기까지 온 것이 `ApiError`일 수도 있어서(조회 실패가
    화면 분기를 못 만나고 던져진 경우) **한 곳에서 갈라야 말이 어긋나지 않는다.**

  ⚠ 콘솔에는 원본을 남긴다. 사용자에게 보이는 문구는 요약이라 원인 추적에 못 쓴다.
*/
export default function AppCrashed() {
  const error = useRouteError()
  console.error('[route]', error)

  const copy = errorCopy(error, { subject: '화면' })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-semibold">{copy.title}</p>
      <p className="text-fg-muted max-w-md text-sm">{copy.description}</p>
      <div className="mt-2 flex gap-2">
        {/*
          라우터 안에서 다시 그리지 않고 **문서를 처음부터 다시 부른다** — 터진 컴포넌트의
          상태가 남아 있으면 같은 예외가 반복된다.
        */}
        <Button variant="ghost" onClick={() => window.location.reload()}>
          새로고침
        </Button>
      </div>
    </div>
  )
}
