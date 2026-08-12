# Dev Docs 목차

`grip docs/dev`로 이 파일을 열고, 아래 링크를 클릭해서 폴더 안 문서를 바로 확인한다.

## 화면별 진행 상황

**그 화면을 이어서 만들 때 이 파일부터 읽는다.** 무엇을 어디까지 했고, 왜 그렇게 했고, 무엇이 남았는지.

- [**OP-01 대시보드**](screens/op-01-dashboard.md) — 목업 대조로 잡은 기획 결함 3건 · 반 비교 기준선 · 파이프라인 단위 · 렌더에서만 잡힌 것들
- [**OP-02 분석**](screens/op-02-analysis.md) — 탭마다 갈라 쓰는 색 체계 · 계층 전환 · 도달 단계 계단 · 화면이 정한 값 1건
- [**OP-03 · OP-04 프로젝트**](screens/op-projects-progress.md) — 무엇을 어디까지 했고 왜 그렇게 했나 · 남은 것
- [**OP-05 리포트**](screens/op-05-report-progress.md) — 문서형 화면(값이 얼어 있다) · 인쇄/CSV가 화면과 갈리는 지점 · 목 데이터 출처
- [**OP-06 운영 관리**](screens/op-06-admin.md) — 반·명단 탭 분리 · 배정 모드 · 매니저 배정 모델(1:N) · 기수 스코프 · 비용 월별·매트릭스
- [**MG-02 히트맵**](screens/mg-02-heatmap.md) — 목 설계 · 정의서 밖 빈틈 판단 · 드릴 계층
- [**MG-04 면담 브리프**](screens/mg-04-brief.md) — 정의서·와이어에 없던 빈틈 5건 · 종결 후 재오픈 · 무효 응시 증거
- [**MG-08 프로젝트**](screens/mg-08-projects.md) — 재응시 판정·발송 · 독촉 모달 · 제출 현황 표 · `bigp` 제거(MG-07 목록 포함)
- [**TR-03 검증 세션**](screens/tr-03-session.md) — **기획 변경(2026-08-11)** · 힌트가 당김에서 밀기로 · 점수 0~5·0단~4단 · 단계 보정 · **API 없음**
- [**TR-04 내 리포트**](screens/tr-04-report.md) — **기획 변경(2026-08-11)** · 공개 기본값 '공개' · `release_status` 3종 · `SUMMARY`/`FULL` 기준 · **API 전부 `unavailable`**

## 아키텍처 · 결정 기록

