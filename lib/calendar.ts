import { supabase } from './supabase'

export interface BusySlot {
  start: string
  end: string
}

export async function getGoogleBusyTimes(dates: string[], timezone: string): Promise<BusySlot[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.provider_token) return []

  const sortedDates = [...dates].sort()
  const timeMin = sortedDates[0] + 'T00:00:00Z'
  const lastDate = new Date(sortedDates[sortedDates.length - 1])
  lastDate.setDate(lastDate.getDate() + 1)
  const timeMax = lastDate.toISOString()

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        timeZone: timezone,
        items: [{ id: 'primary' }],
      }),
    })

    if (!res.ok) return []
    const data = await res.json()
    const busy = data.calendars?.primary?.busy || []
    return busy.map((b: { start: string; end: string }) => ({
      start: b.start,
      end: b.end,
    }))
  } catch {
    return []
  }
}

export function isSlotBusy(date: string, time: string, duration: number, busySlots: BusySlot[]): boolean {
  if (time === 'allday') return false
  const [h, m] = time.split(':').map(Number)
  const slotStart = new Date(date + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00')
  const slotEnd = new Date(slotStart.getTime() + duration * 60000)

  return busySlots.some(b => {
    const busyStart = new Date(b.start)
    const busyEnd = new Date(b.end)
    return slotStart < busyEnd && slotEnd > busyStart
  })
}
export async function createGoogleCalendarEvent(params: {
  title: string
  description: string
  startDateTime: string
  endDateTime: string
  timezone: string
  attendeeEmail?: string
}): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.provider_token || (typeof window !== 'undefined' ? sessionStorage.getItem('google_access_token') : null)
  if (!token) return false

  try {
    const event: Record<string, unknown> = {
      summary: params.title,
      description: params.description,
      start: { dateTime: params.startDateTime, timeZone: params.timezone },
      end: { dateTime: params.endDateTime, timeZone: params.timezone },
    }
    if (params.attendeeEmail) {
      event.attendees = [{ email: params.attendeeEmail }]
    }

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    return res.ok
  } catch {
    return false
  }
}
