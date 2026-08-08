# 배포 정리 + 파일 업로드 구조 — 백엔드 두 담당자께

> **한 문서에 세 가지가 있다.** 담당이 갈리므로 앞에 누구 것인지 적는다.
>
> | | 내용 | 우리가 할 일 |
> |---|---|---|
> | **A. App Runner** | 프록시 URL 검증 완료 · **다만 옛 코드가 올라가 있다** | 주소 교체(한 줄) |
> | **B. 배포 정합** | 두 배포의 코드가 다르다 — 맞추는 방법 | — |
> | **C. 파일 업로드** | 물어보신 S3 구조 — **presigned URL을 권한다** | 그 방식에 맞춰 설계 |

---

# A. App Runner — 프록시 URL, 검증 통과했습니다

## A-1. 프록시로 바꾸라는 안내, 맞습니다

원본 URL은 유휴 상태에서 **envoy가 404를 즉답**해 "서비스가 죽은 것처럼" 보였다.
실제로 우리가 그 상태에서 한참 헤맸고, 원인 문서까지 따로 썼다.

**프록시 URL로 전부 다시 확인했다 — 문제 없다.**

```
https://xvdanr6m362b2ge232vdmfbrny0kwakz.lambda-url.ap-northeast-1.on.aws

GET /v3/api-docs                    200 · 0.87s (첫 호출) → 0.62s   ← 404 없음. 깨우기 동작
OPTIONS /api/v0/auth/login
  https://frontend-eight-neon-73.vercel.app  200
  http://localhost:5173                      200
  https://evil.example.com                   403   ← 정확히 허용 목록만
POST /api/v0/auth/login             200
  Set-Cookie: refresh_token=…; Path=/api/v0/auth; Secure; HttpOnly; SameSite=None
  access-control-allow-credentials: true
POST /api/v0/auth/refresh (쿠키 왕복)  OK
```

**가장 걱정한 것은 쿠키였다.** Lambda를 한 겹 더 거치면 `Set-Cookie`나
`allow-credentials`가 떨어지는 일이 흔한데, **속성이 그대로 살아 넘어온다.**
우리 인증 구조(액세스 토큰은 메모리, 리프레시는 httpOnly 쿠키)가 이 프록시 뒤에서 그대로 돈다.

> **우리 쪽 변경은 환경변수 한 줄이다**(`VITE_API_BASE`). 코드는 안 바뀐다.

## A-2. ⚠️ 그런데 App Runner에 **옛 코드**가 올라가 있습니다

프록시가 아니라 **그 뒤의 애플리케이션** 이야기다. 우리 스펙 검사기를 두 배포에 각각 돌렸다.

```
Railway      error   0건     ← 1·2차 요청 전부 반영된 상태
App Runner   error 417건     ← 1차 요청 이전과 정확히 일치
```

| 항목 | Railway | App Runner |
|---|---|---|
| 에러 응답이 성공 스키마를 가리킴 | 0 | **99건** |
| `required` 없는 스키마 | 0 | **75건** |
| `nullable` 표기 누락 | 0 | **34건** |
| 응답 `content-type` | `application/json` | **`*/*` 152건** |
| `x-readiness` | 56개 전부 | **0개** |
| 전역 `security` | 있음 | **없음** |
| 스펙에서 뽑히는 에러 코드 | **61종** | **0종** |
| `GET /members/me` | 있음 | **없음** |

**그래서 지금 두 배포를 하나로 못 쓴다.**

| | 어디서만 되나 |
|---|---|
| 최신 스펙 · `/me` · 에러 코드 61종 | **Railway** |
| **메일 발송(SMTP)** | **App Runner** |

App Runner 스펙으로 코드를 생성하면 **우리 타입이 1차 요청 이전으로 되돌아간다** —
에러 코드 유니온이 사라지고, 모든 필드가 optional이 되고, `/me`가 없어진다.

### 요청

> **App Runner에 Railway와 같은 커밋(develop)을 배포해 주세요.**
> 그러면 **최신 스펙 + SMTP**가 한 배포에 모여, 우리가 두 주소를 오갈 이유가 없어진다.

## A-3. SMTP는 실제로 됩니다 — 실메일로 확인했습니다

이 배포의 목적이던 것이 동작한다. Railway에서 502로 막히던 둘이 성공했다.

```
POST /platform/operations/super-admins/invitations   201  PENDING
POST /organizations/{id}/operators/invitations       201  PENDING
```

실제 메일 주소로도 보냈다(수신 확인 중). **`ALREADY_INVITED` 중복 방지도 정상 동작**한다.

### 함께 확인 부탁드릴 것 두 가지

**① `x-readiness` 갱신** — 메일이 되니 초대 4건이 `hold`/`unavailable`에서 풀려야 한다.
안 바꾸면 우리 생성기가 **호출 함수를 안 만들어서** 화면이 그 기능을 못 붙인다.

```
POST   /organizations/{id}/operators/invitations                    hold → available
POST   /organizations/{id}/operators/invitations/{tokenId}/resend   hold → available
DELETE /organizations/{id}/operators/invitations/{tokenId}          hold → available
POST   /platform/operations/super-admins/invitations                (이미 available · 이제 실제로 됨)
```

**② `emailDomain` 제한이 실제로는 안 걸린다**

기관 `파이널랩`의 `emailDomain`이 `finallab.com`인데 **gmail 주소로 초대가 그대로 통과**했다.
스펙 설명은 *"이 도메인 밖 주소로는 오퍼레이터를 초대할 수 없다"* 고 되어 있다.

