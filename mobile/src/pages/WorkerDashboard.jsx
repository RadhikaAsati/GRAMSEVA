import { useCallback, useEffect, useState } from 'react'
import { getComplaints } from '../services/api.js'

function prettyStatus(value) {
  return String(value || 'Pending').replaceAll('_', ' ')
}

function locationLabel(complaint) {
  return [
    complaint.village,
    complaint.ward ? `Ward ${complaint.ward}` : '',
    complaint.landmark,
  ].filter(Boolean).join(' · ') || 'Location not provided'
}

function dateLabel(value) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

export default function WorkerDashboard({ user, token, onLogout }) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadAssignments = useCallback(async (manual = false) => {
    setError('')
    if (manual) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await getComplaints(token)
      setComplaints(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'Could not load your assigned complaints.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  return (
    <main className="citizen-dashboard worker-dashboard">
      <header className="citizen-topbar">
        <div className="citizen-brand">
          <span className="citizen-brand-mark">G</span>
          <div>
            <strong>GramSeva</strong>
            <small>Field Worker Portal</small>
          </div>
        </div>
        <button className="citizen-logout" onClick={onLogout}>Log out</button>
      </header>

      <section className="citizen-welcome worker-welcome">
        <div>
          <p className="citizen-eyebrow">FIELD WORKER PORTAL</p>
          <h1>Welcome, {user?.full_name || 'Field Worker'}</h1>
          <p>Review your assigned tasks and help resolve community issues.</p>
          {user?.department && (
            <span className="worker-department-pill">{user.department}</span>
          )}
        </div>
        <button
          type="button"
          className="worker-refresh-button"
          onClick={() => loadAssignments(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh tasks'}
        </button>
      </section>

      <section className="citizen-panel worker-tasks-panel">
        <div className="worker-tasks-heading">
          <div>
            <h2>My assigned work</h2>
            <p className="citizen-muted">
              Complaints currently assigned to your account.
            </p>
          </div>
          <span className="worker-task-count">
            {complaints.length} {complaints.length === 1 ? 'task' : 'tasks'}
          </span>
        </div>

        {error && (
          <div className="worker-error" role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => loadAssignments()}>
              Try again
            </button>
          </div>
        )}

        {loading ? (
          <div className="worker-empty-state">Loading your assigned tasks…</div>
        ) : !error && complaints.length === 0 ? (
          <div className="worker-empty-state">
            <span aria-hidden="true">✓</span>
            <h3>No tasks assigned yet</h3>
            <p>When the administrator assigns a complaint to you, it will appear here.</p>
          </div>
        ) : (
          <div className="worker-task-list">
            {complaints.map((complaint) => (
              <article className="worker-task-card" key={complaint.id}>
                <div className="worker-task-card-top">
                  <span className="worker-task-category">
                    {complaint.category || 'Community issue'}
                  </span>
                  <span className={`worker-task-status status-${String(complaint.status || '').toLowerCase()}`}>
                    {prettyStatus(complaint.status)}
                  </span>
                </div>
                <h3>
                  #{complaint.id} · {complaint.title || complaint.category || 'Assigned complaint'}
                </h3>
                <p className="worker-task-description">
                  {complaint.description || 'No additional description provided.'}
                </p>
                <div className="worker-task-meta">
                  <span>⌖ {locationLabel(complaint)}</span>
                  <span>Submitted {dateLabel(complaint.created_at)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
