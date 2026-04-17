import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import useOrders from '../hooks/useOrders.js'
import OrderTable from '../components/OrderTable.jsx'

const STATUS_FILTERS = [
    { label: 'All', value: 'any' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'On Hold', value: 'on-hold' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Failed', value: 'failed' },
]

const KPI_COLORS = {
    total: '#00c8e0',
    pending: '#f59e0b',
    processing: '#3b82f6',
    completed: '#10b981',
    cancelled: '#ef4444',
}

export default function Dashboard({ onOrderClick, addToast }) {
    const [statusFilter, setStatusFilter] = useState('any')
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [page, setPage] = useState(1)
    const [stats, setStats] = useState(null)

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
        return () => clearTimeout(t)
    }, [searchInput])

    // Fetch stats for KPI cards
    const fetchStats = useCallback((isRefresh = false) => {
        axios.get('/api/stats', { params: { refresh: isRefresh } })
            .then(r => setStats(r.data))
            .catch(() => { })
    }, [])

    useEffect(() => {
        fetchStats(false)
    }, [fetchStats])

    const { orders, total, totalPages, loading, error, lastSynced, syncing, refresh } =
        useOrders({ status: statusFilter, search, page })

    // Update local order status after inline save
    const handleStatusChange = useCallback(() => {
        // Re-fetch stats when any order status changes
        fetchStats(true)
    }, [fetchStats])

    const handleFilterChange = (val) => { setStatusFilter(val); setPage(1) }

    const lastSyncedStr = lastSynced
        ? lastSynced.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '—'

    return (
        <>
            {/* KPI Cards */}
            <div className="kpi-grid">
                <KpiCard label="Total Orders" value={stats?.total ?? '—'} color={KPI_COLORS.total} icon="🛒" />
                <KpiCard label="Pending" value={stats?.byStatus?.pending ?? '—'} color={KPI_COLORS.pending} icon="⏳" />
                <KpiCard label="Processing" value={stats?.byStatus?.processing ?? '—'} color={KPI_COLORS.processing} icon="🔄" />
                <KpiCard label="Completed" value={stats?.byStatus?.completed ?? '—'} color={KPI_COLORS.completed} icon="✅" />
                <KpiCard label="Cancelled" value={stats?.byStatus?.cancelled ?? '—'} color={KPI_COLORS.cancelled} icon="✖" />
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                {/* Search */}
                <div className="search-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name, email, order ID…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                        <button
                            onClick={() => setSearchInput('')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                        >✕</button>
                    )}
                </div>

                {/* Status filters */}
                {STATUS_FILTERS.map(f => (
                    <button
                        key={f.value}
                        className={`filter-pill ${statusFilter === f.value ? 'active' : ''}`}
                        onClick={() => handleFilterChange(f.value)}
                    >
                        {f.label}
                    </button>
                ))}

                {/* Refresh button */}
                <button className={`refresh-btn ${syncing ? 'spinning' : ''}`} onClick={() => { refresh(); fetchStats(true) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M8 16H3v5" />
                    </svg>
                    Refresh
                </button>

                {/* Sync time */}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 4 }}>
                    {syncing ? 'Syncing…' : `Last synced: ${lastSyncedStr}`}
                </span>

                {/* Count */}
                {!loading && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                        {total} order{total !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Table */}
            {loading ? (
                <SkeletonTable />
            ) : error ? (
                <ErrorState message={error} />
            ) : orders.length === 0 ? (
                <EmptyState status={statusFilter} search={search} />
            ) : (
                <>
                    <OrderTable
                        orders={orders}
                        onOrderClick={onOrderClick}
                        addToast={addToast}
                        onStatusChange={handleStatusChange}
                    />
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                                const p = i + 1
                                return (
                                    <button
                                        key={p}
                                        className={`page-btn ${page === p ? 'active' : ''}`}
                                        onClick={() => setPage(p)}
                                    >{p}</button>
                                )
                            })}
                            {totalPages > 7 && <span style={{ color: 'var(--text-muted)' }}>…</span>}
                            <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </>
            )}
        </>
    )
}

function KpiCard({ label, value, color, icon }) {
    return (
        <div className="kpi-card" style={{ '--accent-color': color }}>
            <div className="kpi-icon">{icon}</div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ color }}>{value}</div>
        </div>
    )
}

function SkeletonTable() {
    return (
        <div className="table-wrap" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, opacity: 1 - i * 0.09 }} />
            ))}
        </div>
    )
}

function ErrorState({ message }) {
    const isKeyError = message?.toLowerCase().includes('401') || message?.toLowerCase().includes('unauthorized')
    return (
        <div className="table-wrap">
            <div className="state-box">
                <div className="state-icon">🔑</div>
                <div className="state-title">{isKeyError ? 'Authentication Failed' : 'Connection Error'}</div>
                <div className="state-body">
                    {isKeyError
                        ? <>Your WooCommerce API keys are missing or invalid.<br />Open <code>server/.env</code> and paste your <strong>Consumer Key</strong> and <strong>Consumer Secret</strong>.</>
                        : message}
                </div>
                {isKeyError && (
                    <div className="state-body" style={{ marginTop: 8 }}>
                        Generate keys at: <span className="state-link">aquaticaindia.com/wp-admin → WooCommerce → Settings → Advanced → REST API</span>
                    </div>
                )}
            </div>
        </div>
    )
}

function EmptyState({ status, search }) {
    return (
        <div className="table-wrap">
            <div className="state-box">
                <div className="state-icon">📭</div>
                <div className="state-title">No orders found</div>
                <div className="state-body">
                    {search ? `No orders matching "${search}"` : `No "${status}" orders at the moment.`}
                </div>
            </div>
        </div>
    )
}
