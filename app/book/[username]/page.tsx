'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getAvailabilityByUsername, getBookingsForHost, createBooking, type Availability } from '@/lib/supabase'
import { TZ_LIST, detectTimezone, findClosestTz, convertTime, getTzOffset } from '@/lib/timezone'

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function BookingPage() {
  const { username } = useParams<{ username: string }>()
  const [av, setAv] = useState<Availability | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [bookedTimes, setBookedTimes] = useState<string[]>([])
  const [viewerTz, setViewerTz] = useState(findClosestTz(detectTimezone()))
  const [step, setStep] = useState<'date' | 'time' | 'details'>('date')
  const [bookerName, setBookerName] = useState('')
  const [bookerEmail, setBookerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const today = new Date(); today.setHours(0, 0, 0, 0)

  useEffect(() => {
    if (!username) return
    getAvailabilityByUsername(username).then(a => {
      if (!a) { setNotFound(true); setLoading(false); return }
      setAv(a)
      setLoading(false)
    })
  }, [username])

  const dateKey = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')

  const changeMonth = (dir: number) => {
    let m = month + dir, y = year
    if (m > 11) { m = 0; y++ } if (m < 0) { m = 11; y-- }
    setMonth(m); setYear(y)
  }

  const isDayAvailable = (date: Date): boolean => {
    if (!av) return false
    if (date < today) return false
    const dayKey = DAY_KEYS[date.getDay()]
    return (av.weekly_rules[dayKey]?.length || 0) > 0
  }

  const selectDate = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setSelectedTime(null)
    if (av) {
      const bookings = await getBookingsForHost(av.user_id, dateStr)
      setBookedTimes(bookings.map(b => b.booking_time))
    }
    setStep('time')
  }

  const generateTimeSlots = (): string[] => {
    if (!av || !selectedDate) return []
    const date = new Date(selectedDate + 'T00:00:00')
    const dayKey = DAY_KEYS[date.getDay()]
    const ranges = av.weekly_rules[dayKey] || []
    const slots: string[] = []
    const dur = av.meeting_duration
    const buf = av.buffer_minutes

    ranges.forEach(range => {
      const [sh, sm] = range.start.split(':').map(Number)
      const [eh, em] = range.end.split(':').map(Number)
      let cur = sh * 60 + sm
      const end = eh * 60 + em
      while (cur + dur <= end) {
        const h = Math.floor(cur / 60)
        const m = cur % 60
        const timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
        if (!bookedTimes.includes(timeStr)) slots.push(timeStr)
        cur += dur + buf
      }
    })
    return slots
  }

  const handleBook = async () => {
    if (!av || !selectedDate || !selectedTime) return
    if (!bookerName.trim()) return alert('Please enter your name.')
    if (!bookerEmail.trim()) return alert('Please enter your email.')
    setSubmitting(true)
    const result = await createBooking({
      host_user_id: av.user_id,
      booker_name: bookerName.trim(),
      booker_email: bookerEmail.trim(),
      booking_date: selectedDate,
      booking_time: selectedTime,
      duration: av.meeting_duration,
      notes: notes.trim() || null,
    })
    if (result) {
      try {
        const [h, m] = selectedTime.split(':').map(Number)
        const startDt = selectedDate + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00'
        const endMin = h * 60 + m + av.meeting_duration
        const endDt = selectedDate + 'T' + String(Math.floor(endMin / 60) % 24).padStart(2, '0') + ':' + String(endMin % 60).padStart(2, '0') + ':00'
        await fetch('/api/create-calendar-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostUserId: av.user_id,
            title: (av.display_name || 'Meeting') + ' with ' + bookerName.trim(),
            description: notes.trim() ? 'Notes: ' + notes.trim() : 'Booked via RendezVous',
            startDateTime: startDt,
            endDateTime: endDt,
            timezone: av.timezone,
            attendeeEmail: bookerEmail.trim(),
          }),
        })
      } catch {}
      setConfirmed(true)
    } else {
      alert('Failed to book. That slot may have just been taken.')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="app"><p style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading...</p></div>
  if (notFound || !av) return <div className="app"><div style={{ textAlign: 'center', padding: 80 }}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28 }}>Booking page not found</h2><p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>Check the link and try again.</p></div></div>

  if (confirmed) {
    const showConv = av.timezone !== viewerTz
    const conv = showConv && selectedTime ? convertTime(selectedDate!, selectedTime, av.timezone, viewerTz) : null
    return (
      <div className="app">
        <div className="card" style={{ textAlign: 'center', padding: 40, maxWidth: 480, margin: '40px auto' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, marginBottom: 12 }}>Booking confirmed!</h1>
          <p style={{ color: 'var(--ink-soft)', marginBottom: 20 }}>You're booked with {av.display_name || username}.</p>
          <div style={{ background: 'var(--accent-light)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'left' }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}><strong>📅 Date:</strong> {new Date(selectedDate! + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}><strong>⏰ Time:</strong> {selectedTime} ({av.timezone}){conv && ' → ' + conv.time + ' your time'}</div>
            <div style={{ fontSize: 14 }}><strong>⏱ Duration:</strong> {av.meeting_duration} min</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 20 }}>A confirmation has been recorded. {av.display_name || 'The host'} will be in touch.</p>
        </div>
      </div>
    )
  }

  // Calendar grid
  const first = new Date(year, month, 1)
  let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const calDays: (number | null)[] = []
  for (let i = 0; i < startDay; i++) calDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d)

  const timeSlots = generateTimeSlots()
  const showConv = av.timezone !== viewerTz

  return (
    <div className="app">
      <div className="page-header">
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 36 }}>Book with {av.display_name || username}</h1>
        <p style={{ color: 'var(--ink-soft)' }}>{av.meeting_duration} min meeting · Select a date and time below</p>
      </div>

      {/* Timezone selector */}
      <div className="tz-banner">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>🌐 Times shown in:</span>
        <select value={viewerTz} onChange={e => setViewerTz(e.target.value)} style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 13, minWidth: 280 }}>
          {TZ_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div className="card" style={{ flex: '1 1 340px' }}>
          <div className="calendar-nav">
            <button className="btn btn-icon btn-secondary" onClick={() => changeMonth(-1)}>◀</button>
            <h2>{MONTHS[month]} {year}</h2>
            <button className="btn btn-icon btn-secondary" onClick={() => changeMonth(1)}>▶</button>
          </div>
          <div className="calendar-grid">
            {DOW.map(d => <div key={d} className="cal-day-header">{d}</div>)}
            {calDays.map((d, i) => {
              if (d === null) return <div key={'e' + i} className="cal-day empty" />
              const date = new Date(year, month, d)
              const key = dateKey(date)
              const available = isDayAvailable(date)
              const isToday = date.getTime() === today.getTime()
              return (
                <div key={key}
                  className={'cal-day' + (available ? '' : ' past') + (isToday ? ' today' : '') + (selectedDate === key ? ' selected' : '')}
                  onClick={() => available && selectDate(key)}
                  style={{ cursor: available ? 'pointer' : 'default' }}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>

        {/* Time slots */}
        {step !== 'date' && selectedDate && (
          <div className="card" style={{ flex: '1 1 280px' }}>
            <span className="section-label">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {step === 'time' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {timeSlots.length === 0 ? (
                  <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No available times on this day.</p>
                ) : timeSlots.map(time => {
                  const conv = showConv ? convertTime(selectedDate, time, av.timezone, viewerTz) : null
                  return (
                    <button key={time}
                      className="btn btn-secondary"
                      onClick={() => { setSelectedTime(time); setStep('details') }}
                      style={{ justifyContent: 'center', padding: '12px' }}>
                      {conv ? conv.time : time}
                      {conv && <span style={{ fontSize: 11, color: 'var(--ink-muted)', marginLeft: 6 }}>({time} {av.timezone.split('/')[1] || ''})</span>}
                    </button>
                  )
                })}
              </div>
            )}
            {step === 'details' && selectedTime && (
              <div>
                <div style={{ padding: 12, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 14 }}>
                  <strong>{showConv ? convertTime(selectedDate, selectedTime, av.timezone, viewerTz).time : selectedTime}</strong> · {av.meeting_duration} min
                  <button onClick={() => { setStep('time'); setSelectedTime(null) }} style={{ float: 'right', border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}>Change</button>
                </div>
                <div className="form-group">
                  <label>Your Name *</label>
                  <input value={bookerName} onChange={e => setBookerName(e.target.value)} placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>Your Email *</label>
                  <input type="email" value={bookerEmail} onChange={e => setBookerEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything to share before the meeting?" />
                </div>
                <button className="btn btn-primary" onClick={handleBook} disabled={submitting} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
