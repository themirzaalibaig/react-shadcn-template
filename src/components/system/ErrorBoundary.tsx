import React, { useMemo } from 'react'
import type { PropsWithChildren, ReactNode } from 'react'

type BoundaryProps = PropsWithChildren<{ fallback?: ReactNode }>

class Boundary extends React.Component<BoundaryProps, { hasError: boolean }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback as any
    return this.props.children as any
  }
}

export const ErrorBoundary = ({ children, fallback }: PropsWithChildren<{ fallback?: ReactNode }>) => {
  const f = useMemo(() => fallback ?? <div className="p-4">Something went wrong</div>, [fallback])
  return <Boundary fallback={f}>{children}</Boundary>
}