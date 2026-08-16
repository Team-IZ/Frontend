import type { Brief, CauseKey } from './_/api/types'

/*
  ④ 보낼 곳 — 원인 하나를 목적지 줄로 바꾼다. 원인 체크박스는 분류 라벨이 아니라
  **라우팅 스위치**다(정의서 §3).

  ⚠ **이건 서버 판정이 아니다.** 저장 요청은 `causes`·`why`·`nextAction`만 받고,
  스펙이 *"원인에서 파생되는 조치(라우팅 목적지)는 보내지 않습니다 — 화면이
  계산합니다"* 라고 명시한다. 그래서 목이 갖고 있던 이 표는 지우지 않고 여기로
  옮겼다 — `mockData.ts`와 함께 사라지면 안 되는 값이다.

  `CONCEPT_GAP`만 케이스 데이터(`concepts`)를 본다 — 나머지 여섯은 고정 문구다.
*/

export type DestLine = {
  /** 여러 줄이 한 원인에 붙을 때 첫 줄에만 라벨을 그린다 */
  showLabel: boolean
  text: string
  /** text 안에서 굵게 강조할 부분 문자열 */
  bold?: string
  /** 누가 하는가 — 없으면 안내 정보 줄이다 */
  owner?: 'MANAGER' | 'PASS'
  href?: string
}

export function destinationsFor(cause: CauseKey, brief: Brief): DestLine[] {
  switch (cause) {
    case 'CONCEPT_GAP': {
      /*
        🔴 `brief.concepts`가 지금 **항상 빈 배열**이다 — 교안 위치·반 문제 판정이
        서버 미구현(스펙에 명시). 개념별 교안 안내 줄이 안 나오고 강사 Q&A만 남는다.
        서버가 채우기 시작하면 이 코드가 그대로 살아난다.
      */
      const lines: DestLine[] = brief.concepts.map((c, i) => ({
        showLabel: i === 0,
        text: `교안 ${c.curriculumRef} 안내`,
        owner: 'MANAGER',
        href: '/manager/curriculum',
      }))
      lines.push({ showLabel: lines.length === 0, text: '강사 Q&A 안내', owner: 'PASS' })
      return lines
    }
    case 'OUT_OF_SCOPE':
      return [
        {
          showLabel: true,
          text: '다음 프로젝트 역할 분담에서 조정',
          bold: '역할 분담',
          owner: 'MANAGER',
        },
      ]
    case 'TIME_SHORTAGE':
      return [
        {
          showLabel: true,
          text: '다시 보기 창 안내 · 다음 회차 일정 확인',
          bold: '다시 보기 창',
          owner: 'MANAGER',
        },
      ]
    case 'EXPRESSION':
      // 정의서·와이어에 예시가 없다 — 화면이 정한 문구다
      return [{ showLabel: true, text: '다음 면담에서 다시 설명해보게 하기', owner: 'MANAGER' }]
    case 'TEAM_DEPENDENCE':
      return [{ showLabel: true, text: '다음 팀 편성에서 고려', bold: '팀 편성', owner: 'MANAGER' }]
    case 'CONDITION':
      return [{ showLabel: true, text: '기관 상담 채널로 연결', bold: '상담 채널', owner: 'PASS' }]
    case 'DIFFICULTY_UP':
      // owner 없음 — 분류가 아니라 안내 정보 줄(9-6, 매니저가 세지 않게 한다)
      return [
        {
          showLabel: true,
          text: '반 절반 이상이면 개인 문제가 아님 — 기관에 보고',
          bold: '기관에 보고',
        },
      ]
  }
}
