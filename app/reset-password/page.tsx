'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  const handleReset = async () => {
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true); setError('')
    const { error: e } = await supabase.auth.updateUser({ password })
    if (e) { setError(e.message); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  if (!ready) {
    return (
      <div className="app auth-page">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-muted)', padding: 40 }}>Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app auth-page">
      <div className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, fontWeight: 400, marginBottom: 6 }}>
            Set new password
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            Enter your new password below.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <p style={{ color: 'var(--yes)', fontSize: 15, fontWeight: 600 }}>Password updated!</p>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 8 }}>Redirecting to dashboard...</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="At least 6 characters" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
                placeholder="Type it again" />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 8 }}
              onClick={handleReset} disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
