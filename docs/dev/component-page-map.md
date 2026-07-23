# 컴포넌트 ↔ 화면 매핑

`src/components/ui/` 33개가 어느 화면에서 쓰이는지 정리한 표다.
근거는 `docs/plan/screen/wireframe/` 19개 화면의 실제 마크업 + 각 정의서 §8(컴포넌트 매핑).

> 정의서 §8은 `DataTable`·`MetricCard` 같은 **개념 이름**을 쓴다. 이 문서는 그것을
> **실제 shadcn 프리미티브 이름**으로 옮긴 것이다. 개념 컴포넌트 1개가 프리미티브 여러 개로
> 쪼개지는 경우가 많다(예: `DataTable` = `table` + `input` + `select` + `pagination` + `checkbox`).

---

## 1. 무엇부터 손댈지 — 사용 빈도순

19개 화면 중 몇 개에서 쓰이는지. **위 8개가 전체의 대부분을 차지한다.**

| 컴포넌트 | 화면 수 | 비고 |
|---|---:|---|
| `Button` · `Badge` | 19 | 전 화면. **이미 우리 디자인으로 구현됨** |
| `avatar` | 14 | 상단바 사용자 + 사람 표의 정체성 스파인 |
| `Table` | 12 | **이미 구현됨**(디자인 반영 완료) |
| `select` | 10 | 필터·정렬 드롭다운(`▾`) |
| `input` · `field` · `label` | 9 | 검색창 + 모든 폼 |
| `progress` | 9 | 예산 바·분포 바·업로드·점수 |
| `empty` | 8 | 빈 목록 상태 |
| `Card` | 8 | **이미 구현됨** |
| `alert` | 7 | 인라인 경고·안내 배너 |
| `Tabs` · `checkbox` | 6 | **Tabs 구현됨** / checkbox는 벌크 선택(D75)·동의 |
| `Dialog` · `pagination` | 5 | **Dialog 구현됨** |
| `separator` | 5+ | 섹션 구분 |
| `item` · `switch` · `textarea` · `drawer` · `input-group` · `button-group` | 3 | |
| `dropdown-menu` | 3~4 | 행 액션 메뉴 |
| `alert-dialog` · `bubble` | 2 | |
| `attachment` · `resizable` · `marker` | 1 | 특수 화면 전용 |
| `skeleton` · `spinner` · `sonner` | 전역 | 로딩·제출중·토스트 |

---

## 2. 인증 (SC-A01 · A02 · A03) — 3화면 · **구현 완료**

| 화면 | 파일 | 필요 컴포넌트 |
|---|---|---|
| **SC-A01** 로그인 | `shared/login.html` | `field` `label` `input` `input-group`(비밀번호 표시) `Button` `alert` `spinner` **`kbd`**(Caps Lock) |
| **SC-A02** 가입·활성화 | `manager/signup.html`<br>`trainee/activation.html` | 위 + `checkbox`(약관 동의) `field`(읽기전용 이메일) `Badge`(필수/선택) `separator` |
| **SC-A03** 비밀번호 재설정 | `shared/password-reset.html` | `field` `label` `input` `Button` `alert` `spinner` **`kbd`** |

> **`kbd` = Caps Lock 경고.** 비밀번호는 값이 가려져 있어서 Caps Lock이 켜진 채 입력해도
> 화면만 봐서는 원인을 알 수 없다. 실패 후 "비밀번호를 확인해주세요"를 띄우는 것보다
> 입력 중에 알려주는 편이 낫다. `PasswordField`에 구현되어 있고, 세 화면이 그 컴포넌트를
> 공유하므로 자동으로 적용된다.

> ⚠️ 이 3화면은 이미 `src/features/auth/components/`에 **자체 컴포넌트로 구현되어 있다**
> (`TextField`·`PasswordField`·`InlineAlert`·`ConsentGroup`·`PrimaryButton`·`ReadonlyField`).
> 새로 받은 `field`/`input`/`label`/`checkbox`/`alert`로 **교체할지는 별도 판단**이다 —
> 지금 동작하는 것을 굳이 바꿀 이유는 없고, 다음 폼 화면(SC-M02 모달 등)부터 shadcn을 쓰고
> 중복이 실제로 아플 때 합치는 편이 안전하다.

---

## 3. 매니저 (10화면)

