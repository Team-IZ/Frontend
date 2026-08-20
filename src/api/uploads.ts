import { izClient, izOriginClient, unwrap, type RequestOptions } from '@/api/_contract'
import type { operations } from '@/api/schema'
/* 상한은 의존성 없는 잎 모듈에 있다 — CI 가드가 별칭 없이 읽어 검산한다 */
export { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL, tooLargeToUpload } from '@/api/uploadLimits'

/*
  ⚠ **생성된 타입 파일이 아니라 스펙 원본(`schema.d.ts`)에서 직접 뽑는다.** 태그별
  `*Types.ts`는 생성기가 만드는데, 이 오퍼레이션들은 multipart라 생성기가 건너뛰어서
  그 파일에 이름이 없다. 스펙이 바뀌면 여기서 타입 검사가 잡힌다.
*/
/*
  **`202` — 접수만 하고 등록은 비동기로 돌린다.** 한동안 `201`로 적혀 있다가 사실에
  맞춰졌다(제출 API의 `201`·`202` 정정과 같은 흐름). 선언이 바뀌면 여기서 컴파일이
  깨지므로 스펙과 어긋난 채로 굳지 않는다.
*/
type CsvUploadResponse =
  operations['registerTraineesFromCsv']['responses'][202]['content']['application/json']
/*
  **미리보기는 등록과 다른 스키마다.** 한동안 같은 것을 가리켰는데, 그건 설계가 아니라
  스펙에서 두 이름이 겹쳐 있던 사고였다(30차 회신 §2). 이름이 갈리며 여기서 컴파일이
  깨져서 알았다 — 미리보기에는 `registeredCount`가 없고 `registrableCount`가 있다.
*/
type CsvPreviewResponse =
  operations['previewTraineesFromCsv']['responses'][200]['content']['application/json']
type RegisterCurriculumResponse =
  operations['registerCurriculum']['responses'][201]['content']['application/json']
/** 새 버전 등록. **새 교안 등록과 응답이 같다**(스펙 명시) — 그래도 각자 뽑아 둔다 */
type RegisterCurriculumVersionResponse =
  operations['registerCurriculumVersion']['responses'][201]['content']['application/json']
/*
  **`202` — 접수만 하고 분석은 비동기로 돌린다.** 한동안 스펙이 `200`으로 적혀 있었는데
  서버는 그때도 202를 보내고 있었고, 23차 요청으로 표기가 사실에 맞춰졌다.
  선언이 바뀌면 여기서 컴파일이 깨지므로 스펙과 어긋난 채로 굳지 않는다.
*/
type SubmitZipResponse = operations['submitZip']['responses'][202]['content']['application/json']

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
 * **아무것도 만들지 않는다.** 그래서 응답도 등록과 다르다 — 몇 명을 **등록할 수 있는지**
 * (`registrableCount`)를 주고, 등록 건수·초대 발송 수·배치 ID는 없다.
 */
