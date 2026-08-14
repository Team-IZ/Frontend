import { izClient, izOriginClient, unwrap, type RequestOptions } from '@/api/_contract'
import type { operations } from '@/api/schema'

/*
  ⚠ **생성된 타입 파일이 아니라 스펙 원본(`schema.d.ts`)에서 직접 뽑는다.** 태그별
  `*Types.ts`는 생성기가 만드는데, 이 오퍼레이션들은 multipart라 생성기가 건너뛰어서
  그 파일에 이름이 없다. 스펙이 바뀌면 여기서 타입 검사가 잡힌다.
*/
type CsvUploadResponse =
  operations['registerTraineesFromCsv']['responses'][201]['content']['application/json']
type RegisterCurriculumResponse =
  operations['registerCurriculum']['responses'][201]['content']['application/json']

/*
  **손으로 쓰는 계약 — multipart 업로드.**

  `openapi-fetch`는 본문을 JSON으로 직렬화하는 것을 전제한다. 파일 업로드는 `FormData`를
  직접 만들어야 하므로 생성기가 건너뛴다(`src/api/PENDING.md`가 그 목록을 갖는다).

  **타입은 생성된 것을 쓴다.** 응답 모양은 스펙에서 오고, 여기서 손으로 쓰는 것은
  *"본문을 어떻게 싣나"* 뿐이다 — 그래야 스펙이 바뀔 때 타입 검사가 잡는다.

  `body`에 `FormData`를 넣으면 브라우저가 `Content-Type: multipart/form-data; boundary=…`를
  **직접 붙인다.** 손으로 지정하면 boundary가 빠져 서버가 못 읽는다 — 그래서 헤더를 안 준다.
*/

/** 기수 ID 하나를 경로로 받는 CSV 업로드 — 등록과 드라이런이 같은 모양이다 */
type CsvUpload = { path: { cohortId: string }; file: File } & RequestOptions

/** `file` 한 칸짜리 폼 — CSV든 PDF든 서버가 받는 필드 이름이 같다 */
const csvBody = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return form
}

/**
 * CSV 교육생 명단 등록 및 초대 — `POST /api/v0/cohorts/{cohortId}/trainees`
 *
 * **행별 부분 성공을 허용한다.** 한 행이 실패해도 나머지는 등록되므로 201을 성공으로
 * 처리하되 `failures`가 비어 있는지 반드시 확인해야 한다(스펙 명시).
 */
export const registerTraineesFromCsv = (params: CsvUpload) =>
  unwrap<CsvUploadResponse>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees', {
      params: { path: params.path },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )

/**
 * CSV 명단 사전 검증(드라이런) — `POST /api/v0/cohorts/{cohortId}/trainees/preview`
 *
 * **아무것도 만들지 않는다.** 응답이 등록과 같은 스키마라 화면이 미리보기와 등록 결과를
 * 한 컴포넌트로 그린다 — 다만 `invitationSentCount`는 항상 0이다.
 */
export const previewTraineesFromCsv = (params: CsvUpload) =>
  unwrap<CsvUploadResponse>(
    izClient.POST('/api/v0/cohorts/{cohortId}/trainees/preview', {
      params: { path: params.path },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )

/**
 * 교안 등록 — `POST /api/v0/curricula` (PDF)
 *
 * **제목·주제가 쿼리 파라미터다**(본문이 아니다) — 본문 자리는 파일이 통째로 쓴다.
 *
 * ⚠ **등록 직후에는 분석이 안 된 상태다.** 섹션·검증개념을 쓰려면 별도로
 * `POST /curricula/{materialId}/analyses`를 불러야 한다(스펙 명시).
 *
 * **본문은 `izClient`가 아니라 `izOriginClient`로 보낸다.** Lambda Function URL(`izClient`)엔
 * AWS 자체 6MB 동기 페이로드 상한이 있어 그 이상은 413(실측) — App Runner origin 도메인으로
 * 직접 보내 우회한다(Backend PR #87의 `AiCurriculumClient` 패턴 미러링). origin은 PAUSED
 * 상태를 스스로 못 깨우므로, 실제 업로드 전에 `izClient`로 가벼운 GET을 먼저 보내 깨운다.
 */
export const registerCurriculum = async (
  params: { query: { title: string; topic?: string }; file: File } & RequestOptions,
) => {
  await izClient.GET('/api/v0/members/me', { signal: params.signal }).catch(() => {})
  return unwrap<RegisterCurriculumResponse>(
    izOriginClient.POST('/api/v0/curricula', {
      params: { query: params.query },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )
}
