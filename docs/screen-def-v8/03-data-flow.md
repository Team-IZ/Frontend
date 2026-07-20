# 데이터 플로우 (엔드투엔드) — ERD의 원천

> **이 문서를 보고 ERD를 짠다.** 각 화면 요소가 *어디서 무슨 행위를 했을 때 → 무슨 데이터가 생겨 → 어떤 과정으로 저장되고 → 어떤 로직으로 처리되어 → 어떻게 화면에 표시되는지*를 발생 순서(플로우)대로 정리한다.
> 대시보드(SC-M01)가 이 모든 흐름의 종착점이자 집계처이므로 대시보드 관점에서 역추적한다.
> 엔티티명은 **가칭**(백엔드 확정 전) — `이탤릭 백틱`으로 표기. 상위 정의: [02-domain-hierarchy.md](02-domain-hierarchy.md).

---

## 0. 엔티티 지도 (플로우에 등장하는 저장 실체)

| 엔티티(가칭) | 무엇 | 생성 FR | 핵심 필드 | 불변 여부 |
|---|---|---|---|---|
| `Session` | 코드 이해 소크라테스 세션 1회 | MEAS-06 | traineeId·회차·DP별 도달 depth·등급·답변 로그 | 이력 보존 |
| `Score` | 세션 답변의 5축 채점 결과 | ENG-01 | 축별 점수·원본 응답·근거 span·모델/프롬프트/루브릭 버전 | **원본 불변** |
| `ScoreDelta` | 회차 간 점수 변화 | ENG-02 | 축별 Δ=현재−직전·회차·누적 | 스냅샷 |
| `ContribDeviation` | 기여 편차(설명 변수) | ENG-03 | traineeId·팀·편차·git 근거 | — |
| `Signal` | 자동 위험/시그널 | ENG-04 | 근거 trace·규칙 버전·서술 문구·상태(active/해소) | 이력 보존 |
| `StabilityCheck` | 재채점 편차 검증 | ENG-05 | scoreId·STABLE\|REVIEW_REQUIRED·버전 | — |
| `PrioritySnapshot` | 우선순위 산출 결과 | DASH-03 | S·R·Priority·수식 구성요소·사유·회차 | 스냅샷 |
| `Recommendation` | 개입 유형 추천 | INTV-01 | 트리 경로·근거 축·규칙 버전·상태(추천) | — |
| `Draft` | 개입 실행 초안 | INTV-02 | 슬롯 값·본문·편집 플래그 | — |
| `Intervention` | 확정된 개입 | INTV-04/05 | 유형·담당자·상태(대기→진행→완료)·근거 시그널 | 이력 보존 |
| `InterventionOutcome` | 개입 효과 판정 | INTV-06 | pre/post 점수·Δ·판정(RECOVERED 등)·policy_version | 이력 보존 |
| `AppealRecommendation` | 추천 이의 | INTV-03 | 대상 추천·사유·규칙 버전·기각 여부 | 불변 |
| `BenchmarkSnapshot` | due_at 벤치마크 | DASH-04 | 스냅샷 시각·축별 대비·수정 배지 | **불변** |
| `BriefingState` | 매니저별 브리핑 상태 | DASH-02 | managerId·마지막 확인 시각 | 갱신 |
| `AuditLog` | 확정·수정·열람 이력 | GOV-01/02·AUTH-09 | 행위자·시각·before/after·사유 | **불변** |
| `Curriculum`·`SectionIndex`·`SectionTag` | 교안·섹션·태그(매니저 직접 지정) | CUR-01/02/03·D101 | 플로우 G 참조 (섹션 의미 정체성 앵커·단순 다대다) | 버전 이력 / 태그 관계(변경은 AuditLog) |
| `Cohort`·`Class`·`Team`·`Trainee`·`Project`·`측정계획(회차·due_at)` | 조직·일정 골격 | ORG/PLAN | 02-domain-hierarchy 참조 | 이력 보존 |

> ⚠ **명세 공백:** `참여도`·`팀 진행률`의 원천 엔티티·산출 정의(분자/분모)가 기능명세서에 없음. 아래 플로우 F에서 미완성으로 표기 — **백엔드 정의 선행 필요.** (교안 매핑의 신뢰도·임계값 공백은 D101에서 수동 태깅으로 전환하며 소멸 — 더 이상 해당 없음.)

---

## 플로우 A — 교육생 세션 → 위험·추천·초안 (인박스 한 줄의 일생)

