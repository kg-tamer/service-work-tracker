import { useId } from 'react'
import { viewHref } from '../hooks/useHashView'
import { useI18n } from '../i18n/I18nContext'
import type { ServiceProgress } from '../lib/service'
import { SettingsIcon, TargetIcon } from './icons'

function ProgressBar({ ratio, label, thin = false }: { ratio: number; label: string; thin?: boolean }) {
  const percent = Math.floor(ratio * 100)
  return (
    <div
      className={thin ? 'progress-track thin' : 'progress-track'}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span className="progress-fill" style={{ inlineSize: `${percent}%` }} />
    </div>
  )
}

export function ProgressCard({ progress }: { progress: ServiceProgress }) {
  const i18n = useI18n()
  const { t } = i18n
  const titleId = useId()
  const finish = (remaining: number, date: string | null) =>
    remaining === 0 ? t('estimateCompleted') : date ? i18n.shortWeekdayDate(date) : '—'

  return (
    <section className="card progress-card" aria-labelledby={titleId}>
      <h2 id={titleId} className="card-title">
        <TargetIcon />
        {t('progressTitle')}
      </h2>

      <div className="completed">
        <span className="completed-label">{t('completedLabel')}</span>
        <bdi className="completed-value" dir="ltr">
          <strong>{progress.workedDays}</strong>
          {progress.configured && <span className="completed-total"> / {progress.requiredNetDays}</span>}
        </bdi>
      </div>

      {progress.configured ? (
        <>
          <ProgressBar ratio={progress.progressWithoutShortening} label={t('completedLabel')} />
          <p className="progress-percent">
            {t('percentDone', { percent: Math.floor(progress.progressWithoutShortening * 100) })}
          </p>

          <div className="remaining-grid">
            <div className="remaining-tile">
              <span className="tile-label">{t('remainingLabel')}</span>
              <strong className="tile-value">{progress.remainingWithoutShortening}</strong>
              <span className="tile-sub">
                {t('targetLabel')}: <bdi dir="ltr">{progress.requiredNetDays}</bdi>
              </span>
              {progress.remainingWithoutShortening === 0 && <span className="tile-done">{t('targetReached')}</span>}
            </div>
            <div className="remaining-tile is-shortened">
              <span className="tile-label">{t('remainingWithShorteningLabel')}</span>
              <strong className="tile-value">{progress.remainingWithShortening}</strong>
              <span className="tile-sub">
                {t('targetLabel')}:{' '}
                <bdi dir="ltr">
                  {progress.requiredNetDays} − {progress.shorteningDays} = {progress.shortenedTarget}
                </bdi>
              </span>
              <ProgressBar ratio={progress.progressWithShortening} label={t('estimateWith')} thin />
              {progress.remainingWithShortening === 0 && <span className="tile-done">{t('targetReached')}</span>}
            </div>
          </div>

          <div className="estimates">
            <h3 className="estimates-title">{t('estimateTitle')}</h3>
            <dl>
              <div className="estimate-row">
                <dt>{t('estimateWithout')}</dt>
                <dd>{finish(progress.remainingWithoutShortening, progress.finishWithoutShortening)}</dd>
              </div>
              <div className="estimate-row is-shortened">
                <dt>{t('estimateWith')}</dt>
                <dd>{finish(progress.remainingWithShortening, progress.finishWithShortening)}</dd>
              </div>
            </dl>
            <p className="hint">{t('estimateHint')}</p>
          </div>
        </>
      ) : (
        <div className="setup-prompt">
          <p className="setup-title">{t('setupTitle')}</p>
          <p className="setup-text">{t('setupText')}</p>
          <a className="button secondary" href={viewHref('settings')}>
            <SettingsIcon />
            {t('openSettings')}
          </a>
        </div>
      )}
    </section>
  )
}
