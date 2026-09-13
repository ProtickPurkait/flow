import * as React from 'react'

const STORAGE_KEY = 'flow-theme'

function getInitial(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return stored === 'dark'
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useDarkMode() {
  const [isDark, setIsDark] = React.useState(getInitial)

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark((v) => !v) }
}
