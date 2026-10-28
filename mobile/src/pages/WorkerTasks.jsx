import { useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

function taskStatus(status) {
  const value = String(status || 'pending').toLowerCase()
  if (['resolved', 'completed', 'closed'].includes(value)) return 'Completed'
  if (['awaiting_feedback', 'on_hold', 'under_review', 'escalated'].includes(value)) return 'Review'
  if (['assigned', 'in_progress'].includes(value)) return 'Assigned'
  return 'Pending'
}

function taskLocation(task) {
  return [
    task.village,
    task.ward ? `Ward ${task.ward}` : '',
    task.landmark,
  ].filter(Boolean).join(' · ') || 'Location not provided'
}

function taskDate(value) {
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

export default function WorkerTasks({
  user, onLogout, complaints, loading, error, refreshing, onRefresh,
  onDashboard, onReports, onRecordWork, activeComplaintId, actionTaken,
  setActionTaken, notes, setNotes, saving, formError,
  successMessage, onCancelWork, onSubmitWork, onViewHistory,
}) {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return complaints.filter((task) => {
      const status = taskStatus(task.status)
      const searchable = [
        task.id, task.title, task.category, task.description,
        task.village, task.ward, task.landmark,
      ].filter(Boolean).join(' ').toLowerCase()
      return (filter === 'All' || status === filter) &&
        (!query || searchable.includes(query))
    })
  }, [complaints, filter, search])

  const completed = complaints.filter((task) => taskStatus(task.status) === 'Completed').length
  const pending = complaints.filter((task) => taskStatus(task.status) === 'Pending').length
  const assigned = complaints.filter((task) => taskStatus(task.status) === 'Assigned').length
  const progress = complaints.length ? Math.round(completed / complaints.length * 100) : 0
  const firstName = (user?.full_name || 'Worker').trim().split(' ')[0]

  const navItems = [
    { label: 'Dashboard', icon: '▦' },
    { label: 'My Tasks', icon: '▤' },
    { label: 'Reports', icon: '▧' },
    { label: 'Profile & Settings', icon: '♙' },
    { label: 'Help', icon: '?' },
  ]

  return (
    <main className="gram-worker-portal worker-task-screen">
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
              className={item.label === 'My Tasks' ? 'active' : ''}
              onClick={() => {
                console.log('[WorkerTasks] Sidebar clicked:', item.label)
                if (item.label === 'Dashboard') {
                  onDashboard?.()
                } else if (item.label === 'Reports') {
                  console.log('[WorkerTasks] Calling onReports:', typeof onReports)
                  onReports?.()
                }
              }}
            >
              <span aria-hidden="true">{item.icon}</span>
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
          <div className="gram-topbar-title">Field Worker Dashboard <span>(My Tasks)</span></div>
          <div className="gram-mobile-brand">
            <img src="/images/gramseva-logo.png" alt="" />
            <strong>GramSeva</strong>
          </div>
          <div className="gram-topbar-spacer" />
          <span className="gram-live-dot" title="Worker portal" />
          <div className="gram-avatar">{firstName.charAt(0).toUpperCase()}</div>
          <div className="gram-account">
            <strong>{user?.full_name || 'Field Worker'}</strong>
            <small>{user?.department || 'Field Worker'}</small>
          </div>
          <button className="gram-logout" type="button" onClick={onLogout}>Log out</button>
        </header>

        <div className="gram-worker-content">
          <section className="worker-reference-heading">
            <h1>Task List</h1>
            <button
              className="gram-refresh"
              type="button"
              onClick={onRefresh}
              disabled={loading || refreshing || saving}
            >
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </section>

          {error && <div className="gram-message error" role="alert">{error}</div>}
          {successMessage && <div className="gram-message success" role="status">{successMessage}</div>}

          <section className="worker-reference-layout">
            <div className="worker-reference-list">
              <div className="worker-reference-toolbar">
                <div className="worker-reference-tabs" role="group" aria-label="Filter tasks">
                  {['All', 'Pending', 'Assigned', 'Completed'].map((item) => {
                    const count = item === 'All' ? complaints.length :
                      complaints.filter((task) => taskStatus(task.status) === item).length
                    return (
                      <button
                        key={item}
                        type="button"
                        className={filter === item ? 'active' : ''}
                        onClick={() => setFilter(item)}
                        aria-pressed={filter === item}
                      >
                        {item} ({count})
                      </button>
                    )
                  })}
                </div>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="⌕  Search by complaint ID, location…"
                  aria-label="Search tasks by ID, title, or location"
                />
              </div>

              {loading ? (
                <div className="worker-reference-empty">Loading assigned tasks…</div>
              ) : filteredTasks.length === 0 ? (
                <div className="worker-reference-empty">
                  <span className="worker-reference-empty-icon">✓</span>
                  <strong>{complaints.length ? 'No matching tasks' : 'No tasks assigned yet'}</strong>
                  <p>{complaints.length
                    ? 'Try another search or status filter.'
                    : 'Tasks assigned to your account will appear here.'}</p>
                </div>
              ) : (
                <div className="worker-reference-cards">
                  {filteredTasks.map((task) => {
                    const status = taskStatus(task.status)
                    const expanded = expandedId === task.id
                    return (
                      <article className="worker-reference-card" key={task.id}>
                        <span className={`worker-reference-pin pin-${status.toLowerCase()}`}>
                          {status === 'Completed' ? '✓' : '⌖'}
                        </span>
                        <div className="worker-reference-card-content">
                          <div className="worker-reference-card-heading">
                            <h2>{task.title || task.category || 'Community issue'}</h2>
                            <span className={`worker-reference-status status-${status.toLowerCase()}`}>
                              {status}
                            </span>
                          </div>
                          <p className="worker-reference-meta">
                            #{task.id} <span>·</span> {taskLocation(task)}
                          </p>
                          <p className="worker-reference-date">{taskDate(task.created_at)}</p>

                          {expanded && (
                            <div className="worker-reference-details">
                              <p>{task.description || 'No additional description provided.'}</p>
                              <p>Category: {task.category || 'Not specified'}</p>
                              <p>Current status: {String(task.status || 'pending').replaceAll('_', ' ')}</p>
                            </div>
                          )}

                          {activeComplaintId === task.id && (
                            <form
                              className="gram-work-form"
                              onSubmit={(event) => onSubmitWork(event, task.id)}
                            >
                              <h3>Record work performed</h3>
                              <label htmlFor={`task-action-${task.id}`}>Work performed *</label>
                              <textarea
                                id={`task-action-${task.id}`}
                                value={actionTaken}
                                onChange={(event) => setActionTaken(event.target.value)}
                                placeholder="Describe the inspection, repair, or work completed…"
                                rows={3}
                                maxLength={5000}
                                required
                                disabled={saving}
                              />
                              <label htmlFor={`task-notes-${task.id}`}>Additional notes (optional)</label>
                              <textarea
                                id={`task-notes-${task.id}`}
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                placeholder="Materials used or follow-up needed…"
                                rows={2}
                                maxLength={5000}
                                disabled={saving}
                              />
                              {formError && <p className="gram-form-error" role="alert">{formError}</p>}
                              <div className="gram-form-actions">
                                <button type="button" onClick={onCancelWork} disabled={saving}>Cancel</button>
                                <button type="submit" disabled={saving || !actionTaken.trim()}>
                                  {saving ? 'Submitting…' : 'Submit work report'}
                                </button>
                              </div>
                            </form>
                          )}
                        </div>
                        <div className="worker-reference-actions">
                          <button
                            className="worker-reference-view"
                            type="button"
                            onClick={() => {
                              setExpandedId(expanded ? null : task.id)
                              setSelectedTaskId(task.id)
                            }}
                            disabled={saving}
                          >
                            {expanded ? 'Hide details' : 'View Details'}
                          </button>
                          <button
                            className="worker-reference-view case-history-open-button"
                            type="button"
                            onClick={() => onViewHistory?.(task)}
                            disabled={saving}
                          >
                            Case history ↗
                          </button>
                          {task.latitude != null &&
                           task.longitude != null &&
                           task.latitude !== '' &&
                           task.longitude !== '' &&
                           Number.isFinite(Number(task.latitude)) &&
                           Number.isFinite(Number(task.longitude)) && (
                            <a
                              className="worker-reference-navigate"
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${task.latitude},${task.longitude}`)}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              ↗ Navigate
                            </a>
                          )}
                          {activeComplaintId === task.id && (
                            <span className="worker-reference-work-open">Work form open</span>
                          )}
                          {expanded && activeComplaintId !== task.id && (
                            <button
                              className="worker-reference-record"
                              type="button"
                              onClick={() => onRecordWork(task.id)}
                              disabled={saving}
                            >
                              Record work
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            <aside className="worker-reference-side">
              <section className="worker-reference-progress">
                <h2>Task Progress <span>(Today)</span></h2>
                <div
                  className="worker-reference-ring"
                  style={{ '--progress': `${progress}%` }}
                  role="img"
                  aria-label={`${completed} of ${complaints.length} tasks completed`}
                >
                  <div>
                    <strong>{completed}/{complaints.length}</strong>
                    <span>Completed</span>
                  </div>
                </div>
                <div className="worker-reference-legend">
                  <div><i className="dot-completed" /><span>Completed</span><strong>{completed}</strong></div>
                  <div><i className="dot-pending" /><span>Pending</span><strong>{pending}</strong></div>
                  <div><i className="dot-assigned" /><span>Assigned</span><strong>{assigned}</strong></div>
                </div>
              </section>
              <section className="worker-reference-note">
                Complete your tasks to keep your area clean and safe.
              </section>
            </aside>

              <aside className="worker-work-plan">
                <div className="worker-work-plan-heading">
                  <div>
                    <span className="worker-plan-icon">⌖</span>
                    <div>
                      <h2>Today's Work Plan</h2>
                      <p>Assigned complaint locations</p>
                    </div>
                  </div>
                  <span className="worker-plan-count">
                    {complaints.length} task{complaints.length === 1 ? '' : 's'}
                  </span>
                </div>

                {(() => {
                  const mapTasks = complaints.filter((task) =>
                    task.latitude != null &&
                    task.longitude != null &&
                    task.latitude !== '' &&
                    task.longitude !== '' &&
                    Number.isFinite(Number(task.latitude)) &&
                    Number.isFinite(Number(task.longitude)) &&
                    Math.abs(Number(task.latitude)) <= 90 &&
                    Math.abs(Number(task.longitude)) <= 180
                  )

                  const selectedTask = complaints.find(
                    (task) => String(task.id) === String(selectedTaskId)
                  )

                  const mapCenter = mapTasks.length
                    ? [Number(mapTasks[0].latitude), Number(mapTasks[0].longitude)]
                    : [21.1458, 79.0882]

                  return (
                    <>
                      {mapTasks.length > 0 ? (
                        <MapContainer
                          key={mapTasks.map((task) => task.id).join('-')}
                          center={mapCenter}
                          zoom={13}
                          scrollWheelZoom={false}
                          className="worker-plan-map"
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          {mapTasks.map((task) => (
                            <Marker
                              key={task.id}
                              position={[Number(task.latitude), Number(task.longitude)]}
                              eventHandlers={{
                                click: () => setSelectedTaskId(task.id),
                              }}
                            >
                              <Popup>
                                <strong>{task.title || task.category || 'Community issue'}</strong>
                                <br />
                                Complaint #{task.id}
                                <br />
                                {taskLocation(task)}
                                <br />
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(task.id)}
                                >
                                  View task details
                                </button>
                              </Popup>
                            </Marker>
                          ))}
                        </MapContainer>
                      ) : (
                        <div className="worker-plan-no-map">
                          <span className="worker-plan-no-map-icon">⌖</span>
                          <strong>Map locations unavailable</strong>
                          <p>Assigned complaints need valid latitude and longitude coordinates to appear on the map.</p>
                        </div>
                      )}

                      <div className="worker-plan-list-heading">
                        <h3>Assigned locations</h3>
                        <span>{mapTasks.length} mapped</span>
                      </div>

                      {complaints.length === 0 ? (
                        <p className="worker-plan-empty">Your assigned tasks will appear here.</p>
                      ) : (
                        <div className="worker-plan-task-list">
                          {complaints.slice(0, 8).map((task, index) => (
                            <button
                              type="button"
                              key={task.id}
                              className={`worker-plan-task ${String(selectedTaskId) === String(task.id) ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedTaskId(task.id)
                                setExpandedId(task.id)
                              }}
                            >
                              <span className="worker-plan-number">{index + 1}</span>
                              <span className="worker-plan-task-copy">
                                <strong>#{task.id} · {task.title || task.category || 'Community issue'}</strong>
                                <small>{taskLocation(task)}</small>
                                <small>{String(task.status || 'pending').replaceAll('_', ' ')}</small>
                              </span>
                              <span className="worker-plan-arrow">→</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {selectedTask && (
                        <div className="worker-plan-selected">
                          <strong>Selected: #{selectedTask.id}</strong>
                          {selectedTask.latitude != null &&
                           selectedTask.longitude != null &&
                           selectedTask.latitude !== '' &&
                           selectedTask.longitude !== '' &&
                           Number.isFinite(Number(selectedTask.latitude)) &&
                           Number.isFinite(Number(selectedTask.longitude)) ? (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selectedTask.latitude},${selectedTask.longitude}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="worker-plan-navigate"
                            >
                              ↗ Navigate with Google Maps
                            </a>
                          ) : (
                            <p>Exact coordinates are unavailable for this task.</p>
                          )}
                        </div>
                      )}

                      <div className="worker-plan-help">
                        <strong>Navigation help</strong>
                        <p>Select a mapped task or use Navigate to open directions to its saved location.</p>
                      </div>
                    </>
                  )
                })()}
              </aside>

          </section>

          <footer className="gram-worker-footer">
            <span>GramSeva · Your Village, Our Priority</span>
            <span>Field Worker Portal</span>
          </footer>
        </div>
      </div>
    </main>
  )
}
