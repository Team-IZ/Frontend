/*
  CUR-03 교안 목록 목업 데이터. API 연동 전까지 화면을 검증하기 위한 고정 배열이다.
  실 데이터가 붙으면 이 파일은 지운다.
*/
export type ExtractionStatus = 'UPLOADED' | 'EXTRACTING' | 'EXTRACTED' | 'EXTRACTION_FAILED'

export type CurriculumRow = {
  id: string
  name: string
  /** 부제 — 추출 키워드 요약 · 페이지 수 */
  keywords: string
  type: 'PDF'
  version: string
  extractionStatus: ExtractionStatus
  /** 주제 지정된 섹션 수. 추출 완료 전에는 null(표시 대상 아님) */
  topicSections: number | null
  totalSections: number | null
  /** 적용 프로젝트 — 빈 배열 = 미연결(기수 전체 자동 검색 대상, D103) */
  projects: string[]
  updatedAt: string
  isNew?: boolean
}

export const CURRICULA: CurriculumRow[] = [
  {
    id: 'cur-1',
    name: 'Kubernetes와 CICD',
    keywords: 'K8s 아키텍처 · 컨테이너 배포 · Service/Ingress · CICD · 76p',
    type: 'PDF',
    version: 'v2',
    extractionStatus: 'EXTRACTED',
    topicSections: 5,
    totalSections: 6,
    projects: ['MSA 배포 실습'],
    updatedAt: '06-18',
  },
  {
    id: 'cur-2',
    name: '클라우드 현대화 이해 서비스',
    keywords: '클라우드 네이티브 · IaaS/PaaS/SaaS · 마이그레이션 · 151p',
    type: 'PDF',
    version: 'v1',
    extractionStatus: 'EXTRACTED',
    topicSections: 8,
    totalSections: 8,
    projects: ['클라우드 전환 PJT'],
    updatedAt: '06-19',
  },
  {
    id: 'cur-3',
    name: 'AWS 핵심 서비스',
    keywords: 'EC2 · VPC · IAM · S3 · RDS',
    type: 'PDF',
    version: 'v3',
    extractionStatus: 'EXTRACTED',
    topicSections: 0,
    totalSections: 5,
    projects: ['클라우드 전환 PJT', 'MSA 배포 실습'],
    updatedAt: '06-15',
  },
  {
    id: 'cur-4',
    name: 'Docker 컨테이너 기초',
    keywords: '이미지 · 레지스트리 · Dockerfile',
    type: 'PDF',
    version: 'v1',
    extractionStatus: 'EXTRACTION_FAILED',
    topicSections: null,
    totalSections: null,
    projects: ['MSA 배포 실습'],
    updatedAt: '06-12',
  },
  {
    id: 'cur-5',
    name: 'Microservice 아키텍처',
    keywords: '서비스 분해 · API 게이트웨이 · 사가',
    type: 'PDF',
    version: 'v1',
    extractionStatus: 'EXTRACTING',
    topicSections: null,
    totalSections: null,
    projects: [],
    updatedAt: '06-19',
  },
  {
    id: 'cur-6',
    name: 'Terraform IaC 입문',
    keywords: 'HCL · provider · state',
    type: 'PDF',
    version: 'v1',
    extractionStatus: 'UPLOADED',
    topicSections: null,
    totalSections: null,
    projects: [],
    updatedAt: '06-19',
    isNew: true,
  },
]

/*
  CUR-01+CUR-02 교안 상세 목업. 교안별 섹션·주제(SectionTopic)와 기수 커버리지.
  주제 칩은 화면에서 로컬 상태로 편집한다 — 실 연동 시 GET /curriculum/{cid}/structure
  와 GET /cohorts/{id}/curriculum/coverage 응답으로 대체된다.

  D102: 주제는 AI가 추출 키워드로 초안을 채우지만, 신뢰도·"AI 제안" 배지는 화면에
  절대 노출하지 않는다(폼 자동완성처럼). 여기 데이터에도 그런 필드를 두지 않는다.
*/
export type Section = {
  id: string
  name: string
  /** 페이지 범위. 예: "p.5–20" */
  pageRange: string
  /** 다루는 주제 칩. 추출 키워드로 자동 채움 + 총괄 편집 */
  topics: string[]
}

