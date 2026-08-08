/*
  dev 전용 역할 전환 계정 — 로그인 화면 하단 버튼과 헤더 드롭다운이 쓴다.

  역할 선택 UI는 정책상 화면에 없다(LoginScreen 주석). 이건 **폼을 우회하는 지름길**일 뿐,
  서버가 역할을 판정하는 로그인 흐름 자체는 그대로 재사용한다.

  ## 자격 증명을 저장소에 두지 않는다
  값은 `.env.local`(gitignore 대상)에서 읽는다. **없으면 버튼이 아예 안 나온다** —
  기능이 조용히 반쯤 동작하는 것보다 없는 편이 낫다. 형식은 `.env.example` 참고.

  화면 노출은 이 파일이 아니라 호출부가 막는다(`import.meta.env.DEV || __GIT_BRANCH__`).
  즉 **값이 있어도 main 배포에는 안 나온다** — 두 겹이다.
*/
export type QuickLoginAccount = { label: string; email: string; password: string }

function parseAccounts(raw: string | undefined): QuickLoginAccount[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('배열이 아닙니다')
    return parsed.filter(
      (a): a is QuickLoginAccount =>
        typeof a?.label === 'string' &&
        typeof a?.email === 'string' &&
        typeof a?.password === 'string',
    )
  } catch (e) {
    // 조용히 빈 배열로 떨어뜨리면 "왜 버튼이 없지"로 시간을 쓴다
    console.warn('[dev] VITE_DEV_ACCOUNTS를 읽지 못했습니다 — .env.example 형식 참고', e)
    return []
  }
}

export const QUICK_LOGIN_ACCOUNTS = parseAccounts(import.meta.env.VITE_DEV_ACCOUNTS)
