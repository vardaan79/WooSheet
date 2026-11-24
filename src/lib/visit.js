// Shared booking / visit-date helpers.

// WC Bookings epoch (seconds) → readable. all_day → date only.
export const fmtEpoch = (sec, allDay) => {
    if (!sec) return '—'
    const d = new Date(sec * 1000)
    return allDay
        ? d.toLocaleDateString('en-IN', { dateStyle: 'full' })
        : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// _booking_id is a number on real WC Bookings (hotel) items; waterpark (WPC)
// items store an empty array under the same key — not a usable id.
export const bookingIdOf = (item) => {
    const v = (item?.meta_data || []).find(m => m.key === '_booking_id')?.value
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
}

// Dates picked on WPC Product Options date pickers. Stored on the line item
// as _wpcpo_options (old) / _wpcpo_options_v2 (new) — object of field entries,
// each with { title, value: "November 25, 2026" }.
export const visitDatesOf = (item) => {
    const md = (item?.meta_data || [])
        .find(m => m.key === '_wpcpo_options_v2' || m.key === '_wpcpo_options')
    const raw = md?.value || md?.display_value
    if (!raw || typeof raw !== 'object') return []
    return Object.values(raw)
        .map(f => ({ title: f?.title || 'Visit Date', value: String(f?.value ?? '').trim() }))
        .filter(f => f.value && f.value !== '[object Object]')
}

// "November 25, 2026" → "25-Nov-2026"; unparseable strings pass through.
export const fmtVisitDate = (s) => {
    const d = new Date(s)
    return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
