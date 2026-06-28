import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { hostUserId, title, description, startDateTime, endDateTime, timezone, attendeeEmail } = body

    if (!hostUserId || !startDateTime || !endDateTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: avData, error: avError } = await supabase
      .from('availability')
      .select('google_refresh_token, google_calendar_connected')
      .eq('user_id', hostUserId)
      .maybeSingle()

    if (avError || !avData?.google_refresh_token || !avData.google_calendar_connected) {
      return NextResponse.json({ error: 'Host has not connected Google Calendar', skipped: true }, { status: 200 })
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: avData.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 })
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    const event: Record<string, unknown> = {
      summary: title,
      description: description,
      start: { dateTime: startDateTime, timeZone: timezone },
      end: { dateTime: endDateTime, timeZone: timezone },
    }
    if (attendeeEmail) {
      event.attendees = [{ email: attendeeEmail }]
    }

    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!calRes.ok) {
      const errText = await calRes.text()
      return NextResponse.json({ error: 'Failed to create event', details: errText }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error', details: String(e) }, { status: 500 })
  }
}
