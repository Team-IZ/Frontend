import { CheckIcon, ClockIcon, LockIcon, TriangleAlertIcon, type LucideIcon } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { SubmissionView } from './types'

/*
  표시 라벨 — **화면 것**(api-boundary §1-⑤). 문구는 목업(trainee/submission.html)
  각 .rpage에서 그대로 옮겼다. `#page-closed`는 목업 자체가 `#page-locked`를 복붙한
  버그라 옮기지 않고 케이스표 문구(`제출 기한이 지났어요 · 미제출로 기록`)로 새로 썼다
  (types.ts 머리 주석 참고).

  아이콘은 lucide-react로 통일한다(trainee/home/labels.ts와 같은 이유 — 사이드바가
  이미 그렇게 하고 있고, 같은 뜻은 화면이 달라도 같은 아이콘을 쓴다).
*/

export type StateTone = 'info' | 'success' | 'warning' | 'danger'

/*
  weight — 4개 상태가 요구하는 반응 수준이 다르다. 분석중·잠김은 "참고만 하면 되는
  진행/과거 사실"이라 카드로 색칠하면 실제 경고(분석 실패)와 같은 무게로 보여 신호가
  죽는다. 완료(다음 행동을 여는 좋은 소식)·실패(진짜 봐야 하는 에러)만 카드를 쓴다
  (실사용 피드백으로 발견 — "알림창 UI/UX 재검토").
*/
export type StateWeight = 'inline' | 'card'

export type StateBannerContent = {
  tone: StateTone
  weight: StateWeight
  icon: LucideIcon
  title: string
  description: string
  sub?: string
}

/** 상태별 상단 배너 — 목업의 `.state`(아이콘·제목·설명·보조문구) 카드 */
export function buildStateBanner(view: SubmissionView): StateBannerContent | null {
  switch (view.status) {
    case 'DRAFT':
      return null // 아직 아무것도 안 일어났다 — 배너 대신 폼만 있다
    case 'ANALYZING':
      return {
        tone: 'info',
        weight: 'inline',
        icon: ClockIcon,
        title: '제출됐어요. 코드를 분석하고 있습니다',
        description: '끝나면 알려드릴게요. 이 화면을 켜 두지 않아도 됩니다.',
        // "남은 시간은 알려드리지 않아요 — 정확하지 않은 예상을 드리지 않으려고요"는
        // 지웠다 — description이 이미 같은 사실을 긍정형으로 전달한다. trainee/home
        // 쪽 ANALYZING과 같은 판단이다(labels.ts 머리 주석 참고).
      }
    case 'READY':
      return {
        tone: 'success',
        weight: 'card',
        icon: CheckIcon,
        title: '분석이 끝났어요',
        description: '이해도 확인을 시작할 수 있습니다. 홈에서 시작하면 돼요.',
        sub: `${formatDateTime(view.verifyClosesAt)}까지 · 시작 전까지는 다시 제출할 수 있어요`,
      }
    case 'LOCKED':
      return {
        tone: 'warning',
        weight: 'inline',
        icon: LockIcon,
        title: '이제 다시 제출할 수 없어요',
        description: '이해도 확인을 시작해서 잠겼습니다.',
        sub: '질문이 지금 제출된 코드로 만들어졌어요. 코드가 바뀌면 질문과 답이 어긋납니다.',
      }
    case 'ANALYSIS_FAILED':
      return {
        tone: 'danger',
        weight: 'card',
        icon: TriangleAlertIcon,
        title: '코드를 분석하지 못했어요',
        description: '저장소는 열렸지만 분석할 코드를 찾지 못했습니다.',
        sub: '브랜치가 비어 있거나 소스 폴더가 없는지 확인해 주세요. 계속 안 되면 매니저에게 알려 주세요.',
      }
    case 'SUBMISSION_CLOSED':
      return null // 폼도 카드도 없이 안내 문단 하나만 — TR-01 `missed`와 같은 모양
  }
}

export const REPO_HELP =
  '우리 기관 GitHub 조직 안의 저장소는 따로 권한을 주지 않아도 돼요.\n조직 밖이거나 비공개라면 ZIP으로 올려 주세요.'
export const ZIP_HELP = '최대 50MB · node_modules, .venv 같은 폴더는 빼고 압축해 주세요.'
export const REPO_NOT_FOUND_HELP =
  '비공개 저장소이거나 우리 기관 조직 밖에 있으면 열 수 없어요 — 그럴 땐 ZIP으로 올리면 됩니다.'
