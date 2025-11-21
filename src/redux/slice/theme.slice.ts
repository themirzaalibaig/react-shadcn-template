import { createSlice } from '@reduxjs/toolkit'

type ThemeState = { mode: 'light' | 'dark' }

const initialState: ThemeState = { mode: 'light' }

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode: (state: ThemeState, action: { payload: 'light' | 'dark' }) => {
      state.mode = action.payload
    },
    toggle: (state: ThemeState) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light'
    },
  },
})

export const { setMode, toggle } = themeSlice.actions
export default themeSlice.reducer