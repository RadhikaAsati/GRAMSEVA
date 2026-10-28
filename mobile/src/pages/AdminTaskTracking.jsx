import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getComplaints,
  getAdminWorkers,
  getAdminDecisions,
  getAdminInterventions,
} from '../services/api.js'

function listOf(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  return []
}

function dateLabel(value) {
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

function statusLabel(value) {
  const labels = {
    awaiting_intervention: 'Assigned / awaiting intervention',
    in_progress: 'In progress',
    awaiting_feedback: 'Awaiting citizen feedback',
    resolved: 'Resolved',
    closed: 'Closed',
    escalated: 'Escalated',
    under_review: 'Under review',
    submitted: 'Submitted',
    rejected: 'Rejected',
  }
  const key = String(value || '').toLowerCase()
  return labels[key] || key.replaceAll('_', ' ') || 'Unknown'
}

function locationLabel(complaint) {
  return [
    complaint.village,
    complaint.ward ? `Ward ${complaint.ward}` : '',
    complaint.landmark,
  ].filter(Boolean).join(' · ') || 'Location not provided'
}

export default function AdminTaskTracking({ token }) {
  const [complaints, setComplaints] = useState([])
  const [workers, setWorkers] = useState([])
  const [decisions, setDecisions] = useState([])
  const [interventions, setInterventions] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      const [complaintResult, workerResult, decisionResult, interventionResult] =
        await Promise.allSettled([
          getComplaints(token),
          getAdminWorkers(token),
          getAdminDecisions(token),
          getAdminInterventions(token),
        ])

      if (complaintResult.status === 'rejected') {
        throw complaintResult.reason
      }

      setComplaints(listOf(complaintResult.value))

      if (workerResult.status === 'fulfilled') {
        setWorkers(listOf(workerResult.value))
      }
      if (decisionResult.status === 'fulfilled') {
        setDecisions(listOf(decisionResult.value))
      }
      if (interventionResult.status === 'fulfilled') {
        setInterventions(listOf(interventionResult.value))
      }
    } catch (err) {
      setError(err?.message || 'Unable to load assignment tracking data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const workerMap = useMemo(
    () => new Map(workers.map((worker) => [String(worker.id), worker])),
    [workers]
  )

  const latestAssignmentByComplaint = useMemo(() => {
    const assignmentDecisions = decisions
      .filter((decision) => decision.decision === 'assign_intervention')
      .sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })

    const result = new Map()
    assignmentDecisions.forEach((decision) => {
      const id = String(decision.complaint_id)
      if (!result.has(id)) result.set(id, decision)
    })
    return result
  }, [decisions])

  const assignedComplaints = useMemo(
    () => complaints.filter((complaint) => complaint.assigned_worker_id != null),
    [complaints]
  )

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()

    return assignedComplaints.filter((complaint) => {
      const status = String(complaint.status || '').toLowerCase()
      if (statusFilter !== 'all' && status !== statusFilter) return false

      const worker = workerMap.get(String(complaint.assigned_worker_id))
      const values = [
        complaint.id,
        complaint.title,
        complaint.category,
        complaint.description,
        complaint.village,
        complaint.ward,
        complaint.landmark,
        worker?.full_name,
        worker?.name,
      ]

      return !query || values.some((value) =>
        String(value ?? '').toLowerCase().includes(query)
      )
    })
  }, [assignedComplaints, search, statusFilter, workerMap])

  const countStatus = (status) =>
    assignedComplaints.filter(
      (complaint) => String(complaint.status || '').toLowerCase() === status
    ).length

  const selectedDecision = selected
    ? latestAssignmentByComplaint.get(String(selected.id))
    : null

  const selectedInterventions = selected
    ? interventions.filter(
        (item) => String(item.complaint_id) === String(selected.id)
      )
    : []

  if (loading) {
    return <div className="admin-tracking-page"><p>Loading assignment tracking…</p></div>
  }

  return (
    <div className="admin-tracking-page">
      {error && <div className="admin-tracking-error" role="alert">{error}</div>}

      <div className="admin-tracking-stats">
        <article>
          <span>Total assigned</span>
          <strong>{assignedComplaints.length}</strong>
        </article>
        <article>
          <span>Awaiting intervention</span>
          <strong>{countStatus('awaiting_intervention')}</strong>
        </article>
        <article>
          <span>In progress</span>
          <strong>{countStatus('in_progress')}</strong>
        </article>
        <article>
          <span>Awaiting feedback</span>
          <strong>{countStatus('awaiting_feedback')}</strong>
        </article>
      </div>

      <div className="admin-tracking-toolbar">
        <input
          aria-label="Search assignments"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search complaint, worker, village or ward…"
        />
        <select
          aria-label="Filter assignments by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="awaiting_intervention">Awaiting intervention</option>
          <option value="in_progress">In progress</option>
          <option value="awaiting_feedback">Awaiting feedback</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="escalated">Escalated</option>
          <option value="under_review">Under review</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p className="admin-tracking-count">
        Showing {filteredComplaints.length} of {assignedComplaints.length} assigned complaints
      </p>

      {filteredComplaints.length === 0 ? (
        <div className="admin-tracking-empty">
          <strong>No assigned complaints found</strong>
          <p>
            {assignedComplaints.length === 0
              ? 'When you assign a complaint to a field worker, it will appear here.'
              : 'Try changing your search or status filter.'}
          </p>
        </div>
      ) : (
        <div className="admin-tracking-table-wrap">
          <table className="admin-tracking-table">
            <thead>
              <tr>
                <th>Complaint</th>
                <th>Assigned worker</th>
                <th>Assignment date</th>
                <th>Current status</th>
                <th>Location</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.map((complaint) => {
                const worker = workerMap.get(String(complaint.assigned_worker_id))
                const decision = latestAssignmentByComplaint.get(String(complaint.id))
                const workerName =
                  worker?.full_name || worker?.name ||
                  `Worker #${complaint.assigned_worker_id}`

                return (
                  <tr key={complaint.id}>
                    <td>
                      <strong>#{complaint.id}</strong>
                      <span>{complaint.title || complaint.category || 'Untitled complaint'}</span>
                    </td>
                    <td>{workerName}</td>
                    <td>{dateLabel(decision?.created_at)}</td>
                    <td>
                      <span className={`admin-tracking-status status-${String(complaint.status || 'unknown').toLowerCase()}`}>
                        {statusLabel(complaint.status)}
                      </span>
                    </td>
                    <td>{locationLabel(complaint)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-tracking-view"
                        onClick={() => setSelected(complaint)}
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div
          className="admin-tracking-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null)
          }}
        >
          <section
            className="admin-tracking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-tracking-modal-title"
          >
            <div className="admin-tracking-modal-heading">
              <div>
                <p className="admin-tracking-eyebrow">COMPLAINT #{selected.id}</p>
                <h3 id="admin-tracking-modal-title">
                  {selected.title || selected.category || 'Complaint details'}
                </h3>
              </div>
              <button
                type="button"
                className="admin-tracking-close"
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="admin-tracking-detail-grid">
              <div>
                <span>Assigned worker</span>
                <strong>
                  {workerMap.get(String(selected.assigned_worker_id))?.full_name ||
                    workerMap.get(String(selected.assigned_worker_id))?.name ||
                    `Worker #${selected.assigned_worker_id}`}
                </strong>
              </div>
              <div>
                <span>Current status</span>
                <strong>{statusLabel(selected.status)}</strong>
              </div>
              <div>
                <span>Assignment date</span>
                <strong>{dateLabel(selectedDecision?.created_at)}</strong>
              </div>
              <div>
                <span>Assigned by</span>
                <strong>{selectedDecision?.administrator || 'Assignment record unavailable'}</strong>
              </div>
              <div className="admin-tracking-detail-wide">
                <span>Location</span>
                <strong>{locationLabel(selected)}</strong>
                {selected.latitude != null && selected.longitude != null && (
                  <a
                    href={`https://www.google.com/maps?q=${selected.latitude},${selected.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open location in Google Maps ↗
                  </a>
                )}
              </div>
              <div className="admin-tracking-detail-wide">
                <span>Complaint description</span>
                <p>{selected.description || 'No description provided.'}</p>
              </div>
              <div className="admin-tracking-detail-wide">
                <span>Assignment notes</span>
                <p>{selectedDecision?.notes || 'No assignment notes recorded.'}</p>
              </div>
            </div>

            <div className="admin-tracking-history">
              <h4>Intervention history</h4>
              {selectedInterventions.length === 0 ? (
                <p>No intervention records are available for this complaint yet.</p>
              ) : (
                selectedInterventions
                  .slice()
                  .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                  .map((item) => (
                    <article key={item.id}>
                      <strong>{item.action_taken || 'Intervention recorded'}</strong>
                      <span>{dateLabel(item.created_at)}</span>
                      <p>{item.notes || 'No additional notes.'}</p>
                      {item.performed_by && <small>By: {item.performed_by}</small>}
                    </article>
                  ))
              )}
            </div>

            <div className="admin-tracking-modal-actions">
              <button type="button" onClick={() => setSelected(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
