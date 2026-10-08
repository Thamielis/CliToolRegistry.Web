import { useState } from 'react'
import { useLocale } from '../i18n/LocaleContext'

const REPO_URL = 'https://github.com/ychsieh95/app-list'

export function FeedbackButton() {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const handleSend = () => {
    const body = encodeURIComponent(message.trim())
    const url = `${REPO_URL}/issues/new?title=${encodeURIComponent('Feedback')}&body=${body}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setMessage('')
    setOpen(false)
  }

  return (
    <div className="feedback">
      {open && (
        <div className="feedback-panel">
          <p className="feedback-panel-title">{t('feedbackTitle')}</p>
          <textarea
            className="feedback-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('feedbackPlaceholder')}
            rows={4}
            autoFocus
          />
          <div className="feedback-panel-actions">
            <button type="button" onClick={() => setOpen(false)}>
              {t('feedbackCancel')}
            </button>
            <button
              type="button"
              className="feedback-send"
              onClick={handleSend}
              disabled={!message.trim()}
            >
              {t('feedbackSend')}
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="feedback-fab"
        aria-label={t('feedbackTitle')}
        onClick={() => setOpen((v) => !v)}
      >
        💬
      </button>
    </div>
  )
}
