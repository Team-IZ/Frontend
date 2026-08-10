/**
 * 개인정보 처리방침 — 셸 없는 순수 콘텐츠 페이지.
 * BrandPanel(로그인·초대·비밀번호 재설정 공용)의 링크가 팝업 창으로 이 경로를 연다.
 * 개인정보보호·시큐어코딩 감사(docs/dev/pipa-secure-coding-audit.md ④) 대응 — 이슈 168.
 *
 * 부트캠프 교육용 프로젝트라 사업자등록번호 등 법인 정보가 없다. 아직 정해지지 않은
 * 항목은 거짓으로 채우지 않고 "없음/미정"으로 정직하게 표시한다.
 */
export default function PrivacyPolicyScreen() {
  return (
    <div className="bg-canvas min-h-screen px-6 py-10">
      <div className="mx-auto max-w-[640px]">
        <h1 className="text-fg text-xl font-bold">개인정보 처리방침</h1>
        <p className="text-fg-muted mt-2 text-sm leading-relaxed">
          IZ 프로젝트팀(&quot;서비스&quot;)은 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의
          개인정보를 안전하게 처리하기 위해 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>
        <p className="text-fg-subtle mt-2 text-sm leading-relaxed">
          이 서비스는 부트캠프 교육 과정에서 만들어진 프로젝트로, 사업자등록번호 등 법인 등록 정보가
          존재하지 않습니다. 아래 내용 중 아직 정해지지 않은 사항은 &quot;미정&quot;으로
          표시했습니다.
        </p>

        <Section title="1. 운영 주체">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <Row label="운영">IZ 프로젝트팀</Row>
              <Row label="주소">서울특별시 종로구 청계천로 81 4층</Row>
              <Row label="대표자">김연주</Row>
              <Row label="사업자등록번호">
                없음 (부트캠프 교육용 프로젝트로 사업자 등록이 되어 있지 않습니다)
              </Row>
            </tbody>
          </table>
        </Section>

        <Section title="2. 수집하는 개인정보 항목 및 수집 방법">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-2 pr-3 font-medium">대상</th>
                <th className="py-2 pr-3 font-medium">필수 항목</th>
                <th className="py-2 pr-3 font-medium">선택 항목</th>
                <th className="py-2 font-medium">수집 방법</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-border border-b align-top">
                <td className="py-2 pr-3">매니저</td>
                <td className="py-2 pr-3">이름, 이메일</td>
                <td className="py-2 pr-3">-</td>
                <td className="py-2">가입(초대) 시 입력</td>
              </tr>
              <tr className="align-top">
                <td className="py-2 pr-3">교육생</td>
                <td className="py-2 pr-3">이름, 이메일, 코드·세션 답변, 평가 결과</td>
                <td className="py-2 pr-3">익명화된 이용 데이터</td>
                <td className="py-2">가입(초대) 시 입력, 서비스 이용 과정에서 생성</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Section title="3. 개인정보의 수집 및 이용 목적">
          <ul className="text-fg-muted list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>서비스 회원가입 및 본인 확인</li>
            <li>교육 과정 운영, 평가 및 결과 제공</li>
            <li>
              교육생 코드·세션 답변의 AI 기반 분석(외부 LLM 제공사에 처리 위탁, 미동의 시 평가가
              제한됩니다)
            </li>
            <li>평가 결과의 소속 기관(매니저) 공유</li>
            <li>(선택 동의 시) 익명화된 데이터의 서비스 개선 활용</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 보유 및 이용 기간">
          <p className="text-fg-muted text-sm leading-relaxed">
            이용자가 탈퇴를 요청하거나 서비스 제공 목적이 달성된 때까지 보유합니다.
          </p>
        </Section>

        <Section title="5. 개인정보의 제3자 제공 및 처리 위탁">
          <p className="text-fg-muted text-sm leading-relaxed">
            원칙적으로 외부에 제공하지 않습니다. 다만 AI 분석 목적으로 코드·세션 답변을 외부 LLM
            제공사에 위탁하여 처리합니다.{' '}
            <b className="text-fg-muted font-semibold">
              위탁받는 구체적인 업체명은 현재 미정입니다.
            </b>
          </p>
        </Section>

        <Section title="6. 정보주체의 권리·의무 및 행사 방법">
          <p className="text-fg-muted text-sm leading-relaxed">
            이용자는 언제든지 자신의 개인정보에 대해 열람·정정·삭제·처리정지를 요청할 수 있습니다.
            행사 방법(전담 창구·절차)은 <b className="font-semibold">현재 미정입니다.</b>
          </p>
        </Section>

        <Section title="7. 개인정보의 파기 절차 및 방법">
          <p className="text-fg-muted text-sm leading-relaxed">
            수집·이용 목적이 달성된 개인정보는 지체 없이 파기하며, 전자적 파일은 복구 불가능한
            방법으로 영구 삭제합니다.
          </p>
        </Section>

        <Section title="8. 개인정보 보호책임자">
          <p className="text-fg-muted text-sm leading-relaxed">
            담당자 지정 및 연락처는 <b className="font-semibold">현재 미정입니다.</b>
          </p>
        </Section>

        <Section title="9. 고지의 의무">
          <p className="text-fg-muted text-sm leading-relaxed">
            이 개인정보 처리방침은 2026-08-10부터 적용됩니다.
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border mt-6 border-t pt-5">
      <h2 className="text-fg text-sm font-semibold">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-border border-b align-top">
      <th className="text-fg-muted w-[140px] py-2 pr-3 text-left font-medium">{label}</th>
      <td className="text-fg-muted py-2">{children}</td>
    </tr>
  )
}
