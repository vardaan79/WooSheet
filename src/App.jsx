import { useState, useCallback } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import OrderDetailModal from './components/OrderDetailModal.jsx'
import Toast from './components/Toast.jsx'

export default function App() {
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((msg, type = 'success') => {
        const id = Date.now()
        setToasts(t => [...t, { id, msg, type }])
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }, [])

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header-logo">
                    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="8" fill="rgba(0,200,224,0.12)" />
                        <path d="M6 22 Q10 14 16 18 Q22 22 26 10" stroke="#00c8e0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <circle cx="16" cy="18" r="2.5" fill="#00c8e0" />
                    </svg>
                    Woo<span>Sheet</span>
                </div>
                <LiveStatus />
            </header>

            {/* Dashboard */}
            <main className="main">
                <Dashboard onOrderClick={setSelectedOrder} addToast={addToast} />
            </main>

            {/* Detail modal */}
            {selectedOrder && (
                <OrderDetailModal
                    orderId={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    addToast={addToast}
                />
            )}

            {/* Toasts */}
            <Toast toasts={toasts} />
        </div>
    )
}

function LiveStatus() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="live-badge">
                <span className="live-dot" />
                LIVE
            </div>
            <span className="header-meta">aquaticaindia.com</span>
        </div>
    )
}
