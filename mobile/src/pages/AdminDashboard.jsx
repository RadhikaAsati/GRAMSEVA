import { useLanguage } from '../i18n/index.jsx'
import AdminSettings from './AdminSettings.jsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAdminDashboard,
  getAdminAnalytics,
  getAdminWorkers,
  getComplaints,
} from '../services/api.js'
import AdminComplaints from './AdminComplaints.jsx'
import AdminWorkers from './AdminWorkers.jsx'
import AssignTask from './AssignTask.jsx'
import AdminComplaintMap from './AdminComplaintMap.jsx'

const GREEN = '#356849'

const NAV_ITEMS = [
  { id: 'dashboard', labelKey: 'adminDashboard', icon: '⌂' },
  { id: 'complaints', labelKey: 'adminComplaints', icon: '▤' },
  { id: 'assignments', labelKey: 'adminAssignTask', icon: '✓' },
  { id: 'workers', labelKey: 'adminWorkers', icon: '♙' },
  { id: 'analytics', labelKey: 'adminAnalytics', icon: '▥' },
  { id: 'map', labelKey: 'adminMap', icon: '⌖' },
  { id: 'settings', labelKey: 'adminSettings', icon: '⚙' },
]

const STATUS_LABELS = {
  submitted: 'Pending',
  awaiting_intervention: 'Pending',
  awaiting_feedback: 'Awaiting feedback',
  in_progress: 'Assigned',
  resolved: 'Solved',
  escalated: 'Escalated',
  under_review: 'Under review',
}

function statusLabel(status, translate = (key) => ({
  adminPendingStatus: 'Pending',
  adminAwaitingFeedback: 'Awaiting feedback',
  adminAssigned: 'Assigned',
  adminSolved: 'Solved',
  adminEscalated: 'Escalated',
  adminUnderReview: 'Under review',
  adminUnknown: 'Unknown',
}[key] || key)) {
  const keys = {
    submitted: 'adminPendingStatus',
    awaiting_intervention: 'adminPendingStatus',
    awaiting_feedback: 'adminAwaitingFeedback',
    in_progress: 'adminAssigned',
    resolved: 'adminSolved',
    escalated: 'adminEscalated',
    under_review: 'adminUnderReview',
  }

  return keys[status]
    ? translate(keys[status])
    : String(status || translate('adminUnknown')).replaceAll('_', ' ')
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

function getArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.results)) return data.results
  if (Array.isArray(data?.data)) return data.data
  return []
}

function getTrendPoints(analytics) {
  const candidates = [
    analytics?.monthly_counts,
    analytics?.monthly_complaints,
    analytics?.complaint_trend,
    analytics?.monthly_trend,
    analytics?.trend,
  ]

  const rows = candidates.find(Array.isArray) || []

  return rows.map((item, index) => ({
    label: item.month || item.label || item.period || `Month ${index + 1}`,
    value: Number(item.count ?? item.total ?? item.value ?? 0),
  }))
}

function StatCard({ icon, label, value, color, tint, note }) {
  return (
    <article className="gram-kpi" style={{ '--kpi-color': color, '--kpi-tint': tint }}>
      <span className="gram-kpi-icon" aria-hidden="true">{icon}</span>
      <span className="gram-kpi-label">{label}</span>
      <strong className="gram-kpi-value">{value}</strong>
      <span className="gram-kpi-note">{note}</span>
    </article>
  )
}

