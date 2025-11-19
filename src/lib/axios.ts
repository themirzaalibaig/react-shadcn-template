import axios from 'axios'
import type { AxiosInstance } from 'axios'

export interface ApiClientConfig {
  enableTokenRefresh?: boolean
  refreshUrl?: string
  refreshMethod?: 'post' | 'get' | 'put' | 'patch' | 'delete'
  getRefreshPayload?: () => any
  extractTokens?: (response: any) => { accessToken?: string; refreshToken?: string }
  accessTokenKey?: string
  refreshTokenKey?: string
  authorizationHeader?: string
}

let config: ApiClientConfig = {
  enableTokenRefresh: false,
  refreshUrl: '/auth/refresh',
  refreshMethod: 'post',
  getRefreshPayload: () => ({ refresh_token: localStorage.getItem('refresh_token') || '' }),
  extractTokens: (res: any) => ({ accessToken: res?.data?.access_token, refreshToken: res?.data?.refresh_token }),
  accessTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  authorizationHeader: 'Authorization',
}

export const configureApiClient = (cfg: Partial<ApiClientConfig>) => {
  config = { ...config, ...cfg }
}

export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? 'https://jsonplaceholder.typicode.com',
  withCredentials: true,
  timeout: 15000,
})

let refreshPromise: Promise<void> | null = null

api.interceptors.request.use((req) => {
  const token = localStorage.getItem(config.accessTokenKey || 'access_token')
  if (token && req.headers) {
    req.headers[config.authorizationHeader || 'Authorization'] = `Bearer ${token}`
  }
  return req
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const status = error?.response?.status
    const original = error?.config
    if (status === 401 && config.enableTokenRefresh && !original?._retry) {
      if (!localStorage.getItem(config.refreshTokenKey || 'refresh_token')) return Promise.reject(error)
      original._retry = true
      if (!refreshPromise) {
        refreshPromise = (async () => {
          const payload = config.getRefreshPayload ? config.getRefreshPayload() : {}
          const res = await api.request({ url: config.refreshUrl || '/auth/refresh', method: config.refreshMethod || 'post', data: payload })
          const tokens = config.extractTokens ? config.extractTokens(res) : { accessToken: res?.data?.access_token, refreshToken: res?.data?.refresh_token }
          if (tokens?.accessToken) localStorage.setItem(config.accessTokenKey || 'access_token', tokens.accessToken as string)
          if (tokens?.refreshToken) localStorage.setItem(config.refreshTokenKey || 'refresh_token', tokens.refreshToken as string)
        })().finally(() => {
          refreshPromise = null
        })
      }
      await refreshPromise
      return api(original)
    }
    return Promise.reject(error)
  },
)