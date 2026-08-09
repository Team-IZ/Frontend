# 아직 생성하지 않은 API

`x-readiness`가 `available`이 아니어서 **호출 함수를 만들지 않았다.**
함수가 있으면 누군가 쓰기 때문이다 — 그 화면은 목 데이터로 계속 돈다.

배포 환경 제약(메일 발송 불가 등)으로 막힌 것이 많다. **구현이 없는 게 아니라 환경이 막은
것**이라, 백엔드가 `available`로 바꾸면 `npm run api:gen`만 다시 돌리면 된다.

| readiness | 엔드포인트 | |
|---|---|---|
| `unavailable` | GET /api/v0/reports/{reportId}/disclosure | 내 리포트 공개 상태 조회 |
| `unavailable` | PUT /api/v0/reports/{reportId}/disclosure | 리포트 공개 범위 설정 |
| `unavailable` | POST /api/v0/organizations/{organizationId}/purge | 기관 파기 요청 |
| `unavailable` | GET /api/v0/reports | 내 리포트 전량 조회 |
| `unavailable` | GET /api/v0/reports/{reportId} | 리포트 단건 조회 |
| `unavailable` | GET /api/v0/reports/managed | 담당 반 리포트 목록 조회 (매니저) |
| `unavailable` | GET /api/v0/reports/class-diagnosis | 수업 진단 리포트 조회 |

## 손으로 쓰는 것 — multipart

`openapi-fetch`는 JSON 직렬화를 전제한다. 파일 업로드는 `FormData`를 직접 만들어야 하므로
호출 함수를 생성하지 않는다. **타입(`{tagName}Types.ts`)은 생성돼 있으니 그것을 쓴다.**

- `POST /api/v0/curricula` — 교안 등록
- `POST /api/v0/cohorts/{cohortId}/trainees` — CSV 교육생 명단 등록 및 초대
- `POST /api/v0/cohorts/{cohortId}/trainees/preview` — CSV 교육생 명단 사전 검증(드라이런)

> 이 파일은 자동 생성물이다. 손으로 고치지 마세요.
