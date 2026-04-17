import { useState, useEffect } from 'react'
import axios from 'axios'
import StatusBadge from './StatusBadge.jsx'

const ALL_STATUSES = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export default function OrderDetailModal({ orderId, onClose, addToast }) {
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        let active = true
        setLoading(true)
        axios.get(`/api/orders/${orderId}`)
            .then(r => { if (active) { setOrder(r.data); setStatus(r.data.status) } })
            .catch(() => addToast('Failed to load order details', 'error'))
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [orderId])

    const handleSave = async () => {
        setSaving(true)
        try {
            await axios.put(`/api/orders/${orderId}`, { status })
            setOrder(o => ({ ...o, status }))
            setSaved(true)
            addToast(`Order #${orderId} updated to "${status}"`)
            setTimeout(() => setSaved(false), 2500)
        } catch {
            addToast('Failed to update status', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Close on overlay click or Escape key
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [onClose])

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel">
                {/* Header */}
                <div className="modal-head">
                    <div>
                        <div className="modal-title">Order #{orderId}</div>
                        {order && <StatusBadge status={order.status} />}
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <ModalSkeleton />
                    ) : !order ? (
                        <div className="state-box"><div className="state-icon">⚠️</div><div className="state-title">Could not load order</div></div>
                    ) : (
                        <>
                            {/* Status Update */}
                            <div className="modal-section">
                                <div className="modal-section-title">Update Status</div>
                                <div className="modal-status-row">
                                    <select
                                        className="modal-select"
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                    >
                                        {ALL_STATUSES.map(s => (
                                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                    </select>
                                    <button
                                        className={`modal-save-btn ${saved ? 'saved' : ''}`}
                                        onClick={handleSave}
                                        disabled={saving || status === order.status}
                                    >
                                        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Update Status'}
                                    </button>
                                </div>
                            </div>

                            <hr className="divider" />

                            {/* Customer Info */}
                            <div className="modal-section">
                                <div className="modal-section-title">Customer</div>
                                <div className="info-grid">
                                    <InfoItem label="Name" value={`${order.billing?.first_name} ${order.billing?.last_name}`} />
                                    <InfoItem label="Email" value={order.billing?.email} />
                                    <InfoItem label="Phone" value={order.billing?.phone || '—'} />
                                    <InfoItem label="Payment" value={order.payment_method_title || '—'} />
                                    <InfoItem label="Order Date" value={fmtDate(order.date_created)} />
                                    <InfoItem label="Paid On" value={fmtDate(order.date_paid)} />
                                </div>
                            </div>

                            <hr className="divider" />

                            {/* Billing Address */}
                            <div className="modal-section">
                                <div className="modal-section-title">Billing Address</div>
                                <div className="info-item">
                                    <span>
                                        {[
                                            order.billing?.address_1,
                                            order.billing?.address_2,
                                            order.billing?.city,
                                            order.billing?.state,
                                            order.billing?.postcode,
                                            order.billing?.country,
                                        ].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            </div>

                            {/* Shipping Address (if different) */}
                            {order.shipping?.address_1 && (
                                <>
                                    <hr className="divider" />
                                    <div className="modal-section">
                                        <div className="modal-section-title">Shipping Address</div>
                                        <div className="info-item">
                                            <span>
                                                {[
                                                    order.shipping?.address_1,
                                                    order.shipping?.address_2,
                                                    order.shipping?.city,
                                                    order.shipping?.state,
                                                    order.shipping?.postcode,
                                                    order.shipping?.country,
                                                ].filter(Boolean).join(', ')}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            <hr className="divider" />

                            {/* Line Items */}
                            <div className="modal-section">
                                <div className="modal-section-title">Items ({order.line_items?.length || 0})</div>
                                {(order.line_items || []).map(item => (
                                    <div key={item.id} className="line-item">
                                        <div>
                                            <div className="line-item-name">{item.name}</div>
                                            <div className="line-item-qty">Qty: {item.quantity}</div>
                                        </div>
                                        <div className="line-item-price">{fmt(item.total)}</div>
                                    </div>
                                ))}
                            </div>

                            <hr className="divider" />

                            {/* Totals */}
                            <div className="modal-section">
                                <div className="modal-section-title">Totals</div>
                                <div className="total-row"><span>Subtotal</span><span>{fmt(order.line_items?.reduce((s, i) => s + parseFloat(i.total || 0), 0))}</span></div>
                                {parseFloat(order.shipping_total) > 0 && (
                                    <div className="total-row"><span>Shipping</span><span>{fmt(order.shipping_total)}</span></div>
                                )}
                                {order.coupon_lines?.length > 0 && (
                                    <div className="total-row"><span>Discount</span><span>−{fmt(order.discount_total)}</span></div>
                                )}
                                {parseFloat(order.total_tax) > 0 && (
                                    <div className="total-row"><span>Tax</span><span>{fmt(order.total_tax)}</span></div>
                                )}
                                <div className="total-row grand"><span>Grand Total</span><span>{fmt(order.total)}</span></div>
                            </div>

                            {/* Customer Note */}
                            {order.customer_note && (
                                <>
                                    <hr className="divider" />
                                    <div className="modal-section">
                                        <div className="modal-section-title">Customer Note</div>
                                        <div className="note-box">{order.customer_note}</div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

function InfoItem({ label, value }) {
    return (
        <div className="info-item">
            <label>{label}</label>
            <span>{value || '—'}</span>
        </div>
    )
}

function ModalSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[200, 100, 140, 100, 180, 120].map((w, i) => (
                <div key={i} className="skeleton" style={{ height: 18, width: w, borderRadius: 4 }} />
            ))}
        </div>
    )
}
