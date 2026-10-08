import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'

export function CommandBlock({
  command,
  compact = false,
}: {
  command: string
  compact?: boolean
}) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const timeout = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timeout.current !== null) window.clearTimeout(timeout.current)
    },
    [],
  )

  const copyCommand = async () => {
    if (timeout.current !== null) window.clearTimeout(timeout.current)
    setCopied(false)
    setFailed(false)

    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      timeout.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setFailed(true)
      timeout.current = window.setTimeout(() => setFailed(false), 2400)
    }
  }

  return (
    <div className={'command-block' + (compact ? ' command-block-compact' : '')}>
      <code title={command}>{command}</code>
      <button
        type="button"
        className="copy-button"
        onClick={copyCommand}
        aria-label={copied ? t('copied') : t('copyCommand')}
        title={copied ? t('copied') : failed ? t('copyFailed') : t('copyCommand')}
      >
        {copied ? (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="m4 10 4 4 8-8" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect x="7" y="5" width="9" height="11" rx="1.5" />
            <path d="M13 5V3.8A1.8 1.8 0 0 0 11.2 2H5.8A1.8 1.8 0 0 0 4 3.8v8.4A1.8 1.8 0 0 0 5.8 14H7" />
          </svg>
        )}
      </button>
      <span className="sr-only" role="status">{copied ? t('copied') : ''}</span>
      {failed && <span className="copy-error" role="alert">{t('copyFailed')}</span>}
    </div>
  )
}
