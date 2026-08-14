/*
  통신 계층의 정문. **생성 코드와 화면은 여기만 import한다.**

  `_contract`는 손으로 쓰는 것들이다 — 생성물(`src/api/{server}/`)이 이 이름들에 기대므로
  여기 있는 시그니처는 백엔드가 바뀌어도 그대로 남는다. 반대로 생성물은 스펙이 바뀌면
  통째로 다시 만들어진다. **그 경계가 이 폴더다.**
*/
export { izClient, izOriginClient, createIzClient, unwrap } from './client'
export { ApiError, isApiError, isGenericCode, NETWORK_ERROR_CODE } from './errors'
export type { FieldError, ErrorCode } from './errors'
export { authBridge, connectAuth } from './authBridge'
export type { AuthBridge, RefreshResult, SessionEndReason } from './authBridge'
export { toPage } from './page'
export type { Page } from './page'
export type { RequestOptions, QueryOptions, MutationOptions } from './options'
