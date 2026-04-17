import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'

const POLL_INTERVAL = 30_000 // 30 seconds

export default function useOrders({ status = 'any', search = '', page = 1 } = {}) {
    const [orders, setOrders] = useState([])
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastSynced, setLastSynced] = useState(null)
    const [syncing, setSyncing] = useState(false)
    const timerRef = useRef(null)

    const fetchOrders = useCallback(async (isRefresh = false) => {
        if (isRefresh) setSyncing(true)
        else setLoading(true)
        setError(null)
        try {
            const { data } = await axios.get('/api/orders', {
                params: { status, search, page, per_page: 20, refresh: isRefresh },
            })
            setOrders(data.orders)
            setTotal(data.total)
            setTotalPages(data.totalPages)
            setLastSynced(new Date())
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Failed to fetch orders')
        } finally {
            setLoading(false)
            setSyncing(false)
        }
    }, [status, search, page])

    // Initial + dependency-change fetch
    useEffect(() => {
        fetchOrders(false)
    }, [fetchOrders])

    // Auto-refresh polling
    useEffect(() => {
        timerRef.current = setInterval(() => fetchOrders(true), POLL_INTERVAL)
        return () => clearInterval(timerRef.current)
    }, [fetchOrders])

    const refresh = useCallback(() => fetchOrders(true), [fetchOrders])

    return { orders, total, totalPages, loading, error, lastSynced, syncing, refresh }
}
