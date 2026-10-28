import { useEffect, useMemo, useState } from 'react'
import { createWorkerIntervention, getComplaints } from '../services/api.js'

const issues = [
  'Water supply issue',
  'Street light not working',
  'Garbage overflow',
  'Road damage',
  'Drainage issue',
  'Other',
]

const solutions = [
  'Inspected the issue',
  'Repair completed',
  'Issue temporarily resolved',
  'Referred for further action',
  'Other',
]

function locationOf(item) {
  return [
    item.village,
    item.ward ? `Ward ${item.ward}` : '',
    item.landmark,
  ].filter(Boolean).join(', ') || 'Location not provided'
}

function dateOf(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export default function WorkerReport({ user, token, onLogout, onDashboard }) {
  const [complaints, setComplaints] = useState([])
  const [complaintId, setComplaintId] = useState('')
  const [issue, setIssue] = useState('')
  const [solution, setSolution] = useState('')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState([])
  const [step, setStep] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let active = true
    getComplaints(token)
      .then((data) => {
        if (active) setComplaints(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Could not load assigned complaints.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  useEffect(() => {
    return () => photos.forEach((photo) => URL.revokeObjectURL(photo.preview))
  }, [photos])

  const selectedComplaint = useMemo(
    () => complaints.find((item) => String(item.id) === String(complaintId)),
    [complaints, complaintId],
  )

  function addPhotos(fileList) {
    setError('')
    const incoming = Array.from(fileList || [])
    const valid = incoming.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files can be selected.')
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`${file.name} exceeds the 5 MB limit.`)
        return false
      }
      return true
    })

    setPhotos((current) => {
      const combined = [...current, ...valid].slice(0, 5)
      const accepted = new Set(combined.map((photo) => photo))
      current.forEach((photo) => {
        if (!accepted.has(photo)) URL.revokeObjectURL(photo.preview)
      })
      return combined.map((file) => ({
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
      }))
    })
  }

  function removePhoto(index) {
    setPhotos((current) => current.filter((photo, i) => {
      if (i === index) URL.revokeObjectURL(photo.preview)
      return i !== index
    }))
  }

  function nextStep() {
    setError('')
    if (step === 1) {
      if (!complaintId || !selectedComplaint) {
        setError('Please select one of your assigned complaints.')
        return
      }
      if (!issue.trim() || !solution.trim() || !notes.trim()) {
        setError('Please complete Issue Found, How Did You Solve It, and Additional Notes.')
        return
      }
    }
    if (step === 2 && photos.length === 0) {
      setStep(3)
      return
    }
    setStep((current) => Math.min(3, current + 1))
  }

  async function submitReport() {
    if (!confirmed) {
      setError('Please confirm that the report details are correct.')
      return
    }
    if (!selectedComplaint) {
      setError('Please select a valid assigned complaint.')
      setStep(1)
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const result = await createWorkerIntervention(token, {
        complaint_id: selectedComplaint.id,
        action_taken: `Issue found: ${issue.trim()}\n\nRepair performed: ${solution.trim()}`,
        notes: notes.trim(),
      })

      setSuccess(
        `Report submitted successfully for complaint #${selectedComplaint.id}. Reference: ${result?.id ?? 'created by server'}.`,
      )
      setStep(4)
    } catch (err) {
      setError(err?.message || 'The report could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const nav = [
    ['Dashboard', '▦'],
    ['My Tasks', '▤'],
    ['Reports', '▧'],
    ['Profile & Settings', '♙'],
    ['Help', '?'],
  ]

  return (
    <main className="gram-worker-portal worker-report-screen">
      <aside className="gram-worker-sidebar">
        <div className="gram-worker-brand">
          <img src="/images/gramseva-logo.png" alt="GramSeva logo" />
          <div><strong>GramSeva</strong><small>Your Village, Our Priority</small></div>
        </div>
        <nav className="gram-worker-nav" aria-label="Worker navigation">
          {nav.map(([label, icon]) => (
            <button
              key={label}
              type="button"
              className={label === 'Reports' ? 'active' : ''}
              onClick={() => label === 'Dashboard' && onDashboard()}
            >
              <span aria-hidden="true">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="gram-village-art">
          <img src="/images/village-landscape.png" alt="" />
        </div>
        <div className="gram-sidebar-footer">
          <strong>Better Communities</strong><span>Stronger Together 🌱</span>
        </div>
      </aside>

      <div className="gram-worker-main">
        <header className="gram-worker-topbar">
          <div className="gram-topbar-title">Report Submission</div>
          <div className="gram-mobile-brand">
            <img src="/images/gramseva-logo.png" alt="" /><strong>GramSeva</strong>
          </div>
          <div className="gram-topbar-spacer" />
          <span className="gram-live-dot" />
          <div className="gram-avatar">
            {(user?.full_name || 'W').trim().charAt(0).toUpperCase()}
          </div>
          <div className="gram-account">
            <strong>{user?.full_name || 'Field Worker'}</strong>
            <small>{user?.department || 'Field Worker'}</small>
          </div>
          <button className="gram-logout" type="button" onClick={onLogout}>Log out</button>
        </header>

        <div className="gram-worker-content">
          {step !== 4 ? (
            <>
              <h1 className="worker-report-title">
                {step === 1 ? 'Report Submission' : step === 2 ? 'Upload Photos' : 'Review & Submit'}
              </h1>

              <div className="worker-report-steps">
                {['Report Details', 'Photos', 'Review & Submit'].map((label, index) => {
                  const number = index + 1
                  return (
                    <button
                      type="button"
                      key={label}
                      className={step === number ? 'active' : step > number ? 'done' : ''}
                      onClick={() => {
                        if (number < step) setStep(number)
                      }}
                    >
                      <span>{step > number ? '✓' : number}</span>{label}
                    </button>
                  )
                })}
              </div>

              {error && <div className="gram-message error" role="alert">{error}</div>}
              {success && <div className="gram-message success" role="status">{success}</div>}

              {step === 1 && (
                <div className="worker-report-columns">
                  <div className="worker-report-panel">
                    <h2>Complaint Details</h2>
                    {loading ? (
                      <p>Loading your assigned complaints…</p>
                    ) : (
                      <>
                        <label htmlFor="report-complaint">Assigned complaint *</label>
                        <select
                          id="report-complaint"
                          value={complaintId}
                          onChange={(event) => setComplaintId(event.target.value)}
                        >
                          <option value="">Select an assigned complaint</option>
                          {complaints.map((item) => (
                            <option key={item.id} value={item.id}>
                              #{item.id} — {item.title || item.category || 'Community issue'}
                            </option>
                          ))}
                        </select>
                        {complaints.length === 0 && (
                          <p className="worker-report-hint">No assigned complaints were returned by the server.</p>
                        )}
                        {selectedComplaint && (
                          <dl className="worker-report-summary">
                            <dt>Complaint ID</dt><dd>#{selectedComplaint.id}</dd>
                            <dt>Type</dt><dd>{selectedComplaint.category || selectedComplaint.title || 'Not specified'}</dd>
                            <dt>Location</dt><dd>{locationOf(selectedComplaint)}</dd>
                            <dt>Submitted</dt><dd>{dateOf(selectedComplaint.created_at)}</dd>
                          </dl>
                        )}
                      </>
                    )}

                    <h2 className="worker-report-subheading">Work Details</h2>
                    <label htmlFor="report-issue">Issue Found *</label>
                    <textarea
                      id="report-issue"
                      value={issue}
                      onChange={(event) => setIssue(event.target.value.slice(0, 2000))}
                      placeholder="Describe the problem you found during inspection..."
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="worker-report-counter">{issue.length}/2000</div>

                    <label htmlFor="report-solution">How did you solve it? *</label>
                    <textarea
                      id="report-solution"
                      value={solution}
                      onChange={(event) => setSolution(event.target.value.slice(0, 2000))}
                      placeholder="Describe the repair or action you actually performed..."
                      rows={3}
                      maxLength={2000}
                    />
                    <div className="worker-report-counter">{solution.length}/2000</div>

                    <label htmlFor="report-notes">Additional Notes *</label>
                    <textarea
                      id="report-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value.slice(0, 500))}
                      placeholder="Write details about the work done…"
                      rows={4}
                      maxLength={500}
                    />
                    <div className="worker-report-counter">{notes.length}/500</div>
                  </div>


                </div>
              )}

              {step === 2 && (
                <div className="worker-report-columns">
                  <section className="worker-report-panel">
                    <h2>Upload Work Photos</h2>
                    <p className="worker-report-hint">Add clear photos of the work done, before or after if possible.</p>
                    <label className="worker-report-dropzone">
                      <span className="worker-report-upload-icon">▧</span>
                      <strong>Click to upload or drag and drop</strong>
                      <span>JPG, PNG or WebP · Max 5 MB each · Up to 5 photos</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={(event) => {
                          addPhotos(event.target.files)
                          event.target.value = ''
                        }}
                      />
                    </label>
                    <h3 className="worker-report-photo-heading">Selected Photos ({photos.length})</h3>
                    {photos.length > 0 && (
                      <div className="worker-report-photo-grid">
                        {photos.map((photo, index) => (
                          <figure key={`${photo.name}-${index}`}>
                            <img src={photo.preview} alt={photo.name} />
                            <button type="button" onClick={() => removePhoto(index)} aria-label={`Remove ${photo.name}`}>×</button>
                            <figcaption>{photo.name}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </section>
                  <aside className="worker-report-panel worker-report-guidelines">
                    <h2>Photo Guidelines</h2>
                    {[
                      'Take clear and focused photos',
                      'Include the surrounding area',
                      'Show before and after if possible',
                      'Avoid blurry images',
                    ].map((item) => <p key={item}><span>✓</span>{item}</p>)}
                    <p className="worker-report-hint">Photos are previews only and are not saved to the server by this version.</p>
                  </aside>
                </div>
              )}

              {step === 3 && (
                <div className="worker-report-columns">
                  <section className="worker-report-panel">
                    <h2>Summary</h2>
                    <dl className="worker-report-summary">
                      <dt>Complaint ID</dt><dd>#{selectedComplaint?.id ?? '—'}</dd>
                      <dt>Type</dt><dd>{selectedComplaint?.category || selectedComplaint?.title || '—'}</dd>
                      <dt>Location</dt><dd>{selectedComplaint ? locationOf(selectedComplaint) : '—'}</dd>
                      <dt>Issue Found</dt><dd>{issue || '—'}</dd>
                      <dt>Solution</dt><dd>{solution || '—'}</dd>
                      <dt>Notes</dt><dd>{notes || '—'}</dd>
                      <dt>Photos</dt><dd>{photos.length} selected — upload is not connected yet</dd>
                    </dl>
                    {photos.length > 0 && (
                      <div className="worker-report-photo-grid worker-report-review-photos">
                        {photos.map((photo, index) => (
                          <figure key={`${photo.name}-${index}`}>
                            <img src={photo.preview} alt={photo.name} />
                            <figcaption>{photo.name}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </section>
                  <aside className="worker-report-panel">
                    <h2>Final Submit</h2>
                    <label className="worker-report-confirm">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(event) => setConfirmed(event.target.checked)}
                      />
                      <span>I confirm that the work is completed and the information is correct.</span>
                    </label>
                    <p className="worker-report-hint">Submitting saves the repair action and notes. Photo attachments will need to be connected before they are stored with this report.</p>
                  </aside>
                </div>
              )}

              <div className="worker-report-actions">
                <button
                  type="button"
                  className="worker-report-secondary"
                  onClick={() => step === 1 ? onDashboard() : setStep(step - 1)}
                  disabled={submitting}
                >
                  {step === 1 ? 'Cancel' : 'Back'}
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    className="worker-report-primary"
                    onClick={nextStep}
                    disabled={loading || (step === 1 && complaints.length === 0)}
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    className="worker-report-primary"
                    onClick={submitReport}
                    disabled={submitting || !confirmed}
                  >
                    {submitting ? 'Submitting…' : '➤ Submit Report'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <section className="worker-report-success">
              <div>✓</div>
              <h1>Report submitted</h1>
              <p>{success}</p>
              <button className="worker-report-primary" type="button" onClick={onDashboard}>
                Back to Dashboard
              </button>
            </section>
          )}
          <footer className="gram-worker-footer">
            <span>GramSeva · Your Village, Our Priority</span>
            <span>Field Worker Portal</span>
          </footer>
        </div>
      </div>
    </main>
  )
}
