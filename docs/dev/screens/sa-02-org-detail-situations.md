# SA-02 기관 상세 — 상황 전수

> `docs/dev/screenhardening.md` 1단계 결과물. 대상 파일: `OrgDetailScreen.tsx` ·
> `components/detail/{OverviewTab,OperatorsTab,UsageTab,SettingsTab,OperatorInviteDialog,
> SettingEditDialog,DeleteOrgDialog}.tsx` · `labels.ts`.
> 연동은 완료 상태(`docs/dev/api/integration-status.md` 기준 슈퍼어드민 3/3). 여기서는 값이
> **오기 전 · 안 올 때 · 이상하게 올 때** 화면이 무엇을 하는지만 본다 — 코드만 읽고
> 브라우저는 아직 안 켰다(2단계 몫).

---

## 조회 흐름

```
OrgDetailScreen: useFindOrganization({path:{organizationId}})   GET /organizations/{id}
  — 헤더 전용, 탭 진입 전에 1건. 이 응답 하나로 헤더 배지 + 탭에 org를 내려준다.

탭은 defaultValue="overview"라 개요가 진입 즉시 열리고, 나머지는 탭을 눌러야 조회가 나간다
(각 탭이 자기 것을 직접 조회 — 화면이 4탭 데이터를 미리 다 안 받는다, mock-first-screens.md §6-1):

  개요:   useFindOrganizationCohorts({path})      GET /organizations/{id}/cohorts
          useFindUsage({path})                    GET /organizations/{id}/usage        ─┐ 서로 독립 병렬
  오퍼레이터: useFindOperators({path})              GET /organizations/{id}/operators
  사용량:  useFindUsage({path, query:{period}})     GET /organizations/{id}/usage        ─┘ 개요와 "같은 API"

  설정:   useFindOrganizationOperationSettings({path})  GET .../operation-settings

모달 · 액션(각자 열렸거나 눌렸을 때만):
  OperatorInviteDialog   useInviteOperator()                 제출 시 1회
  오퍼레이터 행 액션      useUpdateOperatorStatus / useResendOperatorInvitation / useCancelInvitation
  SettingEditDialog(5종: 상태·한도·데이터정책·기능허용·등급)  useUpdateOrganizationOperationSettings()  PATCH 부분수정
  DeleteOrgDialog        useDeleteOrganization()             확정 시 1회
  설정 탭 상단 "복구"     useRestoreOrganization()            클릭 시 1회
```

**⚠ 코드 주석과 실제가 어긋나는 지점을 하나 찾았다.** `OverviewTab.tsx` 44~46행은 "저장량은
사용량 탭과 같은 API라 탭을 오가도 캐시가 재사용된다(같은 쿼리 키)"라고 적어 뒀지만,
`usageKeys.ts`의 실제 키 빌더(`params.query ?? null`)를 보면 **다르다** — 개요 탭은 `query`
자체를 안 넘겨 키가 `null`로 끝나고, 사용량 탭은 첫 렌더부터 `query:{period:'2026-08'}`를
넘겨 키가 `{period:'2026-08'}`로 끝난다. 같은 달을 가리켜도 **다른 캐시 키**라 탭을 오가면
중복 조회가 난다 — 화면 진입당 조회 수 원칙(§6-1) 위반 후보. 자리는 축 C·G에 나눠 적는다.

---

## 축

### 축 A. 헤더(`useFindOrganization`) 조회 상태

| | |
|---|---|
| A1 | pending — 제목 자리 `Skeleton h-7 w-48` + 본문 `Skeleton h-64` |
| A2 | isError — "기관을 찾을 수 없습니다 / 삭제되었거나 잘못된 주소일 수 있습니다" 카드 |
| A3 | success |