가장 중요한 흐름. 대시보드 인박스의 한 줄이 어떻게 만들어지는가.

```
[교육생이 세션 응시]                         [시스템 자동 처리]                        [대시보드 표시]
SC-T04 세션 응시(MEAS-06)
  → Session 저장(답변·depth·등급)
      → ENG-01 5축 채점
          → Score 저장(축별·원본·근거 span·버전)
              → ENG-02 회차 비교 → ScoreDelta 저장
              → ENG-03 기여 편차 → ContribDeviation 저장
                  → ENG-04 다중근거 교차 → Signal 저장(근거 trace·서술)
                      → DASH-03 산출 → PrioritySnapshot 저장
                            S=(기수평균−개인)/σ (표본≥2·σ>0)
                            R=(회복+1)/(전체+2)  ← InterventionOutcome 재사용(플로우 B)
                            Priority=S×(0.5+R)
                      → INTV-01 결정리스트 → Recommendation 저장(트리 경로·근거 축)
                          → INTV-02 슬롯 주입 → Draft 저장(초안·편집 플래그)
                      → DASH-05 타이밍 판정(위험도+Δ+개입이력+쿨다운 상수)
                                                                          → 인박스 한 줄 =
                                                                            Signal(사유)
                                                                          + PrioritySnapshot(순위·수식)
                                                                          + 타이밍 문구
                                                                          + Recommendation + Draft
                                                                            (= 확정 대기 항목)
```

**단계별 상세:**
1. **원천:** 교육생이 SC-T04에서 세션 응시 → `Session`(답변 로그·DP별 도달 depth·최종 이해 등급). *행위자=교육생, 발생=매 회차.*
2. **채점:** `ENG-01`이 답변을 5축 LLM-as-judge(25점 동일가중·편향완화 스왑·축별 근거 span 인용) → `Score` 저장. **원본·버전 불변**(재채점·이의 대비).
3. **변화·시그널:** `ENG-02`→`ScoreDelta`, `ENG-03`→`ContribDeviation`, 이 둘+Score를 `ENG-04`가 교차 → 근거 있는 `Signal`만 생성(근거 없으면 미생성·A2).
4. **우선순위:** `DASH-03`이 Score+기수 σ+회복 이력으로 `PrioritySnapshot` 저장. 표본<2·σ=0이면 S 생략(→ DASH-08 표본 부족).
5. **추천·초안:** `INTV-01`이 Score 패턴으로 `Recommendation`(최초 매칭 1건·배타), `INTV-02`가 슬롯 템플릿에 주입해 `Draft`.
6. **타이밍:** `DASH-05`가 상태 판정(즉시/관찰/회복/추가확인), 쿨다운이면 관찰로 전환.
7. **표시:** 대시보드 인박스 한 줄에 위 산출물을 조합. 확정 대기 큐 = Recommendation+Draft가 준비된 항목.

---

## 플로우 B — 매니저 개입 → 회복 → 성능 (피드백 루프)

```
[매니저가 개입 확정]                    [다음 회차 후 자동 판정]              [대시보드/우선순위에 환류]
대시보드/SC-M07 [확정](INTV-04/05)
  → Intervention 저장(유형·담당·상태·근거 시그널)
  → AuditLog(확정자·시각·근거) 저장           (GOV-02 사람 승인)
      → (다음 회차 세션·채점)
          → INTV-06 pre/post 비교
             (Δ≥1 AND post≥3 → RECOVERED)
             → InterventionOutcome 저장(판정·policy_version)
                 → DASH-07 (유형×실패축) 집계 → 추천 성능(자연빈도·N<5 진행바)
                 → DASH-03 R값이 이 회복 이력 재사용 ─────────────→ 우선순위가 개입 효과를 학습
```

- 개입은 대시보드 또는 SC-M07 어디서 확정해도 **같은 `Intervention` 실체**(targetId 키). 완료 시에만 `InterventionOutcome` 생성(진행 중은 효과 판정 전).
- `DASH-07`은 자연빈도 우선(a/N), N<5는 백분율 숨김. `DASH-03`의 R은 동일 (유형×실패축) 조합의 Outcome을 라플라스 스무딩으로 재사용 → **닫힌 루프.**

---

## 플로우 C — 매니저 이의 → 규칙 재검토

