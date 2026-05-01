const TZ_RAW = [
  { value: 'Pacific/Honolulu', city: 'Hawaii / Honolulu' },
  { value: 'America/Anchorage', city: 'Alaska / Anchorage' },
  { value: 'America/Los_Angeles', city: 'Los Angeles / Vancouver / San Francisco / Seattle' },
  { value: 'America/Denver', city: 'Denver / Phoenix / Calgary / Salt Lake City' },
  { value: 'America/Chicago', city: 'Chicago / Houston / Dallas / Mexico City' },
  { value: 'America/New_York', city: 'New York / Toronto / Miami / Washington DC' },
  { value: 'America/Halifax', city: 'Halifax / Puerto Rico / Bermuda / Santo Domingo' },
  { value: 'America/Sao_Paulo', city: 'São Paulo / Buenos Aires / Rio de Janeiro / Santiago' },
  { value: 'Atlantic/Azores', city: 'Azores / Cape Verde' },
  { value: 'Europe/London', city: 'London / Dublin / Lisbon / Casablanca' },
  { value: 'Europe/Paris', city: 'Paris / Berlin / Madrid / Rome' },
  { value: 'Europe/Helsinki', city: 'Helsinki / Cairo / Athens / Johannesburg' },
  { value: 'Europe/Moscow', city: 'Moscow / Istanbul / Riyadh / Nairobi' },
  { value: 'Asia/Dubai', city: 'Dubai / Abu Dhabi / Baku / Muscat' },
  { value: 'Asia/Karachi', city: 'Karachi / Tashkent / Islamabad / Lahore' },
  { value: 'Asia/Kolkata', city: 'Mumbai / Delhi / Bangalore / Colombo' },
  { value: 'Asia/Dhaka', city: 'Dhaka / Almaty' },
  { value: 'Asia/Bangkok', city: 'Bangkok / Jakarta / Hanoi / Ho Chi Minh City' },
  { value: 'Asia/Singapore', city: 'Singapore / Hong Kong / Beijing / Kuala Lumpur' },
  { value: 'Asia/Tokyo', city: 'Tokyo / Seoul / Osaka / Busan' },
  { value: 'Australia/Sydney', city: 'Sydney / Melbourne / Brisbane / Canberra' },
  { value: 'Pacific/Auckland', city: 'Auckland / Wellington / Fiji / Suva' },
]

function getCurrentOffset(tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
    const parts = formatter.formatToParts(new Date())
    const offsetPart = parts.find(p => p.type === 'timeZoneName')
    if (!offsetPart) return 'UTC'
    return offsetPart.value.replace('GMT', 'UTC')
  } catch {
    return 'UTC'
  }
}

export const TZ_LIST = TZ_RAW.map(t => ({
  value: t.value,
  label: '(' + getCurrentOffset(t.value) + ') ' + t.city,
}))

export function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Europe/London' }
}

export function findClosestTz(iana: string): string {
  const exact = TZ_LIST.find(t => t.value === iana)
  if (exact) return exact.value
  try {
    const off = getTzOffset(iana)
    return TZ_LIST.reduce((best, t) => {
      const bestOff = getTzOffset(best.value)
      const tOff = getTzOffset(t.value)
      return Math.abs(tOff - off) < Math.abs(bestOff - off) ? t : best
    }).value
  } catch {}
  return 'Europe/London'
}

export function getTzOffset(tz: string): number {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    const parts = formatter.formatToParts(now)
    const offsetPart = parts.find(p => p.type === 'timeZoneName')
    if (!offsetPart) return 0
    const match = offsetPart.value.match(/GMT([+-]?\d+)?(?::(\d+))?/)
    if (!match) return 0
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    return hours + (hours < 0 ? -minutes : minutes) / 60
  } catch {
    return 0
  }
}

export function getTzLabel(v: string): string {
  const found = TZ_LIST.find(t => t.value === v)
  if (found) {
    const m = found.label.match(/\(([^)]+)\)/)
    return m ? m[1] : v
  }
  return getCurrentOffset(v)
}

export function convertTime(dateStr: string, timeStr: string, fromTz: string, toTz: string) {
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const fakeDate = new Date(dateStr + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00')
    const fromStr = fakeDate.toLocaleString('en-US', { timeZone: fromTz })
    const fromLocal = new Date(fromStr)
    const toStr = fakeDate.toLocaleString('en-US', { timeZone: toTz })
    const toLocal = new Date(toStr)
    const diffMs = toLocal.getTime() - fromLocal.getTime()
    const result = new Date(fakeDate.getTime() + diffMs)
    const rH = result.getHours(), rM = result.getMinutes()
    const rDate = result.getFullYear() + '-' + String(result.getMonth() + 1).padStart(2, '0') + '-' + String(result.getDate()).padStart(2, '0')
    return { date: rDate, time: String(rH).padStart(2, '0') + ':' + String(rM).padStart(2, '0') }
  } catch {
    return { date: dateStr, time: timeStr }
  }
}