**A2에 재시도 수단이 없다.** SA-01 목록·SA-02의 다른 모든 탭(개요 기수·오퍼레이터·사용량·
설정)은 `isError`일 때 전부 "다시 시도" 버튼이 있는데, **헤더만 없다.** 코드 주석은 "슈퍼어드민이
목록에서 눌러 들어오는 화면이라 없는 기관은 삭제됐거나 주소를 직접 고친 경우뿐"이라고
정당화하지만, 그 판정은 **404만 가정한 것**이고 실제로는 순수 네트워크 일시 장애·5xx도 같은
분기를 탄다(`isError`는 원인을 안 가른다). 그 경우 사용자가 할 수 있는 건 브라우저 새로고침뿐
— 코드로 구조적으로 확정, 2단계에서 실제로 5xx를 흘려 카드가 뜨는지 렌더 확인 필요.

### 축 B. 개요 탭 — 기수 목록(`useFindOrganizationCohorts`) 조회 상태

| | |
|---|---|
| B1 | pending — `Skeleton h-32` |
| B2 | isError — `Empty` + "다시 시도" |
| B3 | success, `rows.length === 0` — 점선 박스 "아직 개설된 기수가 없습니다" |
| B4 | success, `rows.length > 0` — 표 |

### 축 C. 개요 탭 — 저장량 지표 카드(`useFindUsage`, 기간 없이 호출) 조회 상태

| | |
|---|---|
| C1 | pending — 값 자리에 `'—'`. **스켈레톤이 아니다** — 옆의 "기수" 카드(B축)는 `Skeleton`이 없고 텍스트 `'—'`로 대신하는데, 이 카드도 같은 방식이라 "로딩 중"과 "실제로 0/모름"이 시각적으로 구분 안 됨 |
| C2 | **isError — 코드로 확정된 결함.** `value={usage.isPending ? '—' : formatBytes(usage.data?.storage.totalBytes ?? 0)}`가 `isPending`만 가르고 `isError`는 안 본다. 실패하면 `usage.data`가 `undefined`라 `formatBytes(0)` = **"0 B"가 실제 값처럼 뜬다.** 정의서 SA-02 §6 "집계 실패를 0으로 보여주지 않는다"·"안 쓴 것과 못 읽은 것은 다르다"를 정면으로 어긴다(SA-02 자신의 사용량 탭 C축은 이 원칙을 지키는데 개요 탭 카드만 새어 나감) |
| C3 | success |

### 축 D. 오퍼레이터 탭(`useFindOperators`) 조회 상태

| | |
|---|---|
| D1 | pending — 상단 "N명" 줄은 `data ? ... : ' '`(빈 문자열)로 자리만 유지, 표는 `Skeleton h-40` |
| D2 | isError — 화면 전체가 `Empty` + "다시 시도"로 바뀐다. **"오퍼레이터 초대" 버튼도 이 순간 같이 사라진다**(SA-01 목록의 isError와 같은 패턴 — 버그는 아니고 기존 관례와 일치, 기록만) |
| D3 | success, `operators.length === 0` — 점선 안내 "첫 오퍼레이터를 초대해 이 기관을 시작하세요" |
| D4 | success, `operators.length > 0` |

### 축 E. 오퍼레이터 행 파생 상태

| | |
|---|---|
| E1 | `ACTIVE`, `suspendable: true` — 정지 가능 |
| E2 | `ACTIVE`, `suspendable: false` — 정지 버튼 비활성 + `title`로 사유("마지막 활성 오퍼레이터") |
| E3 | `INACTIVE` — 행 `opacity-60`, "재활성" 링크 |
| E4 | `PENDING`, `invitationDeliveryFailed: false` — "초대됨" 배지, `pendingInvitationTokenId` 있으면 재발송·취소 링크 |
| E5 | `PENDING`, `invitationDeliveryFailed: true` — "메일 발송 실패" 배지 + 행 `bg-warning-soft` + 상단 공용 `Alert`(`hasMailFailure`) |
| E6 | 스펙에 없는 `status` 값 — `default` 분기, 원문 그대로 배지(빈칸으로 안 감춤, SA-01 기수 상태와 같은 원칙) |
| **E7** | **정지 버튼을 눌렀는데 서버가 `LAST_OPERATOR`로 거절** — 목록을 받은 뒤 다른 세션이 먼저 마지막 활성 오퍼레이터를 정지시킨 경합. `run()`이 코드를 문장으로 바꿔 보여주는 처리는 있으나 실제로 두 세션으로 경합을 만들어 렌더 확인한 적 없음(SA-01 라운드1의 "정지 버튼은 잠그되 서버가 최종 거절할 수 있다" 설계와 같은 성격) |

