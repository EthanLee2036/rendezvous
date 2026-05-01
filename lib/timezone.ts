const TZ_RAW = [
  { value: 'Pacific/Honolulu', city: 'Hawaii' },
  { value: 'America/Anchorage', city: 'Alaska' },
  { value: 'America/Los_Angeles', city: 'Pacific Time' },
  { value: 'America/Denver', city: 'Mountain Time' },
  { value: 'America/Chicago', city: 'Central Time' },
  { value: 'America/New_York', city: 'Eastern Time' },
  { value: 'America/Halifax', city: 'Atlantic Time' },
  { value: 'America/Sao_Paulo', city: 'São Paulo' },
  { value: 'Atlantic/Azores', city: 'Azores' },
  { value: 'Europe/London', city: 'London' },
  { value: 'Europe/Paris', city: 'Paris / Berlin' },
  { value: 'Europe/Helsinki', city: 'Helsinki / Cairo' },
  { value: 'Europe/Moscow', city: 'Moscow / Istanbul' },
  { value: 'Asia/Dubai', city: 'Dubai' },
  { value: 'Asia/Karachi', city: 'Karachi' },
  { value: 'Asia/Kolkata', city: 'Mumbai / Delhi' },
  { value: 'Asia/Dhaka', city: 'Dhaka' },
  { value: 'Asia/Bangkok', city: 'Bangkok / Jakarta' },
  { value: 'Asia/Singapore', city: 'Beijing / Singapore' },
  { value: 'Asia/Tokyo', city: 'Tokyo / Seoul' },
  { value: 'Australia/Sydney', city: 'Sydney' },
  { value: 'Pacific/Auckland', city: 'Auckland' },
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
