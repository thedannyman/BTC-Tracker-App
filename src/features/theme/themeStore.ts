import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'

const getInitialTheme = (): ThemeMode => {
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return preferredDark ? 'dark' : 'light'
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme }
}
