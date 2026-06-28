'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getMyAvailability, saveAvailability, saveGoogleRefreshToken, signInWithGoogle } from '@/lib/supabase'
import { TZ_LIST, detectTimezone, findClosestTz } from '@/lib/timezone'

const DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

type TimeRange = { start: string; end: string }
type WeeklyRules = Record<string, TimeRange[]>

export default function AvailabilityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState(findClosestTz(detectTimezone()))
  const [duration, setDuration] = useState(30)
  const [buffer, setBuffer] = useState(0)
  const [rules, setRules] = useState<WeeklyRules>({
    mon: [{ start: '09:00', end: '17:00' }],
    tue: [{ start: '09:00', end: '17:00' }],
    wed: [{ start: '09:00', end: '17:00' }],
    thu: [{ start: '09:00', end: '17:00' }],
    fri: [{ start: '09:00', end: '17:00' }],
    sat: [],
    sun: [],
  })
  const [savedUsername, setSavedUsername] = useState('')
  const [calendarConnected, setCalendarConnected] = useState(false)

  useEffect(() => {
      // Capture refresh token from Google OAuth callback
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.provider_refresh_token) {
          await saveGoogleRefreshToken(session.provider_refresh_token)
          setCalendarConnected(true)
        }
      })
  
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) { router.push('/login'); return }
        getMyAvailability().then(av => {
          if (av) {
            setUsername(av.username || '')
            setSavedUsername(av.username || '')
            setDisplayName(av.display_name || '')
            setTimezone(av.timezone)
            setDuration(av.meeting_duration)
            setBuffer(av.buffer_minutes)
            setCalendarConnected(av.google_calendar_connected || false)
            if (av.weekly_rules && Object.keys(av.weekly_rules).length > 0) setRules(av.weekly_rules)
          }
          setLoading(false)
        })
      })
  
      return () => subscription.unsubscribe()
    }, [router])

  const toggleDay = (day: string) => {
    setRules(prev => ({ ...prev, [day]: prev[day]?.length > 0 ? [] : [{ start: '09:00', end: '17:00' }] }))
  }

  const updateRange = (day: string, idx: number, field: 'start' | 'end', value: string) => {
    setRules(prev => {
      const dayRules = [...(prev[day] || [])]
      dayRules[idx] = { ...dayRules[idx], [field]: value }
      return { ...prev, [day]: dayRules }
    })
  }

  const addRange = (day: string) => {
    setRules(prev => ({ ...prev, [day]: [...(prev[day] || []), { start: '09:00', end: '17:00' }] }))
  }

  const removeRange = (day: string, idx: number) => {
    setRules(prev => ({ ...prev, [day]: prev[day].filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    if (!username.trim()) return alert('Please choose a username for your booking link.')
    if (!/^[a-z0-9-]+$/.test(username)) return alert('Username can only contain lowercase letters, numbers, and hyphens.')
    setSaving(true)
    const result = await saveAvailability({
      username: username.trim(),
      display_name: displayName.trim() || null,
      timezone,
      meeting_duration: duration,
      buffer_minutes: buffer,
      weekly_rules: rules,
    })
    setSaving(false)
    if (result) {
      setSavedUsername(username.trim())
      alert('Availability saved! Your booking link is ready.')
    } else {
      alert('Failed to save. The username might be taken — try another.')
    }
  }

  if (loading) return <div className="app"><p style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading...</p></div>

  const bookingUrl = typeof window !== 'undefined' ? window.location.origin + '/book/' + (savedUsername || 'your-username') : ''

  return (
    <div className="app">
      <div className="page-header">
        <h1>Booking Page Setup</h1>
        <p>Set your availability and share your personal booking link — like Calendly.</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <span className="section-label">Your booking link</span>
        <div className="form-group">
          <label>Username</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-muted)' }}>rendezvous-phi.vercel.app/book/</span>
            <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="your-name" style={{ flex: 1 }} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Display Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Jeremy Cheng" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <span className="section-label">Meeting settings</span>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label>Meeting Duration</label>
            <select value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label>Buffer Between Meetings</label>
            <select value={buffer} onChange={e => setBuffer(parseInt(e.target.value))}>
              <option value={0}>No buffer</option>
              <option value={5}>5 min</option>
              <option value={10}>10 min</option>
              <option value={15}>15 min</option>
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>🌐 Your Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}>
            {TZ_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <span className="section-label">Google Calendar</span>
        {calendarConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--yes-bg)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: 20 }}>✓</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--yes)' }}>Connected</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>New bookings will be added to your Google Calendar automatically.</div>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12 }}>Connect your Google Calendar so bookings are automatically added to it. (Save your availability first, then connect.)</p>
            <button className="btn btn-secondary btn-sm" onClick={async () => {
              if (!savedUsername) { alert('Please save your availability first, then connect.'); return }
              await signInWithGoogle()
            }}>
              📅 Connect Google Calendar
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <span className="section-label">Weekly availability</span>
        {DAYS.map(day => {
          const dayRules = rules[day.key] || []
          const isActive = dayRules.length > 0
          return (
            <div key={day.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ width: 120, paddingTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={isActive} onChange={() => toggleDay(day.key)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{day.label}</span>
                </label>
              </div>
              <div style={{ flex: 1 }}>
                {!isActive ? (
                  <span style={{ fontSize: 13, color: 'var(--ink-muted)', paddingTop: 8, display: 'inline-block' }}>Unavailable</span>
                ) : (
                  dayRules.map((range, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <input type="time" value={range.start} onChange={e => updateRange(day.key, idx, 'start', e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 13 }} />
                      <span style={{ color: 'var(--ink-muted)' }}>–</span>
                      <input type="time" value={range.end} onChange={e => updateRange(day.key, idx, 'end', e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 13 }} />
                      <button onClick={() => removeRange(day.key, idx)} style={{ border: 'none', background: 'none', color: 'var(--no)', cursor: 'pointer', fontSize: 18, padding: '0 6px' }}>×</button>
                      {idx === dayRules.length - 1 && <button onClick={() => addRange(day.key)} style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 18, padding: '0 6px' }}>+</button>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {savedUsername && (
        <div className="card" style={{ marginBottom: 24, background: 'var(--accent-light)' }}>
          <span className="section-label">Your booking link is live!</span>
          <div className="share-box">
            <input readOnly value={bookingUrl} />
            <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard.writeText(bookingUrl); alert('Link copied!') }}>Copy</button>
          </div>
          <a href={'/book/' + savedUsername} target="_blank" rel="noopener" style={{ fontSize: 13, color: 'var(--accent)', marginTop: 10, display: 'inline-block' }}>Preview your booking page →</a>
        </div>
      )}

      <div className="step-footer">
        <div />
        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '14px 32px', fontSize: 16 }}>
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  )
}
