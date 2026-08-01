# 와이어프레임 — 역할별 앱 구성

각 파일은 **그 URL 권한의 뷰만** 담는다(권한이 달라도 같은 화면이면 같은 파일 = 공유). 앱은 3개(슈퍼어드민 콘솔 / 매니저 앱 / 교육생 앱) + 공용 인증. 총괄 매니저는 별도 앱이 아니라 **매니저 앱 + `manager/lead-only/`**(ORG_MANAGE 전용) 이다.

**총괄/담당 경계(D66·D67·D68):** 총괄 전용 = **조직 구조·인사를 정하는 것** — nav에 **`운영 관리`** 항목 하나(총괄만 보임)로 모임. 한 화면 3탭: ① **기수**(생성·종료) ② **반·명단**(반 구성·명단 등록·반 배정) ③ **매니저**(초대·권한·기수 배정). 기수 **내부 운영**(측정 계획·프로젝트·팀·대시보드·위험·개입·리포트·이의)은 **전부 공용** — 담당은 배정 기수 범위, 총괄은 전체. 근거: [../01-decision-log.md](../01-decision-log.md) D63·D64·D66·D67·D68.

## shared/ — 전 역할 공용 인증
| 파일 | 화면 | 정의서 |
|---|---|---|
| `shared/login.html` | 로그인(역할 무관·서버가 역할 판정) | SC-A01-login.md |

## superadmin/ — 슈퍼어드민 콘솔 (플랫폼 운영사, 크로스-테넌트)
| 파일 | 화면 | 정의서 |
|---|---|---|
| `superadmin/console.html` | 플랫폼 콘솔(기관·총괄 초대·사용량·설정) | SC-S01-platform-console.md |

## manager/ — 매니저 앱 (총괄·담당 **공유** 운영 화면)
| 파일 | 화면 | 정의서 |
|---|---|---|
| `manager/signup.html` | 매니저 회원가입(초대) | SC-A02-signup-activation.md |
| `manager/dashboard.html` | 대시보드 | SC-M01-dashboard.md |
| `manager/analysis.html` | 분석·진단 (사람 렌즈 + 패턴 렌즈, M04+M05 병합) | SC-M04-risk-analysis.md · SC-M05-heatmap.md |
| `manager/trainee-list.html` | 교육생 리스트 | SC-M11-trainee-list.md |
| `manager/trainee-detail.html` | 개별 교육생 상세 | SC-M06-trainee-detail.md |
| `manager/intervention.html` | 개입 관리 | SC-M07-intervention-management.md |
| `manager/report.html` | 리포트 | SC-M08-report.md |

### manager/lead-only/ — **총괄 매니저(ORG_MANAGE) 전용** (담당엔 네비 비노출·403)
| 파일 | 화면 | 정의서 |
|---|---|---|
| `manager/lead-only/program-admin.html` | **운영 관리** — 한 화면 3탭(기수 생성·종료 / 반·명단 편성 / 매니저 초대·권한·배정) | SC-M02-cohort-setup.md |

> 담당 매니저가 보는 것 = `manager/` 전부(배정 기수 범위). 총괄 = 그 위에 `lead-only/program-admin` 추가.

## trainee/ — 교육생 앱
| 파일 | 화면 | 정의서 |
|---|---|---|
| `trainee/activation.html` | 교육생 계정 활성화(초대) | SC-A02-signup-activation.md |
| `trainee/home.html` | 홈(회차·응시 상태) | SC-T01-trainee-home.md |
| `trainee/submission.html` | 코드 제출 | SC-T02-code-submission.md |
| `trainee/session.html` | 검증 세션 | SC-T04-verification-session.md |
| `trainee/result.html` | 결과 리포트 | SC-T05-result-report.md |

---

- SC-ID(예: SC-M06)는 여전히 **정의서(md)의 정식 식별자** — 화면 간 참조·결정 로그가 SC-ID를 쓴다. 폴더는 시각 카탈로그의 역할 분기일 뿐.
- 회원가입(A02)은 매니저/교육생으로 분리됨 — 한 정의서(SC-A02) + 두 뷰 파일.
