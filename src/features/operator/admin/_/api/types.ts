/*
  운영 관리 도메인 — **화면이 쓰는 값의 이름만 남았다.**

  탭 여섯이 전부 실서버에 붙으면서 손으로 쓴 계약(요청·응답 모양)이 사라졌다. 응답 타입은
  스펙에서 생성되고(`src/api/` 아래), 이 파일에 남은 것은 두 종류다.

  | | |
  |---|---|
  | 생성 타입에서 **이름만 빌려온 것** | 라벨·배지가 상태값을 알아야 한다. 두 파일이 각자 파생 타입을 만들면 같은 개념을 가리키는 경로가 둘이 된다 |
  | **서버 계약이 아닌 것** | CSV 판정은 보내기 전에 화면이 한다 — 서버는 자기 실패 코드를 따로 준다(`Failure.status`) |

  `api.ts`·`mockDb.ts`는 지웠다.
*/
import type { findCohorts_Item } from '@/api/academic/academicTypes'
import type { findManagers_Item, findTraineeRoster_Response } from '@/api/member/memberTypes'
import type { findOrganizationCurricula_Item } from '@/api/curriculum/curriculumTypes'

/**
 * 명단 한 줄.
 *
 * ⚠ **생성기가 `findTraineeRoster_Item`을 안 만든다.** 목록 봉투 판정이
 * *"배열 프로퍼티가 정확히 하나"* 인데(`scripts/api-gen.mjs`), 이 응답은 `content`와
 * **`rounds` 둘**이 배열이라 규칙에서 빠진다. 생성물을 손으로 고치지 않고 여기서 파생한다.
 *
 * 세 화면(명단·반 배정·비활성 처리)이 같은 줄을 쓰므로 **이름은 한 곳에만 있어야 한다** —
 * 각자 파생하면 같은 개념을 가리키는 경로가 셋이 된다(이 파일이 존재하는 이유).
 */
export type TraineeRosterEntry = NonNullable<findTraineeRoster_Response['content']>[number]

/**
 * 기수 상태 — `PLANNED`·`RUNNING`·`CLOSED`.
 *
 * ⚠ 목일 때는 둘이었다(진행·종료). 개강 전 기수를 진행 중으로 그리면 **아직 시작 안 한
 * 기수에 사람을 넣어도 되는지**가 화면에서 안 갈린다 — 반 편성을 고칠 수 있는 구간이
 * 바로 거기다.
 */
export type CohortStatus = findCohorts_Item['status']

/**
 * 계정 상태 — `INVITED`·`ACTIVE`·`INACTIVE`.
 *
 * 교육생과 매니저가 **같은 값을 쓰고 라벨만 갈린다**(labels.ts) — 교육생의 `INACTIVE`는
 * 중도 이탈이고 매니저의 것은 운영자가 막은 것이라 `비활성`과 `정지`로 나뉜다.
 * 9차에서 `LOCKED`가 제거됐다 — DB CHECK가 애초에 세 값만 허용해 도달할 수 없었다.
 */
export type AccountStatus = findManagers_Item['status']

/**
 * 교안 분석 상태 — `PENDING`·`RUNNING`·`SUCCEEDED`·`FAILED`.
 *
 * ⚠ **한 번도 분석하지 않은 교안은 이 값이 `null`이다.** 그건 상태가 아니라 상태 없음이라
 * 화면이 따로 그린다(`분석 전`) — 그래서 `NonNullable`로 벗겨 낸다.
 */
export type CurriculumStatus = NonNullable<findOrganizationCurricula_Item['analysisStatus']>

// ── CSV 판정 ── **서버 계약이 아니다** ─────────────────────────
/*
  명단을 보내기 전에 화면이 그 자리에서 거른다(`rules.ts`). 형식·기관 도메인·파일 안
  중복은 서버를 안 거쳐도 알 수 있고, 등록을 누른 뒤에 알려주면 수백 명짜리 파일을
  다시 만들게 된다.

  *이미 등록된 이메일*은 여기 없다 — 명단 전량을 받아야 셀 수 있어 서버가 판정하고
  (드라이런 · 9차 Q3-③) 그 결과는 `Failure.status`로 온다.
*/

/** 명단 한 줄 — CSV 한 행이자 직접 입력 한 행 */
export type RosterEntry = {
  name: string
  email: string
}

export type RosterIssue = {
  /** 1부터. CSV 편집기의 행 번호와 같아야 한다 */
  line: number
  reason: RosterIssueReason
}

export type RosterIssueReason =
  | 'INVALID_FORMAT'
  | 'DOMAIN_NOT_ALLOWED'
  | 'DUPLICATE_IN_FILE'
  /** 이름 칸이 비었다 — **서버가 파일 전체를 거절한다**(`TRAINEE_NAME_INVALID`) */
  | 'NAME_REQUIRED'
  /** 머리글이 `이름,이메일`이 아니다 — **서버가 파일 전체를 거절한다** */
  | 'HEADER_NOT_FOUND'
  /** UTF-8이 아니다(엑셀 기본 CP949) — 서버가 인코딩으로 거절한다 */
  | 'ENCODING_NOT_UTF8'
