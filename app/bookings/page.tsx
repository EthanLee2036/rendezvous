'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, getMyBookings, type Booking } from '@/lib/supabase'

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      getMyBookings().then(b => { setBookings(b); setLoading(false) })
    })
  }, [router])

  const now = new Date()
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')

  const upcoming = bookings.filter(b => b.booking_date >= todayStr)
  const past = bookings.filter(b => b.booking_date < todayStr)

  const fmtDate = (ds: string) => new Date(ds + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  const BookingCard = ({ b }: { b: Booking }) => (
    <div className="card" style={{ marginBottom: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{b.booker_name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            <a href={'mailto:' + b.booker_email} style={{ color: 'var(--accent)' }}>{b.booker_email}</a>
          </div>
          {b.notes && <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 8, fontStyle: 'italic' }}>"{b.notes}"</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{b.booking_time}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{fmtDate(b.booking_date)}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{b.duration} min</div>
        </div>
      </div>
    </div>
  )

  if (loading) return <div className="app"><p style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading...</p></div>

  return (
    <div className="app">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>People who have booked time with you.</p>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400, color: 'var(--ink-soft)', marginBottom: 8 }}>No bookings yet</h2>
          <p style={{ color: 'var(--ink-muted)' }}>Share your booking link to start receiving bookings!</p>
          <a href="/availability" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>Set up Booking Page</a>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 400, marginBottom: 16 }}>Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>No upcoming bookings.</p>
            ) : (
              upcoming.map(b => <BookingCard key={b.id} b={b} />)
            )}
          </div>

          {past.length > 0 && (
            <div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, fontWeight: 400, marginBottom: 16, color: 'var(--ink-muted)' }}>Past ({past.length})</h2>
              <div style={{ opacity: 0.6 }}>
                {past.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
