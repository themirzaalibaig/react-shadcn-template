
import { ENV } from '@/config'

export const toQueryString = <TParams extends object = Record<string, unknown>>(params?: TParams): string => {
  if (!params) return ''
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    if (value instanceof Date) {
      sp.append(key, value.toISOString())
    } else if (Array.isArray(value)) {
      sp.append(key, value.join(','))
    } else if (typeof value === 'object') {
      sp.append(key, JSON.stringify(value))
    } else {
      sp.append(key, String(value))
    }
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export const endpoint = <TParams extends object = Record<string, unknown>>(path: string, params?: TParams, base: string = ENV.API_ENDPOINT || ''): string => {
  const qs = toQueryString<TParams>(params)
  return `${base}${path}${qs}`
}

export const createResourceEndpoints = <TParams extends object = Record<string, unknown>, TId extends string | number = string | number>(resourcePath: string, base: string = ENV.API_ENDPOINT || '') => {
  return {
    ALL: (params?: TParams) => endpoint<TParams>(resourcePath, params, base),
    CREATE: () => endpoint<TParams>(resourcePath, undefined, base),
    GET_BY_ID: (id: TId, params?: TParams) => endpoint<TParams>(`${resourcePath}/${id}`, params, base),
    UPDATE: (id: TId) => endpoint<TParams>(`${resourcePath}/${id}`, undefined, base),
    DELETE: (id: TId) => endpoint<TParams>(`${resourcePath}/${id}`, undefined, base),
  }
}

export const createCustomEndpoints = <TRoutes extends Record<string, (...args: any[]) => { path: string; params?: any }>, TParams extends object = Record<string, unknown>>(
  resourcePath: string,
  routes: TRoutes,
  base: string = ENV.API_ENDPOINT || ''
) => {
  const out = {} as { [K in keyof TRoutes]: (...args: Parameters<TRoutes[K]>) => string }
  (Object.entries(routes) as Array<[keyof TRoutes, TRoutes[keyof TRoutes]]>).forEach(([key, fn]) => {
    out[key] = ((...args: Parameters<typeof fn>) => {
      const def = (fn as any)(...args) as { path: string; params?: TParams }
      const p = def.path.startsWith('/') ? def.path : `${resourcePath}/${def.path}`
      return endpoint<TParams>(p, def.params, base)
    }) as any
  })
  return out
}