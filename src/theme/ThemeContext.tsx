import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'cli-tool-registry.theme'
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

function detectInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'dark'
  } catch {
    return 'dark'
  }
}

function detectSystemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(COLOR_SCHEME_QUERY).matches
    ? 'dark'
    : 'light'
}

function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved)
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content', resolved === 'dark' ? '#080e1a' : '#f5f7fa',
  )
}

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(detectInitialTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(detectSystemTheme)
  const resolvedTheme = theme === 'system' ? systemTheme : theme

  useLayoutEffect(() => {
    const media = window.matchMedia(COLOR_SCHEME_QUERY)
    const update = () => {
      const nextSystemTheme: ResolvedTheme = media.matches ? 'dark' : 'light'
      setSystemTheme(nextSystemTheme)
      const resolved = theme === 'system' ? nextSystemTheme : theme
      applyResolvedTheme(resolved)
    }

    update()
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

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