function TrendChart({ points, t }) {
  if (!points.length) {
    return (
      <div className="gram-chart-empty">
        t('adminComplaintActivity')
      </div>
    )
  }

  const width = 520
  const height = 230
  const left = 38
  const right = 12
  const top = 15
  const bottom = 36
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const max = Math.max(5, ...points.map((point) => point.value))
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0

  const coordinates = points.map((point, index) => ({
    ...point,
    x: points.length > 1 ? left + index * step : left + plotWidth / 2,
    y: top + plotHeight - (point.value / max) * plotHeight,
  }))

  const line = coordinates.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')

  const area = `${line} L ${coordinates.at(-1).x} ${top + plotHeight} L ${coordinates[0].x} ${top + plotHeight} Z`

  return (
    <div className="gram-chart-wrap">
      <svg
        className="gram-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Complaint trend from available analytics data"
      >
        {[0, 1, 2, 3].map((index) => {
          const y = top + (plotHeight / 3) * index
          return (
            <g key={index}>
              <line x1={left} x2={width - right} y1={y} y2={y} className="gram-grid-line" />
              <text x={left - 8} y={y + 4} textAnchor="end" className="gram-axis-label">
                {Math.round(max * (1 - index / 3))}
              </text>
            </g>
          )
        })}

        <path d={area} className="gram-chart-area" />
        <path d={line} className="gram-chart-line" />

        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" className="gram-chart-point" />
            <text
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              className="gram-axis-label"
            >
              {String(point.label).slice(0, 7)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}


const ANALYTICS_COLORS = [
  "#4F8FEF", "#32A875", "#F2B544", "#EF786B",
  "#9674D8", "#32B7B0", "#E78AB5", "#78909C",
]

function AnalyticsDonut({ title, subtitle, entries, emptyText }) {
  const total = entries.reduce((sum, item) => sum + item.value, 0)
  let offset = 0
  const segments = entries.map((item, index) => {
    const share = total ? item.value / total * 100 : 0
    const segment = {
      ...item,
      color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
      share,
      start: offset,
    }
    offset += share
    return segment
  })

  return (
    <article className="ga-card">
      <div className="ga-card-heading">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="ga-chart-mark" aria-hidden="true">◔</span>
      </div>
      {!total ? (
        <div className="ga-empty">{emptyText}</div>
      ) : (
        <div className="ga-donut-layout">
          <div
            className="ga-donut"
            role="img"
            aria-label={`${title}: ${entries.map((item) => `${item.label} ${item.value}`).join(", ")}`}
            style={{
              background: `conic-gradient(${segments.map((item) =>
                `${item.color} ${item.start}% ${item.start + item.share}%`
              ).join(", ")})`,
            }}
          >
            <div className="ga-donut-hole">
              <strong>{total}</strong>
              <span>complaints</span>
            </div>
          </div>
          <div className="ga-legend">
            {segments.map((item) => (
              <div className="ga-legend-row" key={item.label}>
                <span className="ga-legend-dot" style={{ background: item.color }} />
                <span className="ga-legend-label">{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function AnalyticsBars({ points }) {
  const max = Math.max(1, ...points.map((item) => item.value))
  const colors = ["#4F8FEF", "#32A875", "#F2B544", "#EF786B", "#9674D8", "#32B7B0"]

  return (
    <article className="ga-card ga-trend-card">
      <div className="ga-card-heading">
        <div>
          <h3>Monthly Complaint Trend</h3>
          <p>Reports received over the last six calendar months</p>
        </div>
        <span className="ga-chart-mark" aria-hidden="true">▥</span>
      </div>
      {!points.length ? (
        <div className="ga-empty">Monthly trend data is not available yet.</div>
      ) : (
        <div className="ga-bars" role="img" aria-label="Monthly complaint totals">
          {points.map((point, index) => (
            <div className="ga-bar-column" key={`${point.label}-${index}`}>
              <strong className="ga-bar-value">{point.value}</strong>
              <div className="ga-bar-track">
                <div
                  className="ga-bar"
                  style={{
                    height: `${Math.max(point.value > 0 ? 5 : 0, point.value / max * 100)}%`,
                    background: colors[index % colors.length],
                  }}
                />
              </div>
              <span className="ga-bar-label">{point.label}</span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function getAnalyticsComplaintRows(analytics) {
  const candidates = [
    analytics?.complaint_details,
    analytics?.complaints,
    analytics?.items,
    analytics?.results,
  ]
  return candidates.find(Array.isArray) || []
}

function makeDistribution(rows, field, fallbackCounts = {}) {
  if (rows.length) {
    const counts = new Map()
    rows.forEach((row) => {
      const raw = row?.[field]
      const label = String(raw || "Unknown")
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
      counts.set(label, (counts.get(label) || 0) + 1)
    })
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7)
  }

  return Object.entries(fallbackCounts)
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => ({
      label: label.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
      value: Number(value),
    }))
}

export default function AdminDashboard({ user, token, onLogout }) {
  const { t } = useLanguage()
  const [dashboard, setDashboard] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [workers, setWorkers] = useState([])
  const [mapComplaints, setMapComplaints] = useState([])
  const [complaintToOpen, setComplaintToOpen] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showNotifications, setShowNotifications] = useState(false)

  const openComplaintFromMap = useCallback((complaintId) => {
    setComplaintToOpen(complaintId)
    setActiveSection('complaints')
  }, [])

  const loadDashboard = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true)
    else setLoading(true)

    setError('')

    try {
      const results = await Promise.allSettled([
        getAdminDashboard(token),
        getAdminAnalytics(token),
        getAdminWorkers(token),
        getComplaints(token),
      ])

      if (results[0].status === 'rejected') {
        throw results[0].reason
      }

      setDashboard(results[0].value)

      if (results[1].status === 'fulfilled') {
        setAnalytics(results[1].value)
      }

      if (results[2].status === 'fulfilled') {
        setWorkers(getArray(results[2].value))
      }

      if (results[3].status === 'fulfilled') {
        setMapComplaints(getArray(results[3].value))
      }
    } catch (err) {
      setError(err?.message || 'Could not load dashboard data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const summary = dashboard?.summary || {}
  const complaints = dashboard?.recent_complaints || []
  const recurring = dashboard?.recurring_complaints || []

  const solvedCount = useMemo(
    () => complaints.filter((item) => item.status === 'resolved').length,
    [complaints]
  )

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()

    return complaints.filter((item) => {
      const matchesQuery =
        !query ||
        String(item.id).includes(query) ||
        String(item.title || '').toLowerCase().includes(query) ||
        String(item.category || '').toLowerCase().includes(query)

      return matchesQuery &&
        (statusFilter === 'all' || item.status === statusFilter)
    })
  }, [complaints, search, statusFilter])

  const trendPoints = useMemo(() => getTrendPoints(analytics), [analytics])

  const pageTitle = t(NAV_ITEMS.find((item) => item.id === activeSection)?.labelKey || 'adminDashboard')
  const firstName = (user?.full_name || 'Admin').split(' ')[0]
  const initials = (user?.full_name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <main className="gram-admin">
      <aside className="gram-sidebar">
        <button
          type="button"
          className="gram-brand"
          onClick={() => setActiveSection('dashboard')}
          aria-label="Go to dashboard"
        >
          <img src="/images/gramseva-logo.png" alt="" />
          <span>
            <strong>GramSeva</strong>
            <small>{t('adminPortal')}</small>
          </span>
        </button>

        <nav className="gram-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeSection === item.id ? 'active' : ''}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="gram-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
        </nav>

        <div className="gram-sidebar-art">
          <img src="/images/village-landscape.png" alt="" />
        </div>

        <div className="gram-sidebar-user">
          <span className="gram-avatar">{initials}</span>
          <span className="gram-sidebar-user-copy">
            <strong>{user?.full_name || 'Administrator'}</strong>
            <small>{t('adminRole')}</small>
          </span>
          <button type="button" onClick={onLogout} title={t("adminLogout")} aria-label={t("adminLogout")}>
            ↪
          </button>
        </div>
      </aside>

      <section className="gram-main">
        <header className="gram-topbar">
          <div className="gram-mobile-brand">
            <img src="/images/gramseva-logo.png" alt="" />
            <strong>GramSeva</strong>
          </div>

          <div className="gram-topbar-spacer" />

          <button
            type="button"
            className="gram-icon-button"
            onClick={() => setShowNotifications((value) => !value)}
            aria-label="Toggle notifications"
          >
            ♧
            {recurring.length > 0 && <span className="gram-notification-dot" />}
          </button>

          <button
            type="button"
            className="gram-profile-button"
            onClick={() => setShowNotifications((value) => !value)}
          >
            <span className="gram-avatar">{initials}</span>
            <span>{user?.full_name || 'Admin'}</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </header>

        <div className="gram-content">
          {activeSection === 'complaints' ? (
            <AdminComplaints
              token={token}
              initialComplaintId={complaintToOpen}
              onInitialComplaintOpened={() => setComplaintToOpen(null)}
            />
          ) : (
            <>
              <section className={`gram-welcome ${activeSection === 'workers' ? 'gram-welcome-workers' : ''}`}>
                <div>
                  <p className="gram-eyebrow">GRAMSEVA / {pageTitle}</p>
                  <h1>
                    {activeSection === 'workers'
                      ? t('adminWorkers')
                      : activeSection === 'assignments'
                        ? t('adminAssignTask')
                        : activeSection === 'analytics'
                          ? t('adminAnalytics')
                          : activeSection === 'map'
                            ? t('adminMap')
                            : activeSection === 'settings'
                              ? t('adminSettings')
                              : `${t('adminGreeting')}, ${firstName}`}
                  </h1>
                  <p>
                    {activeSection === 'workers'
                      ? t('adminManageStaff')
                      : activeSection === 'dashboard'
                        ? 'Here’s what’s happening in your community today.'
                        : `Manage ${pageTitle.toLowerCase()} in GRAMSEVA.`}
                  </p>
                </div>

                <button
                  type="button"
                  className="gram-refresh"
                  onClick={() => loadDashboard(true)}
                  disabled={loading || refreshing}
                >
                  ↻ {refreshing ? t('adminRefreshing') : t('adminRefresh')}
                </button>
              </section>

              {error && (
                <div className="gram-error" role="alert">
                  <strong>{t('adminUnableDashboard')}</strong>
                  <p>{error}</p>
                  <button type="button" onClick={() => loadDashboard()}>
                    Try again
                  </button>
                </div>
              )}

              {showNotifications && (
                <section className="gram-notice">
                  <strong>{t('adminNotifications')}</strong>
                  <p>
                    {recurring.length
                      ? `${recurring.length} recurring complaint${recurring.length === 1 ? '' : 's'} may need review.`
                      : t('adminNoRecurringAlerts')}
                  </p>
                </section>
              )}

              {activeSection === 'workers' ? (
                <AdminWorkers token={token} />
              ) : activeSection === 'analytics' ? (
                <section className="ga-analytics">
<section className="ga-kpis">
                    <article className="ga-kpi ga-blue">
                      <span className="ga-kpi-icon">▤</span>
                      <span>{t('adminTotalComplaints')}</span>
                      <strong>{summary.total_complaints ?? analytics?.total_complaints ?? "—"}</strong>
                      <small>{t('adminAllRecordedComplaints')}</small>
                    </article>
                    <article className="ga-kpi ga-green">
                      <span className="ga-kpi-icon">✓</span>
                      <span>{t('adminResolvedOutcomes')}</span>
                      <strong>{analytics?.outcome_counts?.resolved ?? analytics?.counts?.resolved ?? "—"}</strong>
                      <small>{t('adminResolutionAnalysis')}</small>
                    </article>
                    <article className="ga-kpi ga-amber">
                      <span className="ga-kpi-icon">◷</span>
                      <span>{t('adminNeedsFollowup')}</span>
                      <strong>{summary.complaints_needing_follow_up ?? analytics?.outcome_counts?.requires_follow_up ?? "—"}</strong>
                      <small>{t('adminMayNeedAttention')}</small>
                    </article>
                    <article className="ga-kpi ga-purple">
                      <span className="ga-kpi-icon">↻</span>
                      <span>{t('adminRecurringReports')}</span>
                      <strong>{summary.recurring_complaints ?? analytics?.outcome_counts?.recurring_complaints ?? "—"}</strong>
                      <small>{t('adminIssuesReportedAgain')}</small>
                    </article>
                  </section>

                  <section className="ga-chart-grid">
                    <AnalyticsDonut
                      title={t('adminAnalyticsComplaintsType')}
                      subtitle={t('adminDistributionCategory')}
                      entries={makeDistribution(
                        getAnalyticsComplaintRows(analytics),
                        "category"
                      )}
                      emptyText={t('adminAnalyticsCategoryUnavailable')}
                    />
                    <AnalyticsDonut
                      title={t('adminStatusDistribution')}
                      subtitle={t('adminWorkflowStatus')}
                      entries={makeDistribution(
                        getAnalyticsComplaintRows(analytics),
                        "status"
                      )}
                      emptyText={t('adminAnalyticsStatusUnavailable')}
                    />
                    <AnalyticsBars points={trendPoints} />
                  </section>

                  <div className="ga-footnote">
                    {t('adminAnalyticsFootnote')}
                  </div>
                </section>
              ) : activeSection === 'map' ? (
                <AdminComplaintMap complaints={mapComplaints} onViewComplaint={openComplaintFromMap} />
              ) : activeSection === 'assignments' ? (
                <AssignTask token={token} />
              ) : activeSection === 'settings' ? (
                <AdminSettings user={user} token={token} />
              ) : (
                <>
                  <section className="gram-kpi-grid">
                    <StatCard
                      icon="◉"
                      label="Total Complaints"
                      value={summary.total_complaints ?? complaints.length}
                      color="#218b55"
                      tint="#e3f3e8"
                      note="All recorded complaints"
                    />
                    <StatCard
                      icon="⌖"
                      label="Solved"
                      value={solvedCount}
                      color="#347ec4"
                      tint="#e6f0fc"
                      note="Resolved in recent records"
                    />
                    <StatCard
                      icon="◷"
                      label="Pending"
                      value={summary.complaints_needing_follow_up ?? 0}
                      color="#d68b20"
                      tint="#fff0d5"
                      note="Need further action"
                    />
                    <StatCard
                      icon="♙"
                      label="Field Workers"
                      value={workers.length}
                      color="#8064c9"
                      tint="#eee8fc"
                      note="Active workers"
                    />
                  </section>

                  <section className="gram-dashboard-grid">
                    <article className="gram-panel gram-trend-panel">
                      <div className="gram-panel-heading">
                        <div>
                          <h2>{t('adminComplaintTrend')}</h2>
                          <p>{t('adminComplaintActivity')}</p>
                        </div>
                      </div>
                      <TrendChart points={trendPoints} t={t} />
                    </article>

                    <article className="gram-panel gram-recent-panel">
                      <div className="gram-panel-heading">
                        <div>
                          <h2>{t('adminRecentComplaints')}</h2>
                          <p>{t('adminLatestReports')}</p>
                        </div>
                        <button
                          type="button"
                          className="gram-text-button"
                          onClick={() => setActiveSection('complaints')}
                        >
                          View All →
                        </button>
                      </div>

                      {complaints.length ? (
                        <div className="gram-recent-list">
                          {complaints.slice(0, 5).map((item, index) => (
                            <div className="gram-recent-item" key={item.id}>
                              <span className={`gram-complaint-icon tone-${index % 3}`}>
                                {index % 3 === 0 ? '⌖' : index % 3 === 1 ? '♧' : '⌂'}
                              </span>
                              <div className="gram-recent-copy">
                                <strong>{item.title || item.category || `Complaint #${item.id}`}</strong>
                                <small>
                                  {item.category || t('adminGeneral')}
                                  {' · '}
                                  {formatDate(item.created_at)}
                                </small>
                              </div>
                              <span className={`gram-status status-${item.status || 'unknown'}`}>
                                {statusLabel(item.status, t)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="gram-empty">
                          {loading ? t('adminLoadingComplaints') : t('adminNoRecentComplaints')}
                        </p>
                      )}

                      <div className="gram-mini-map">
                        <div className="gram-map-pattern" aria-hidden="true">
                          <span className="gram-map-road road-one" />
                          <span className="gram-map-road road-two" />
                          <span className="gram-map-river" />
                          <span className="gram-map-pin">●</span>
                        </div>
                        <div className="gram-map-caption">
                          <span>{t('adminLatestLocation')}</span>
                          <button
                            type="button"
                            onClick={() => setActiveSection('map')}
                          >
                            View map →
                          </button>
                        </div>
                        <small>
                          Map preview is illustrative until complaint coordinates are available.
                        </small>
                      </div>
                    </article>
                  </section>

                  {recurring.length > 0 && (
                    <section className="gram-panel gram-recurring-panel">
                      <div className="gram-panel-heading">
                        <div>
                          <h2>Recurring Complaints</h2>
                          <p>{t('adminRecurringHelp')}</p>
                        </div>
                        <span className="gram-count">{recurring.length} t('adminToReview')</span>
                      </div>

                      <div className="gram-recurring-list">
                        {recurring.slice(0, 5).map((item) => (
                          <div key={item.complaint_id} className="gram-recurring-item">
                            <div>
                              <strong>{item.title}</strong>
                              <small>{item.category} · Complaint #{item.complaint_id}</small>
                              <p>{item.message}</p>
                            </div>
                            <span className="gram-status status-under_review">Review</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {complaints.length > 0 && (
                    <section className="gram-panel gram-table-panel">
                      <div className="gram-panel-heading">
                        <div>
                          <h2>All Recent Records</h2>
                          <p>Search and filter the complaints returned by the dashboard.</p>
                        </div>
                      </div>

                      <div className="gram-table-tools">
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Search ID, title or category…"
                          aria-label="Search complaints"
                        />
                        <select
                          value={statusFilter}
                          onChange={(event) => setStatusFilter(event.target.value)}
                          aria-label="Filter complaints by status"
                        >
                          <option value="all">All statuses</option>
                          {[...new Set(complaints.map((item) => item.status).filter(Boolean))].map((status) => (
                            <option key={status} value={status}>{statusLabel(status)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="gram-table-scroll">
                        <table className="gram-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Complaint</th>
                              <th>Category</th>
                              <th>Status</th>
                              <th>Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredComplaints.map((item) => (
                              <tr key={item.id}>
                                <td>#{item.id}</td>
                                <td>{item.title}</td>
                                <td>{item.category || '—'}</td>
                                <td>
                                  <span className={`gram-status status-${item.status || 'unknown'}`}>
                                    {statusLabel(item.status, t)}
                                  </span>
                                </td>
                                <td>{formatDate(item.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!filteredComplaints.length && (
                          <p className="gram-empty">No complaints match your filters.</p>
                        )}
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
