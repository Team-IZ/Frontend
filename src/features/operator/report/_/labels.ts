/*
  화면 표시용 한글 라벨·색·CSV 유틸. projects/labels.ts와 같은 이유로 계약(types)과
  가른다 — enum 값은 서버와 맞추는 것이고 라벨은 화면 것이다.
*/
import type { ReachLevel, Report } from './api/types'
import { sectionQuestion, type ReportSectionKey } from './sections'

export const REACH_LEVEL_LABEL: Record<ReachLevel, string> = {
  1: '무엇을 하는지',
  2: '왜 그렇게 했는지',
  3: '다른 방법과 비교',
  4: '언제 깨지는지',
}

/**
 * 도달 단계 색. 기획에 정의된 절대 눈금이라(02-layout-system §7) 값에 직접 칠한다 —
 * OP-02 반 비교처럼 "기준선 대비 부호"만 쓰는 상대 색과 다르다.
 *
 * ⚠ 실제 디자인 토큰은 `--color-reach-0`~`--color-reach-4`(5단계)인데, OP-05
 * 목업(`operator/report.html`)의 범례는 4단계(1~4단)만 정의하고 가운데 노랑
 * 토큰(`reach-2`)을 건너뛴다. 목업 문구를 그대로 따라 4단계로 구현했다 — MG-02·
 * OP-02가 실제로 붙으면 도달 단계가 4단인지 5단인지 실측 대조가 필요하다(PR에 남김).
 */
export const REACH_LEVEL_COLOR: Record<ReachLevel, string> = {
  1: 'bg-reach-0 text-white',
  2: 'bg-reach-1 text-reach-fg',
  3: 'bg-reach-3 text-reach-fg',
  4: 'bg-reach-4 text-white',
}

export const UNASKED_LABEL = '묻지 못함'
export const UNASKED_HINT = '코드에 없어서'

/**
 * 개념 하나가 여러 회차에 걸치면(`c.rounds.join(' · ')`) "미니프로젝트"가 그
 * 줄에서 여러 번 반복된다 — 이 화면 전체가 이미 미니프로젝트 맥락이라(제목·
 * 섹션 제목) 매 회차마다 다시 밝힐 필요가 없다. 그 줄에서만 숫자만 남긴다.
 */
export const shortRoundLabel = (round: string) => round.replace('미니프로젝트 ', '')

/**
 * 리포트 전체를 CSV 파일 **하나**로 내려받는다 — PDF와 같은 문서의 다른 형식이지
 * 섹션별 발췌가 아니다. 받는 쪽이 "리포트"라고 부르는 건 다섯 섹션이 다 든 그 문서
 * 하나인데, 파일 다섯 개를 주면 그걸 다시 합치는 일이 읽는 사람 몫이 된다.
 *
 * **엑셀에서 열었을 때 읽히도록 짠다.**
 *  - 맨 위 표제부(문서명·기수·발행 시점·범위)를 라벨/값 두 칸으로 둔다 — 어느 기수
 *    무슨 시점 자료인지가 파일 안에 있어야 파일명을 바꿔도 안 잃는다.
 *  - 섹션은 `── 제목 · 질문` 한 줄로 끊는다. 화면·인쇄와 **같은 질문 문장**을
 *    (`sections.ts`에서) 가져다 쓰므로 세 형식이 같은 말을 한다.
 *  - **숫자 열 이름에 단위를 박는다**(`2단 이하(명)`) — CSV엔 열 폭도 서식도 없어서
 *    헤더 말고는 단위를 말할 자리가 없다.
 *  - 비율은 `57%` 문자열로 넣는다. 엑셀이 이걸 백분율 셀(0.57)로 알아서 읽어 정렬·
 *    계산이 되고, 사람 눈에도 바로 비율로 보인다.
 *
 * **화면이 이미 들고 있는 데이터를 그대로 굽는 것**이라 서버 호출이 없다.
 */
