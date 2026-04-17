export default function StatusBadge({ status }) {
    const labels = {
        pending: '⏳ Pending',
        processing: '🔄 Processing',
        'on-hold': '⏸ On Hold',
        completed: '✅ Completed',
        cancelled: '✖ Cancelled',
        refunded: '↩ Refunded',
        failed: '✖ Failed',
    }
    return (
        <span className={`status-badge ${status}`}>
            {labels[status] || status}
        </span>
    )
}