| 화면 | 파일 | 필요 컴포넌트 |
|---|---|---|
| **SC-M01** 대시보드 | `manager/dashboard.html` | `Card` `Badge` `Button` `select` `progress` `item`(확정 대기 큐) `separator` `avatar` `dropdown-menu`(기수 선택기) |
| **SC-M02** 운영 관리(총괄) | `lead-only/program-admin.html` | `Tabs` `Table` `Dialog`(모달 다수) `alert-dialog` `select` `input` `checkbox`(벌크) `pagination` `Badge` `switch` `avatar` `empty` `field` `label` `sonner` |
| **SC-M02b** 명단·반 배정 | `lead-only/roster-assign.html` | `Table` `checkbox`(벌크) `avatar` `select` `pagination` `Badge` `Button` `sonner` `empty` |
| **SC-M04** 분석·진단 🟡 | `manager/analysis.html` | `Tabs` `Table` **`drawer`**(드릴인 패널) `Badge` `select` `progress`(분포 바) `avatar` `checkbox` **`marker`**(개입 마커) `separator` `empty` |
| **SC-M06** 교육생 상세 | `manager/trainee-detail.html` | `Tabs` **`bubble`**(대화 전문) `Badge` `Card` `drawer`(근거 패널) `avatar` `textarea`(메모) `separator` `progress` |
| **SC-M07** 개입 관리 🟡 | `manager/intervention.html` | `Table` **`drawer`**(사이드 패널) `Badge` `select` `textarea` `pagination` `Button` `alert` `field` `label` |
| **SC-M08** 리포트 🟡 | `manager/report.html` | `Tabs` `Table` `Badge` `progress` `separator` `Button` `select` `Card` `button-group`(버전 토글) |
| **SC-M10** 온보딩 튜토리얼 | `manager/onboarding.html` | `Dialog`(코치마크 오버레이) `progress`(스텝) `Button` `Badge` |
| **SC-M11** 교육생 리스트 | `manager/trainee-list.html` | `Table` `avatar` `input`(검색) `input-group` `select`(필터) `pagination` `Badge` `checkbox`(벌크) `Button` `empty` |
| **SC-M12** 교안 관리 | `manager/curriculum.html` | `Table` `Dialog` `Badge` `select` `switch` `textarea` `avatar` `input` `field` `label` |
| **SC-M13** 프로젝트 워크스페이스 | `manager/project-workspace.html` | `Tabs` `Table` `Dialog` `Badge` `input` `select` `avatar` `checkbox` `item`(팀 카드) `button-group`(타입 토글) `separator` `empty` |

🟡 = 임시 화면(분석·진단 / 개입 / 리포트). 나중에 전면 재작성 예정이므로
**이 3개 화면의 빈도를 근거로 공용 컴포넌트를 만들지 않는다.**

> ⚠️ **`Popover`가 없다.** SC-M10 코치마크와 SC-M04 셀 근거 팝업이 원래 팝오버 형태다.
> `Dialog`로 대체하거나 `npx shadcn add popover`로 추가해야 한다.

---

## 4. 교육생 + 슈퍼어드민 (5화면)

| 화면 | 파일 | 필요 컴포넌트 |
|---|---|---|
| **SC-T01** 교육생 홈 | `trainee/home.html` | `Card` `Badge` `Button` `avatar` `empty` `separator` `item`(체크포인트 카드) `alert` |
| **SC-T02** 코드 제출 | `trainee/submission.html` | **`attachment`**(ZIP 업로드) `input`(레포 URL) `Badge` `Table` `progress`(업로드) `Button` `alert` `field` `label` `spinner` |
| **SC-T04** 검증 세션 | `trainee/session.html` | **`resizable`**(코드 \| 대화 분할) **`bubble`**(대화) `input-group`(메시지 입력) `Badge` `progress` `Button` `spinner` `sonner` |
| **SC-T05** 결과 리포트 | `trainee/result.html` | `Card` `Badge` `separator` `empty` `avatar` `Button` `progress` |
| **SC-S01** 플랫폼 콘솔 ✅ | `superadmin/console.html` | `Table`✅ `Badge`✅ `Card`✅ `Dialog`✅ `Tabs`✅ `Button`✅ · 아직 안 쓴 것 → `input` `select` `progress` `pagination` `separator` `empty` `avatar` `switch` `alert` `alert-dialog` |

> SC-S01은 지금 검색·필터·페이저·토글을 **네이티브 `<input>`/`<select>`로 직접 그려놨다.**
> shadcn `input`/`select`/`pagination`/`switch`로 바꾸면 그 자리가 정리된다 — 첫 교체 후보다.

---

## 5. 화면 1개에서만 쓰는 것 (나중에)

| 컴포넌트 | 유일한 사용처 | 언제 필요 |
|---|---|---|
| `attachment` | SC-T02 코드 제출 | ZIP 드래그&드롭 업로드 |
| `resizable` | SC-T04 검증 세션 | 코드 패널 ↔ 대화 패널 분할 |
| `marker` | SC-M04 분석 🟡 | 히트맵/타임라인 개입 마커 |
| `bubble` | SC-T04, SC-M06 | 대화 전문 렌더 |

---

## 6. 아직 쓸 자리가 없는 것

| 컴포넌트 | 판단 |
|---|---|
| ~~`kbd`~~ | **자리를 찾았다 → SC-A01·A02·A03.** 아래 참고 |
| `sonner` | 쓸 자리는 있다(운영 관리·명단 배정·세션의 저장 피드백). 다만 **전역 1회 설치**라 화면 매핑 대상이 아님 |
| `skeleton` `spinner` | 로딩 상태용. 정의서 §6에 "스켈레톤"이 명시된 화면(SC-S01 등)부터 |

---

## 7. 이 표를 어떻게 쓰나

1. **화면 하나 맡으면** 위 표에서 그 행만 보고 필요한 것을 import 한다.
2. **표에 없는 컴포넌트가 필요해지면** 임의로 `components/ui`에 넣지 말고
   `features/{도메인}/components/`에 만든다 — 3번 반복된 뒤 공용으로 올린다
   (`docs/dev/components.html` §"필요한 컴포넌트가 없으면").
3. **표와 실제가 어긋나면** 표를 고친다. 이 파일은 생성물이 아니라 손으로 관리한다.
