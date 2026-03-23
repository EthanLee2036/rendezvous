export const TZ_LIST = [
  { value: 'Pacific/Honolulu', label: '(UTC-10:00) Hawaii', offset: -10 },
  { value: 'America/Anchorage', label: '(UTC-09:00) Alaska', offset: -9 },
  { value: 'America/Los_Angeles', label: '(UTC-08:00) Pacific Time', offset: -8 },
  { value: 'America/Denver', label: '(UTC-07:00) Mountain Time', offset: -7 },
  { value: 'America/Chicago', label: '(UTC-06:00) Central Time', offset: -6 },
  { value: 'America/New_York', label: '(UTC-05:00) Eastern Time', offset: -5 },
  { value: 'America/Halifax', label: '(UTC-04:00) Atlantic Time', offset: -4 },
  { value: 'America/Sao_Paulo', label: '(UTC-03:00) São Paulo', offset: -3 },
  { value: 'Atlantic/Azores', label: '(UTC-01:00) Azores', offset: -1 },
  { value: 'Europe/London', label: '(UTC+00:00) London / GMT', offset: 0 },
  { value: 'Europe/Paris', label: '(UTC+01:00) Paris / Berlin', offset: 1 },
  { value: 'Europe/Helsinki', label: '(UTC+02:00) Helsinki / Cairo', offset: 2 },
  { value: 'Europe/Moscow', label: '(UTC+03:00) Moscow / Istanbul', offset: 3 },
  { value: 'Asia/Dubai', label: '(UTC+04:00) Dubai', offset: 4 },
  { value: 'Asia/Karachi', label: '(UTC+05:00) Karachi', offset: 5 },
  { value: 'Asia/Kolkata', label: '(UTC+05:30) Mumbai / Delhi', offset: 5.5 },
  { value: 'Asia/Dhaka', label: '(UTC+06:00) Dhaka', offset: 6 },
  { value: 'Asia/Bangkok', label: '(UTC+07:00) Bangkok / Jakarta', offset: 7 },
  { value: 'Asia/Shanghai', label: '(UTC+08:00) Beijing / Singapore', offset: 8 },
  { value: 'Asia/Tokyo', label: '(UTC+09:00) Tokyo / Seoul', offset: 9 },
  { value: 'Australia/Sydney', label: '(UTC+10:00) Sydney', offset: 10 },
  { value: 'Pacific/Auckland', label: '(UTC+12:00) Auckland', offset: 12 },
] as const

export function detectTimezone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'Europe/London' }
}

export function findClosestTz(iana: string): string {
  const exact = TZ_LIST.find(t => t.value === iana)
  if (exact) return exact.value
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'shortOffset' })
    const p = fmt.formatToParts(new Date()).find(p => p.type === 'timeZoneName')
    if (p) {
      const m = p.value.match(/GMT([+-]?\d+)?(?::(\d+))?/)
      if (m) {
        const h = parseInt(m[1] || '0'), mi = parseInt(m[2] || '0')
        const off = h + (h >= 0 ? mi / 60 : -mi / 60)
        return TZ_LIST.reduce((best, t) => Math.abs(t.offset - off) < Math.abs(best.offset - off) ? t : best).value
      }
    }
  } catch {}
  return 'Europe/London'
}

export function getTzOffset(v: string): number {
  return TZ_LIST.find(t => t.value === v)?.offset ?? 0
}

export function getTzLabel(v: string): string {
  const m = TZ_LIST.find(t => t.value === v)?.label.match(/\(([^)]+)\)/)
  return m ? m[1] : v
}

export function convertTime(dateStr: string, timeStr: string, fromTz: string, toTz: string) {
  try {
    const [h, m] = timeStr.split(':').map(Number)
    const fakeDate = new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
    const fromStr = fakeDate.toLocaleString('en-US', { timeZone: fromTz })
    const fromLocal = new Date(fromStr)
    const toStr = fakeDate.toLocaleString('en-US', { timeZone: toTz })
    const toLocal = new Date(toStr)
    const diffMs = toLocal.getTime() - fromLocal.getTime()
    const result = new Date(fakeDate.getTime() + diffMs)
    const rH = result.getHours(), rM = result.getMinutes()
    const rDate = `${result.getFullYear()}-${String(result.getMonth()+1).padStart(2,'0')}-${String(result.getDate()).padStart(2,'0')}`
    return { date: rDate, time: String(rH).padStart(2,'0') + ':' + String(rM).padStart(2,'0') }
  } catch {
    return { date: dateStr, time: timeStr }
  }
}
