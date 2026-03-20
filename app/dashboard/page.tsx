'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getMyPolls, deletePoll, type Poll } from '@/lib/supabase'
import { getTzLabel } from '@/lib/timezone'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUser(user)
      getMyPolls().then(p => { setPolls(p.filter(poll => poll.user_id === user.id)); setLoading(false) })
    })
  }, [router])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this poll?')) return
    await deletePoll(id)
    setPolls(prev => prev.filter(p => p.id !== id))
  }

  const fmtDate = (ds: string) => new Date(ds + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  if (!user || loading) return <div className="app"><p style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading...</p></div>

  return (
    <div className="app">
      <div className="page-header">
        <h1>My Polls</h1>
        <p>Welcome back! Here are your polls. Only you can see these.</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Link href="/create" className="btn btn-primary">+ Create New Poll</Link>
      </div>

      {polls.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--ink-soft)', marginBottom: 8 }}>No polls yet</h2>
          <p style={{ color: 'var(--ink-muted)' }}>Create your first poll to get started!</p>
        </div>
      ) : (
        <div className="dash-grid">
          {polls.map(p => (
            <Link href={`/poll/${p.id}`} key={p.id} className="dash-card" style={{ position: 'relative' }}>
              <button className="btn btn-icon btn-ghost" onClick={(e) => handleDelete(p.id, e)}
                style={{ position: 'absolute', top: 12, right: 12 }} title="Delete">🗑</button>
              <div className="dash-card-title">{p.title}</div>
              <div className="dash-card-meta">
                <span>📅 {p.dates?.length ? `${fmtDate(p.dates[0])} – ${fmtDate(p.dates[p.dates.length - 1])}` : ''}</span>
                <span>🌐 {getTzLabel(p.timezone)}</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div><div className="dash-stat-num">{p.slot_keys?.length || 0}</div><div className="dash-stat-label">Slots</div></div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
