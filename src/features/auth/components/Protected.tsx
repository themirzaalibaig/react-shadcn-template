import type { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'

export const Protected = ({ children }: PropsWithChildren) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/about" replace />
  return children as any
}