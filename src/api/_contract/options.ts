/*
  생성된 호출 함수·훅이 받는 옵션 모양. **생성기가 이 이름들을 그대로 쓴다.**

  왜 훅 옵션을 우리가 정의하나 — TanStack Query의 `UseQueryOptions`를 그대로 열어 주면
  화면이 `queryKey`·`queryFn`까지 덮어쓸 수 있다. 그 둘은 생성기가 정하는 값이고,
  화면이 바꾸면 캐시가 갈라진다. **덮어써도 되는 것만 열어 둔다.**
*/
import type { UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { ApiError } from './errors'

/** 모든 호출 함수가 받는다. React Query가 넘겨주는 취소 신호를 fetch까지 실어 나른다 */
export type RequestOptions = { signal?: AbortSignal }

/**
 * 조회 훅 옵션 — `queryKey`·`queryFn`은 뺀다(생성기 소관).
 * 에러 타입이 `ApiError`라 화면이 `error.code`에 바로 닿는다.
 */
export type QueryOptions<TData> = Omit<
  UseQueryOptions<TData, ApiError, TData>,
  'queryKey' | 'queryFn'
>

/** 쓰기 훅 옵션 — `mutationFn`은 뺀다. `onSuccess`는 기본 무효화 **뒤에** 이어서 불린다 */
export type MutationOptions<TData, TVars> = Omit<
  UseMutationOptions<TData, ApiError, TVars>,
  'mutationFn'
>