export type CurriculumDetail = {
  /** 추출된 섹션 인덱스 */
  sections: Section[]
  /** 이 기수 프로젝트가 측정하는 전체 주제 수 */
  cohortTopicTotal: number
  /** 그중 이 교안이 커버하는 주제 수 */
  coveredCount: number
  /** 이 기수 어느 교안도 안 다루는 주제 — 커버리지 요약의 "미커버" 목록 */
  uncoveredTopics: string[]
}

/*
  추출 완료(EXTRACTED) 교안만 상세 데이터를 갖는다. EXTRACTING·UPLOADED·
  EXTRACTION_FAILED 교안은 상세 화면에서 상태별 안내만 보여주고 표는 없다.
*/
export const CURRICULUM_DETAILS: Record<string, CurriculumDetail> = {
  'cur-1': {
    sections: [
      {
        id: 's1',
        name: 'Kubernetes 아키텍처',
        pageRange: 'p.5–20',
        topics: ['Master/Worker Node', 'API Server', 'etcd', 'kubelet'],
      },
      {
        id: 's2',
        name: '컨테이너 배포',
        pageRange: 'p.21–34',
        topics: ['Pod', 'ReplicaSet', 'Deployment', 'YAML'],
      },
      {
        id: 's3',
        name: '컨테이너 통신',
        pageRange: 'p.35–46',
        topics: ['Service', 'ClusterIP/NodePort', 'LoadBalancer', 'Ingress'],
      },
      {
        id: 's4',
        name: '컨테이너 볼륨·환경변수',
        pageRange: 'p.47–53',
        topics: ['Volume', 'PV/PVC', 'ConfigMap', 'Secret'],
      },
      {
        id: 's5',
        name: 'CICD Pipeline',
        pageRange: 'p.54–70',
        topics: ['DevOps', 'CI', 'CD', '애자일'],
      },
      {
        id: 's6',
        name: 'AWS CICD',
        pageRange: 'p.71–74',
        topics: ['CodePipeline', '릴리즈 프로세스'],
      },
    ],
    cohortTopicTotal: 12,
    coveredCount: 9,
    uncoveredTopics: ['관측성 · 모니터링', '보안 · 시크릿 관리', '비용 최적화'],
  },
  'cur-2': {
    sections: [
      {
        id: 's1',
        name: '클라우드 네이티브 개요',
        pageRange: 'p.3–18',
        topics: ['클라우드 네이티브', '12 Factor'],
      },
      { id: 's2', name: '서비스 모델', pageRange: 'p.19–40', topics: ['IaaS', 'PaaS', 'SaaS'] },
      {
        id: 's3',
        name: '마이그레이션 전략',
        pageRange: 'p.41–66',
        topics: ['6R', '리프트앤시프트', '리팩터링'],
      },
      {
        id: 's4',
        name: '가용성·확장성',
        pageRange: 'p.67–88',
        topics: ['오토스케일링', '로드밸런싱'],
      },
      { id: 's5', name: '관측성', pageRange: 'p.89–104', topics: ['모니터링', '로깅', '트레이싱'] },
      { id: 's6', name: '보안 기초', pageRange: 'p.105–120', topics: ['IAM', '시크릿 관리'] },
      { id: 's7', name: '비용 관리', pageRange: 'p.121–138', topics: ['비용 최적화', '태깅'] },
      { id: 's8', name: '거버넌스', pageRange: 'p.139–151', topics: ['정책', '컴플라이언스'] },
    ],
    cohortTopicTotal: 12,
    coveredCount: 12,
    uncoveredTopics: [],
  },
  // 추출은 됐지만 주제가 아직 하나도 지정되지 않은 교안 (CUR-02 case 2: 수동 입력 유도)
  'cur-3': {
    sections: [
      { id: 's1', name: 'EC2 · 컴퓨팅', pageRange: 'p.1–12', topics: [] },
      { id: 's2', name: 'VPC · 네트워킹', pageRange: 'p.13–24', topics: [] },
      { id: 's3', name: 'IAM · 권한', pageRange: 'p.25–34', topics: [] },
      { id: 's4', name: 'S3 · 스토리지', pageRange: 'p.35–44', topics: [] },
      { id: 's5', name: 'RDS · 데이터베이스', pageRange: 'p.45–56', topics: [] },
    ],
    cohortTopicTotal: 12,
    coveredCount: 0,
    uncoveredTopics: ['관측성 · 모니터링', '보안 · 시크릿 관리', '비용 최적화'],
  },
}
