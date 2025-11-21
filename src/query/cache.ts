import { queryClient } from './'

export const prefetch = async <T>(key: any[], fn: () => Promise<T>) => {
  await queryClient.prefetchQuery({ queryKey: key, queryFn: fn })
}

export const invalidate = async (keys: any[] | Array<any[]>) => {
  const list = Array.isArray(keys[0]) ? (keys as Array<any[]>) : [keys as any[]]
  for (const k of list) await queryClient.invalidateQueries({ queryKey: k })
}

export const setOptimistic = <T>(key: any[], updater: (old: T | undefined) => T) => {
  queryClient.setQueryData<T>(key, (old) => updater(old as T | undefined))
}