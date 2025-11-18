/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useCallback, useState } from 'react'
import type { UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query'
import type { ApiRequest, ParallelRequest, InfiniteApiRequest, UseApiReturn, ApiClientConfig, UseApiOptions } from '../types'

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://api.example.com',
  timeout: 15000,
})

let apiConfig: ApiClientConfig = {
  enableTokenRefresh: false,
  refreshUrl: '/auth/refresh',
  refreshMethod: 'post',
  getRefreshPayload: () => ({ refresh_token: localStorage.getItem('refresh_token') || '' }),
  extractTokens: (res: any) => ({ accessToken: res?.data?.access_token, refreshToken: res?.data?.refresh_token }),
  accessTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  authorizationHeader: 'Authorization',
}

const debounceTimers = new Map<string, { timer: any; resolvers: Array<(v: any) => void>; rejecters: Array<(e: any) => void> }>()
const throttleMap = new Map<string, number>()
let refreshPromise: Promise<void> | null = null

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(apiConfig.accessTokenKey || 'access_token')
  if (token && config.headers) {
    config.headers[apiConfig.authorizationHeader || 'Authorization'] = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const status = error?.response?.status
    const original = error?.config
    if (status === 401 && apiConfig.enableTokenRefresh && !original?._retry) {
      if (!localStorage.getItem(apiConfig.refreshTokenKey || 'refresh_token')) return Promise.reject(error)
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const payload = apiConfig.getRefreshPayload ? apiConfig.getRefreshPayload() : {}
          const res = await apiClient.request({ url: apiConfig.refreshUrl || '/auth/refresh', method: apiConfig.refreshMethod || 'post', data: payload })
          const tokens = apiConfig.extractTokens ? apiConfig.extractTokens(res) : { accessToken: res?.data?.access_token, refreshToken: res?.data?.refresh_token }
          if (tokens?.accessToken) localStorage.setItem(apiConfig.accessTokenKey || 'access_token', tokens.accessToken as string)
          if (tokens?.refreshToken) localStorage.setItem(apiConfig.refreshTokenKey || 'refresh_token', tokens.refreshToken as string)
        })().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
      return apiClient(original)
    }
    return Promise.reject(error)
  }
)

export const configureApi = (cfg: Partial<ApiClientConfig>) => {
  apiConfig = { ...apiConfig, ...cfg }
}

