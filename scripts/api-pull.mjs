#!/usr/bin/env node
/*
  백엔드 OpenAPI 스펙을 레포 파일로 내려받는다 — `npm run api:pull`

  왜 파일로 받아 커밋하나(api-codegen.md A1):
    ① 스펙 변화가 PR diff로 보인다 — "백엔드가 무엇을 바꿨나"가 리뷰 대상이 된다
    ② 네트워크 없이 빌드·생성이 된다 (CI가 백엔드 가동에 의존하지 않는다)
    ③ 무엇을 기준으로 생성했는지가 커밋에 박힌다

  ⚠️ 캐시버스터가 이 스크립트의 존재 이유 절반이다.
     Railway 엣지가 옛 스펙을 그대로 준다. 실제로 1차 수정 직후 받은 파일이 이전 것과
     바이트 단위로 같아서 "반영 안 됐다"고 오판했고, `?cb=`를 붙이니 새 파일이 나왔다.
     그래서 매번 쿼리를 흔들고, 받은 뒤 해시와 개수를 찍어 "정말 바뀌었는지"를 보여준다.
*/
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/*
  주소·저장 위치는 **생성기와 같은 설정 파일**에서 읽는다. 두 곳에 적어 두면 한쪽만 바꿨을 때
  "받은 스펙"과 "코드를 만든 스펙"이 갈린다 — 실제로 백엔드를 옮기며 그럴 뻔했다.
*/
const CONFIG = 'api/codegen.config.json'

function parseArgs(argv) {
  const cfg = JSON.parse(readFileSync(CONFIG, 'utf8'))
  const args = { url: process.env.IZ_API_DOCS_URL || cfg.spec.url, out: cfg.spec.file }
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--url') args.url = argv[++i]
    else if (argv[i] === '--out') args.out = argv[++i]
  }
  return args
}

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12)

/** 사람이 "무엇이 달라졌나"를 한 줄로 볼 수 있는 최소 지표. 전체 diff는 git이 보여준다 */
function summarize(spec) {
  const ops = Object.values(spec.paths ?? {}).flatMap((item) =>
    Object.entries(item).filter(([, op]) => op?.responses),
  )
  return {
    version: spec.info?.version ?? '?',
    paths: Object.keys(spec.paths ?? {}).length,
    operations: ops.length,
    schemas: Object.keys(spec.components?.schemas ?? {}).length,
  }
}

const main = async () => {
  const { url, out } = parseArgs(process.argv)

  // 캐시버스터 두 겹 — 쿼리스트링(엣지 키를 바꾼다) + 헤더(중간 프록시용)
  const bust = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`
  const res = await fetch(bust, { headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } })
  if (!res.ok) throw new Error(`스펙을 받지 못했습니다 — HTTP ${res.status} ${url}`)

  const raw = await res.text()
  let spec
  try {
    spec = JSON.parse(raw)
  } catch {
    throw new Error(
      '받은 응답이 JSON이 아닙니다. URL이 Swagger UI 페이지를 가리키고 있지 않은지 확인하세요.',
    )
  }

  const before = await readFile(out, 'utf8').catch(() => null)
  // 저장은 정규화(2칸 들여쓰기 + 끝 개행)해서 한다 — 서버가 한 줄로 주면 diff가 통째로 한 줄이 된다
  const next = JSON.stringify(spec, null, 2) + '\n'

  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, next)

  const s = summarize(spec)
  console.log(`↓ ${url}`)
  console.log(
    `  ${out}  ${s.version} · 경로 ${s.paths} · 오퍼레이션 ${s.operations} · 스키마 ${s.schemas}`,
  )
  console.log(`  sha256 ${sha(next)}${before ? ` (이전 ${sha(before)})` : ''}`)

  if (before === next) {
    console.log('\n= 이전과 동일합니다. 백엔드가 아직 재배포하지 않았을 수 있습니다.')
  } else if (before) {
    const b = summarize(JSON.parse(before))
    const d = (a, z) => (a === z ? `${z}` : `${a} → ${z}`)
    console.log(
      `\n★ 바뀌었습니다 — 오퍼레이션 ${d(b.operations, s.operations)} · 스키마 ${d(b.schemas, s.schemas)}`,
    )
    console.log('  다음: npm run api:check')
  } else {
    console.log('\n★ 처음 받았습니다. 다음: npm run api:check')
  }
}

main().catch((e) => {
  console.error(`✗ ${e.message}`)
  process.exit(1)
})
