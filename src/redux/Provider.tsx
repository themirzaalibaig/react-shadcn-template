import type { PropsWithChildren } from 'react'
import { Suspense } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { persistor, store } from './store'

export const ReduxProvider = ({ children }: PropsWithChildren) => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <Suspense>{children}</Suspense>
    </PersistGate>
  </Provider>
)
