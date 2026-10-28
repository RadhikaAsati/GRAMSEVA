import { useEffect, useState } from 'react'
import { getComplaintCaseHistory } from '../services/api.js'

function formatDate(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function readable(value) {
  return String(value || 'Not recorded')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function EmptyState({ children }) {
  return <div className="case-history-empty">{children}</div>
}

async function loadComplaintPhoto(token, complaintId, attachmentId) {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

  const response = await fetch(
    `${baseUrl}/complaints/${complaintId}/attachments/${attachmentId}/photo`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Unable to load this complaint photo.')
  }

  return URL.createObjectURL(await response.blob())
}

export default function WorkerComplaintHistory({
  token,
  complaint,
  user,
  onBack,
  onLogout,
  onRecordWork,
}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [photoUrls, setPhotoUrls] = useState({})


  useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      setLoading(true)
      setError('')
      setData(null)

      try {
        const result = await getComplaintCaseHistory(token, complaint.id)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load this complaint history.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHistory()

    return () => {
      cancelled = true
    }
  }, [token, complaint.id, attempt])

  useEffect(() => {
    let cancelled = false
    let createdUrls = []

    async function loadPhotos() {
      const attachments = data?.complaint?.attachments || []
      const entries = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const url = await loadComplaintPhoto(
              token,
              complaint.id,
              attachment.id,
            )
            return [attachment.id, url]
          } catch {
            return [attachment.id, null]
          }
        }),
      )

      const urls = Object.fromEntries(entries)
      if (cancelled) {
        Object.values(urls).forEach((url) => {
          if (url) URL.revokeObjectURL(url)
        })
        return
      }

      createdUrls = Object.values(urls).filter(Boolean)
      setPhotoUrls(urls)
    }

    setPhotoUrls({})
    if (data?.complaint?.attachments?.length) {
      loadPhotos()
    }

    return () => {
      cancelled = true
      createdUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [data, token, complaint.id])

  const current = data?.complaint || complaint
  const interventions = data?.interventions || []
  const feedback = data?.citizen_feedback || []
  const decisions = data?.admin_decisions || []
  const recurrence = data?.recurrence
  const resolution = data?.resolution

  return (
    <main className="gram-worker-portal case-history-screen">
      <aside className="gram-worker-sidebar">
        <div className="gram-worker-brand">
          <img src="/images/gramseva-logo.png" alt="GramSeva logo" />
          <div>
            <strong>GramSeva</strong>
            <small>Your Village, Our Priority</small>
          </div>
        </div>

        <div className="case-history-sidebar-intro">
          <span>FIELD WORKER</span>
          <h2>Case history</h2>
          <p>Understand the issue before deciding your next step.</p>
        </div>

        <button className="case-history-back side-back" type="button" onClick={onBack}>
          ← Back to My Tasks
        </button>

        <div className="gram-sidebar-footer">
          <strong>Better Communities</strong>
          <span>Stronger Together 🌱</span>
        </div>
      </aside>

      <section className="gram-worker-main">
        <header className="gram-worker-topbar">
          <div className="gram-topbar-title">Complaint Details <span>& History</span></div>
          <div className="gram-mobile-brand">
            <img src="/images/gramseva-logo.png" alt="" />
            <strong>GramSeva</strong>
          </div>
          <div className="gram-topbar-spacer" />
          <span className="gram-live-dot" title="Worker portal" />
          <div className="gram-avatar">
            {(user?.full_name || 'W').trim().charAt(0).toUpperCase()}
          </div>
          <div className="gram-account">
            <strong>{user?.full_name || 'Field Worker'}</strong>
            <small>{user?.department || 'Field Worker'}</small>
          </div>
          <button className="gram-logout" type="button" onClick={onLogout}>
            Log out
          </button>
        </header>

        <div className="case-history-content">
          <button className="case-history-back mobile-back" type="button" onClick={onBack}>
            ← Back to My Tasks
          </button>

          <div className="case-history-heading">
            <div>
              <span className="case-history-eyebrow">COMPLAINT #{current.id}</span>
              <h1>{current.title || current.category || 'Community complaint'}</h1>
              <p>Review recorded work, feedback and previous cases before acting.</p>
            </div>
            <span className={`case-history-status status-${String(current.status || 'pending').toLowerCase()}`}>
              {readable(current.status)}
            </span>
          </div>

          {loading && (
            <div className="case-history-message">
              <span className="case-history-spinner" />
              <strong>Loading complaint history…</strong>
              <p>Fetching the recorded case details from GRAMSEVA.</p>
            </div>
          )}

          {!loading && error && (
            <div className="case-history-message case-history-error" role="alert">
              <strong>We couldn't load this history.</strong>
              <p>{error}</p>
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                Try again
              </button>
            </div>
          )}

          {!loading && (
            <>
              <section className="case-history-overview">
                <div className="case-history-section-title">
                  <span className="case-history-icon">▤</span>
                  <div>
                    <h2>About this complaint</h2>
                    <p>The information recorded for this report</p>
                  </div>
                </div>

                <div className="case-history-overview-grid">
                  <div>
                    <span>Category</span>
                    <strong>{readable(current.category)}</strong>
                  </div>
                  <div>
                    <span>Reported on</span>
                    <strong>{formatDate(current.created_at)}</strong>
                  </div>
                  <div>
                    <span>Linked asset</span>
                    <strong>{current.asset?.name || 'No asset linked'}</strong>
                  </div>
                  <div>
                    <span>Asset location</span>
                    <strong>{current.asset?.location || [
                      complaint.village,
                      complaint.ward ? `Ward ${complaint.ward}` : '',
                      complaint.landmark,
                    ].filter(Boolean).join(' · ') || 'Location not provided'}</strong>
                  </div>
                </div>

                <div className="case-history-description">
                  <span>Description</span>
                  <p>{current.description || 'No description was recorded.'}</p>
                </div>
                {data?.complaint?.attachments?.length > 0 && (
                  <div className="case-history-photo-gallery">
                    <div className="case-history-description">
                      <span>Original complaint photos</span>
                      <p>Images submitted with this complaint</p>
                    </div>
                    <div className="case-history-complaint-photos">
                      {data.complaint.attachments.map((attachment) => (
                        <figure key={attachment.id}>
                          {photoUrls[attachment.id] ? (
                            <a
                              href={photoUrls[attachment.id]}
                              target="_blank"
                              rel="noreferrer"
                              className="case-history-photo-link"
                            >
                              <img
                                className="case-history-photo"
                                src={photoUrls[attachment.id]}
                                alt={
                                  attachment.description ||
                                  attachment.original_filename ||
                                  'Original complaint photo'
                                }
                                loading="lazy"
                              />
                              <span>Open full-size photo ↗</span>
                            </a>
                          ) : (
                            <div className="case-history-photo-unavailable">
                              Photo could not be loaded.
                            </div>
                          )}
                          {(attachment.description ||
                            attachment.original_filename) && (
                            <figcaption>
                              {attachment.description ||
                                attachment.original_filename}
                            </figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

              </section>

              {!error && (
                <>
                  <section className="case-history-panel case-history-work">
                    <div className="case-history-section-title">
                      <span className="case-history-icon">◷</span>
                      <div>
                        <h2>Work done so far</h2>
                        <p>See what has already been tried, from earliest to latest</p>
                      </div>
                    </div>

                    {interventions.length === 0 ? (
                      <EmptyState>No work has been recorded yet.</EmptyState>
                    ) : (
                      <div className="case-history-timeline">
                        {interventions.map((item) => (
                          <article className="case-history-event" key={item.id}>
                            <span className="case-history-timeline-dot" />
                            <div className="case-history-event-card">
                              <div className="case-history-event-top">
                                <span className="case-history-event-label">WORK RECORDED</span>
                                <time>{formatDate(item.created_at)}</time>
                              </div>
                              <h3>{item.action_taken}</h3>
                              <p className="case-history-worker">
                                <span>Recorded by</span> {item.performed_by || 'Worker not recorded'}
                              </p>
                              {item.notes && (
                                <div className="case-history-notes">
                                  <strong>Additional notes</strong>
                                  <p>{item.notes}</p>
                                </div>
                              )}
                              {item.evidence?.length > 0 && (
                                <div className="case-history-evidence">
                                  <strong>Evidence ({item.evidence.length})</strong>
                                  {item.evidence.map((evidence) => (
                                    <div key={evidence.id}>
                                      {evidence.file_url ? (
                                        <div className="case-history-evidence-item">
                                          {(/\\.(jpe?g|png|webp)(?:$|\\?)/i).test(evidence.file_url) ? (
                                            <a
                                              className="case-history-photo-link"
                                              href={evidence.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                            >
                                              <img
                                                className="case-history-photo"
                                                src={evidence.file_url}
                                                alt={evidence.description || 'Repair evidence photo'}
                                                loading="lazy"
                                              />
                                              <span>Open full-size photo ↗</span>
                                            </a>
                                          ) : (
                                            <a href={evidence.file_url} target="_blank" rel="noreferrer">
                                              {evidence.description || 'Open evidence file'}
                                            </a>
                                          )}
                                          {evidence.description && (
                                            <p>{evidence.description}</p>
                                          )}
                                        </div>
                                      ) : (
                                        evidence.description || 'Evidence file'
                                      )}
                                      <small>{formatDate(evidence.created_at)}</small>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="case-history-panel case-history-citizen">
                    <div className="case-history-section-title">
                      <span className="case-history-icon">♡</span>
                      <div>
                        <h2>What the citizen said</h2>
                        <p>Feedback shared after the work was done</p>
                      </div>
                    </div>

                    {feedback.length === 0 ? (
                      <EmptyState>No feedback has been shared yet.</EmptyState>
                    ) : (
                      <div className="case-history-feedback-list">
                        {feedback.map((item) => (
                          <article className="case-history-feedback" key={item.id}>
                            <div>
                              <span className={`case-history-outcome outcome-${String(item.outcome || '').toLowerCase()}`}>
                                {readable(item.outcome)}
                              </span>
                              <time>{formatDate(item.created_at)}</time>
                            </div>
                            <p>{item.comments || 'No extra comment was added.'}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="case-history-panel case-history-resolution">
                    <div className="case-history-section-title">
                      <span className="case-history-icon">✓</span>
                      <div>
                        <h2>Is the problem fixed?</h2>
                        <p>Current assessment based on recorded work and feedback</p>
                      </div>
                    </div>
                    <div className="case-history-resolution-grid">
                      <div>
                        <span>Current result</span>
                        <strong>{readable(resolution?.outcome)}</strong>
                      </div>
                      <div>
                        <span>More work needed</span>
                        <strong>{resolution?.requires_follow_up == null
                          ? 'Not available'
                          : resolution.requires_follow_up ? 'Yes' : 'No'}</strong>
                      </div>
                    </div>
                    {resolution?.recommendation && (
                      <p className="case-history-recommendation">{resolution.recommendation}</p>
                    )}
                  </section>

                  <section className="case-history-panel case-history-related-cases">
                    <div className="case-history-section-title">
                      <span className="case-history-icon">↻</span>
                      <div>
                        <h2>Has this happened before?</h2>
                        <p>Earlier related reports based on complaint details and category</p>
                      </div>
                    </div>

                    {recurrence?.message && (
                      <p className="case-history-recurrence-message">{recurrence.message}</p>
                    )}

                    {recurrence?.historical_complaints?.length ? (
                      <div className="case-history-related-list">
                        {recurrence.historical_complaints.map((item) => (
                          <article className="case-history-related" key={item.complaint_id}>
                            <div>
                              <strong>#{item.complaint_id} · {item.title || item.category}</strong>
                              <span>{readable(item.status)}</span>
                            </div>
                            <p>Latest citizen outcome: {readable(item.latest_citizen_outcome)}</p>
                            {item.previous_interventions?.length > 0 ? (
                              <div className="case-history-earlier-work">
                                <strong>Previously recorded work</strong>
                                {item.previous_interventions.map((work) => (
                                  <div key={work.intervention_id}>
                                    <p>{work.action_taken}</p>
                                    <small>
                                      {work.performed_by || 'Worker not recorded'} · {formatDate(work.created_at)}
                                    </small>
                                    {work.notes && <p>{work.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <small>No work was recorded for this earlier report.</small>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>No earlier related complaints were found.</EmptyState>
                    )}
                  </section>

                  

                  <section className="case-history-panel case-history-admin">
                    <div className="case-history-section-title">
                      <span className="case-history-icon">▣</span>
                      <div>
                        <h2>Instructions from the admin</h2>
                        <p>Guidance to help you decide what to do next</p>
                      </div>
                    </div>

                    {decisions.length === 0 ? (
                      <EmptyState>There are no admin instructions for this complaint yet.</EmptyState>
                    ) : (
                      <div className="case-history-feedback-list">
                        {decisions.map((item) => (
                          <article className="case-history-feedback" key={item.id}>
                            <div>
                              <span className="case-history-outcome">{readable(item.decision)}</span>
                              <time>{formatDate(item.created_at)}</time>
                            </div>
                            <p>{item.notes}</p>
                            <small>Recorded by {item.administrator || 'Administrator not recorded'}</small>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}

              <section className="case-history-panel case-history-location-card">
                <div className="case-history-section-title">
                  <span className="case-history-icon">⌖</span>
                  <div>
                    <h2>Location</h2>
                    <p>Where this complaint was reported</p>
                  </div>
                </div>
                <div className="case-history-location-details">
                  <strong>{current.asset?.name || 'Complaint location'}</strong>
                  <p>
                    {current.asset?.location || [
                      complaint.village,
                      complaint.ward ? `Ward ${complaint.ward}` : '',
                      complaint.landmark,
                    ].filter(Boolean).join(' · ') || 'No location details were recorded.'}
                  </p>
                  {(() => {
                    const address = current.asset?.location || [
                      complaint.village,
                      complaint.ward ? `Ward ${complaint.ward}` : '',
                      complaint.landmark,
                    ].filter(Boolean).join(', ')
                    return address ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="case-history-map-link"
                      >
                        Search this location on Google Maps ↗
                      </a>
                    ) : null
                  })()}
                  <small>
                    This opens a location search, not a verified GPS pin.
                  </small>
                </div>
              </section>
</>
          )}
        </div>
      </section>
    </main>
  )
}

