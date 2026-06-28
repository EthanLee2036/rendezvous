'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, signOut } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function TopBar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setMenuOpen(false)
    router.push('/')
  }

  return (
    <nav className="topbar">
      <Link href="/" className="logo">
        Rendez<span>Vous</span>
      </Link>
      <div className="topbar-actions">
        {user ? (
          <>
            <Link href="/" className="btn btn-ghost btn-sm">Group Poll</Link>
            <Link href="/availability" className="btn btn-ghost btn-sm">Booking Page</Link>
            <Link href="/dashboard" className="btn btn-ghost btn-sm">My Polls</Link>
            <Link href="/bookings" className="btn btn-ghost btn-sm">My Bookings</Link>
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--accent)', color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontSize: 13, fontWeight: 600
                }}>
                  {(user.email || '?')[0].toUpperCase()}
                </span>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>▾</span>
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setMenuOpen(false)} />
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 6,
                    background: 'var(--surface)', border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-lg)',
                    minWidth: 200, zIndex: 100, overflow: 'hidden'
                  }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-light)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>Signed in</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%', padding: '12px 16px', border: 'none',
                        background: 'transparent', textAlign: 'left',
                        fontFamily: 'inherit', fontSize: 13, color: 'var(--no)',
                        cursor: 'pointer',
                      }}
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link href="/login?mode=register" className="btn btn-primary btn-sm">Sign up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