### 축 F. 오퍼레이터 초대 모달(`OperatorInviteDialog`) 플로우

| | |
|---|---|
| F1 | 열기 직후 — idle |
| F2 | 이메일 형식 오류 — blur 또는 제출 시 `FieldError` |
| F3 | 제출 성공 — 모달 닫힘, 오퍼레이터 목록 무효화·재조회 |
| F4 | 제출 실패 `ALREADY_INVITED` |
| F5 | 제출 실패 `NOT_FOUND`("활성 기관이 아님") — 초대 창을 연 사이 다른 세션이 그 기관을 정지·삭제한 경합 상황. 실제로 만들어 본 적 없음 |
| F6 | 제출 실패 `INVITE_MAIL_FAILED`(502) — **에러인데 모달은 닫힌다**(초대 자체는 됐다는 스펙 판단). 그 직후 오퍼레이터 목록이 재조회돼 그 행에 "메일 발송 실패" 배지가 뜨는지가 크로스 컴포넌트(모달 → 탭 리스트) 확인 지점 — 코드는 앞뒤가 맞지만 실제 502를 흘려서 봐야 함 |
| F7 | 제출 실패 — 스펙에 없는 코드 → 폴백 문구 |
| F8 | **모달을 두 번째 열 때 `autoFocus`가 실제로 다시 걸리는지.** 주석에 "다이얼로그는 닫아도 언마운트되지 않는다"고 명시돼 있다 — `Input`의 `autoFocus`는 React에서 보통 마운트 시 1회 동작인데, 이 다이얼로그가 정말 언마운트 안 된다면 두 번째 열림부터 자동 포커스가 안 걸릴 수 있다. Base UI `Dialog`가 내부적으로 포커스를 다시 잡아 주는지까지 포함해 2단계 렌더 확인 필요 |

### 축 G. 사용량 탭(`UsageTab`, 기간 선택 포함) 조회 상태

| | |
|---|---|
| G1 | pending — `Skeleton` 3덩이(2열 그리드 + 표 자리) |
| G2 | isError — `Empty`(아이콘 포함) + "다시 불러오기"(이 탭은 개요 탭 C축과 달리 원칙을 제대로 지킨다) |
| G3 | success, `aiCost.costComplete: false` — 경고 `Alert`("일부 호출의 단가가 설정되지 않았습니다") |
| G4 | success, `aiCost.costComplete: true` |
| G5 | success, `aiCost.models.length === 0` — "사용 내역이 없습니다" |
| G6 | success, `storage` 네 항목 전부 0 — "저장된 데이터가 없습니다"(breakdown 필터링) |
| **G7** | **기간 선택(이번 달 → 지난 달 → N개월 전) 변경 — 화면 전체가 다시 `isPending` 스켈레톤으로 리셋된다.** `placeholderData`(이전 값 유지) 없이 쿼리 키가 바뀌므로, 방금 보고 있던 표가 사라지고 스켈레톤이 다시 깜빡인 뒤 새 기간 데이터로 바뀐다 — SA-01의 CLS(레이아웃 시프트) 이슈와 같은 성격, 2단계에서 실측 |
| G8 | (조회 흐름 절 참고) 개요 탭에서 이 화면으로 넘어와도 **캐시가 재사용 안 되고 새로 조회 나간다**(쿼리 키가 다름 — 코드로 확정, 위 "조회 흐름" 절 참고). 반대 방향(사용량 → 개요)도 마찬가지 |

