import { useState } from 'react'
import axios from 'axios'
import StatusBadge from './StatusBadge.jsx'

const ALL_STATUSES = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']
const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export default function OrderTable({ orders, onOrderClick, addToast, onStatusChange }) {
    return (
        <div className="table-wrap">
            {/* Header */}
            <div className="table-header-row">
                <span>#ID</span>
                <span>Customer</span>
                <span>Date</span>
                <span>Items</span>
                <span>Total</span>
                <span>Status</span>
                <span>Actions</span>
            </div>

            {/* Rows */}
            {orders.map(order => (
                <OrderRow
                    key={order.id}
                    order={order}
                    onClick={() => onOrderClick(order.id)}
                    addToast={addToast}
                    onStatusChange={onStatusChange}
                />
            ))}
        </div>
    )
}

function OrderRow({ order, onClick, addToast, onStatusChange }) {
    const [status, setStatus] = useState(order.status)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const isDirty = status !== order.status

    const itemsSummary = (order.line_items || [])
        .map(i => i.name)
        .join(', ')
        .substring(0, 40) + ((order.line_items?.length > 1) ? '…' : '')

    const handleSave = async (e) => {
        e.stopPropagation()
        setSaving(true)
        try {
            await axios.put(`/api/orders/${order.id}`, { status })
            onStatusChange(order.id, status)
            setSaved(true)
            addToast(`Order #${order.id} → "${status}"`)
            setTimeout(() => setSaved(false), 2000)
        } catch {
            addToast('Failed to update status', 'error')
            setStatus(order.status)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="order-row" onClick={onClick}>
            {/* ID */}
            <span className="order-id">#{order.id}</span>

            {/* Customer */}
            <span>
                <div className="customer-name">{order.billing?.first_name} {order.billing?.last_name}</div>
                <div className="customer-email">{order.billing?.email}</div>
            </span>

            {/* Date */}
            <span className="order-date">{fmtDate(order.date_created)}</span>

            {/* Items */}
            <span className="order-items" title={order.line_items?.map(i => i.name).join(', ')}>
                {order.line_items?.length || 0} item{order.line_items?.length !== 1 ? 's' : ''}&nbsp;
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{itemsSummary}</span>
            </span>

            {/* Total */}
            <span className="order-total">{fmt(order.total)}</span>

            {/* Status badge (current saved status) */}
            <span onClick={e => e.stopPropagation()}>
                <StatusBadge status={order.status} />
            </span>

            {/* Inline status editor */}
            <span className="status-select-wrap" onClick={e => e.stopPropagation()}>
                <select
                    className="status-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                >
                    {ALL_STATUSES.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                {isDirty && (
                    <button
                        className={`save-btn ${saved ? 'saved' : ''}`}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? '…' : saved ? '✓' : 'Save'}
                    </button>
                )}
            </span>
        </div>
    )
}
