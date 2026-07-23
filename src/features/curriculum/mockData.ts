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
