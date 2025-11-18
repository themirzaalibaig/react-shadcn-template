import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes'
import { ReduxProvider } from '@/redux/Provider'
import { ReactQueryProvider } from '@/query/Provider'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <ReactQueryProvider>
        <RouterProvider router={router} />
      </ReactQueryProvider>
    </ReduxProvider>
  </StrictMode>,
)
