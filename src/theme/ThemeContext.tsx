import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'cli-tool-registry.theme'

function detectInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme
  root.setAttribute('data-theme', resolved)
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', resolved === 'dark' ? '#080e1a' : '#f5f7fa',
  )
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(detectInitialTheme)

  useLayoutEffect(() => {
    applyTheme(theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => applyTheme(theme)
    if (theme === 'system') media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [theme])

  const setTheme = (next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Theme selection remains available when browser storage is blocked.
    }
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
