import type { UseQueryOptions, UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import type { ToastOptions } from 'react-toastify'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data?: T | null
  errors?: ValidationError[] | null
  meta?: ResponseMeta | undefined
  timestamp: string
}

export interface ValidationError {
  field: string
  message: string
  code?: string | undefined
  value?: unknown
}
export interface ResponseMeta {
  pagination?: PaginationMeta
  version?: string
  [key: string]: any
}

export interface PaginationMeta {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage?: number | null
  prevPage?: number | null
}
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface UseApiOptions<TData = any, TError = any, TVariables = any> {
  enabled?: boolean
  auth?: boolean
  method?: HttpMethod
  headers?: Record<string, string>
  toastOptions?: ToastOptions
  axiosConfig?: AxiosRequestConfig
  queryConfig?: Partial<UseQueryOptions<TData, TError, TData>>
  debounceMs?: number
  throttleMs?: number
  optimisticUpdate?: (oldData: TData | undefined, variables: TVariables) => TData
  autoOptimistic?: boolean
  collectionPath?: string
  getId?: (item: any) => any
  silent?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: TError) => void
  enableTokenRefresh?: boolean
  refreshUrl?: string
  refreshMethod?: HttpMethod
  getRefreshPayload?: () => any
  extractTokens?: (response: any) => { accessToken?: string; refreshToken?: string }
}

export interface ApiRequest {
  url: string
  method?: HttpMethod
  data?: any
  params?: any
  config?: AxiosRequestConfig
}

export interface ParallelRequest<T = any> {
  key: string | any[]
  request: ApiRequest
  options?: UseQueryOptions<T>
}

export interface InfiniteApiRequest {
  getNextPageParam?: (lastPage: any, allPages: any[]) => any
  initialPageParam?: any
}

export interface UseApiReturn<TData = any, TError = any, TVariables = any> {
  data: TData | undefined
  response: AxiosResponse<TData> | undefined
  meta?: ResponseMeta | undefined
  validationErrors?: ValidationError[] | null
  isLoading: boolean
  isFetching: boolean
  isPending: boolean
  isError: boolean
  isSuccess: boolean
  error: TError | null
  status: 'idle' | 'loading' | 'error' | 'success'
  isMutating: boolean
  get: (config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  post: (data?: TVariables, config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  put: (data?: TVariables, config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  patch: (data?: TVariables, config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  del: (config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  request: <R = TData>(req: ApiRequest) => Promise<AxiosResponse<R>>
  uploadFile: (file: File | File[], config?: AxiosRequestConfig) => Promise<AxiosResponse<TData>>
  parallel: <T = any>(requests: ParallelRequest<T>[]) => Array<{
    data: T | undefined
    isLoading: boolean
    isError: boolean
    error: any
    key: string | any[]
  }>
  batch: (requests: ApiRequest[]) => Promise<AxiosResponse<any>[]>
  invalidate: (keys?: any[]) => Promise<void>
  refetch: () => Promise<void>
  setData: (updater: (old: TData | undefined) => TData) => void
  remove: () => void
  cancel: () => void
  setAuth: (enabled: boolean, token?: string) => void
  makeKey: (url: string, params?: any) => any[]
  useInfiniteApi: <TInfiniteData = any, TInfiniteError = any>(
    infiniteOptions?: InfiniteApiRequest & UseInfiniteQueryOptions<TInfiniteData, TInfiniteError, InfiniteData<TInfiniteData>>
  ) => {
    data: InfiniteData<TInfiniteData> | undefined
    fetchNextPage: (options?: any) => void
    hasNextPage: boolean | undefined
    isFetchingNextPage: boolean
    isError: boolean
    error: TInfiniteError | null
    refetch: () => void
  }
  mutate: (variables: TVariables, options?: any) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
}

export interface ApiClientConfig {
  enableTokenRefresh?: boolean
  refreshUrl?: string
  refreshMethod?: HttpMethod
  getRefreshPayload?: () => any
  extractTokens?: (response: any) => { accessToken?: string; refreshToken?: string }
  accessTokenKey?: string
  refreshTokenKey?: string
  authorizationHeader?: string
}
