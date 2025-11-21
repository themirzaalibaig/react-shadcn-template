import './index.css'
import 'react-toastify/dist/ReactToastify.css'
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { routes } from '@/routes'
import { ReduxProvider } from '@/redux'
import { ReactQueryProvider } from '@/query'
import { Loader } from '@/components/system'
import { ToastContainer } from 'react-toastify'

const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReduxProvider>
      <ReactQueryProvider>
        <Suspense fallback={<Loader />}>
          <RouterProvider router={router} />
          <ToastContainer />
        </Suspense>
      </ReactQueryProvider>
    </ReduxProvider>
  </StrictMode>,
)