테스트에는 편했지만 **계약과 구현이 다르다.** 의도적으로 안 막는 것이면 스펙 설명을 고치고,
막아야 하는 것이면 구현이 빠진 것이다. **화면이 이 검증을 미리 할지 말지가 여기 걸린다.**

---

# B. 배포 정합 — 앞으로 어떻게 맞출까요

지금 문제는 **담당이 둘이라서**가 아니라 **두 배포가 서로 다른 코드를 보고 있어서**다.
그래서 매번 "어느 쪽이 최신인지"를 우리가 확인해야 한다 — 실제로 이번에 그렇게 시간을 썼다.

**제안 — 셋 중 하나면 된다.**

| | |
|---|---|
| **① 같은 브랜치를 보게 한다** ✅ 권장 | Railway가 `develop` 자동배포라면 App Runner도 같은 브랜치로. **한 번 맞추면 끝난다** |
| ② App Runner 하나로 모은다 | SMTP가 되는 쪽이라 사실 이게 가장 단순하다. Railway를 접어도 되면 |
| ③ 배포 시점만 맞춘다 | 사람이 매번 기억해야 해서 가장 약하다 |

> **우리 쪽 부담은 어느 쪽이든 같다.** 주소가 환경변수 한 줄이라 언제든 갈아탄다.
> 중요한 것은 **우리가 코드를 생성하는 스펙과 실제로 호출하는 서버가 같아야** 한다는 것뿐이다.

**확인만 해 주시면 좋겠다** — Railway는 `develop` 머지 시 자동배포가 맞나?
App Runner는 어떤 트리거인가(수동/브랜치/이미지 푸시)?

---

# C. 파일 업로드 구조 — 물어보신 것

## C-1. 지금은 문제가 없습니다. 앞으로가 문제입니다

**현재 스펙에서 파일을 다루는 것은 하나뿐이다.**

```
POST /api/v0/cohorts/{cohortId}/trainees   multipart/form-data   ← CSV 명단 등록
```

CSV는 250명이라도 **수십 KB**라 6MB 제한과 무관하다.

**문제는 아직 스펙에 없는 쪽이다.**

| 앞으로 생길 것 | 크기 | 6MB 직통이면 |
|---|---|---|
| **코드 제출 ZIP** (TR-02) | 학생 프로젝트 압축 — **수십 MB가 흔하다** | 🔴 **막힌다** |
| 리포트 인쇄·CSV 내보내기 | 텍스트 | 안전 |
| 교안 PDF 등록 | 수 MB~수십 MB | 🔺 경계 |

**코드 제출이 이 제품의 출발점**이다(제출 → 분석 → 검증 세션 → 리포트). 여기가 막히면
핵심 흐름이 통째로 막힌다.

## C-2. 우리 의견 — **presigned URL 방식을 권합니다**

```
지금 물어보신 두 구조

  ① 직통      프론트 ──파일──▶ 백엔드 ──▶ S3     🔴 6MB 제한에 걸린다
  ② presigned 프론트 ──요청──▶ 백엔드 (URL만 발급)
              프론트 ──파일──────────────▶ S3     ✅ 제한을 안 만난다
```

**②를 권하는 이유가 Lambda 제한만은 아니다.**

| | |
|---|---|
| 6MB 제한을 **안 만난다** | 우회가 아니라 애초에 그 경로를 안 지난다 |
| 큰 파일이 **백엔드 메모리·시간을 안 쓴다** | 수십 MB 업로드가 요청 스레드를 오래 잡지 않는다 |
| 진행률·재시도가 **자연스럽다** | 브라우저가 S3에 직접 올리므로 진행률이 정확하다. 중간 실패도 그 파일만 다시 |
| 우리 코드가 **더 단순해진다** | 이미 그렇게 설계해 뒀다 — 파일 업로드는 생성 대상에서 빼고 얇은 함수로 처리하기로 정해 놓았다 |

**필요한 것은 엔드포인트 하나다.**

```jsonc
POST /api/v0/submissions/upload-url   →  { uploadUrl, fileKey, expiresIn }
// 프론트가 uploadUrl로 직접 PUT → 끝나면 fileKey를 제출 API에 넘긴다
```

> **다운로드도 같다.** 리포트·제출물 조회는 백엔드가 **다운로드용 presigned URL**을 주고
> 브라우저가 직접 받으면 된다.

## C-3. 다만 — 지금 당장 정할 필요는 없습니다

제출 API가 **아직 설계 전**이다. 그래서 **지금이 정하기 가장 좋은 시점**이지, 급한 것은 아니다.
TR-02(코드 제출) 스펙을 만드실 때 이 방식으로 잡아 주시면 프론트는 그대로 따른다.

**우리가 준비해 둔 것:** `openapi-fetch`는 JSON 직렬화를 전제하므로 **파일 업로드는 생성기
대상에서 제외**해 뒀고, 타입만 생성해 손으로 쓰는 얇은 함수가 쓰도록 갈라 놓았다.
presigned든 직통이든 **그 함수 하나만 바뀐다.**

---

# 요약 — 부탁드리는 것

| | 누구 | |
|---|---|---|
| 1 | App Runner | **최신 커밋(develop) 배포** — 지금은 1·2차 요청 반영 전 코드다 |
| 2 | App Runner | `x-readiness` 갱신 (초대 4건 `hold` 해제) |
| 3 | 백엔드 공통 | `emailDomain` 제한 — 스펙과 구현 중 어느 쪽이 맞나 |
| 4 | 배포 담당 | 두 배포가 같은 브랜치를 보게 (또는 트리거 알려 주기) |
| 5 | 백엔드 공통 | 파일 업로드 = **presigned URL** 방식으로 (TR-02 설계 시) |

**우리가 바로 하는 것:** API 주소를 프록시 URL로 교체.
