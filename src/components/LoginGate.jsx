import { useState } from 'react'
import axios from 'axios'

export default function LoginGate({ onAuth }) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const { data } = await axios.post('/api/auth', { password })
            if (data.success) {
                sessionStorage.setItem('woosheet_auth', '1')
                onAuth()
            }
        } catch {
            setError('Invalid password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-gate">
            <div className="login-card">
                <div className="login-logo">
                    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="32" height="32" rx="8" fill="rgba(0,200,224,0.12)" />
                        <path d="M6 22 Q10 14 16 18 Q22 22 26 10" stroke="#00c8e0" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                        <circle cx="16" cy="18" r="2.5" fill="#00c8e0" />
                    </svg>
                    <h1>Woo<span>Sheet</span></h1>
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    {error && <p className="login-error">{error}</p>}
                    <button type="submit" disabled={loading || !password}>
                        {loading ? 'Verifying...' : 'Enter'}
                    </button>
                </form>
            </div>
        </div>
    )
}
