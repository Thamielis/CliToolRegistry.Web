import { useState } from 'react'
import type { AppEntry } from '../types/app'
import { TOOL_LOGO_BY_ID } from '../data/toolLogos'
import { useTheme } from '../theme/ThemeContext'

type ToolIconIdentity = Pick<AppEntry, 'id' | 'name' | 'icon'>

function isLegacyText(value: string | undefined): value is string {
  if (!value?.trim()) return false
  const candidate = value.trim()
  return !(
    /^[a-z][a-z\d+.-]*:/i.test(candidate)
    || candidate.startsWith('/')
    || candidate.startsWith('\\')
    || candidate.includes('://')
    || /^[^\s]+\.(?:svg|png|webp|jpe?g|ico)(?:[?#].*)?$/i.test(candidate)
  )
}

function initials(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? []
  if (words.length > 1) return words.slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase()
  return Array.from(words[0] ?? '?').slice(0, 2).join('').toUpperCase()
}

export function AppIcon({ app, className = '' }: { app: ToolIconIdentity; className?: string }) {
  const { resolvedTheme } = useTheme()
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const entry = TOOL_LOGO_BY_ID.get(app.id)
  const relativeAsset = resolvedTheme === 'dark'
    ? entry?.darkAsset ?? entry?.asset
    : entry?.lightAsset ?? entry?.asset
  const currentSource = relativeAsset
    ? `${import.meta.env.BASE_URL}tool-logos/${relativeAsset}`
    : null
  const imageFailed = currentSource !== null && failedSource === currentSource
  const legacy = isLegacyText(app.icon) ? app.icon.trim() : null
  const fallback = legacy ?? initials(app.name)
  const frameClass = [
    'app-icon-frame',
    className,
    entry?.surface === 'light' ? 'app-icon-frame--surface-light' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={frameClass} aria-hidden="true" data-logo-id={app.id} data-logo-kind={entry?.kind ?? 'fallback'}>
      {currentSource && !imageFailed ? (
        <img
          key={currentSource}
          className="app-icon-image"
          src={currentSource}
          alt=""
          width={42}
          height={42}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSource(currentSource)}
        />
      ) : (
        <span className="app-icon-fallback">{fallback}</span>
      )}
      {app.id === 'python3' && currentSource && !imageFailed && <span className="app-icon-trademark">™</span>}
    </div>
  )
}