export const useApi = <TData = any, E = any, V = any>(
  queryKey: any[],
  defaultUrl: string,
  options?: UseApiOptions<TData, E, V>
): UseApiReturn<TData, E, V> => {
  const queryClient = useQueryClient()
  const [authEnabled, setAuthEnabled] = useState(options?.auth ?? true)

  const makeKey = useCallback((url: string, params?: any) => [url, params ? JSON.stringify(params) : undefined], [])

  const request = useCallback(
    async <R = TData>(req: ApiRequest, signal?: AbortSignal): Promise<AxiosResponse<R>> => {
      const { url = defaultUrl, method = 'get', data, params, config } = req
      const cfg: AxiosRequestConfig = {
        url,
        method,
        data,
        params,
        signal,
        ...config,
      }
      if (!authEnabled) {
        if (!cfg.headers) cfg.headers = {}
        delete cfg.headers[apiConfig.authorizationHeader || 'Authorization']
      }
      return apiClient.request<R>(cfg)
    },
    [defaultUrl, authEnabled]
  )

  const { refetchInterval: _polling, ...restQueryConfig } = (options?.queryConfig || {}) as any
  const query = useQuery<TData, E, TData>({
    queryKey,
    queryFn: ({ signal }) => {
      const run = () => request<TData>({ url: defaultUrl, method: 'get' }, signal).then((res) => res.data as TData)
      const k = JSON.stringify(queryKey)
      if (options?.throttleMs && options.throttleMs > 0) {
        const last = throttleMap.get(k) || 0
        const now = Date.now()
        if (now - last < options.throttleMs) {
          const wait = (options.throttleMs || 0) - (now - last)
          return new Promise<TData>((resolve) => setTimeout(() => resolve(run()), wait > 0 ? wait : 0))
        }
        throttleMap.set(k, now)
      }
      if (options?.debounceMs && options.debounceMs > 0) {
        const entry = debounceTimers.get(k)
        return new Promise<TData>((resolve, reject) => {
          if (entry) {
            clearTimeout(entry.timer)
            entry.resolvers.push(resolve)
            entry.rejecters.push(reject)
            const timer = setTimeout(async () => {
              try {
                const v = await run()
                entry.resolvers.forEach((r) => r(v))
              } catch (e) {
                entry.rejecters.forEach((r) => r(e))
              } finally {
                debounceTimers.delete(k)
              }
            }, options.debounceMs)
            entry.timer = timer
            debounceTimers.set(k, entry)
          } else {
            const timer = setTimeout(async () => {
              try {
                const v = await run()
                const stored = debounceTimers.get(k)
                if (stored) stored.resolvers.forEach((r) => r(v))
              } catch (e) {
                const stored = debounceTimers.get(k)
                if (stored) stored.rejecters.forEach((r) => r(e))
              } finally {
                debounceTimers.delete(k)
              }
            }, options.debounceMs)
            debounceTimers.set(k, { timer, resolvers: [resolve], rejecters: [reject] })
          }
        })
      }
      return run()
    },
    enabled: options?.enabled ?? true,
    staleTime: restQueryConfig?.staleTime ?? 1000 * 60 * 5,
    gcTime: restQueryConfig?.gcTime ?? 1000 * 60 * 30,
    retry: restQueryConfig?.retry ?? 2,
    ...restQueryConfig,
  })

  const mutation = useMutation<TData, E, V>({
    mutationFn: (variables) => {
      return request<TData>({
        url: defaultUrl,
        method: options?.method || 'post',
        data: variables,
      }).then((res) => res.data as TData)
    },
    onMutate: async (variables) => {
      if (options?.optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey })
        const previous = queryClient.getQueryData<TData>(queryKey)
        queryClient.setQueryData(queryKey, options.optimisticUpdate(previous, variables))
        return { previous }
      }
      return {}
    },
    onError: (_, __, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous as TData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const useParallelApi = <P = any>(requests: ParallelRequest<P>[]) => {
    return useQueries({
      queries: requests.map(({ key, request, options }) => ({
        queryKey: Array.isArray(key) ? key : [key],
        queryFn: ({ signal }) => apiClient.request<P>({ ...request, signal }).then((res) => res.data as P),
        ...options,
      })),
    }).map((q, i) => ({
      data: q.data as P | undefined,
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.error,
      key: requests[i].key,
    }))
  }

  const batch = async (requests: ApiRequest[]): Promise<AxiosResponse<any>[]> => {
    return Promise.all(requests.map((req) => request(req)))
  }

  const uploadFile = async (file: File | File[], config?: AxiosRequestConfig) => {
    const files = Array.isArray(file) ? file : [file]
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return apiClient.post(defaultUrl, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    })
  }

  const invalidate = (keys = queryKey) => queryClient.invalidateQueries({ queryKey: keys })
  const refetch = () => queryClient.refetchQueries({ queryKey })
  const setData = (updater: (old: TData | undefined) => TData) => queryClient.setQueryData(queryKey, updater)
  const remove = () => queryClient.removeQueries({ queryKey })

  const cancel = () => {
    queryClient.cancelQueries({ queryKey }, { revert: true, silent: false })
  }

  

  const useInfiniteApi = <TInfiniteQueryData = any, TInfiniteError = any>(
    infiniteOptions?: InfiniteApiRequest & UseInfiniteQueryOptions<TInfiniteQueryData, TInfiniteError, InfiniteData<TInfiniteQueryData>>
  ) => {
    const initialPageParam = infiniteOptions?.initialPageParam ?? 0
    const getNextPageParam = infiniteOptions?.getNextPageParam
    const { getNextPageParam: _g, initialPageParam: _i, ...restOptions } = (infiniteOptions || {}) as any
    const infiniteQuery = useInfiniteQuery<TInfiniteQueryData, TInfiniteError, InfiniteData<TInfiniteQueryData>>({
      queryKey,
      queryFn: async ({ pageParam = initialPageParam, signal }) => {
        const paginatedUrl = `${defaultUrl}?page=${pageParam}&limit=10`
        const response = await request<TInfiniteQueryData>({ url: paginatedUrl, method: 'get' }, signal)
        return response.data as TInfiniteQueryData
      },
      getNextPageParam: (lastPage: any, allPages: any[]) =>
        getNextPageParam ? getNextPageParam(lastPage, allPages) : (lastPage as any).nextCursor || undefined,
      initialPageParam,
      staleTime: 1000 * 60 * 5,
      ...restOptions,
    })
    return {
      data: infiniteQuery.data,
      fetchNextPage: infiniteQuery.fetchNextPage,
      hasNextPage: infiniteQuery.hasNextPage,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
      isError: infiniteQuery.isError,
      error: infiniteQuery.error,
      refetch: infiniteQuery.refetch,
    }
  }

  const setAuth = (enabled: boolean, token?: string) => {
    setAuthEnabled(enabled)
    if (token !== undefined) {
      if (enabled && token) localStorage.setItem(apiConfig.accessTokenKey || 'access_token', token)
      else localStorage.removeItem(apiConfig.accessTokenKey || 'access_token')
    }
  }

  return {
    data: query.data,
    response: query.data ? ({ data: query.data } as AxiosResponse<TData>) : undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPending: query.isPending || mutation.isPending,
    isError: query.isError || mutation.isError,
    isSuccess: query.isSuccess,
    error: (query.error || mutation.error) as E | null,
    status: query.isLoading ? 'loading' : query.isError ? 'error' : query.isSuccess ? 'success' : 'idle',
    isMutating: mutation.isPending,
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    get: (config) => request({ method: 'get', url: defaultUrl, config }),
    post: (data, config) => request({ method: 'post', url: defaultUrl, data, config }),
    put: (data, config) => request({ method: 'put', url: defaultUrl, data, config }),
    patch: (data, config) => request({ method: 'patch', url: defaultUrl, data, config }),
    del: (config) => request({ method: 'delete', url: defaultUrl, config }),
    request,
    uploadFile,
    parallel: useParallelApi,
    batch,
    cancel,
    useInfiniteApi,
    invalidate,
    refetch,
    setData,
    remove,
    setAuth,
    makeKey,
  }
}

export { apiClient }