### 축 H. 설정 탭(`useFindOrganizationOperationSettings`) 조회 상태

| | |
|---|---|
| H1 | pending — `Skeleton h-96` |
| H2 | isError — `Empty` + "다시 시도" |
| H3 | success |

### 축 I. 설정 항목 수정 모달(`SettingEditDialog`, 5종 공용 — 상태·한도·데이터정책·기능허용·등급) 플로우

| | |
|---|---|
| I1 | 열기 — `initial`로 draft 초기화(서버 값에서 시작) |
| I2 | 변경 없음 — 저장 버튼 비활성(`changed === false`) |
| I3 | 변경 있음 — 저장 버튼 활성 |
| I4 | 저장 성공 — 모달 닫힘, 설정 쿼리 무효화·재조회 |
| I5 | 저장 실패 — `Alert`("저장하지 못했습니다"), 모달 유지, draft 보존 |
| **I6** | **저장 요청이 진행 중(`update.isPending`)인 동안 "취소" 버튼을 누르면?** 저장 버튼만 `disabled={!changed \|\| update.isPending}`이고 **취소 버튼엔 그런 잠금이 없다.** 사용자가 취소로 닫으면 화면상 "취소된 것"처럼 보이지만, 다이얼로그가 언마운트되지 않으므로 백그라운드에서 요청은 계속 진행되고 나중에 조용히 성공(설정이 실제로 바뀜)하거나 실패(사용자는 이미 창을 닫아 에러 Alert를 볼 수 없음)할 수 있다 — 실사용 시나리오로 재현해 봐야 하는 지점 |
| I7 | `한도` 모달 — 예산·토큰·저장량 중 일부만 바꿨을 때 `toPatch`가 바뀐 필드만 담는지, 실제 요청 바디를 네트워크 탭에서 대조(문서상 PATCH 부분수정·`null`=무제한/키 생략=유지 규칙이 맞게 구현됐는지 2단계에서 확인) |

### 축 J. 기관 삭제 · 복구 플로우

| | |
|---|---|
| J1 | `DeleteOrgDialog` 열기 — 기관명 미입력 시 삭제 버튼 비활성 |
| J2 | 기관명 정확히 입력 — 버튼 활성 |
| J3 | 삭제 확정 성공 — 다이얼로그 닫힘, 헤더·설정 재조회로 `org.status`가 `DELETION_PENDING`으로 바뀌고 설정 탭 상단에 삭제대기 `Alert` + "기관 삭제" 버튼 비활성화(`org.status === 'DELETION_PENDING' \|\| 'DELETED'`) |
| J4 | 삭제 확정 실패(다이얼로그 연 사이 다른 세션이 기관명을 바꾼 경합) — "삭제하지 못했습니다. 기관명이 바뀌었을 수 있습니다.", 다이얼로그 유지 |
| **J5** | **`복구`(useRestoreOrganization) 버튼 — 실패를 아예 안 잡는다.** `onClick={() => void restore.mutateAsync({...})}`로 끝이라 `try/catch`도 에러 상태 표시도 없다. 삭제·설정저장·오퍼레이터 액션·초대는 전부 실패 시 `Alert`로 알리는데 이 액션만 빠져 있다 — 실패하면 사용자는 버튼이 안 눌린 것처럼 느낀다. 코드로 확정된 결함 |
| J6 | `DELETION_PENDING` 동안 다른 탭(예: 오퍼레이터 초대)의 액션이 여전히 눌리는지 — 화면상 막는 코드가 없어 보이는데, 삭제 대기 중인 기관에 초대를 허용하는 게 정책상 맞는지는 정의서에 명시가 없다. 2단계에서 정책 확인 필요(백엔드가 막는지 프론트가 막아야 하는지) |

