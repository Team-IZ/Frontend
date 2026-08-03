# Dev Docs 목차

`grip docs/dev`로 이 파일을 열고, 아래 링크를 클릭해서 폴더 안 문서를 바로 확인한다.

## 아키텍처 · 결정 기록

- [**API 없이 화면 만들기**](mock-first-screens.md) — **화면 하나를 시작할 때 이것부터 본다.** 착수 점검 → 목업 값 옮기기 → 목/경계 구조 → 완료 판정
- [프론트엔드 구조 설계](frontend-architecture.md) — 두 명이 영역을 나눠 병렬 개발하기 위한 폴더·레이어 규칙
- [API 경계](api-boundary.md) — 무엇이 서버에서 오고 무엇이 화면 것인가 · 백엔드와 합의할 목록
- [개발 결정 기록](decision-log.md) — 개발 과정의 결정과 근거("왜 이렇게 했는가")

## 컴포넌트 · 입력 인벤토리

- [컴포넌트 ↔ 화면 매핑](component-page-map.md) — `src/components/ui/` 33개가 어느 화면에서 쓰이는지
- [입력(Input) 목록](input-inventory.md) — 와이어프레임 21개 + 정의서 기준 실제 필요한 입력 형태
- [컴포넌트 카탈로그](components.html) *(HTML — 브라우저가 직접 렌더링)*
- [디자인 시스템](design-system.html) *(HTML — 브라우저가 직접 렌더링)*
