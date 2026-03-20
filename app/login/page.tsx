'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmail, signUpWithEmail, signInWithGoogle, getUser } from '@/lib/supabase'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'login' | 'register'>(searchParams.get('mode') === 'register' ? 'register' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    getUser().then(u => { if (u) router.push('/dashboard') })
  }, [router])

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill in all fields.')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true); setError('')
    if (mode === 'register') {
      const { error: e } = await signUpWithEmail(email, password)
      if (e) { setError(e.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error: e } = await signInWithEmail(email, password)
      if (e) { setError(e.message); setLoading(false); return }
      const redirect = searchParams.get('redirect')
      router.push(redirect === 'create-save' ? '/' : '/dashboard')
    }
  }

  const handleGoogle = async () => {
    const { error: e } = await signInWithGoogle()
    if (e) setError(e.message)
  }

  return (
    <div className="app auth-page">
      <div className="card auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, fontWeight: 400, marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>
            {mode === 'login' ? 'Log in to manage your polls.' : 'Sign up to start creating polls.'}
          </p>
        </div>

        <button className="btn btn-google" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <div className="auth-divider">or</div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="you@example.com" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} placeholder="At least 6 characters" />
        </div>

        {error && <p className="auth-error">{error}</p>}
        {success && <p style={{ color: 'var(--yes)', fontSize: 13, marginTop: 8 }}>{success}</p>}

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', marginTop: 8 }}
          onClick={handleSubmit} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don&apos;t have an account? <a onClick={() => { setMode('register'); setError(''); setSuccess('') }}>Sign up</a></>
          ) : (
            <>Already have an account? <a onClick={() => { setMode('login'); setError(''); setSuccess('') }}>Log in</a></>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="app" style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