### 축 K. 상태 표시 일관성 — 헤더 배지 vs 탭별 표시

| | |
|---|---|
| K1 | 헤더 배지(`orgStatusBadge(org)`)와 개요 탭 "상태" `InfoRow`는 같은 함수를 써서 일관됨(코드 확인) |
| **K2** | **설정 탭 "기관 상태" 행은 다른 값을 쓴다.** `s.organizationStatus`(운영 설정 API의 값, `ACTIVE`/`SUSPENDED` 2값만 표시)를 쓰는데, 이건 헤더가 쓰는 `org.status`(`ACTIVE`/`SUSPENDED`/`DELETION_PENDING`/`DELETED` 4값)와 **다른 필드·다른 값 체계**다. `org.status === 'DELETION_PENDING'`일 때 `s.organizationStatus`가 무엇을 주는지 스펙에 명시가 없다 — 만약 `ACTIVE`를 그대로 준다면 헤더는 "삭제 대기"인데 설정 탭 안의 "기관 상태" 행은 "활성 [변경]"으로 보여 **같은 화면 안에서 서로 다른 말을 하는 상태**가 된다. SA-01의 G8(배지·행 배경 불일치)과 같은 성격의 리스크, 실제 삭제 대기 기관으로 렌더 확인 필요 |

---

## 조합 수

탭은 한 번에 하나만 보이므로 탭 간 상태를 곱하지 않는다. 축별로 세면 A(3) + B(4) + C(3) +
D(4) + E(7, 행 단위) + F(8, 모달 진입 시만) + G(8) + H(3) + I(7, 모달 진입 시만) + J(6) + K(2)
— **개별 상황 약 55개.** SA-01(약 600대, 목록형 화면이라 필터·정렬·페이지 조합이 큼)보다
조합 폭발은 작지만 **탭 4개 × 모달 7개(초대 1 + 설정수정 5 + 삭제 1)로 진입점이 훨씬 많다.**
전부 못 본다 — 2단계에서 실제로 갈리는 지점(위에 **굵게** 표시한 C2·E7·F6·F8·G7·G8·I6·J5·K2,
코드로 이미 결함이 확정된 건 C2·J5·G8 셋)부터 추린다.

---

## 공통 축 — 6갈래

| | SA-02에서 물을 것 |
|---|---|
| 네트워크·인프라 | 헤더 조회 실패 시 재시도 수단이 진짜 없는지(A2) · 탭 하나만 느릴 때 다른 탭 전환이 막히지 않는지 · 사용량 탭 기간 변경 중 이전 요청이 늦게 도착하는 레이스(G7과 조합) |
| 인증·세션 | `RequireRole`은 SA-01에서 코드로 이미 확인됨(공유 컴포넌트, 재확인 불필요) · 존재하지 않는 `organizationId`로 직접 URL 진입 시 A2와 동일 경로를 타는지 |
| 시간·타이밍 | `purgeDateOf`(`labels.ts`)가 `parseISO`+`addDays`+`format`로 클라이언트에서 계산 — 서버가 UTC로 `deletedAt`을 주면 자정 근처 파기 예정일이 하루 밀릴 수 있음(SA-01 `formatDate`와 같은 계열) · 사용량 탭의 "이번 달/지난 달" 옵션이 `new Date()`(로컬 시각) 기준이라 서버의 UTC 월 경계와 자정 근처에 어긋날 수 있음 |
| 사용자 조작 | 탭을 빠르게 연타 전환할 때 진행 중이던 요청이 취소되는지, 늦게 도착해 엉뚱한 탭에 반영되는지(Base UI `Tabs`가 비활성 탭 콘텐츠를 언마운트하는지 확인 필요) · SA-01 목록 → 상세 → 뒤로가기 → 다시 상세 진입 시 탭이 매번 "개요"로 리셋되는지(의도로 보이나 확인) · 설정 모달 저장 중 취소(I6) · 200% 확대 시 4탭·설정 항목 줄 레이아웃 |
| 표현·성능 | 개요 탭 저장량 카드가 로딩 중 스켈레톤 없이 `'—'`만 쓰는 것(C1)이 실제로 어색해 보이는지 · G7의 기간 전환 시 전체 리셋이 실측 CLS로 얼마나 되는지 · 설정 탭 `Skeleton h-96`이 실제 6개 행 높이와 맞는지 · 헤더의 긴 기관명 줄바꿈/말줄임 처리 없음 |
| 접근성 | 오퍼레이터 탭의 정지·재활성·재발송·취소가 전부 순수 `<button>` 텍스트 링크 — 포커스 링·disabled 시 `title`이 스크린리더에 전달되는지 · 설정 탭 `SettingRow`가 목록 마크업 없이 `div` 나열이라 스크린 리더가 항목 개수를 인지하는지 · Dialog들의 초점 이동은 Base UI 공용 컴포넌트라 SA-01에서 사실상 검증된 것으로 보고 우선순위 낮게 둠 |

