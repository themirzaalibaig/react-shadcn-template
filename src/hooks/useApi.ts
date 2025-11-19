/* eslint-disable @typescript-eslint/no-unused-vars */
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { useCallback, useState } from 'react'
import type { UseInfiniteQueryOptions, InfiniteData } from '@tanstack/react-query'
import type { ApiRequest, ParallelRequest, InfiniteApiRequest, UseApiReturn, UseApiOptions, ResponseMeta, ValidationError } from '../types'
import { api } from '@/lib/axios'
import { useDebounce, useThrottle } from '@reactuses/core'
import { toast } from 'react-toastify'
import { get, set, cloneDeep } from 'lodash'

const debounceTimers = new Map<string, { timer: any; resolvers: Array<(v: any) => void>; rejecters: Array<(e: any) => void> }>()
const throttleMap = new Map<string, number>()

 

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
        delete cfg.headers['Authorization']
      }
      return api.request<R>(cfg)
    },
    [defaultUrl, authEnabled]
  )

  const keyStr = JSON.stringify(queryKey)
  const debouncedKeyStr = useDebounce(keyStr, options?.debounceMs || 0)
  const throttledKeyStr = useThrottle(debouncedKeyStr, options?.throttleMs || 0)
  const effectiveQueryKey = JSON.parse(throttledKeyStr)

  const { refetchInterval: _polling, ...restQueryConfig } = (options?.queryConfig || {}) as any
  const query = useQuery<TData, E, TData>({
    queryKey: effectiveQueryKey,
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
      const auto = options?.autoOptimistic ?? true
      if (options?.optimisticUpdate || auto) {
        await queryClient.cancelQueries({ queryKey })
        const previous = queryClient.getQueryData<TData>(queryKey)
        if (options?.optimisticUpdate) {
          queryClient.setQueryData(queryKey, options.optimisticUpdate(previous, variables))
          return { previous }
        }
        const updated = (() => {
          if (!previous) return previous as TData
          const method = options?.method || 'post'
          const idGetter = options?.getId || ((x: any) => x?.id)
          const path = options?.collectionPath
          const draft = cloneDeep(previous as any)
          const target = path ? get(draft, path) : Array.isArray(draft) ? draft : Object.values(draft).find((v) => Array.isArray(v))
          if (!target) return previous as TData
          if (method === 'post') {
            const item = (variables as any) ?? {}
            if (Array.isArray(target)) (target as any[]).push(item)
          } else if (method === 'put' || method === 'patch') {
            const item = (variables as any) ?? {}
            const id = idGetter(item)
            if (Array.isArray(target)) {
              const idx = (target as any[]).findIndex((x) => idGetter(x) === id)
              if (idx >= 0) (target as any[])[idx] = { ...(target as any[])[idx], ...item }
            }
          } else if (method === 'delete') {
            const id = idGetter(variables as any)
            if (Array.isArray(target)) {
              const idx = (target as any[]).findIndex((x) => idGetter(x) === id)
              if (idx >= 0) (target as any[]).splice(idx, 1)
            }
          }
          if (path) set(draft, path, target)
          return draft as TData
        })()
        queryClient.setQueryData(queryKey, updated)
        return { previous }
      }
      return {}
    },
    onSuccess: (data) => {
      if (!options?.silent) {
        const msg = (data && typeof data === 'object' && (data as any).message) || 'Success'
        toast.success(String(msg))
      }
      options?.onSuccess?.(data)
    },
    onError: (_, __, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous as TData)
      }
      if (!options?.silent) {
        const err: any = __ as any
        const r = err?.response?.data
        const hasValidation = Array.isArray(r?.errors) && r.errors.length > 0
        if (!hasValidation) {
          const msg = (r && r.message) || err?.message || 'Error'
          toast.error(String(msg))
        }
      }
      if (options?.onError) options.onError(__ as any)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const useParallelApi = <P = any>(requests: ParallelRequest<P>[]) => {
    return useQueries({
      queries: requests.map(({ key, request, options }) => ({
        queryKey: Array.isArray(key) ? key : [key],
        queryFn: ({ signal }) => api.request<P>({ ...request, signal }).then((res) => res.data as P),
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
    return api.post(defaultUrl, formData, {
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
      if (enabled && token) localStorage.setItem('access_token', token)
      else localStorage.removeItem('access_token')
    }
  }

  const raw = query.data as any
  const meta: ResponseMeta | undefined = raw && raw.meta ? (raw.meta as ResponseMeta) : undefined
  const payload = raw && raw.success !== undefined && raw.timestamp ? raw.data ?? undefined : raw
  const extracted = typeof payload === 'object' && payload ? payload : undefined

  return {
    data: payload as TData | undefined,
    response: query.data ? ({ data: payload } as AxiosResponse<TData>) : undefined,
    meta,
    validationErrors: raw && raw.errors ? (raw.errors as ValidationError[] | null) : null,
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
    get: (config?: AxiosRequestConfig) => request({ method: 'get', url: defaultUrl, config }),
    post: (data?: V, config?: AxiosRequestConfig) =>
      request<TData>({ method: 'post', url: defaultUrl, data, config }).then((res) => {
        if (!options?.silent) {
          const msg = (res?.data && (res.data as any).message) || 'Success'
          toast.success(String(msg))
        }
        return res as AxiosResponse<TData>
      }).catch((err: any) => {
        if (!options?.silent) {
          const r = err?.response?.data
          const hasValidation = Array.isArray(r?.errors) && r.errors.length > 0
          if (!hasValidation) {
            const msg = (r && r.message) || err?.message || 'Error'
            toast.error(String(msg))
          }
        }
        throw err
      }),
    put: (data?: V, config?: AxiosRequestConfig) =>
      request<TData>({ method: 'put', url: defaultUrl, data, config }).then((res) => {
        if (!options?.silent) {
          const msg = (res?.data && (res.data as any).message) || 'Success'
          toast.success(String(msg))
        }
        return res as AxiosResponse<TData>
      }).catch((err: any) => {
        if (!options?.silent) {
          const r = err?.response?.data
          const hasValidation = Array.isArray(r?.errors) && r.errors.length > 0
          if (!hasValidation) {
            const msg = (r && r.message) || err?.message || 'Error'
            toast.error(String(msg))
          }
        }
        throw err
      }),
    patch: (data?: V, config?: AxiosRequestConfig) =>
      request<TData>({ method: 'patch', url: defaultUrl, data, config }).then((res) => {
        if (!options?.silent) {
          const msg = (res?.data && (res.data as any).message) || 'Success'
          toast.success(String(msg))
        }
        return res as AxiosResponse<TData>
      }).catch((err: any) => {
        if (!options?.silent) {
          const r = err?.response?.data
          const hasValidation = Array.isArray(r?.errors) && r.errors.length > 0
          if (!hasValidation) {
            const msg = (r && r.message) || err?.message || 'Error'
            toast.error(String(msg))
          }
        }
        throw err
      }),
    del: (config?: AxiosRequestConfig) =>
      request<TData>({ method: 'delete', url: defaultUrl, config }).then((res) => {
        if (!options?.silent) {
          const msg = (res?.data && (res.data as any).message) || 'Success'
          toast.success(String(msg))
        }
        return res as AxiosResponse<TData>
      }).catch((err: any) => {
        if (!options?.silent) {
          const r = err?.response?.data
          const hasValidation = Array.isArray(r?.errors) && r.errors.length > 0
          if (!hasValidation) {
            const msg = (r && r.message) || err?.message || 'Error'
            toast.error(String(msg))
          }
        }
        throw err
      }),
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
    ...(extracted || {}),
  } as unknown as UseApiReturn<TData, E, V> & (TData extends object ? Partial<TData> : object)
}

export { api as apiClient }