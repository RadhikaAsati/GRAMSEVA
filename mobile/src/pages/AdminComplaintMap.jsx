import { useEffect, useMemo, useState } from 'react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const INDIA_CENTER = [20.5937, 78.9629]

const CATEGORY_COLORS = {
  'water supply': '#3988e8',
  water: '#3988e8',
  electricity: '#ed6a55',
  roads: '#ed9d32',
  road: '#ed9d32',
  sanitation: '#2a9d70',
  garbage: '#8b6bd6',
  'street light': '#159c94',
  'street lights': '#159c94',
}

function categoryColor(category) {
  const key = String(category || '').trim().toLowerCase()
  return CATEGORY_COLORS[key] || '#477b58'
}

function validCoordinates(complaint) {
  if (complaint.latitude == null || complaint.longitude == null) return false
  const lat = Number(complaint.latitude)
  const lon = Number(complaint.longitude)
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180
}

function FitComplaintBounds({ complaints }) {
  const map = useMap()

  useEffect(() => {
    if (!complaints.length) return

    const points = complaints.map(item => [
      Number(item.latitude),
      Number(item.longitude),
    ])

    if (points.length === 1) {
      map.setView(points[0], 15)
    } else {
      map.fitBounds(points, { padding: [36, 36], maxZoom: 15 })
    }
  }, [complaints, map])

  return null
}