---

## 1단계 완료 — 다음(2단계 이후, 실측·수정·렌더 확인)이 볼 것

**코드만 읽고 구조적으로 확정된 결함 후보 3건**(SA-01의 `isPlatformEmpty`·B3처럼 렌더 없이도
코드로 판정 가능):

1. **C2 — 개요 탭 저장량 카드, 사용량 조회 실패 시 "0 B"로 표시.** SA-02 §6 원칙 위반.
2. **G8 — 개요 탭과 사용량 탭의 `useFindUsage` 쿼리 키가 달라 탭을 오가면 중복 조회.** 코드
   주석("같은 쿼리 키")이 실제 키 빌더와 어긋남.
3. **J5 — "복구" 버튼이 실패를 전혀 처리하지 않는다.** 다른 모든 mutation과 다른 패턴.

**렌더로만 확인 가능한 지점**(코드는 있으나 실제로 만들어 봐야 아는 것): A2(재시도 없는
헤더 실패), E7·F5(경합), F6(모달 닫힘 후 크로스 컴포넌트 반영), F8(재오픈 시 autoFocus),
G7(기간 전환 CLS), I6(저장 중 취소), K2(설정 탭 "기관 상태" 행과 헤더 배지 불일치 여부) —
전부 위 표에 **굵게** 표시해 뒀다.

---

## (정정) 기관 삭제 즉시파기 의심 — 해프닝, 상태 라벨 문제였음

아래 "긴급" 절은 2단계 렌더 확인 중 실제로 작성됐던 기록이지만, **팀장 확인 결과
즉시 파기 버그가 아니었다.** `org.status`가 `DELETED`를 돌려준 건 맞지만, 이 백엔드에서
그 값은 실제로 "삭제 대기(복구 가능)"를 가리키는 상태였다 — 라벨이 애매했을 뿐이다.
백엔드가 이 상태의 표시를 "삭제됨" → "삭제 대기"로 바꿀 예정. 상세 판단은
`docs/dev/decision-log.md` D30. 원래 기록은 아래 그대로 남긴다(취소선 없이 — 당시엔
실제로 이렇게 관찰됐고, 그 판단 과정 자체가 기록할 값어치가 있다).

> K2를 확인하려고 신규/빈 테스트 기관 "파이널랩"(0교육생·0기수, `dataRetentionDays:
> 180`)을 표준 삭제 확인 모달로 소프트 삭제했는데 "삭제 대기 중입니다" 배너·복구
> 버튼을 한 번도 못 보고 매번 곧바로 `DELETED`(삭제됨)만 떠서, 즉시 파기 버그로
> 의심하고 백엔드 확인을 요청했다. 확인 결과 파이널랩도 실제로는 삭제된 게 아니라
> 복구 가능한 상태였다 — 다만 이 문서가 마지막으로 확인한 시점 기준으로는 여전히
> 프론트에서 복구 액션을 걸지 않은 상태로 남아 있었다(복구 자체는 이 라운드 범위 밖).

