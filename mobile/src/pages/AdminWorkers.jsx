import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAdminWorker,
  getAdminWorkers,
} from '../services/api.js'

const DEPARTMENTS = [
  'Water Supply',
  'Roads',
  'Electricity',
  'Street Light',
  'Sanitation',
  'Garbage',
  'Public Assets',
  'Drainage',
  'General Maintenance',
]

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  department: 'Water Supply',
  password: '',
}

function workerId(worker) {
  return `FW-${String(worker.id).padStart(3, '0')}`
}

export default function AdminWorkers({ token }) {
  const [workers, setWorkers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const loadWorkers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminWorkers(token)
      setWorkers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Could not load field workers.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadWorkers()
  }, [loadWorkers])

  const filteredWorkers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return workers.filter((worker) =>
      [
        worker.full_name,
        worker.email,
        worker.phone,
        worker.id,
        workerId(worker),
        worker.department,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)),
    )
  }, [workers, search])

  function updateField(event) {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  async function handleCreateWorker(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        department: form.department,
        password: form.password,
      }

      const created = await createAdminWorker(token, payload)
      setWorkers((previous) =>
        [...previous.filter((worker) => worker.id !== created.id), created]
          .sort((a, b) => a.id - b.id),
      )
      setNotice(
        `${created.full_name} was added successfully. Worker ID: ${workerId(created)}. Share the initial login credentials securely.`,
      )
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Could not create the worker account.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="admin-panel admin-workers-page">
      <div className="admin-workers-heading">
        <div>
          <p className="admin-eyebrow">ADMINISTRATION / TEAM</p>
          <h1>Field Workers</h1>
          <p>Manage your field staff and their assignments.</p>
        </div>
        <div className="admin-workers-heading-actions">


        </div>
      </div>

      <div className="admin-workers-stats">
        <article>
          <span>Registered workers</span>
          <strong>{workers.length}</strong>
          <small>Field staff accounts</small>
        </article>
        <article>
          <span>Active accounts</span>
          <strong>{workers.filter((worker) => worker.is_active).length}</strong>
          <small>Accounts enabled for login</small>
        </article>
        <article>
          <span>Matching results</span>
          <strong>{filteredWorkers.length}</strong>
          <small>Based on your search</small>
        </article>
      </div>

      <div className="admin-workers-toolbar">
        <label className="admin-workers-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or ID..."
            aria-label="Search workers by name or ID"
          />
        </label>
        <span className="admin-workers-count">
          {filteredWorkers.length} workers
        </span>
        <div className="admin-workers-toolbar-actions">
          <button
            type="button"
            className="admin-button admin-button-primary"
            onClick={() => {
              setError('')
              setNotice('')
              setForm(EMPTY_FORM)
              setShowForm(true)
            }}
          >
            + Add Worker
          </button>
        </div>
      </div>

      {notice && (
        <div className="admin-workers-notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="admin-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="admin-button admin-button-outline"
            onClick={loadWorkers}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-empty">Loading field workers…</div>
      ) : filteredWorkers.length === 0 ? (
        <div className="admin-empty">
          {workers.length === 0
            ? 'No field workers yet. Select “Add Worker” to create the first account.'
            : 'No workers match your search.'}
        </div>
      ) : (
        <div className="admin-workers-table-wrap">
          <table className="admin-table admin-workers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Departments</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <div className="admin-worker-identity">
                      <span className="admin-worker-avatar">
                        {(worker.full_name || 'W')
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      <span className="admin-worker-name">
                        <strong>{worker.full_name || 'Unnamed worker'}</strong>
                        <small>{worker.email}</small>
                      </span>
                    </div>
                  </td>
                  <td className="admin-worker-id">{workerId(worker)}</td>
                  <td>
                    <span className="admin-worker-department">
                      {worker.department || 'Not assigned'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-worker-status ${
                        worker.is_active ? '' : 'is-inactive'
                      }`}
                    >
                      <span aria-hidden="true">●</span>
                      {worker.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-button admin-button-outline admin-worker-view"
                      onClick={() => setSelectedWorker(worker)}
                    >
                      View <span aria-hidden="true">⌄</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-workers-footer">
        Showing {filteredWorkers.length} of {workers.length} workers
      </div>

      {showForm && (
        <div
          className="admin-detail-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowForm(false)
            }
          }}
        >
          <section
            className="admin-detail-dialog admin-worker-dialog admin-worker-form-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-add-worker-title"
          >
            <button
              type="button"
              className="admin-detail-close"
              onClick={() => !saving && setShowForm(false)}
              aria-label="Close add worker form"
              disabled={saving}
            >
              ×
            </button>
            <p className="admin-eyebrow">TEAM MANAGEMENT</p>
            <h2 id="admin-add-worker-title">Add Field Worker</h2>
            <p className="admin-worker-form-intro">
              Create a worker account and assign their department.
            </p>

            <form className="admin-worker-form" onSubmit={handleCreateWorker}>
              <label>
                Full name *
                <input
                  name="full_name"
                  value={form.full_name}
                  onChange={updateField}
                  placeholder="Enter worker's full name"
                  minLength={2}
                  maxLength={150}
                  required
                />
              </label>

              <label>
                Email address *
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="worker@example.com"
                  maxLength={255}
                  required
                />
              </label>

              <label>
                Phone number
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  placeholder="Enter phone number (optional)"
                  maxLength={20}
                />
              </label>

              <label>
                Department *
                <select
                  name="department"
                  value={form.department}
                  onChange={updateField}
                  required
                >
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Initial login password *
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="At least 12 characters"
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                />
                <small>
                  Give this password to the worker securely. It will be stored
                  as a hash, not as plain text.
                </small>
              </label>

              {error && (
                <div className="admin-error" role="alert">
                  {error}
                </div>
              )}

              <div className="admin-worker-form-actions">
                <button
                  type="button"
                  className="admin-button admin-button-outline"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={saving}
                >
                  {saving ? 'Creating account…' : 'Create Worker'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedWorker && (
        <div
          className="admin-detail-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedWorker(null)
          }}
        >
          <section
            className="admin-detail-dialog admin-worker-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-worker-detail-title"
          >
            <button
              type="button"
              className="admin-detail-close"
              onClick={() => setSelectedWorker(null)}
              aria-label="Close worker details"
            >
              ×
            </button>
            <p className="admin-eyebrow">FIELD WORKER PROFILE</p>
            <div className="admin-worker-profile-avatar">
              {(selectedWorker.full_name || 'W')
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <h2 id="admin-worker-detail-title">{selectedWorker.full_name}</h2>
            <span
              className={`admin-worker-status ${
                selectedWorker.is_active ? '' : 'is-inactive'
              }`}
            >
              ● {selectedWorker.is_active ? 'Active account' : 'Inactive account'}
            </span>
            <dl className="admin-detail-list">
              <dt>Worker ID</dt>
              <dd>{workerId(selectedWorker)}</dd>
              <dt>Department</dt>
              <dd>{selectedWorker.department || 'Not assigned'}</dd>
              <dt>Email</dt>
              <dd>{selectedWorker.email || 'Not provided'}</dd>
              <dt>Phone</dt>
              <dd>{selectedWorker.phone || 'Not provided'}</dd>
            </dl>
          </section>
        </div>
      )}
    </section>
  )
}
