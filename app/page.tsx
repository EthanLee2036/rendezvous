'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  // If already logged in, go to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
      else setChecking(false)
    })
  }, [router])

  if (checking) return null

  return (
    <div className="app" style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 52, fontWeight: 400, letterSpacing: '-1px',
          marginBottom: 16, lineHeight: 1.1
        }}>
          Find the perfect<br />time to meet
        </h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 18, lineHeight: 1.7, marginBottom: 40 }}>
          Create a poll, share the link, and let everyone vote on the best time.
          Works across time zones. No fuss.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 60 }}>
          <Link href="/login?mode=register" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
            Get started free
          </Link>
          <Link href="/login" className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: 16 }}>
            Log in
          </Link>
        </div>

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, textAlign: 'center' }}>
          {[
            { icon: '📅', title: 'Visual time grid', desc: 'Drag to paint available slots' },
            { icon: '🌐', title: 'Timezone smart', desc: 'Auto-converts for each voter' },
            { icon: '🗳️', title: 'Easy voting', desc: 'No signup needed to vote' },
            { icon: '📊', title: 'Live results', desc: 'Best time found instantly' },
          ].map(f => (
            <div key={f.title} style={{
              padding: 24, background: 'var(--surface)',
              borderRadius: 'var(--radius)', border: '1px solid var(--border-light)'
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 60, color: 'var(--ink-muted)', fontSize: 13 }}>
          Have a poll link? Just open it directly — no account needed to vote.
        </p>
      </div>
    </div>
  )
}
