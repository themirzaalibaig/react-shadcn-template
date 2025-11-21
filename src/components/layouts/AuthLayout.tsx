import type { PropsWithChildren } from 'react'

export const AuthLayout = ({ children }: PropsWithChildren) => (
  <div className="min-h-svh grid place-items-center p-4">
    <div className="w-full max-w-md border rounded-lg p-6 bg-background">
      {children}
    </div>
  </div>
)