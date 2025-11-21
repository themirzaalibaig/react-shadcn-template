import type { RouteObject } from 'react-router-dom'
import { About, App } from '@/pages'
import { AppLayout } from '@/components/layouts'
import { Protected } from '@/features/auth'
import { TestsPage } from '@/features/tests'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: (
      <AppLayout>
        <App />
      </AppLayout>
    ),
  },
  {
    path: '/about',
    element: (
      <AppLayout>
        <Protected>
          <About />
        </Protected>
      </AppLayout>
    ),
  },
  {
    path: '/tests',
    element: (
      <AppLayout>
        <TestsPage />
      </AppLayout>
    ),
  },
]
