import type { PropsWithChildren } from 'react'
import { ThemeToggle } from '@/components/custom'
import { ErrorBoundary } from '@/components/system'

export const AppLayout = ({ children }: PropsWithChildren) => (
  <div className="min-h-svh flex flex-col">
    <header className="border-b px-4 py-2 flex items-center justify-between">
      <div className="font-medium">App</div>
      <ThemeToggle />
    </header>
    <main className="flex-1 p-4">
      <ErrorBoundary>{children}</ErrorBoundary>
    </main>
  </div>
)