export const previewTraineesFromCsv = (params: CsvUpload) =>
  unwrap<CsvPreviewResponse>(
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
 *
 * **웜업 결과를 확인한다.** 예전엔 `.catch(() => {})`로 웜업 실패를 통째로 무시하고 바로
 * origin에 업로드를 쐈다 — App Runner가 아직 준비 안 된 순간(PAUSED에서 막 깨어나는 중 등)에
 * 이 레이스가 걸리면 origin 요청이 그대로 실패했다(도메인 코드 없는 500이 실측됨, 2026-08-18).
 * 그래서 웜업을 최대 3회(2초 간격)까지 재시도하고, 그래도 안 깨어나면 origin에 아예 안 쏘고
 * 에러를 던진다 — 실패를 조용히 삼키는 대신 화면이 재시도를 안내할 근거를 준다.
 */
const WARMUP_RETRIES = 3
const WARMUP_RETRY_DELAY_MS = 2000

/** origin으로 파일을 보내기 전 App Runner를 깨운다 — 실패하면 던진다(위 주석 참고) */
const warmUpOrigin = async (signal: RequestOptions['signal']) => {
  let warmed = false
  for (let attempt = 0; attempt < WARMUP_RETRIES && !warmed; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, WARMUP_RETRY_DELAY_MS))
    const { error } = await izClient.GET('/api/v0/members/me', { signal })
    warmed = !error
  }
  if (!warmed) {
    throw new Error('서버를 깨우지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export const registerCurriculum = async (
  params: { query: { title: string; topic?: string }; file: File } & RequestOptions,
) => {
  await warmUpOrigin(params.signal)
  return unwrap<RegisterCurriculumResponse>(
    izOriginClient.POST('/api/v0/curricula', {
      params: { query: params.query },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )
}

/**
 * 교안 **새 버전** 등록 — `POST /api/v0/curricula/{materialId}/versions` (PDF)
 *
 * **새 교안을 만들지 않는다** — `materialId`가 가리키는 그 교안에 다음 버전이 하나 는다.
 * 번호는 서버가 매긴다(현재 최신 + 1). 기존 버전 행은 지워지지 않고 그대로 남는다 —
 * 이미 그 버전을 연결해 쓰는 회차와, 발행된 리포트가 가리키는 쪽 번호를 지키기 위해서다.
 *
 * **`title`은 제목을 바꿀 때만 보낸다.** 생략하면 기존 제목을 그대로 쓰고, 그때는 제목
 * 중복 검사도 돌지 않는다(같은 교안에 버전을 더하는 것이라 자기 자신과 겹칠 이유가 없다).
 *
 * 🔴 **분석은 자동으로 안 걸린다**(44차 R4 회신). 새 버전은 내용이 비슷해도 **다른 파일**
 * 이라 쪽 번호·섹션 구성이 바뀔 수 있는데, 분석이 다시 돌지 않으면 검증 개념을 못 뽑아
 * **회차에 붙일 수 없는 상태로 남는다.** 부르는 쪽이 응답의 `materialId`로
 * `POST /curricula/{materialId}/analyses`를 이어 붙여야 한다.
 *
 * 업로드 경로는 새 교안 등록과 같다 — Lambda 6MB 상한을 피해 origin으로 보내고, 그 전에
 * 깨운다(`registerCurriculum` 주석 참고).
 */
export const registerCurriculumVersion = async (
  params: {
    path: { materialId: string }
    /** 제목을 바꿀 때만. 비우면 기존 제목 유지 */
    query?: { title?: string }
    file: File
  } & RequestOptions,
) => {
  await warmUpOrigin(params.signal)
  return unwrap<RegisterCurriculumVersionResponse>(
    izOriginClient.POST('/api/v0/curricula/{materialId}/versions', {
      params: { path: params.path, query: params.query ?? {} },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )
}

/*
  ─── 교육생 코드 제출 (ZIP) ──────────────────────────────────────────────────
*/

/**
 * ZIP 업로드 제출·재제출 — `POST /api/v0/submissions/zip`
 *
 * **`Idempotency-Key`가 필수다**(생략하면 400). 지금까지 우리가 안 쓰던 헤더인데,
 * 이 오퍼레이션이 처음으로 요구한다 — 서버가 대신 만들어 주지 않는다.
 *
 * ```
 * 재시도(타임아웃·5xx·네트워크)  →  같은 키   →  서버가 최초 결과를 돌려준다
 * 사용자가 다시 제출              →  새 키     →  별개의 제출
 * ```
 *
 * **키를 여기서 만들지 않는다.** 화면이 제출 버튼을 누른 순간 만들어 그 제출이 끝날
 * 때까지 들고 있어야 재시도가 같은 키를 쓴다 — 이 함수 안에서 만들면 호출마다 새 키가
 * 되어 멱등이 성립하지 않는다(스펙이 명시한 실패 방식이다).
 *
 * **접수만 하고 끝난다.** 서버가 보는 것은 크기·압축 형식뿐이고 `EMPTY_CODE` 같은
 * 내용 판정은 분석 단계에서 `failureCode`로 온다.
 */
export const submitZip = (
  params: {
    query: { assessmentRoundId: string }
    idempotencyKey: string
    file: File
  } & RequestOptions,
) =>
  unwrap<SubmitZipResponse>(
    izClient.POST('/api/v0/submissions/zip', {
      params: {
        query: params.query,
        header: { 'Idempotency-Key': params.idempotencyKey },
      },
      body: csvBody(params.file) as never,
      signal: params.signal,
    }) as never,
  )
