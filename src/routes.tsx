import type { RouteObject } from 'react-router-dom'
import { About } from '@/pages/About'
import { App } from './App'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/about',
    element: <About />,
  },
]
