/*
  올릴 수 있는 최대 크기.

  ⚠ **이것은 교안·명단의 규칙이 아니라 전송 경로의 한계다** — PDF든 CSV든 ZIP이든 같은
  문을 지난다. 그래서 도메인 규칙(`rules.ts`)이 아니라 API 층에 있다.

  백엔드 앞에 **AWS Lambda Function URL**이 있고, 그 플랫폼 한도가 **요청 6,291,456바이트**다.
  Lambda가 바이너리 본문을 **base64로 감싸서**(×4/3) 함수에 넘기므로, 실을 수 있는 바이트는
  그 3/4다. 스펙도 같은 말을 한다 — *"본문이 base64로 부풀어(×4/3) 실질 4.5MB에서 막히는
  것이라 **앱이 손댈 수 있는 층이 아니고**, presigned S3로 그 층을 비켜가는 것이 답이다."*

  **앱 코드에 닿기도 전에 잘린다.** 그래서 스펙의 응답 목록에 `413`이 없고, 몸통도 우리
  `{code, message}`가 아니라 AWS의 `{"Message": …}`다 — `errorCopy`가 코드로 가를 수 없는
  유일한 실패다.

  ## 왜 4.5MB에서 다시 빼나
  실린 것은 파일만이 아니다 — multipart 경계·헤더·파일명이 같이 간다. 실측(이분 탐색):

      4,715,625 B  →  통과        4,717,187 B  →  413
      이론 상한    4,718,592 B (= 6,291,456 × 3/4)

  약 3KB가 그 부대 비용이다. **4KB는 그보다 넉넉하게 잡은 값이다** — 파일명 길이도 재
  봤는데(5B vs 93B) 이 근처에서 결과를 안 바꿨다. 즉 이 여유는 계산으로 딱 맞춘 것이
  아니라 **경계에 붙지 않으려고 일부러 남긴 것**이다.

  대가는 4.5MB 바로 아래 **1.5KB쯤 되는 구간이 화면에서만 막히는 것**이고(서버는 받는다),
  4.5MB 중 0.03%라 무시한다. 반대쪽 대가 — 경계를 넘겨 잡아 사용자가 413을 보는 것 —
  이 훨씬 나쁘다.

  ⚠ **그래도 서버 413을 계속 처리해야 한다.** 여기 검사는 *"어차피 실패할 요청을 안
  보낸다"* 는 것이지 마지막 방어선이 아니다.

  ⚠ **이 파일은 아무것도 import 하지 않는다.** `scripts/check-admin-rules.mts`가 별칭 없이
  직접 읽어 상한을 검산한다(`node --experimental-strip-types`는 `@/`를 못 푼다).
*/

/** AWS Lambda Function URL의 요청 한도 — base64로 감싼 크기 기준이다 */
const LAMBDA_PAYLOAD_LIMIT = 6_291_456

/** multipart 경계·헤더·파일명 몫 — 실측 부대 비용 약 3KB에 여유를 더한 값 */
const MULTIPART_ALLOWANCE = 4_096

/** 실제로 실을 수 있는 파일 바이트 */
export const MAX_UPLOAD_BYTES = Math.floor((LAMBDA_PAYLOAD_LIMIT * 3) / 4) - MULTIPART_ALLOWANCE

/** 사용자에게 보여줄 상한 — 계산값과 어긋나지 않게 여기서 만든다 */
export const MAX_UPLOAD_LABEL = `${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)}MB`

/** 이 파일을 지금 경로로 올릴 수 있나. 못 올리면 **보내지 않는다** */
export const tooLargeToUpload = (file: File) => file.size > MAX_UPLOAD_BYTES
