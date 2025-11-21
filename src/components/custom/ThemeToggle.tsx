import { useCallback, useEffect, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux'
import { setMode, toggle } from '@/redux'
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui'

export const ThemeToggle = () => {
  const mode = useAppSelector((s) => s.theme.mode)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const root = document.documentElement
    if (mode === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [mode])

  const options = useMemo(() => ['light', 'dark'] as Array<'light' | 'dark'>, [])
  const onSelect = useCallback(
    (m: 'light' | 'dark') => {
      dispatch(setMode(m))
    },
    [dispatch],
  )
  const onToggle = useCallback(() => dispatch(toggle()), [dispatch])

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onToggle} variant="outline" size="sm">
        {mode}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Theme
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Select theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((m) => (
            <DropdownMenuItem key={m} onClick={() => onSelect(m)}>
              {m}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
