'use client'

import { getGoogleBusyTimes, isSlotBusy, type BusySlot } from '@/lib/calendar'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, createPoll } from '@/lib/supabase'
import { TZ_LIST, detectTimezone, findClosestTz } from '@/lib/timezone'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function HomePage() {
  const router = useRouter()
  const today = useRef(new Date()); today.current.setHours(0,0,0,0)
  const detectedTz = useRef(findClosestTz(detectTimezone()))

  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [duration, setDuration] = useState('60')
  const [location, setLocation] = useState('')
  const [timezone, setTimezone] = useState(detectedTz.current)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set())
  const [timeGrid, setTimeGrid] = useState<Record<string, Set<string>>>({})
  const [interval, setInterval_] = useState(60)
  const [deadline, setDeadline] = useState('')
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [loadingBusy, setLoadingBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const dragRef = useRef<{ mode: 'on' | 'off' } | null>(null)

  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const changeMonth = (dir: number) => {
    let m = month + dir, y = year
    if (m > 11) { m = 0; y++ } if (m < 0) { m = 11; y-- }
    setMonth(m); setYear(y)
  }
  const toggleDate = (key: string, isPast: boolean) => {
    if (isPast) return
    setSelectedDates(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })
    setTimeGrid(prev => { const n = { ...prev }; if (n[key]) delete n[key]; else n[key] = new Set(); return n })
  }

  const first = new Date(year, month, 1)
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calDays: (number | null)[] = []
  for (let i = 0; i < startDay; i++) calDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)

  const getSlots = useCallback(() => {
    const s: string[] = []
    for (let h = 7; h < 22; h++) for (let m = 0; m < 60; m += interval) {
      if (h === 21 && m > 0) break
      s.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'))
    }
    return s
  }, [interval])

  const toggleCell = (ds: string, t: string, mode: 'on' | 'off') => {
    setTimeGrid(prev => { const n = { ...prev }; const s = new Set(n[ds] || []); if (mode === 'on') s.add(t); else s.delete(t); n[ds] = s; return n })
  }
  const applyPreset = (type: string) => {
    const slots = getSlots()
    const r: Record<string, [string, string]> = { morning: ['08:00', '12:00'], afternoon: ['12:00', '17:00'], evening: ['17:00', '21:00'], business: ['09:00', '17:00'] }
    setTimeGrid(prev => { const n = { ...prev }; selectedDates.forEach(ds => { if (type === 'clear') { n[ds] = new Set() } else { const s = new Set(n[ds] || []); const [a, b] = r[type]; slots.forEach(t => { if (t >= a && t < b) s.add(t) }); n[ds] = s } }); return n })
  }
  const copyFirstToAll = () => {
    const sorted = [...selectedDates].sort(); if (sorted.length < 2) return
    setTimeGrid(prev => { const n = { ...prev }; const f = n[sorted[0]]; for (let i = 1; i < sorted.length; i++) n[sorted[i]] = new Set(f); return n })
  }

  const handleSave = async () => {
    if (!title.trim()) return alert('Please add a title.')
    if (selectedDates.size === 0) return alert('Select at least one date.')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      const formData = {
        title, desc, duration, location, timezone,
        dates: [...selectedDates],
        timeGrid: Object.fromEntries(Object.entries(timeGrid).map(([k, v]) => [k, [...v]])),
      }
      sessionStorage.setItem('rv_pending_poll', JSON.stringify(formData))
      router.push('/login?mode=register&redirect=create-save')
      return
    }
    setSaving(true)
    const dates = [...selectedDates].sort()
    const slotKeys: string[] = []; const gridData: Record<string, string[]> = {}
    dates.forEach(ds => { const s = timeGrid[ds]; gridData[ds] = s ? [...s].sort() : []; if (!s || s.size === 0) slotKeys.push(ds + '_allday'); else [...s].sort().forEach(t => slotKeys.push(ds + '_' + t)) })
    const poll = await createPoll({ user_id: user.id, title: title.trim(), description: desc.trim() || null, duration, location: location.trim() || null, timezone, dates, slot_keys: slotKeys, grid_data: gridData, deadline: deadline ? new Date(deadline).toISOString() : null })
    if (poll) router.push(`/poll/${poll.id}`)
    else { alert('Failed to create poll.'); setSaving(false) }
  }

  useEffect(() => {
    const pending = sessionStorage.getItem('rv_pending_poll')
    if (!pending) return
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      try {
        const form = JSON.parse(pending)
        sessionStorage.removeItem('rv_pending_poll')
        const dates = form.dates.sort()
        const tg: Record<string, Set<string>> = {}
        Object.entries(form.timeGrid).forEach(([k, v]) => { tg[k] = new Set(v as string[]) })
        const slotKeys: string[] = []; const gridData: Record<string, string[]> = {}
        dates.forEach((ds: string) => { const s = tg[ds]; gridData[ds] = s ? [...s].sort() : []; if (!s || s.size === 0) slotKeys.push(ds + '_allday'); else [...s].sort().forEach(t => slotKeys.push(ds + '_' + t)) })
        const poll = await createPoll({ user_id: user.id, title: form.title, description: form.desc || null, duration: form.duration, location: form.location || null, timezone: form.timezone, dates, slot_keys: slotKeys, grid_data: gridData, deadline: null })
        if (poll) router.push(`/poll/${poll.id}`)
      } catch {}
    })
  }, [router])

  const sortedDates = [...selectedDates].sort()
  const slots = getSlots()

  return (
    <div className="app">
      <div className="page-header">
        <h1>Create Your Poll</h1>
        <p>Set up your event, pick dates, paint time slots, and share across time zones. Free to use.</p>
      </div>
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-group"><label>Event Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Team Offsite Planning" /></div>
        <div className="form-group"><label>Description (optional)</label><textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Add details..." /></div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}><label>Duration</label><select value={duration} onChange={e => setDuration(e.target.value)}><option value="30">30 min</option><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option><option value="0">Full day</option></select></div>
          <div className="form-group" style={{ flex: 1, minWidth: 180 }}>
            <label>Location</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {['Zoom', 'Google Meet', 'Microsoft Teams', 'In-person', 'Phone call'].map(opt => (
                <button key={opt} type="button" onClick={() => setLocation(location === opt ? '' : opt)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: location === opt ? '2px solid var(--accent)' : '1px solid var(--border)', background: location === opt ? 'var(--accent-light)' : 'var(--surface)', color: location === opt ? 'var(--accent)' : 'var(--ink)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: location === opt ? 600 : 400 }}>
                  {opt === 'Zoom' ? '📹' : opt === 'Google Meet' ? '📹' : opt === 'Microsoft Teams' ? '💬' : opt === 'In-person' ? '📍' : '📞'} {opt}
                </button>
              ))}
            </div>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Or type a custom location..." />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}><label>🌐 Poll Timezone</label><select value={timezone} onChange={e => setTimezone(e.target.value)}>{TZ_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
      </div>
<div className="card" style={{ marginBottom: 24 }}>
        <span className="section-label">① Select Date Range</span>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>From</label>
            <input type="date" value={rangeStart} onChange={e => { setRangeStart(e.target.value); if (e.target.value) { const d = new Date(e.target.value); setMonth(d.getMonth()); setYear(d.getFullYear()) }}} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 14 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>To</label>
            <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 14 }} />
          </div>
          {rangeStart && rangeEnd && <button className="btn btn-sm btn-ghost" onClick={() => { setRangeStart(''); setRangeEnd('') }} style={{ marginTop: 18 }}>Clear range</button>}
        </div>
        <div className="calendar-nav"><button className="btn btn-icon btn-secondary" onClick={() => changeMonth(-1)}>◀</button><h2>{MONTHS[month]} {year}</h2><button className="btn btn-icon btn-secondary" onClick={() => changeMonth(1)}>▶</button></div>
        <div className="calendar-grid">
          {DAYS.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          {calDays.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="cal-day empty" />
            const date = new Date(year, month, d); const key = dateKey(date); const isPast = date < today.current; const isToday = date.getTime() === today.current.getTime()
            const outOfRange = (rangeStart && key < rangeStart) || (rangeEnd && key > rangeEnd)
            if (outOfRange) return <div key={key} className="cal-day past">{d}</div>
            return <div key={key} className={`cal-day${isPast ? ' past' : ''}${isToday ? ' today' : ''}${selectedDates.has(key) ? ' selected' : ''}`} onClick={() => toggleDate(key, isPast)}>{d}</div>
          })}
        </div>
        {selectedDates.size > 0 && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 13, fontWeight: 600, borderRadius: 20, marginTop: 16 }}>{selectedDates.size} date{selectedDates.size > 1 ? 's' : ''} selected</div>}
      </div>
      {selectedDates.size > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <span className="section-label">② Paint Time Slots</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)' }}>
            <button className="btn btn-sm btn-secondary" disabled={loadingBusy} onClick={async () => {
              setLoadingBusy(true)
              const busy = await getGoogleBusyTimes([...selectedDates], timezone)
              setBusySlots(busy)
              setLoadingBusy(false)
              if (busy.length === 0) alert('No busy times found, or Google Calendar not connected. Try logging in with Google first.')
            }}>
              {loadingBusy ? 'Loading...' : '📅 Import busy times from Google Calendar'}
            </button>
            {busySlots.length > 0 && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{busySlots.length} busy slots found — shown in red below</span>}
          </div>
          <div className="time-presets">
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-soft)' }}>Quick fill:</span>
            {['morning','afternoon','evening','business'].map(t => <button key={t} className="preset-btn" onClick={() => applyPreset(t)}>{t === 'morning' ? '🌅 Morning 8–12' : t === 'afternoon' ? '☀️ Afternoon 12–17' : t === 'evening' ? '🌙 Evening 17–21' : '💼 Business 9–17'}</button>)}
            <button className="preset-btn" onClick={() => applyPreset('clear')}>✕ Clear</button>
          </div>
          <div className="tgrid-wrapper"><div className="tgrid" style={{ gridTemplateColumns: `140px repeat(${slots.length}, minmax(38px, 1fr))` }} onMouseUp={() => { dragRef.current = null }} onMouseLeave={() => { dragRef.current = null }}>
            <div className="tgrid-header-cell" style={{ position: 'sticky', left: 0, zIndex: 3 }} />
            {slots.map(t => <div key={t} className="tgrid-header-cell">{t}</div>)}
            {sortedDates.map(ds => { const d = new Date(ds + 'T00:00:00'); return [
              <div key={ds + '-l'} className="tgrid-date-label" style={{ position: 'sticky', left: 0, zIndex: 1 }}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>,
              ...slots.map(t => { const on = timeGrid[ds]?.has(t); const busy = busySlots.length > 0 && isSlotBusy(ds, t, parseInt(duration) || 60, busySlots); return <div key={ds + t} className={`tgrid-cell${on ? ' on' : ''}${busy ? ' busy' : ''}`} onMouseDown={e => { e.preventDefault(); const mode = on ? 'off' : 'on'; dragRef.current = { mode }; toggleCell(ds, t, mode) }} onMouseEnter={() => { if (dragRef.current) toggleCell(ds, t, dragRef.current.mode) }} /> })
            ] })}
          </div></div>
          <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 10 }}>💡 Click or drag to toggle slots.</p>
          {sortedDates.length > 1 && <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '12px 16px', background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}><span>Copy first row to all →</span><button className="btn btn-sm btn-secondary" onClick={copyFirstToAll}>Apply to all</button></div>}
        </div>
      )}
      <div className="step-footer"><div /><button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '14px 32px', fontSize: 16 }}>{saving ? 'Creating...' : 'Create Poll →'}</button></div>
    </div>
  )
}
