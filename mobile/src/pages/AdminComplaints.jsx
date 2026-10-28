
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAllComplaints,
  getComplaintDetails,
} from '../services/api.js'

const STATUS_LABELS = {
  submitted: 'Pending',
  awaiting_intervention: 'Awaiting assignment',
  in_progress: 'In progress',
  awaiting_feedback: 'Awaiting feedback',
  resolved: 'Solved',
  escalated: 'Escalated',
  under_review: 'Under review',
}

const PAGE_SIZE = 8

function statusLabel(status) {
  return STATUS_LABELS[status] || (status || 'Unknown').replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getLocation(item) {
  return [item.village, item.ward].filter(Boolean).join(', ') || '—'
}

function getStatusClass(status) {
  return `status-${(status || 'unknown').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`
}

function getCategoryIcon(category) {
  const value = (category || '').toLowerCase()

  if (value.includes('water')) return { icon: '●', tone: 'blue' }
  if (value.includes('light') || value.includes('electric')) {
    return { icon: 'ϟ', tone: 'amber' }
  }
  if (value.includes('garbage') || value.includes('sanitation')) {
    return { icon: '●', tone: 'green' }
  }
  if (value.includes('road') || value.includes('drain')) {
    return { icon: '◆', tone: 'blue' }
  }

  return { icon: '●', tone: 'green' }
}

export default function AdminComplaints({ token, initialComplaintId = null, onInitialComplaintOpened }) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('30')
  const [locationFilter, setLocationFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [page, setPage] = useState(1)
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [mapComplaint, setMapComplaint] = useState(null)
  const [mapLoading, setMapLoading] = useState(false)

  const loadComplaints = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getAllComplaints(token)
      setComplaints(Array.isArray(result) ? result : [])
      setSelectedIds([])
      setPage(1)
    } catch (err) {
      setError(err.message || 'Could not load complaints.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  const categories = useMemo(
    () =>
      [...new Set(complaints.map((item) => item.category).filter(Boolean))]
        .sort(),
    [complaints],
  )

  const statuses = useMemo(
    () =>
      [...new Set(complaints.map((item) => item.status).filter(Boolean))]
        .sort(),
    [complaints],
  )

  const locations = useMemo(
    () =>
      [...new Set(
        complaints
          .map((item) => getLocation(item))
          .filter((location) => location !== '—'),
      )].sort(),
    [complaints],
  )

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = new Date()

    return complaints.filter((item) => {
      const location = getLocation(item)
      const created = item.created_at ? new Date(item.created_at) : null

      const matchesSearch =
        !query ||
        String(item.id ?? '').toLowerCase().includes(query) ||
        (item.title || '').toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query) ||
        (item.village || '').toLowerCase().includes(query) ||
        (item.ward || '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter

      const matchesCategory =
        categoryFilter === 'all' || item.category === categoryFilter

      const matchesLocation =
        locationFilter === 'all' || location === locationFilter

      let matchesDate = true

      if (dateFilter !== 'all' && created && !Number.isNaN(created.getTime())) {
        const days = Number(dateFilter)
        const cutoff = new Date(now)
        cutoff.setDate(cutoff.getDate() - days)
        matchesDate = created >= cutoff && created <= now
      } else if (dateFilter !== 'all' && !created) {
        matchesDate = false
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesLocation &&
        matchesDate
      )
    })
  }, [
    complaints,
    search,
    statusFilter,
    categoryFilter,
    dateFilter,
    locationFilter,
  ])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredComplaints.length / PAGE_SIZE),
  )

  const currentPage = Math.min(page, totalPages)

  const visibleComplaints = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredComplaints.slice(start, start + PAGE_SIZE)
  }, [filteredComplaints, currentPage])

  const openComplaints = complaints.filter(
    (item) => item.status !== 'resolved',
  ).length

  const allVisibleSelected =
    visibleComplaints.length > 0 &&
    visibleComplaints.every((item) => selectedIds.includes(item.id))

  function updateFilter(setter, value) {
    setter(value)
    setPage(1)
    setSelectedIds([])
  }

  function toggleComplaint(id) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id],
    )
  }

  function toggleVisibleComplaints() {
    if (allVisibleSelected) {
      setSelectedIds((previous) =>
        previous.filter(
          (id) => !visibleComplaints.some((item) => item.id === id),
        ),
      )
    } else {
      setSelectedIds((previous) => [
        ...new Set([
          ...previous,
          ...visibleComplaints.map((item) => item.id),
        ]),
      ])
    }
  }

  async function openDetails(complaintId) {
    setSelectedComplaint(null)
    setDetailLoading(true)
    setError('')

    try {
      const result = await getComplaintDetails(token, complaintId)
      setSelectedComplaint(result)
    } catch (err) {
      setError(err.message || 'Could not load complaint details.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    if (initialComplaintId == null) return
    openDetails(initialComplaintId)
    onInitialComplaintOpened?.()
  }, [initialComplaintId, onInitialComplaintOpened])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setSelectedComplaint(null)
        setDetailLoading(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const firstItem = filteredComplaints.length
    ? (currentPage - 1) * PAGE_SIZE + 1
    : 0

  const lastItem = Math.min(
    currentPage * PAGE_SIZE,
    filteredComplaints.length,
  )


  async function openComplaintMap(complaintId) {
    setMapComplaint(null)
    setMapLoading(true)
    setError('')

    try {
      const result = await getComplaintDetails(token, complaintId)
      setMapComplaint(result)
    } catch (err) {
      setError(err.message || 'Could not load complaint location.')
    } finally {
      setMapLoading(false)
    }
  }

  return (
    <section className="admin-panel admin-all-complaints">
      <div className="admin-complaints-toolbar">
        <div className="admin-complaints-title">
          <h1>All Complaints</h1>
          <p>View and manage all citizen complaints.</p>
        </div>

        <div className="admin-complaints-search-actions">
          <label className="admin-complaints-search">
            <span aria-hidden="true" className="admin-complaints-search-icon">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => updateFilter(setSearch, event.target.value)}
              placeholder="Search by ID, location, type..."
              aria-label="Search complaints by ID, location or type"
            />
          </label>

          <button
            type="button"
            className={`admin-complaints-filter-button ${filtersOpen ? 'is-active' : ''}`}
            onClick={() => setFiltersOpen((previous) => !previous)}
            aria-expanded={filtersOpen}
            aria-controls="admin-complaints-filters"
          >
            <span aria-hidden="true">☷</span> Filters
          </button>

          <button
            type="button"
            className="admin-complaints-refresh"
            onClick={loadComplaints}
            disabled={loading}
            title="Refresh complaints"
            aria-label="Refresh complaints"
          >
            {loading ? '…' : '↻'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="admin-complaints-dismiss"
            onClick={() => setError('')}
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`admin-complaints-filters ${filtersOpen ? 'filters-open' : ''}`}
        id="admin-complaints-filters"
      >
        <label>
          <span className="sr-only">Filter by type</span>
          <select
            value={categoryFilter}
            onChange={(event) =>
              updateFilter(setCategoryFilter, event.target.value)
            }
          >
            <option value="all">All Types</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              updateFilter(setStatusFilter, event.target.value)
            }
          >
            <option value="all">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by date range</span>
          <select
            value={dateFilter}
            onChange={(event) =>
              updateFilter(setDateFilter, event.target.value)
            }
          >
            <option value="30">Last 30 Days</option>
            <option value="7">Last 7 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by location</span>
          <select
            value={locationFilter}
            onChange={(event) =>
              updateFilter(setLocationFilter, event.target.value)
            }
          >
            <option value="all">All Locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-complaint-summary">
        <div>
          <span>Total complaints</span>
          <strong>{complaints.length}</strong>
        </div>
        <div>
          <span>Matching filters</span>
          <strong>{filteredComplaints.length}</strong>
        </div>
        <div>
          <span>Open complaints</span>
          <strong>{openComplaints}</strong>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="admin-complaints-selection-bar">
          <span>
            {selectedIds.length} complaint{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
          >
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-empty">Loading complaints…</div>
      ) : filteredComplaints.length === 0 ? (
        <div className="admin-empty">
          No complaints match your search and filters.
        </div>
      ) : (
        <>
          <div className="admin-table-wrap admin-complaints-table-wrap">
            <table className="admin-table admin-complaints-table">
              <thead>
                <tr>
                  <th className="admin-complaints-checkbox-cell">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisibleComplaints}
                      aria-label="Select all complaints on this page"
                    />
                  </th>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {visibleComplaints.map((item) => {
                  const categoryIcon = getCategoryIcon(item.category)

                  return (
                    <tr key={item.id}>
                      <td className="admin-complaints-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleComplaint(item.id)}
                          aria-label={`Select complaint ${item.id}`}
                        />
                      </td>

                      <td className="admin-complaints-id">
                        C-{String(item.id).padStart(4, '0')}
                      </td>

                      <td>
                        <div className="admin-complaints-type">
                          <span
                            className={`admin-complaints-category-icon tone-${categoryIcon.tone}`}
                            aria-hidden="true"
                          >
                            {categoryIcon.icon}
                          </span>
                          <span>{item.category || 'Other'}</span>
                        </div>
                        <span className="admin-complaints-mobile-title">
                          {item.title}
                        </span>
                      </td>

                      <td className="admin-complaints-location">
                        {getLocation(item)}
                      </td>

                      <td className="admin-complaints-date">
                        {formatDateTime(item.created_at)}
                      </td>

                      <td>
                        <span
                          className={`admin-status ${getStatusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>

                      <td>
  <div className="admin-complaints-actions">
    <button
      type="button"
      className="admin-complaints-view"
      onClick={() => openDetails(item.id)}
    >
      View <span aria-hidden="true">⌄</span>
    </button>

    <button
      type="button"
      className="admin-complaints-map-button"
      onClick={() => openComplaintMap(item.id)}
      title={`View map for complaint ${item.id}`}
      aria-label={`View map for complaint ${item.id}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    </button>
  </div>
</td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-complaints-pagination">
            <span>
              Showing {firstItem}–{lastItem} of {filteredComplaints.length}
            </span>

            <div className="admin-complaints-page-buttons">
              <button
                type="button"
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((pageNumber) => {
                  return (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    Math.abs(pageNumber - currentPage) <= 1
                  )
                })
                .map((pageNumber, index, pages) => (
                  <span className="admin-complaints-page-item" key={pageNumber}>
                    {index > 0 && pages[index - 1] !== pageNumber - 1 && (
                      <span className="admin-complaints-ellipsis">…</span>
                    )}
                    <button
                      type="button"
                      className={pageNumber === currentPage ? 'active' : ''}
                      onClick={() => setPage(pageNumber)}
                      aria-current={pageNumber === currentPage ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  </span>
                ))}

              <button
                type="button"
                onClick={() =>
                  setPage((previous) => Math.min(totalPages, previous + 1))
                }
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </>
      )}

      {(detailLoading || selectedComplaint) && (
        <div
          className="admin-detail-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedComplaint(null)
              setDetailLoading(false)
            }
          }}
        >
          <section
            className="admin-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-complaint-detail-title"
          >
            <button
              type="button"
              className="admin-detail-close"
              onClick={() => {
                setSelectedComplaint(null)
                setDetailLoading(false)
              }}
              aria-label="Close complaint details"
            >
              ×
            </button>

            {detailLoading ? (
              <p>Loading complaint details…</p>
            ) : selectedComplaint ? (
              <>
                <p className="admin-eyebrow">
                  COMPLAINT C-{String(selectedComplaint.id).padStart(4, '0')}
                </p>

                <h2 id="admin-complaint-detail-title">
                  {selectedComplaint.title}
                </h2>

                <span
                  className={`admin-status ${getStatusClass(selectedComplaint.status)}`}
                >
                  {statusLabel(selectedComplaint.status)}
                </span>

                <dl className="admin-detail-list">
                  <dt>Category</dt>
                  <dd>{selectedComplaint.category || '—'}</dd>

                  <dt>Description</dt>
                  <dd>{selectedComplaint.description || '—'}</dd>

                  <dt>Village</dt>
                  <dd>{selectedComplaint.village || '—'}</dd>

                  <dt>Ward</dt>
                  <dd>{selectedComplaint.ward || '—'}</dd>

                  <dt>Landmark</dt>
                  <dd>{selectedComplaint.landmark || '—'}</dd>

                  <dt>Asset ID</dt>
                  <dd>{selectedComplaint.asset_id ?? '—'}</dd>

                  <dt>Submitted</dt>
                  <dd>{formatDateTime(selectedComplaint.created_at)}</dd>

                  <dt>Coordinates</dt>
                  <dd>
                    {selectedComplaint.latitude != null &&
                    selectedComplaint.longitude != null
                      ? `${selectedComplaint.latitude}, ${selectedComplaint.longitude}`
                      : 'Not available'}
                  </dd>
                </dl>
              </>
            ) : null}
          </section>
        </div>
      )}
            {mapLoading && (
        <div className="admin-detail-overlay">
          <section
            className="admin-location-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Loading complaint location"
          >
            <p>Loading complaint location…</p>
          </section>
        </div>
      )}

      {!mapLoading && mapComplaint && (
        <div
          className="admin-detail-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setMapComplaint(null)
            }
          }}
        >
          <section
            className="admin-location-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-location-title"
          >
            <button
              type="button"
              className="admin-detail-close"
              onClick={() => setMapComplaint(null)}
              aria-label="Close map"
            >
              ×
            </button>

            <p className="admin-eyebrow">
              COMPLAINT C-{String(mapComplaint.id).padStart(4, '0')}
            </p>

            <h2 id="admin-location-title">Complaint Location</h2>

            <p className="admin-location-description">
              {mapComplaint.title}
            </p>

            <p className="admin-location-address">
              {[mapComplaint.landmark, mapComplaint.ward, mapComplaint.village]
                .filter(Boolean)
                .join(', ') || 'Location details unavailable'}
            </p>

            {mapComplaint.latitude != null &&
            mapComplaint.longitude != null &&
            Number.isFinite(Number(mapComplaint.latitude)) &&
            Number.isFinite(Number(mapComplaint.longitude)) &&
            Math.abs(Number(mapComplaint.latitude)) <= 90 &&
            Math.abs(Number(mapComplaint.longitude)) <= 180 ? (
              <>
                <iframe
                  className="admin-location-map"
                  title={`Map for complaint ${mapComplaint.id}`}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(mapComplaint.longitude) - 0.005}%2C${Number(mapComplaint.latitude) - 0.005}%2C${Number(mapComplaint.longitude) + 0.005}%2C${Number(mapComplaint.latitude) + 0.005}&layer=mapnik&marker=${Number(mapComplaint.latitude)}%2C${Number(mapComplaint.longitude)}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

                <p className="admin-location-coordinates">
                  {mapComplaint.latitude}, {mapComplaint.longitude}
                </p>

                <a
                  className="admin-location-directions"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${mapComplaint.latitude},${mapComplaint.longitude}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps ↗
                </a>
              </>
            ) : (
              <div className="admin-location-unavailable">
                <p>Location coordinates are not available for this complaint.</p>
                <p>
                  The map will appear when valid latitude and longitude are
                  recorded.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  )
}