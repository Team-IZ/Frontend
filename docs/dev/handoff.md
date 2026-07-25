# 작업 핸드오프

새 대화(또는 Claude Code) 세션으로 작업을 이어갈 때 먼저 읽는 메모.
규약은 `CLAUDE.md`가 자동으로 로드되므로 여기엔 **세션이 모르는 현재 상태·환경**만 적는다.
작업이 끝나면 "지금까지 상태"를 갱신한다.

---

## 지금까지 상태 (리뷰 대기·미머지, develop 대상)

- **인증 화면 3종**(로그인·초대가입·재설정) 공용 컴포넌트로 교체 → **PR #35**
- **교안 관리(SC-M12) 3화면 완료**: 목록·등록은 기존, 교안 상세를 신규 구현 → **PR #38**
  - 신규 파일: `features/curriculum/CurriculumDetailScreen.tsx`,
    `features/curriculum/components/SectionTopicTable.tsx`,
    `features/curriculum/components/CoverageSummary.tsx`
  - 주제 칩 편집은 로컬 상태(`useState`)만, `mockData` 기반 — 실 API 연동 전
  - 중복 칩 판정은 대소문자 무시, 목록 교안명 클릭으로 상세 진입(§7)

## 작업 환경 메모

- **Windows · cmd · GitHub Desktop** 사용. 커밋은 GitHub Desktop(Summary=제목 / Description=본문).
  브랜치는 develop에서 분기 후 `git config branch.<브랜치>.issue <번호>`로 이슈 연결
  → 커밋에 `(#N)`이 훅으로 자동 부착된다(손으로 안 씀).
- **목업 고정값**: 기수 `7기`, 사용자 `박지현`/`총괄 매니저`, `isLead=true` (인증 연동 전이라 하드코딩).
- **커밋 훅**: AI co-author 금지, 제목 72자 초과 거부, 50자 초과는 경고(무시 가능).
- **검증 명령**: `npm run typecheck`, `npm run lint`(oxlint), `npm run format`, `npm run build`, `npm run dev`.
  lint는 `only-export-components` 경고가 기존 파일들에 있음 — **에러 0이면 정상**.
- 화면 구현 전 해당 `SC-xx` 정의서 + 와이어프레임(`docs/plan/screen/wireframe/`)을 먼저 읽는다.
  명세에 없는 문구·상태·컴포넌트 이름을 임의로 만들지 않는다.

## 다음 작업

> 여기에 다음 화면/이슈를 적는다. 예: "SC-M13 프로젝트·팀 화면 구현" 또는 이슈 번호.
> 새 화면이면: 해당 SC 정의서·와이어프레임부터 읽고, develop에서 feature 브랜치를 판다.

(미정)