- [**API 없이 화면 만들기**](mock-first-screens.md) — **화면 하나를 시작할 때 이것부터 본다.** 착수 점검 → 목업 값 옮기기 → 목/경계 구조 → 완료 판정
- [**OpenAPI(스웨거)가 뭔가**](api/openapi-basics.md) — **"스웨거가 뭔데요?" 부터인 사람은 여기부터(15분, 사전 지식 0).** OpenAPI가 뭐고 왜 있나 · 누가 만드나 · 문서 구조 · `$ref`·`enum`·`required` · **다섯 가지 용도**와 우리가 쓰는 것
- [**API 붙이는 법**](api/api-usage.md) — **서버에 연결할 때 이것부터 본다(10분).** 화면에서 쓰는 법 · 명령 3개 · 폴더 구조 · 손대면 안 되는 것 · 자주 막히는 것
- [**API 코드는 어떻게 만들어지나**](api/api-process.md) — **생성기를 고쳐야 할 때 본다.** `pull`→`check`→`gen` 전 과정 · IR 필드 전량 · 렌더러 6개가 무엇을 왜 만드나 · 요청 한 번의 전체 경로 · 생성기 고치는 법
- [프론트엔드 구조 설계](frontend-architecture.md) — 두 명이 영역을 나눠 병렬 개발하기 위한 폴더·레이어 규칙
- [API 경계](api/api-boundary.md) — 값 하나를 어디에 둘 것인가(생성물/손) · **화면이 하면 안 되는 서버 판정** · 연동 시 지워지는 것
- [백엔드 API 문서 진단 — 1차](backend/backend-api-requests.md) — 스펙 실측 · 치명 3건(에러 스키마·required·nullable) · **전부 반영됨**
- [백엔드 API — 2차 요청](backend/backend-api-requests-2.md) — 1차 반영 검증 · 요청 1건(도메인 에러 코드) · 나머지 3건은 프론트가 흡수(철회 근거)
- [백엔드 API — 3차 요청](backend/backend-api-requests-3.md) — 실계정 연동 테스트에서 나온 것 · 쿠키 `SameSite` · 배포 도메인 Origin · `GET /me` — **전부 반영됨**
- [배포 정리 + 파일 업로드](backend/backend-deployment-and-files.md) — **프록시 URL 검증 통과** · App Runner에 옛 코드 · presigned URL 권고
- [App Runner 배포 — 안 닿음(해결됨)](backend/backend-apprunner-deploy.md) — 원인 후보와 환경변수. 기록으로 남긴다
- [백엔드 API — 4차 요청](backend/backend-api-requests-4.md) — 3차 반영 확인(실서버 전 구간 동작) · 요청 1건(차단이 인스턴스 분산으로 새어나감) · **다음 API 출시 순서 요청**
- [백엔드 API — 5차 요청](backend/backend-api-requests-5.md) — 새 스펙 65개 수신 · **요청 2건**: 초대 3종 `hold` 해제(막힘) · 새 `Item` 스키마(이름·`required`·enum 재사용)
- [백엔드 API — 6차 요청](backend/backend-api-requests-6.md) — **요청 1건**: 운영 설정 수정을 부분 수정(`PATCH`)으로. 모달이 2~4개를 바꾸는데 13개를 다 보내야 해서 **이력이 쓸모없어지고 남의 수정을 되돌린다**
- [백엔드 API — 7차 요청](backend/backend-api-requests-7.md) — **막힘 1건**: `Operator` 스키마에 필드 6개 누락(서버는 다 준다). 두 응답이 같은 스키마를 공유해 좁은 쪽에 맞춰졌다 · `period` 형식 확인 요청
- [백엔드 API — 8차 요청](backend/backend-api-requests-8.md) — 새 API 24개(프로젝트 실행·교안)에서 나온 **요청 3건**: `description`이 설명은 null인데 타입이 아님(런타임에 터진다) · `required` 누락 · 도메인 에러 코드 16건 · **5·6·7차 전부 반영 확인**
- [백엔드 API — 9차 요청](backend/backend-api-requests-9.md) — OP-03·OP-04(프로젝트)와 OP-06(운영 관리)을 붙이며 나온 **요청 8건 + 확인 3건**. 최우선은 **R5** — 같은 매니저인데 `Manager.memberId`만 정수고 나머지는 UUID라 **반 담당을 되읽어 다시 보낼 수가 없다**(스키마 한 줄)
- [백엔드 API — 10차 요청](backend/backend-api-requests-10.md) — OP-03·OP-04를 붙이며 나온 것. **검증 개념을 한 번 정하면 못 바꾼다(409)** · 프록시가 병렬 요청에서 502 · `traineeCount`가 항상 0
- [백엔드 API — 11차 요청](backend/backend-api-requests-11.md) — OP-06 여섯 탭을 붙이며 나온 **요청 8건 + 확인 3건**. 최우선은 **R1** — 교안 섹션 조회가 90초를 넘겨 상세가 안 열린다 · **9차 반영본 전수 검증 통과**
- [백엔드 API — 12차 요청](backend/backend-api-requests-12.md) — OP-02 분석을 붙이며 나온 것. `roundNo`가 요청·응답에서 다른 것을 가리킨다 · `sameCurriculumOnly=true`면 결과 0건
- [백엔드 API — 13차 요청](backend/backend-api-requests-13.md) — 11차 반영본으로 OP-06을 다시 돌려보며 나온 **요청 2건 + 확인 1건**. **같은 교안을 목록은 24개 회차가 쓴다 하고 상세는 0건**이라 한다 · **11차 열한 건 전부 반영 확인**
- [백엔드 API — 16차 요청](backend/backend-api-requests-16.md) — **교육생 도메인 계약 제안.** 결함 보고가 아니라 *만들어지기 전에* 보내는 것 — 홈 상태 8종 · 제출 6종 · 세션 채점/힌트(기획 변경) · 리포트 공개 정책. 화면 4개는 목으로 이미 완성
- [백엔드 API — 17차 요청](backend/backend-api-requests-17.md) — **16차 반영본 검수**(오퍼레이션 96→118). 대부분 반영됨 ✅ · **막힘: `api:check` error 37건** — 설명문엔 `enum`인데 스키마에 제약이 없다(홈 35필드) · `required` 9 · `nullable` 28
- [백엔드 API — 19차 요청](backend/backend-api-requests-19.md) — **17차 전수 검증: error 37 → 2건** ✅ · **남은 2건(`nullable` 두 줄)이 유일한 관문** — 그것만 오면 교육생 연동 시작 · enum 중복 7건 · 보류 2필드 회신
- [인증·세션 설계](api/auth-design.md) — 토큰을 어디에 두나 · 왜 Context가 아니라 스토어인가 · 401 재발급의 함정 셋 · 실무 정석과 우리 절충
- [연동 계획 — Auth·슈퍼어드민](api/integration-plan-auth-superadmin.md) — **지금 붙일 수 있는 6화면** · 타입 불일치 · 순서와 완료 판정
- [API 계층 결정 지점](api/api-layer-decisions.md) — 층·훅·쿼리 키·타입·에러를 왜 이렇게 했나 · **알려진 결함 3건**
- [codegen 설계](api/api-codegen.md) — 기존 툴킷 해부 · 결정 지점 전량(후보·판단·근거) · 착수 순서
- [개발 결정 기록](decision-log.md) — **여러 화면에 걸치는** 결정과 근거("왜 이렇게 했는가"). 한 화면 안의 결정은 위 화면별 문서가 갖는다 — 판정 기준은 그 문서 맨 위 "어디에 적는가"

## 컴포넌트 · 입력 인벤토리

- [컴포넌트 ↔ 화면 매핑](component-page-map.md) — `src/components/ui/` 33개가 어느 화면에서 쓰이는지
- [입력(Input) 목록](input-inventory.md) — 와이어프레임 21개 + 정의서 기준 실제 필요한 입력 형태
- [컴포넌트 카탈로그](components.html) *(HTML — 브라우저가 직접 렌더링)*
- [디자인 시스템](design-system.html) *(HTML — 브라우저가 직접 렌더링)*
