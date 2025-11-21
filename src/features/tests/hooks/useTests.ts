import { useMemo, useCallback } from 'react'
import { useApi } from '@/hooks'
import { ENDPOINTS } from '@/constants/endpoint'
import type { Test } from '../types'

export const useTests = () => {
  const api = useApi<Test[]>(['tests'], ENDPOINTS.TESTS.ALL(), {
    autoOptimistic: true,
    getId: (x) => (x as Test).id,
  })

  const create = useCallback((payload: Test) => api.post(payload, { url: ENDPOINTS.TESTS.CREATE() }), [api])
  const update = useCallback((payload: Test) => api.put(payload, { url: ENDPOINTS.TESTS.UPDATE(payload.id) }), [api])
  const remove = useCallback((id: number) => api.del({ url: ENDPOINTS.TESTS.DELETE(id) }), [api])

  const items = useMemo(() => (Array.isArray(api.data) ? api.data : []), [api.data])

  return { items, api, create, update, remove }
}