import { useCallback, useEffect, useState } from 'react'
import {
  createWorkerIntervention,
  getComplaints,
} from '../services/api.js'
import WorkerTasks from './WorkerTasks.jsx'
import WorkerReport from './WorkerReport.jsx'
import WorkerComplaintHistory from './WorkerComplaintHistory.jsx'

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

function isToday(value) {
  if (!value) return false
  const date = new Date(value)
  const today = new Date()

  return !Number.isNaN(date.getTime()) &&
    date.toDateString() === today.toDateString()
}

function isCompleted(status) {
  return ['resolved', 'completed', 'closed'].includes(
    String(status || '').toLowerCase()
  )
}

function Icon({ name }) {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    tasks: <><rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 9h8M8 13h8M8 17h5M9 2v4M15 2v4"/></>,
    reports: <><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 12h8M8 16h8"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.4 1-1.9 1.5-1.9 3M12 17.5h.01"/></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    alert: <><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 11.6-2L20 12M4 12l2.9 5a7 7 0 0 0 11.6-2"/></>,
  }

  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.tasks}
    </svg>
  )
}

export default function WorkerDashboard({ user, token, onLogout }) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeComplaintId, setActiveComplaintId] = useState(null)
  const [actionTaken, setActionTaken] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [historyComplaint, setHistoryComplaint] = useState(null)

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

  const todayCount = complaints.filter((item) => isToday(item.created_at)).length
  const completedCount = complaints.filter((item) => isCompleted(item.status)).length
  const pendingCount = complaints.filter((item) =>
    ['pending', 'awaiting_intervention', 'in_progress'].includes(
      String(item.status || '').toLowerCase()
    )
  ).length
  const onHoldCount = complaints.filter((item) =>
    ['on_hold', 'escalated', 'under_review'].includes(
      String(item.status || '').toLowerCase()
    )
  ).length

  function goTo(section) {
    setActiveNav(section)
    const target = section === 'Dashboard'
      ? document.getElementById('worker-overview')
      : document.getElementById('worker-tasks')

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function openWorkForm(complaintId) {
    setActiveComplaintId(complaintId)
    setActionTaken('')
    setNotes('')
    setFormError('')
    setSuccessMessage('')
    document.getElementById('worker-tasks')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function cancelWorkForm() {
    setActiveComplaintId(null)
    setActionTaken('')
    setNotes('')
    setFormError('')
  }

  async function submitWork(event, complaintId) {
    event.preventDefault()
    if (!actionTaken.trim()) {
      setFormError('Please describe the work you performed.')
      return
    }

    setSaving(true)
    setFormError('')
    setSuccessMessage('')

    try {
      await createWorkerIntervention(token, {
        complaint_id: complaintId,
        action_taken: actionTaken.trim(),
        notes: notes.trim() || null,
      })

      setActiveComplaintId(null)
      setActionTaken('')
      setNotes('')
      await loadAssignments(true)
      setSuccessMessage(
        `Work recorded successfully for complaint #${complaintId}. Its status is now awaiting feedback.`
      )
    } catch (err) {
      setFormError(err?.message || 'Could not record your work. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const navItems = [
    { label: 'Dashboard', icon: 'dashboard' },
    { label: 'My Tasks', icon: 'tasks' },
    { label: 'Reports', icon: 'reports' },
    { label: 'Profile & Settings', icon: 'profile' },
    { label: 'Help', icon: 'help' },
  ]

  console.log('[WorkerDashboard] activeNav:', activeNav)

  if (historyComplaint) {
    return (
      <WorkerComplaintHistory
        token={token}
        user={user}
        complaint={historyComplaint}
        onLogout={onLogout}
        onBack={() => setHistoryComplaint(null)}
        onRecordWork={(complaintId) => {
          setHistoryComplaint(null)
          setActiveNav('My Tasks')
          openWorkForm(complaintId)
        }}
      />
    )
  }

  if (activeNav === 'Reports') {
    return (
      <WorkerReport
        user={user}
        token={token}
        onLogout={onLogout}
        onDashboard={() => setActiveNav('Dashboard')}
      />
    )
  }

  if (activeNav === 'My Tasks') {
    return (
      <WorkerTasks
        user={user}
        onLogout={onLogout}
        complaints={complaints}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={() => loadAssignments(true)}
        onDashboard={() => setActiveNav('Dashboard')}
          onReports={() => setActiveNav('Reports')}
        onRecordWork={openWorkForm}
        activeComplaintId={activeComplaintId}
        actionTaken={actionTaken}
        setActionTaken={setActionTaken}
        notes={notes}
        setNotes={setNotes}
        saving={saving}
        formError={formError}
        successMessage={successMessage}
        onCancelWork={cancelWorkForm}
        onSubmitWork={submitWork}
        onViewHistory={(task) => setHistoryComplaint(task)}
      />
    )
  }

  return (
    <main className="gram-worker-portal">
      <aside className="gram-worker-sidebar">
        <div className="gram-worker-brand">
          <img src="/images/gramseva-logo.png" alt="GramSeva logo" />
          <div>
            <strong>GramSeva</strong>
            <small>Your Village, Our Priority</small>
          </div>
        </div>

        <nav className="gram-worker-nav" aria-label="Worker navigation">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.label}
              className={activeNav === item.label ? 'active' : ''}
              onClick={() => {
                if (item.label === 'Dashboard') {
                  setActiveNav('Dashboard')
                } else if (item.label === 'My Tasks') {
                  setActiveNav('My Tasks')
                } else if (item.label === 'Reports') {
                  setActiveNav('Reports')
                } else {
                  setActiveNav(item.label)
                }
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="gram-village-art">
          <img src="/images/village-landscape.png" alt="" />
        </div>

        <div className="gram-sidebar-footer">
          <strong>Better Communities</strong>
          <span>Stronger Together 🌱</span>
        </div>
      </aside>

      <div className="gram-worker-main">
        <header className="gram-worker-topbar">
          <div className="gram-topbar-title">
              Field Worker Dashboard <span>(Overview)</span>
          </div>
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

        <div className="gram-worker-content">
          <section className="gram-welcome" id="worker-overview">
            <p className="gram-eyebrow">FIELD WORKER DASHBOARD (OVERVIEW)</p>
            <h1>Good morning, {(user?.full_name || 'Worker').split(' ')[0]}!</h1>
            <p>Here’s your daily progress and assigned tasks.</p>
            {user?.department && (
              <span className="gram-department">{user.department}</span>
            )}
            <button
              className="gram-refresh"
              type="button"
              onClick={() => loadAssignments(true)}
              disabled={loading || refreshing || saving}
            >
              <Icon name="refresh" />
              {refreshing ? 'Refreshing…' : 'Refresh tasks'}
            </button>
          </section>

          {error && (
            <div className="gram-message error" role="alert">
              {error}
              <button type="button" onClick={() => loadAssignments()}>Try again</button>
            </div>
          )}
          {successMessage && (
            <div className="gram-message success" role="status">
              {successMessage}
            </div>
          )}

          <section className="gram-stat-grid" aria-label="Task summary">
            <article className="gram-stat-card green">
              <div className="gram-stat-icon"><Icon name="tasks" /></div>
              <div>
                <span>Today's Tasks</span>
                <strong>{loading ? '—' : todayCount}</strong>
                <small>{complaints.length} assigned in total</small>
              </div>
            </article>
            <article className="gram-stat-card blue">
              <div className="gram-stat-icon"><Icon name="check" /></div>
              <div>
                <span>Completed (This Month)</span>
                <strong>{loading ? '—' : completedCount}</strong>
                <small>Assigned complaints resolved</small>
              </div>
            </article>
            <article className="gram-stat-card amber">
              <div className="gram-stat-icon"><Icon name="alert" /></div>
              <div>
                <span>Pending</span>
                <strong>{loading ? '—' : pendingCount}</strong>
                <small>Needs attention</small>
              </div>
            </article>
            <article className="gram-stat-card purple">
              <div className="gram-stat-icon"><Icon name="clock" /></div>
              <div>
                <span>On Hold / Review</span>
                <strong>{loading ? '—' : onHoldCount}</strong>
                <small>Requires follow-up</small>
              </div>
            </article>
          </section>

          <div className="gram-worker-columns">
            <section className="gram-panel gram-assigned-panel" id="worker-tasks">
              <div className="gram-panel-heading">
                <div>
                  <h2>Today's Assigned Tasks</h2>
                  <p>Complaints assigned to your account</p>
                </div>
                <button type="button" onClick={() => goTo('My Tasks')}>
                  View all <span>→</span>
                </button>
              </div>

              {loading ? (
                <div className="gram-empty">Loading assigned tasks…</div>
              ) : complaints.length === 0 && !error ? (
                <div className="gram-empty">
                  <div className="gram-empty-icon"><Icon name="check" /></div>
                  <strong>No tasks assigned yet</strong>
                  <p>When the administrator assigns a complaint to you, it will appear here.</p>
                </div>
              ) : (
                <div className="gram-task-list">
                  {complaints.map((complaint, index) => (
                    <article className="gram-task-row" key={complaint.id}>
                      <div className={`gram-task-pin pin-${index % 3}`}>
                        <Icon name="pin" />
                      </div>
                      <div className="gram-task-info">
                        <strong>{complaint.title || complaint.category || 'Community issue'}</strong>
                        <span>#{complaint.id} · {locationLabel(complaint)}</span>
                        <small>Submitted {dateLabel(complaint.created_at)}</small>
                        {complaint.description && (
                          <p>{complaint.description}</p>
                        )}
                      </div>
                      <span className={`gram-status status-${String(complaint.status || 'pending').toLowerCase()}`}>
                        {prettyStatus(complaint.status)}
                      </span>
                      <button
                        className="gram-view-button"
                        type="button"
                        onClick={() => setSelectedTaskId(
                          selectedTaskId === complaint.id ? null : complaint.id
                        )}
                        disabled={saving}
                      >
                        {selectedTaskId === complaint.id ? 'Hide details' : 'View details'}
                      </button>

                      {selectedTaskId === complaint.id && (
                        <div className="gram-task-detail-panel">
                          <h3>Complaint details</h3>
                          <p><strong>Complaint:</strong> #{complaint.id}</p>
                          <p><strong>Category:</strong> {complaint.category || 'Community issue'}</p>
                          <p><strong>Status:</strong> {prettyStatus(complaint.status)}</p>
                          <p><strong>Location:</strong> {locationLabel(complaint)}</p>
                          <p><strong>Description:</strong> {complaint.description || 'No additional description provided.'}</p>
                          {complaint.latitude != null &&
                           complaint.longitude != null &&
                           complaint.latitude !== '' &&
                           complaint.longitude !== '' ? (
                            <a
                              className="gram-navigate-button"
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${complaint.latitude},${complaint.longitude}`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Navigate to location ↗
                            </a>
                          ) : (
                            <p className="gram-location-warning">
                              Exact map coordinates are not available for this complaint.
                            </p>
                          )}
                          <button
                            type="button"
                            className="gram-record-work-button"
                            onClick={() => openWorkForm(complaint.id)}
                            disabled={saving}
                          >
                            Record work
                          </button>
                        </div>
                      )}

                      {activeComplaintId === complaint.id && (
                        <form
                          className="gram-work-form"
                          onSubmit={(event) => submitWork(event, complaint.id)}
                        >
                          <h3>Record work performed</h3>
                          <p>Complaint #{complaint.id} · {complaint.category || 'Community issue'}</p>
                          <label htmlFor={`action-${complaint.id}`}>Work performed *</label>
                          <textarea
                            id={`action-${complaint.id}`}
                            value={actionTaken}
                            onChange={(event) => setActionTaken(event.target.value)}
                            placeholder="Describe the inspection, repair, or work completed…"
                            maxLength={5000}
                            rows={3}
                            required
                            disabled={saving}
                          />
                          <label htmlFor={`notes-${complaint.id}`}>Additional notes (optional)</label>
                          <textarea
                            id={`notes-${complaint.id}`}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="Materials used or follow-up needed…"
                            maxLength={5000}
                            rows={2}
                            disabled={saving}
                          />
                          {formError && <p className="gram-form-error" role="alert">{formError}</p>}
                          <div className="gram-form-actions">
                            <button type="button" onClick={cancelWorkForm} disabled={saving}>Cancel</button>
                            <button type="submit" disabled={saving || !actionTaken.trim()}>
                              {saving ? 'Submitting…' : 'Submit work report'}
                            </button>
                          </div>
                        </form>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="gram-right-column">
              <section className="gram-panel gram-quick-panel gram-visit-planner">
                <div className="gram-panel-heading">
                  <div>
                    <h2>Field Visit Planner</h2>
                    <p>Plan your next assigned visit</p>
                  </div>
                  <button type="button" onClick={() => loadAssignments(true)} disabled={loading || refreshing}>
                    Refresh
                  </button>
                </div>

                {selectedTaskId != null && complaints.some((item) => String(item.id) === String(selectedTaskId)) ? (
                  (() => {
                    const task = complaints.find((item) => String(item.id) === String(selectedTaskId))
                    const hasCoordinates =
                      task.latitude != null && task.longitude != null &&
                      task.latitude !== '' && task.longitude !== ''

                    return (
                      <div className="gram-visit-selected">
                        <span className="gram-visit-eyebrow">SELECTED ASSIGNMENT</span>
                        <h3>{task.title || task.category || 'Community issue'}</h3>
                        <p>Complaint #{task.id}</p>
                        <p><strong>Location</strong><br />{locationLabel(task)}</p>
                        <p><strong>Current status</strong><br />{prettyStatus(task.status)}</p>
                        {hasCoordinates ? (
                          <a
                            className="gram-navigate-button"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${task.latitude},${task.longitude}`)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Navigate to visit ↗
                          </a>
                        ) : (
                          <p className="gram-location-warning">
                            Exact map coordinates are not available for this assignment.
                          </p>
                        )}
                        <button
                          type="button"
                          className="gram-planner-secondary"
                          onClick={() => goTo('My Tasks')}
                        >
                          Open full task list
                        </button>
                      </div>
                    )
                  })()
                ) : (
                  <div className="gram-visit-empty">
                    <div className="gram-visit-symbol"><Icon name="map" /></div>
                    <strong>Choose a task to plan your visit</strong>
                    <p>Select “View details” on an assigned complaint to see its location and navigation options here.</p>
                    <button type="button" onClick={() => goTo('My Tasks')}>
                      Browse assigned tasks →
                    </button>
                  </div>
                )}
              </section>

              <section className="gram-panel gram-attention-panel">
                <div className="gram-panel-heading">
                  <div>
                    <h2>Needs Attention</h2>
                    <p>Based on current complaint status</p>
                  </div>
                </div>
                {loading ? (
                  <div className="gram-empty">Loading assignments…</div>
                ) : complaints.filter((item) =>
                    ['awaiting_intervention', 'assigned', 'in_progress', 'awaiting_feedback', 'partially_solved', 'not_solved']
                      .includes(String(item.status || '').toLowerCase())
                  ).length === 0 ? (
                  <div className="gram-visit-empty">
                    <strong>No follow-up items identified</strong>
                    <p>Check your assigned tasks for the latest status.</p>
                  </div>
                ) : (
                  <div className="gram-attention-list">
                    {complaints.filter((item) =>
                      ['awaiting_intervention', 'assigned', 'in_progress', 'awaiting_feedback', 'partially_solved', 'not_solved']
                        .includes(String(item.status || '').toLowerCase())
                    ).slice(0, 4).map((item) => (
                      <button
                        type="button"
                        className="gram-attention-item"
                        key={item.id}
                        onClick={() => setSelectedTaskId(item.id)}
                      >
                        <span className="gram-attention-dot" />
                        <span className="gram-attention-copy">
                          <strong>{item.title || item.category || 'Community issue'}</strong>
                          <small>#{item.id} · {prettyStatus(item.status)}</small>
                          <small>{locationLabel(item)}</small>
                        </span>
                        <span className="gram-attention-arrow">→</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>

          <footer className="gram-worker-footer">
            <span>GramSeva · Your Village, Our Priority</span>
            <span>Field Worker Portal</span>
          </footer>
        </div>
      </div>
    </main>
  )
}