```
대시보드 [이의](INTV-03) → AppealRecommendation 저장(사유·규칙 버전)
   → 동일 규칙 최근 5건 중 3건 기각 판정 → 규칙 재검토 플래그
       → 레일 "N건 기각 → 재검토 중" 표시 (자동 규칙 변경 금지·사람 검토)
```
- 채점 루브릭 이의(GOV-01·SC-M09)와는 **별개 실체.** 이쪽은 추천 규칙에 대한 이의.

---

## 플로우 D — 채점 안정성

```
ENG-05 동일 답변 재채점 편차 → StabilityCheck 저장(STABLE|REVIEW_REQUIRED)
   → DASH-06 2상태 배지 → REVIEW면 DASH-09 근거 원본 진입(매니저 전용)
```

---

## 플로우 E — 로그인 브리핑

```
매니저 로그인 → BriefingState.마지막확인시각 조회
   → 그 이후 생성된 Signal diff 그룹화·요약 → 브리핑 배너
   → [확인] 시 마지막확인시각 갱신 (다음엔 그 이후 신규만)
```
- "지난 방문 이후 변화"의 기준점. 인박스의 NEW 마커도 이 시각 기준.

---

## 플로우 F — KPI 집계 (통합 현황 DASH-01)

| KPI | 원천 → 처리 | 상태 |
|---|---|---|
| 이해도 평균 | `Score` 회차 스냅샷 → 개인 총점(÷5) → 기수 평균(응시 완료 분모) | ✅ |
| 응시율 | `Session` 완료 수 ÷ 측정계획 대상(due_at) | ✅ |
| 활성 시그널 | `Signal`(status=active) count | ✅ |
| 미처리 개입 | `Intervention`(status=대기) count | ✅ |
| **참여도** | 원천 엔티티·분모 **정의 없음** | ⚠ 미완성 |
| **팀 진행률** | 원천 엔티티·분모 **정의 없음** | ⚠ 미완성 |

> KPI Δ(방향)는 각 지표의 직전 회차 스냅샷(`ScoreDelta` 등)과의 차이. 기준 시각은 스냅샷 시각(B1).

---

## 플로우 G — 교안 매핑 → 리포트 위치 안내 (매니저 직접 태깅, D101)

> SC-M12 교안 관리의 데이터 계약. **매칭 대상 규모가 작다** — 교안 1개당 섹션 4~6개 · 프로젝트 1개당 기술영역 3~4개 = 매칭 조합 십수 개. 이 규모에서 AI 자동 매칭+신뢰도 판정(D96·D100의 `CurriculumMapping`/confidence/link_state 모델)은 과설계로 판정·철회(D101). **총괄이 섹션↔기술영역을 등록 직후 화면에서 직접 체크(태깅)** — 확률·임계값·자동 상태 전이 없는 결정론적 다대다 관계. 학생별 정확 페이지는 여전히 **리포트 시점 검색**(태그된 섹션 범위 내에서 좁힘, D94 유지 — 이 계약은 안 바뀜).

```
[교안 등록·자동 추출]                    [매니저 직접 태깅]                         [리포트 소비]
SC-M12 등록(CUR-03)
  → Curriculum 저장(상태머신·버전)
      → CUR-01 구조 추출
          → SectionIndex 저장(섹션 의미 정체성·페이지범위)  ★앵커=heading+임베딩, 페이지는 파생
              → CUR-02 교안 연결(총괄이 기술영역↔섹션 체크박스로 태깅)
                 → SectionTag 저장(sectionId·techAreaId·taggedBy·taggedAt) — 단순 다대다, 확률 없음
                 → MEAS-07 리포트: 태그된 (기술영역,섹션)만 "취약축→교안 위치" 소비
                      (미태그·미링크 프로젝트 = 위치 안내 생략)
                      → 렌더 시 태그 섹션 범위 내에서 학생 세션 근거와 가장 가까운 위치로 검색(D94)
```

### 왜 AI 매칭에서 수동 태깅으로 (D101, 규모 재평가)

AI/자동화가 이기는 조건은 **사람이 감당 못 할 규모일 때**다. 여기는 애초에 사람이 한 번에 감당하는 규모(십수 개 조합)라 자동화가 오히려 검증 부담(신뢰도 바 읽기·근거 스니펫 확인)을 늘렸다. 등록 시 이미 "주제·설명"을 훑어 채우는 총괄이 섹션마다 체크박스 몇 개 더 누르는 건 추가 노동이 거의 0 — **직접 체크가 AI 추천 검토보다 빠르고, 확률이 없어 항상 정확하다.**

### 삭제된 것 (D96·D100 계열, D101로 철회)

