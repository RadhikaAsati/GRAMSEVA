import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAllComplaints,
  getAdminWorkers,
  createAdminDecision,
} from '../services/api.js'

function listOf(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  return []
}

function prettyStatus(value) {
  return String(value || 'Unknown').replaceAll('_', ' ')
}

function complaintLocation(complaint) {
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
    : date.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
}

export default function AssignTask({ token }) {
  const [complaints, setComplaints] = useState([])
  const [workers, setWorkers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [workerId, setWorkerId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [complaintData, workerData] = await Promise.all([
        getAllComplaints(token),
        getAdminWorkers(token),
      ])
      setComplaints(listOf(complaintData))
      setWorkers(listOf(workerData).filter((worker) => worker.is_active !== false))
    } catch (err) {
      setError(err?.message || 'Unable to load complaints and field workers.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()
    return complaints.filter((complaint) => {
      const status = String(complaint.status || '').toLowerCase()
      const alreadyAssigned = complaint.assigned_worker_id != null
      const isClosed = ['resolved', 'closed', 'rejected'].includes(status)
      if (alreadyAssigned || isClosed) return false
      if (!query) return true
      return [
        complaint.id,
        complaint.title,
        complaint.category,
        complaint.description,
        complaint.village,
        complaint.ward,
      ].some((value) => String(value ?? '').toLowerCase().includes(query))
    })
  }, [complaints, search])

  const selectedComplaint = complaints.find(
    (complaint) => String(complaint.id) === String(selectedId)
  )
  const selectedWorker = workers.find(
    (worker) => String(worker.id) === String(workerId)
  )

  async function submitAssignment(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!selectedComplaint) {
      setError('Select a complaint before assigning a task.')
      return
    }
    if (!selectedWorker) {
      setError('Choose a field worker for this complaint.')
      return
    }

    setSubmitting(true)
    try {
      await createAdminDecision(token, {
        complaint_id: Number(selectedComplaint.id),
        decision: 'assign_intervention',
        worker_id: Number(selectedWorker.id),
        notes: notes.trim() || 'Task assigned by administrator.',
      })

      setNotice(
        `Complaint #${selectedComplaint.id} assigned to ${selectedWorker.full_name}.`
      )
      setSelectedId('')
      setWorkerId('')
      setNotes('')
      await loadData()
    } catch (err) {
      setError(err?.message || 'The task could not be assigned.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="assign-task-page">
      <div className="assign-landscape-banner" aria-hidden="true">
        <img
          src="/images/gramseva-services-banner.png"
          alt=""
        />
      </div>
      {error && <div className="assign-message assign-error" role="alert">{error}</div>}
      {notice && <div className="assign-message assign-success" role="status">{notice}</div>}

      {loading ? (
        <div className="assign-empty">Loading complaints and field workers…</div>
      ) : (
        <div className="assign-task-grid">
          <section className="assign-panel assign-complaints-panel">
            <div className="assign-panel-title">
              <span className="assign-step">1</span>
              <div>
                <h3>Select Complaint</h3>
                <p>{filteredComplaints.length} available to assign</p>
              </div>
            </div>

            <label className="assign-search">
              <span aria-hidden="true">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search complaint by ID or type..."
                aria-label="Search complaints"
              />
            </label>

            <div className="assign-complaint-list">
              {filteredComplaints.length ? filteredComplaints.map((complaint) => (
                <button
                  key={complaint.id}
                  type="button"
                  className={`assign-complaint-option ${
                    String(selectedId) === String(complaint.id) ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedId(String(complaint.id))}
                >
                  <span className="assign-radio" aria-hidden="true">
                    {String(selectedId) === String(complaint.id) ? '●' : ''}
                  </span>
                  <span className="assign-category-icon" aria-hidden="true">
                    {String(complaint.category || '').toLowerCase().includes('water')
                      ? '◉'
                      : String(complaint.category || '').toLowerCase().includes('road')
                        ? '⌁'
                        : String(complaint.category || '').toLowerCase().includes('light') ||
                          String(complaint.category || '').toLowerCase().includes('electric')
                          ? 'ϟ'
                          : '⌖'}
                  </span>
                  <span className="assign-complaint-copy">
                    <strong>#{complaint.id} · {complaint.title || complaint.category || 'Complaint'}</strong>
                    <span>{complaint.category || 'General issue'}</span>
                    <small>{complaintLocation(complaint)}</small>
                    <small>{dateLabel(complaint.created_at)}</small>
                  </span>
                  <span
                    className={`assign-status status-${String(complaint.status || '')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')}`}
                  >
                    {prettyStatus(complaint.status)}
                  </span>
                </button>
              )) : (
                <div className="assign-empty">
                  No unassigned complaints found. Try another search or refresh the list.
                </div>
              )}
            </div>
          </section>

          <form className="assign-panel assign-form-panel" onSubmit={submitAssignment}>
            <div className="assign-panel-title">
              <span className="assign-step">2</span>
              <div>
                <h3>Choose Field Worker</h3>
                <p>Assign the task to an active worker.</p>
              </div>
            </div>

            {selectedComplaint ? (
              <div className="assign-selected-summary">
                <span>Selected complaint</span>
                <strong>#{selectedComplaint.id} · {selectedComplaint.title || selectedComplaint.category}</strong>
                <small>{complaintLocation(selectedComplaint)}</small>
              </div>
            ) : (
              <div className="assign-hint">Select a complaint from the list to get started.</div>
            )}

            <label className="assign-field-label" htmlFor="assign-worker">
              Select Field Worker
            </label>
            <select
              id="assign-worker"
              value={workerId}
              onChange={(event) => setWorkerId(event.target.value)}
              required
            >
              <option value="">Choose a field worker…</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.full_name} (FW-{String(worker.id).padStart(3, '0')})
                  {worker.department ? ` · ${worker.department}` : ''}
                </option>
              ))}
            </select>

            {selectedWorker && (
              <div className="assign-worker-preview">
                <span className="assign-worker-avatar">
                  {(selectedWorker.full_name || 'W').slice(0, 1).toUpperCase()}
                </span>
                <span>
                  <strong>{selectedWorker.full_name}</strong>
                  <small>{selectedWorker.department || 'Department not assigned'}</small>
                  <small>{selectedWorker.email}</small>
                </span>
              </div>
            )}

            {!workers.length && (
              <div className="assign-hint">
                No active field workers are available. Create a worker account first.
              </div>
            )}

            <label className="assign-field-label" htmlFor="assign-notes">
              3. Add Instructions <span>(optional)</span>
            </label>
            <textarea
              id="assign-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value.slice(0, 200))}
              placeholder="e.g. Inspect the damaged pipeline near the village well..."
              rows={5}
              maxLength={200}
            />
            <div className="assign-character-count">{notes.length}/200</div>

            <button
              className="assign-submit"
              type="submit"
              disabled={submitting || !selectedComplaint || !selectedWorker}
            >
              {submitting ? 'Assigning task…' : '➤ Assign Task'}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