function prettyStatus(status) {
  return String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

export default function AdminComplaintMap({ complaints = [], onViewComplaint }) {
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const locatedComplaints = useMemo(
    () => complaints.filter(validCoordinates),
    [complaints],
  )

  // Build filter options from every complaint, including reports
  // that do not yet have coordinates.
  const categories = useMemo(
    () => [...new Set(complaints.map(item => item.category).filter(Boolean))].sort(),
    [complaints],
  )

  const statuses = useMemo(
    () => [...new Set(locatedComplaints.map(item => item.status).filter(Boolean))].sort(),
    [locatedComplaints],
  )

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()

    return locatedComplaints.filter(item => {
      if (category !== 'all' && item.category !== category) return false
      if (status !== 'all' && item.status !== status) return false

      if (query) {
        const searchable = [
          item.title,
          item.description,
          item.village,
          item.ward,
          item.landmark,
          item.category,
          item.id,
        ].filter(value => value != null).join(' ').toLowerCase()

        if (!searchable.includes(query)) return false
      }

      return true
    })
  }, [locatedComplaints, category, status, search])

  const center = filtered.length
    ? [Number(filtered[0].latitude), Number(filtered[0].longitude)]
    : INDIA_CENTER

  return (
    <section className="gram-panel gram-complaint-map">
      <div className="gram-panel-heading">
        <div>
          <h2>Complaint Map</h2>
          <p>Explore recorded complaints by location, category, and status.</p>
        </div>
      </div>

      <div className="gram-map-overview">
        <article className="gram-map-stat gram-map-stat-blue">
          <span>Mapped complaints</span>
          <strong>{locatedComplaints.length}</strong>
          <small>Reports with valid coordinates</small>
        </article>
        <article className="gram-map-stat gram-map-stat-amber">
          <span>Needs location</span>
          <strong>{complaints.length - locatedComplaints.length}</strong>
          <small>Reports not yet mappable</small>
        </article>
        <article className="gram-map-stat gram-map-stat-green">
          <span>Currently shown</span>
          <strong>{filtered.length}</strong>
          <small>Matching map filters</small>
        </article>
      </div>

      <div className="gram-map-toolbar">
        <label className="gram-map-control">
          Complaint type
          <select value={category} onChange={event => setCategory(event.target.value)}>
            <option value="all">All types</option>
            {categories.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>

        <label className="gram-map-control">
          Status
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map(value => (
              <option key={value} value={value}>{prettyStatus(value)}</option>
            ))}
          </select>
        </label>

        <label className="gram-map-control">
          Search complaints
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search title, village, landmark…"
            maxLength={255}
          />
        </label>
      </div>

      <div className="gram-map-counts" aria-live="polite">
        <span>{filtered.length} mapped {filtered.length === 1 ? 'complaint' : 'complaints'}</span>
        <span>{complaints.length - locatedComplaints.length} without coordinates</span>
      </div>

      {filtered.length > 0 ? (
        <MapContainer
          center={center}
          zoom={5}
          scrollWheelZoom
          className="gram-leaflet-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitComplaintBounds complaints={filtered} />

          {filtered.map(item => {
            const color = categoryColor(item.category)
            return (
              <CircleMarker
                key={item.id}
                center={[Number(item.latitude), Number(item.longitude)]}
                radius={9}
                pathOptions={{
                  color: '#ffffff',
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 0.95,
                }}
              >
                <Popup>
                  <div className="gram-map-popup">
                    <strong>{item.title || `Complaint #${item.id}`}</strong>
                    <p><b>ID:</b> {item.id}</p>
                    <p><b>Type:</b> {item.category || 'Uncategorized'}</p>
                    <p><b>Status:</b> {prettyStatus(item.status)}</p>
                    {(item.village || item.ward || item.landmark) && (
                      <p>
                        <b>Location:</b>{' '}
                        {[item.landmark, item.ward, item.village].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <small>
                      {Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}
                    </small>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      ) : (
        <div className="gram-map-empty">
          <strong>
            {locatedComplaints.length === 0
              ? 'No complaints have map coordinates yet'
              : 'No complaints match these filters'}
          </strong>
          <span>
            {locatedComplaints.length === 0
              ? 'Complaints with a saved location will appear here. Existing reports without coordinates are not assigned invented locations.'
              : 'Try another category, status, or search term.'}
          </span>
        </div>
      )}

      {complaints.some(item => !validCoordinates(item)) && (
        <section className="gram-unlocated">
          <div className="gram-unlocated-heading">
            <div>
              <h3>Complaints needing location</h3>
              <p>These reports cannot appear on the map until coordinates are recorded.</p>
            </div>
            <span>{complaints.filter(item => !validCoordinates(item)).length} reports</span>
          </div>

          <div className="gram-unlocated-list">
            {complaints
              .filter(item => !validCoordinates(item))
              .filter(item => {
                const query = search.trim().toLowerCase()
                if (category !== 'all' && item.category !== category) return false
                if (status !== 'all' && item.status !== status) return false
                if (!query) return true
                return [
                  item.title, item.description, item.village, item.ward,
                  item.landmark, item.category, item.id,
                ].filter(value => value != null).join(' ').toLowerCase().includes(query)
              })
              .map(item => (
                <article className="gram-unlocated-row" key={item.id}>
                  <div className="gram-unlocated-marker" aria-hidden="true">⌖</div>
                  <div className="gram-unlocated-main">
                    <strong>{item.title || `Complaint #${item.id}`}</strong>
                    <span>C-{String(item.id).padStart(4, '0')} · {item.category || 'Uncategorized'}</span>
                    <small>
                      {[item.landmark, item.ward, item.village].filter(Boolean).join(', ')
                        || 'Location details not provided'}
                    </small>
                  </div>
                  <div className="gram-unlocated-actions">
                    <span className={`gram-unlocated-status ${['escalated', 'under_review'].includes(String(item.status || '').toLowerCase()) ? 'is-attention' : ''}`}>
                      {prettyStatus(item.status)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewComplaint?.(item.id)}
                      disabled={item.id == null || !onViewComplaint}
                    >
                      View details <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
      )}

      {filtered.length > 0 && (
        <div className="gram-map-legend">
          {[...new Set(filtered.map(item => item.category || 'Other'))].map(value => (
            <span key={value}>
              <i style={{ background: categoryColor(value) }} />
              {value}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