`CurriculumMapping`의 confidence·link_state(AUTO_LINKED/SUPPRESSED/UNCOVERED)·content_match·source_confidence 필드 전부 삭제. `MappingOutcome`(D100에서 이미 철회)·`MappingOverride`(정답 라벨 개념)도 불필요 — 태그 자체가 이미 사람이 정한 확정값이라 "오버라이드할 자동 판정"이 없음. 임계값 [가정값]·골든셋 사후보정 문제도 함께 소멸(확률이 없으니 보정할 게 없음).

### 신규 엔티티 (BE 확정 대상)

| 엔티티(가칭) | 무엇 | 생성 FR | 핵심 필드 | 불변 여부 |
|---|---|---|---|---|
| `Curriculum` | 교안 1건 | CUR-03 | 기수·주제·버전·상태머신(UPLOADED→…→EXTRACTED) | 버전 이력 보존 |
| `SectionIndex` | 교안 섹션 목차 1행 | CUR-01 | curriculumId·**section_identity(heading+embedding centroid)**·page_range·keywords | 재추출 시 재생성(identity로 재앵커) |
| `SectionTag` | 기술영역↔섹션 태그 1건 | CUR-02 | techAreaId·sectionId·taggedBy(actor)·taggedAt | 단순 관계(변경 이력은 전역 `AuditLog` 재사용, 신규 엔티티 불필요) |

### Type-1 데이터 계약 1건 — 되돌리기 비쌈, ERD 전 확정 (D100에서 판단, D101에서도 유지)

**태그 앵커 = 페이지 번호가 아니라 섹션 의미 정체성.** `SectionTag`는 `SectionIndex.section_identity`(heading 텍스트 + 청크 임베딩 centroid)를 FK로 가리키고, page_range는 파생 표시값. 버전 재추출 시 identity가 ~동일하면 태그 유지(페이지만 갱신), 섹션이 소멸·모호 분할되면 해당 태그 무효화·재태깅 안내. **매칭 방식이 AI든 수동이든 이 앵커 원칙은 동일하게 필요** — 수동 태깅이라도 페이지 번호에 고정하면 버전 교체마다 총괄이 처음부터 다시 체크해야 하는 낭비가 생긴다.

> **미해결(BE 정의 선행):** 없음 — 신뢰도·임계값·산출식 문제가 D101로 전부 소멸. 남은 건 태그 변경 로그를 전역 `AuditLog`로 라우팅하는 구현 디테일뿐(신규 스펙 확정 불필요).

---

## 온디맨드 흐름 (클릭 시에만)

| 클릭 | 읽는 엔티티 | FR |
|---|---|---|
| 지표 [ⓘ 출처] | 위 플로우 A~F 계보(원천→처리→시각) | 신규(계보 패널) |
| [벤치마크] | `BenchmarkSnapshot`(due_at 불변) | DASH-04 |
| [근거 원본] | `Score`(원본 응답·근거 span·버전) | DASH-09 |
| 행 [초안] | `Recommendation`+`Draft` | INTV-01·02 |

---

## ERD 설계 시 이 문서에서 바로 읽어야 할 것

1. **엔티티 목록·필드·불변 여부** = §0 표.
2. **관계/외래키** = 각 플로우의 화살표(`Session`→`Score`→`ScoreDelta`/`Signal`→`PrioritySnapshot`…).
3. **스냅샷 vs 라이브** = `Score`·`BenchmarkSnapshot`·`AuditLog` 불변 / KPI·우선순위는 회차 스냅샷 재계산.
4. **피드백 루프** = `InterventionOutcome` → `DASH-03` R (플로우 B) — 순환 아님, 회차 경계로 분리. (교안 매핑은 회복 루프도 AI 신뢰도 루프도 없음·D100→D101로 전부 철회 — `SectionTag`는 매니저가 직접 정하는 단순 관계.)
5. **교안 태그 앵커(Type-1)** = `SectionTag`는 페이지가 아니라 `SectionIndex.section_identity`를 FK로 참조(플로우 G). 버전 재추출은 identity diff로 자동 재앵커 — ERD에서 page를 태그 키로 삼으면 안 됨.
6. **미해결(설계 전 확정 필요)** = 참여도·팀 진행률 정의, policy_version 관리 주체, 쿨다운/타이밍 상수 테이블(D-5). (교안 매핑 신뢰도·임계값 공백은 D101로 소멸 — 더 이상 목록에 없음.)
