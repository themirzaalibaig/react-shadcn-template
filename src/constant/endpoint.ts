import { createResourceEndpoints, createCustomEndpoints } from '@/lib'
import type { Pagination, Sort, Status } from '@/types'

type TestParams = Pagination & Sort & Status

export const ENDPOINTS = {
  TESTS: {
    ...createResourceEndpoints<TestParams, string | number>('/tests'),
    ...createCustomEndpoints('/tests', {
      UPDATE_STATUS: (id: string | number) => ({ path: `${id}` }),
    }),
  },
}