**진짜 K2는 팀장이 실제 삭제 대기 기관 "(주)코딩몬스터 주식회사"로 재현해 찾아냈다** —
아래 2단계 표 K2 행 참고.

---

## 2단계 — 렌더 확인 결과(이슈 #195, 코드 확정 3건 수정 완료 후)

Playwright(`page.route()` 가로채기, dev quick-login 슈퍼어드민, SPA `pushState`/
`popstate` 클라이언트 라우팅 — `page.goto()` 풀 리로드는 메모리 전용 access token이
날아가는 레이스가 있어 피했다)로 실측. 판단 근거·수정 diff는 `docs/dev/decision-log.md`
D29(A2·F6·G7·I6)·D30(K2)·D31(K2 후속 — 라벨 통합)·D32(J6·I7)에 있다.

| | 결과 |
|---|---|
| **A2** | **버그, 수정.** 헤더 GET에 500을 흘리면 "기관을 찾을 수 없습니다" 카드가 뜨고 재시도 버튼이 정말 없었다(재시도 버튼 개수=0 실측). `OrgDetailScreen.tsx`가 `useFindOrganization`의 `refetch`를 받아 카드에 "다시 시도" 버튼 추가 → 재검증 시 버튼 1개 노출 확인. |
| **E7** | **정상 확인.** 정지 가능한(활성·`suspendable`) 오퍼레이터 행에서 정지를 눌렀을 때 서버가 `LAST_OPERATOR`(409)로 거절하도록 흘리면, "이 기관의 마지막 오퍼레이터라 정지할 수 없습니다. 새 오퍼레이터를 먼저 초대하세요." 문장이 정확히 뜬다. 수정 없음. |
| **F5** | **정상 확인.** 초대 제출에 `NOT_FOUND`(404)를 흘리면 모달이 안 닫히고 "활성 상태인 기관이 아닙니다. 목록에서 다시 들어와 주세요." 문구가 뜬다. 수정 없음. |
| **F6** | **버그, 수정.** 초대 제출에 `INVITE_MAIL_FAILED`(502)를 흘리면 모달은 닫히지만(의도대로), `useInviteOperator`가 `onSuccess`에서만 무효화하는 구조라 이 실패 경로는 오퍼레이터 목록을 재조회하지 않았다(재조회 발생=false 실측) — 방금 생긴 "메일 발송 실패" 행이 다른 계기 전까진 안 보인다. `OperatorInviteDialog.tsx`의 해당 catch 분기에 `queryClient.invalidateQueries` 추가 → 재검증 시 재조회 발생=true 확인. |
| **F8** | **정상 확인.** 모달을 닫았다 다시 열어도 이메일 입력에 `autoFocus`가 다시 걸린다(Base UI Dialog가 재포커스 처리). 수정 없음. |
| **G7** | **버그, 수정.** 기간 선택을 바꾸면 `placeholderData` 없이 쿼리 키가 바뀌어 화면 전체가 스켈레톤으로 리셋됐다(전환 중 스켈레톤 요소 3개 실측). `UsageTab.tsx`에 `placeholderData: keepPreviousData` 추가 + `isFetching` 동안 `opacity-60` → 재검증 시 전환 중 스켈레톤 요소 0개, 콘텐츠 높이 변화 없음(666px 그대로). |
| **I6** | **버그, 수정.** `SettingEditDialog.tsx`의 "취소" 버튼이 저장 진행 중에도 안 잠겨 있어, 취소로 닫아도 백그라운드 요청이 계속 돌 수 있었다. "저장"과 같은 `disabled={update.isPending}`을 "취소"에도 추가 → 재검증 시 저장 중 취소 disabled=true, 저장 완료 후 모달 자동 닫힘 확인. |
| **K2** | **버그, 수정 완료.** 실제 삭제 대기 기관("(주)코딩몬스터 주식회사")으로 재현: `SettingsTab.tsx`의 5개 "변경" 버튼이 삭제 대기 중에도 안 잠겨 있어, 모달을 열고 저장까지 진행해야 서버가 거부해 범용 에러("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.")만 떴다 — 모달 초기값이 쓰는 `s.organizationStatus`(운영 설정 API, ACTIVE/SUSPENDED 2값)가 삭제 대기 여부를 모르는 게 원인, 헤더 배지가 쓰는 `org.status`(4값)와 다른 필드. `settingsLocked = org.status === 'DELETION_PENDING' \|\| org.status === 'DELETED'` 하나로 5개 버튼 + "기관 삭제" 버튼 전부 잠그고 `title`로 이유 표시. 재검증: 삭제 대기 기관에서 변경 버튼 5개 전부 disabled+title 노출, 정상(ACTIVE) 기관 "리부트 아카데미"에서 5개 버튼 전부 정상 동작(회귀 없음) 확인. 판단 근거는 `docs/dev/decision-log.md` D30. |
| **J6** | **버그, 수정 완료(정책 지시 반영).** `OperatorsTab.tsx`가 K2와 같은 구멍을 갖고 있었다 — 삭제 대기 중에도 오퍼레이터 초대·정지·재활성·재발송·취소가 전부 그대로 눌렸다(잠금 자체가 없었음). 사용자 정책 지시: 삭제 대기 중엔 읽기(탭 전환·재조회)와 복구만 허용. `labels.ts`에 `isDeletionLocked(status)`를 뽑아 `SettingsTab`의 `settingsLocked`와 공유하고, `OperatorsTab`의 초대 버튼 + 행 액션 4종에 `disabled={locked \|\| 기존조건}` + 통일 문구 title을 추가(기존 개별 사유는 `locked`일 때 이 문구로 덮임). 렌더 확인(`page.route()`로 `status: DELETION_PENDING` + 정지가능/정지됨/초대중 오퍼레이터 3종 합성 — 실 DB 변경 없음): 초대 버튼·행 액션 4개 전부 disabled+통일 title 확인, 그 상태에서도 탭 전환은 정상(읽기 안 막힘) 확인. 정상 기관 회귀 없음(초대 enabled, 정지 버튼은 원래 사유 그대로 노출). 판단 근거는 `docs/dev/decision-log.md` D32. |
| **I7** | **정상 확인, 버그 아님.** 한도 모달에서 토큰 한도만 "무제한"으로 바꾸고 예산·저장량은 안 건드린 뒤 실제 PATCH 바디를 가로채 확인: `{"monthlyTokenLimit":null}` — 안 바꾼 필드는 키 자체가 없고(부분수정 유지), "무제한"은 명시적 `null`로 온다(스펙 규칙과 일치). 코드 변경 없음. 판단 근거는 `docs/dev/decision-log.md` D32. |

---

## 2단계 완료 — 이슈 #195 축 A~K 전 범위 종료

(정정: 이전 판에서 이 절이 "전 범위 종료"라고 썼지만 실제로는 J6·I7이 빠져 있었다.
이번 판으로 진짜 전 범위가 끝났다.)

코드 확정 결함 3건(C2·G8·J5) + 렌더 확인 10곳(A2·E7·F5·F6·F8·G7·I6·K2·J6·I7) 전부 처리.
실제 버그로 확인·수정된 것은 총 9건(C2·G8·J5·A2·F6·G7·I6·K2·J6), 정상 확인 4건
(E7·F5·F8·I7). 커밋·PR은 사용자가 GitHub Desktop/웹에서 직접(CLAUDE.md §4).
