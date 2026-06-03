import { useState, useEffect } from 'react'
import axios from 'axios'
import StatusBadge from './StatusBadge.jsx'

const ALL_STATUSES = ['pending', 'processing', 'on-hold', 'completed', 'cancelled', 'refunded', 'failed']

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = (s) => s ? new Date(s).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

// WC Bookings epoch (seconds) → readable. all_day → date only.
const fmtEpoch = (sec, allDay) => {
    if (!sec) return '—'
    const d = new Date(sec * 1000)
    return allDay
        ? d.toLocaleDateString('en-IN', { dateStyle: 'full' })
        : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// Pull _booking_id from a line item's raw meta_data (it's an internal _key)
const bookingIdOf = (item) =>
    (item?.meta_data || []).find(m => m.key === '_booking_id')?.value || null

// Booking/date-ish meta keys to highlight in line items
const isBookingKey = (k = '') => /book|date|schedul|appoint|slot|delivery|pickup|start|end/i.test(k)

// Surface human-readable line-item meta (skip internal _keys and empty values)
const visibleMeta = (md = []) =>
    md
        .filter(m => m && !String(m.display_key || m.key || '').startsWith('_'))
        .map(m => ({
            key: m.display_key || m.key,
            value: String(m.display_value ?? m.value ?? '').trim(),
        }))
        .filter(m => m.key && m.value)

export default function OrderDetailModal({ orderId, onClose, addToast }) {
    const [order, setOrder] = useState(null)
    const [bookings, setBookings] = useState({}) // bookingId -> booking record
    const [notes, setNotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [status, setStatus] = useState('')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [attempt, setAttempt] = useState(0) // bump to retry

    useEffect(() => {
        let active = true
        setLoading(true)
        setError('')
        setBookings({})

        // Client-side fallback retry on top of server retry — survives proxy/network blips
        const loadOrder = async () => {
            const maxTries = 3
            for (let i = 0; i < maxTries; i++) {
                try {
                    const r = await axios.get(`/api/orders/${orderId}`, { timeout: 95000 })
                    if (!r.data?.id) throw new Error('Empty order response')
                    return r.data
                } catch (err) {
                    if (i === maxTries - 1) throw err
                    await new Promise(res => setTimeout(res, 1000 * (i + 1)))
                }
            }
        }

        loadOrder()
            .then(data => {
                if (!active) return
                setOrder(data); setStatus(data.status)
                // Resolve any WC Bookings line items → fetch their date records
                const ids = [...new Set((data.line_items || []).map(bookingIdOf).filter(Boolean))]
                ids.forEach(id => {
                    axios.get(`/api/bookings/${id}`)
                        .then(r => { if (active) setBookings(b => ({ ...b, [id]: r.data })) })
                        .catch(() => {})
                })
            })
            .catch(err => {
                if (!active) return
                const msg = err.response?.data?.error || err.message || 'Unknown error'
                setError(msg)
                addToast('Failed to load order details', 'error')
            })
            .finally(() => { if (active) setLoading(false) })

        // Notes load independently — failure is non-fatal
        axios.get(`/api/orders/${orderId}/notes`)
            .then(r => { if (active) setNotes(Array.isArray(r.data) ? r.data : []) })
            .catch(() => { if (active) setNotes([]) })

        return () => { active = false }
    }, [orderId, attempt])

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
                        <div className="state-box">
                            <div className="state-icon">⚠️</div>
                            <div className="state-title">Could not load order</div>
                            {error && <div className="state-sub">{error}</div>}
                            <button className="retry-btn" onClick={() => setAttempt(a => a + 1)}>↻ Retry</button>
                        </div>
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

                            {/* Payment & Tracking */}
                            <div className="modal-section">
                                <div className="modal-section-title">Payment & Tracking</div>
                                <div className="info-grid">
                                    <InfoItem label="Transaction ID" value={order.transaction_id} />
                                    <InfoItem label="Shipping Method" value={(order.shipping_lines || []).map(l => l.method_title).filter(Boolean).join(', ')} />
                                    <InfoItem label="Order Key" value={order.order_key} />
                                    <InfoItem label="Created Via" value={order.created_via} />
                                    <InfoItem label="Currency" value={order.currency} />
                                    <InfoItem label="Order #" value={order.number} />
                                </div>
                            </div>

                            <hr className="divider" />

                            {/* Timeline */}
                            <div className="modal-section">
                                <div className="modal-section-title">Timeline</div>
                                <div className="info-grid">
                                    <InfoItem label="Created" value={fmtDate(order.date_created)} />
                                    <InfoItem label="Modified" value={fmtDate(order.date_modified)} />
                                    <InfoItem label="Completed" value={fmtDate(order.date_completed)} />
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
                                {(order.line_items || []).map(item => {
                                    const sub = parseFloat(item.subtotal || 0)
                                    const tot = parseFloat(item.total || 0)
                                    const discounted = sub > tot
                                    const meta = visibleMeta(item.meta_data)
                                    const bId = bookingIdOf(item)
                                    const bk = bId ? bookings[bId] : null
                                    return (
                                        <div key={item.id} className="line-item-block">
                                            <div className="line-item">
                                                <div>
                                                    <div className="line-item-name">{item.name}</div>
                                                    <div className="line-item-qty">
                                                        Qty: {item.quantity}
                                                        {item.sku ? ` · SKU: ${item.sku}` : ''}
                                                        {` · ${fmt(item.price)} ea`}
                                                        {parseFloat(item.total_tax) > 0 ? ` · Tax: ${fmt(item.total_tax)}` : ''}
                                                    </div>
                                                </div>
                                                <div className="line-item-price">
                                                    {discounted && <span className="line-item-strike">{fmt(sub)}</span>}
                                                    {fmt(tot)}
                                                </div>
                                            </div>
                                            {bId && (
                                                <div className="booking-box">
                                                    {bk ? (
                                                        <>
                                                            <div className="meta-row meta-booking">
                                                                <span className="meta-key">📅 Booking Date</span>
                                                                <span className="meta-val">{fmtEpoch(bk.start, bk.all_day)}</span>
                                                            </div>
                                                            {bk.end && bk.end !== bk.start && (
                                                                <div className="meta-row meta-booking">
                                                                    <span className="meta-key">⤷ Until</span>
                                                                    <span className="meta-val">{fmtEpoch(bk.end, bk.all_day)}</span>
                                                                </div>
                                                            )}
                                                            {bk.status && (
                                                                <div className="meta-row"><span className="meta-key">Booking Status</span><span className="meta-val">{bk.status}</span></div>
                                                            )}
                                                            {bk.person_counts && Object.keys(bk.person_counts).length > 0 && (
                                                                <div className="meta-row"><span className="meta-key">Persons</span><span className="meta-val">{Object.values(bk.person_counts).reduce((a, b) => a + Number(b), 0)}</span></div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="meta-row meta-booking"><span className="meta-key">📅 Booking</span><span className="meta-val">#{bId} · loading date…</span></div>
                                                    )}
                                                </div>
                                            )}
                                            {meta.length > 0 && (
                                                <div className="line-item-meta">
                                                    {meta.map((m, i) => (
                                                        <div key={i} className={`meta-row ${isBookingKey(m.key) ? 'meta-booking' : ''}`}>
                                                            <span className="meta-key">{isBookingKey(m.key) ? '📅 ' : ''}{m.key}</span>
                                                            <span className="meta-val" dangerouslySetInnerHTML={{ __html: m.value }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
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

                            {/* Order Notes timeline */}
                            {notes.length > 0 && (
                                <>
                                    <hr className="divider" />
                                    <div className="modal-section">
                                        <div className="modal-section-title">Order Notes ({notes.length})</div>
                                        {notes.map(n => (
                                            <div key={n.id} className={`order-note ${n.customer_note ? 'note-customer' : 'note-private'}`}>
                                                <div className="order-note-meta">
                                                    <span className="order-note-tag">{n.customer_note ? 'Customer' : 'Private'}</span>
                                                    <span>{fmtDate(n.date_created)}</span>
                                                </div>
                                                <div className="order-note-text" dangerouslySetInnerHTML={{ __html: n.note }} />
                                            </div>
                                        ))}
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
