import { useState } from 'react'
import type { AppEntry } from '../types/app'

function faviconUrl(appUrl: string): string | null {
  try {
    const { hostname } = new URL(appUrl)
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
  } catch {
    return null
  }
}

export function AppIcon({
  app,
  className,
}: {
  app: AppEntry
  className: string
}) {
  const [failed, setFailed] = useState(false)
  const isIconUrl = app.icon?.startsWith('http')
  const src = isIconUrl ? app.icon! : faviconUrl(app.url)

  return (
    <div className={className} aria-hidden="true">
      {failed || !src ? (
        (isIconUrl ? '📦' : app.icon) ?? '📦'
      ) : (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      )}
    </div>
  )
}