export function exportReportCsv(report: Report) {
  const { excluded } = report
  const pct = (n: number, d: number) => (d === 0 ? '' : `${Math.round((n / d) * 100)}%`)

  const sections: {
    key: ReportSectionKey
    title: string
    headers: string[]
    rows: (string | number)[][]
  }[] = [
    {
      key: 'summary',
      title: '요약',
      headers: ['항목', '값', '비고'],
      rows: [
        ['교육생(명)', report.traineeCount, `${report.classCount}개 반`],
        ['미니프로젝트 완료(회)', report.completedRounds, `등록 ${report.totalRounds}회 중`],
        ['검증 개념(건)', report.conceptCount, `교안 ${report.curriculumCount}종`],
        ['전체 응시(건)', report.totalSubmissionCount, ''],
        ['제외 · 미응시(건)', excluded.notTaken, ''],
        ['제외 · 무효 응시(건)', excluded.invalid, ''],
        ['제외 · 중단(건)', excluded.interrupted, ''],
        ['채점된 응시(건)', report.gradedCount, '이 문서 모든 비율의 분모'],
        ['재시험', '반영 안 함', '1차 결과만 집계'],
      ],
    },
    {
      key: 'round',
      title: '회차별',
      headers: [
        '회차',
        '검증 개념',
        '1단(명)',
        '2단(명)',
        '3단(명)',
        '4단(명)',
        '묻지 못함(명)',
        '2단 이하(명)',
        '채점 인원(명)',
        '2단 이하 비율',
      ],
      rows: report.rounds.map((r) => [
        r.name,
        r.conceptNames.join(' · '),
        r.distribution.level1,
        r.distribution.level2,
        r.distribution.level3,
        r.distribution.level4,
        r.distribution.unasked,
        r.belowLevel2Count,
        r.gradedCount,
        pct(r.belowLevel2Count, r.gradedCount),
      ]),
    },
    {
      key: 'concept',
      title: '개념별 도달 분포',
      headers: [
        '교안',
        '검증 개념',
        '출처',
        '쓰인 회차',
        '1단(명)',
        '2단(명)',
        '3단(명)',
        '4단(명)',
        '묻지 못함(명)',
        '2단 이하(명)',
        '채점 인원(명)',
        '2단 이하 비율',
      ],
      rows: report.concepts.map((c) => [
        `${c.curriculumName} ${c.curriculumVersion}`,
        c.name,
        c.section,
        c.rounds.join(' · '),
        c.distribution.level1,
        c.distribution.level2,
        c.distribution.level3,
        c.distribution.level4,
        c.distribution.unasked,
        c.belowLevel2Count,
        c.gradedCount,
        pct(c.belowLevel2Count, c.gradedCount),
      ]),
    },
    {
      key: 'ops',
      // 한 섹션에 표가 둘이라 블록도 둘로 나간다 — 열이 달라 한 표로 못 합친다
      title: `반별 위험자 비율 · ${report.classRiskRoundLabel}`,
      headers: ['반', '위험자(명)', '전체 인원(명)', '위험자 비율'],
      rows: report.classRisk.map((c) => [
        c.className,
        c.atRiskCount,
        c.traineeCount,
        pct(c.atRiskCount, c.traineeCount),
      ]),
    },
    {
      key: 'ops',
      title: '집단 미달',
      headers: [
        '교안',
        '검증 개념',
        '출처',
        '회차',
        '반',
        '미달(명)',
        '전체 인원(명)',
        '미달 비율',
      ],
      rows: report.groupShortfalls.map((g) => [
        g.curriculumName,
        g.conceptName,
        g.section,
        g.round,
        g.className,
        g.shortfallCount,
        g.totalCount,
        pct(g.shortfallCount, g.totalCount),
      ]),
    },
    {
      key: 'top',
      title: '우수 교육생',
      headers: ['이름', '반', '우수 횟수(회)', '우수한 회차'],
      rows: report.topStudents.map((s) => [
        s.name,
        s.className,
        s.miniTopCount,
        s.miniTopRounds.map((n) => `${n}차`).join(' · '),
      ]),
    },
  ]

  const escape = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const line = (row: (string | number)[]) => row.map(escape).join(',')

  // 같은 섹션의 두 번째 표(집단 미달)에는 질문을 다시 붙이지 않는다 — 한 번이면 족하다
  const asked = new Set<ReportSectionKey>()
  const block = (s: (typeof sections)[number]) => {
    const q = asked.has(s.key) ? '' : ` · ${sectionQuestion(s.key)}`
    asked.add(s.key)
    return [
      escape(`── ${s.title}${q}`),
      line(s.headers),
      // 확정 전이라 비어 있는 섹션 — 빈 표로 두면 "0건"으로 오독된다
      ...(s.rows.length === 0 ? [escape('(확정 전이라 아직 값이 없습니다)')] : s.rows.map(line)),
    ].join('\n')
  }

  const head = [
    line(['리포트', report.cohortName]),
    line(['발행 시점', report.publishedAt ?? '확정 전']),
    line(['상태', report.status === 'CONFIRMED' ? '확정' : '진행 중']),
    line(['범위', `${report.periodStart} – ${report.periodEnd ?? '진행 중'}`]),
  ].join('\n')

  const csv = `${head}\n\n${sections.map(block).join('\n\n')}\n`
  // BOM — 엑셀이 한글 CSV를 UTF-8로 안 읽으면 깨진다
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `리포트-${report.cohortName}-${report.publishedAt ?? '진행중'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
