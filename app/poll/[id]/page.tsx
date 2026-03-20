'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { getPoll, getVotes, submitVote as submitVoteApi, type Poll, type Vote } from '@/lib/supabase'
import { TZ_LIST, detectTimezone, findClosestTz, getTzOffset, getTzLabel, convertTime } from '@/lib/timezone'

type VoteValue = 'yes' | 'maybe' | 'no' | null

export default function PollPage() {
  const { id } = useParams<{ id: string }>()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'vote' | 'results'>('vote')
  const [voterName, setVoterName] = useState('')
  const [voterTz, setVoterTz] = useState(findClosestTz(detectTimezone()))
  const [myVotes, setMyVotes] = useState<Record<string, VoteValue>>({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!id) return
    Promise.all([getPoll(id), getVotes(id)]).then(([p, v]) => {
      if (!p) { setNotFound(true); setLoading(false); return }
      setPoll(p); setVotes(v)
      const init: Record<string, VoteValue> = {}; p.slot_keys.forEach(k => init[k] = null); setMyVotes(init)
      setLoading(false)
    })
  }, [id])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const splitKey = (k: string): [string, string] => { const i = k.lastIndexOf('_'); return [k.substring(0, i), k.substring(i + 1)] }

  const fmtConv = useCallback((ds: string, t: string) => {
    if (!poll || poll.timezone === voterTz || t === 'allday') return ''
    const c = convertTime(ds, t, poll.timezone, voterTz)
    if (c.date === ds) return c.time
    return c.time + ' ' + new Date(c.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }, [poll, voterTz])

  const tzDiff = poll ? getTzOffset(voterTz) - getTzOffset(poll.timezone) : 0
  const cycleVote = (k: string) => { const o: VoteValue[] = [null, 'yes', 'maybe', 'no']; setMyVotes(prev => ({ ...prev, [k]: o[(o.indexOf(prev[k]) + 1) % o.length] })) }

  const handleSubmit = async () => {
    if (!poll) return
    if (!voterName.trim()) return alert('Enter your name.')
    if (!Object.values(myVotes).some(v => v !== null)) return alert('Vote on at least one slot.')
    setSubmitting(true)
    const choices: Record<string, string> = {}; for (const k in myVotes) choices[k] = myVotes[k] || 'no'
    const vote = await submitVoteApi({ poll_id: poll.id, voter_name: voterName.trim(), voter_timezone: voterTz, choices: choices as Record<string, 'yes' | 'maybe' | 'no'> })
    if (vote) { setVotes(prev => [...prev, vote]); setVoterName(''); const init: Record<string, VoteValue> = {}; poll.slot_keys.forEach(k => init[k] = null); setMyVotes(init); setTab('results'); showToast('Vote submitted!') }
    else alert('Failed to submit vote.')
    setSubmitting(false)
  }

  const exportCSV = () => {
    if (!poll || !votes.length) return
    const header = ['Participant', ...poll.slot_keys.map(k => { const [ds, t] = splitKey(k); return ds + ' ' + t })]
    let csv = header.join(',') + '\n'
    votes.forEach(v => { csv += `"${v.voter_name.replace(/"/g, '""')}",${poll.slot_keys.map(k => v.choices[k] || 'no').join(',')}\n` })
    const scores = poll.slot_keys.map(k => { let s = 0; votes.forEach(v => { if (v.choices[k] === 'yes') s += 2; else if (v.choices[k] === 'maybe') s += 1 }); return Math.round(s / (votes.length * 2) * 100) + '%' })
    csv += 'Score,' + scores.join(',') + '\n'
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `${poll.title.replace(/[^a-z0-9]/gi, '_')}_results.csv`; a.click()
    showToast('CSV downloaded!')
  }

  const scores: Record<string, number> = {}
  if (poll) poll.slot_keys.forEach(k => { let s = 0; votes.forEach(v => { if (v.choices[k] === 'yes') s += 2; else if (v.choices[k] === 'maybe') s += 1 }); scores[k] = s })
  const bestKey = poll ? poll.slot_keys.reduce((best, k) => (scores[k] > (scores[best] || 0)) ? k : best, poll.slot_keys[0]) : ''

  if (loading) return <div className="app"><p style={{ textAlign: 'center', padding: 80, color: 'var(--ink-muted)' }}>Loading poll...</p></div>
  if (notFound || !poll) return <div className="app"><div style={{ textAlign: 'center', padding: 80 }}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28 }}>Poll not found</h2><p style={{ color: 'var(--ink-muted)', marginTop: 8 }}>Check the link and try again.</p></div></div>

  const showConv = poll.timezone !== voterTz

  const renderHeaders = () => poll.slot_keys.map(k => {
    const [ds, t] = splitKey(k); const d = new Date(ds + 'T00:00:00'); const conv = showConv ? fmtConv(ds, t) : ''
    return <th key={k}><div className="th-date">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', weekday: 'short' })}</div><div className="th-time">{t === 'allday' ? 'All day' : t}</div>{conv && <div className="th-converted">🕐 {conv}</div>}</th>
  })

  return (
    <div className="app">
      <div className="page-header">
        <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40 }}>{poll.title}</h1>
        {poll.description && <p style={{ color: 'var(--ink-soft)', marginBottom: 28 }}>{poll.description}</p>}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink-soft)' }}>
          <span>📍 {poll.location || 'TBD'}</span>
          <span>⏱ {poll.duration === '0' ? 'Full day' : poll.duration + ' min'}</span>
          <span>📅 {poll.slot_keys.length} slot{poll.slot_keys.length > 1 ? 's' : ''}</span>
          <span>🌐 {getTzLabel(poll.timezone)}</span>
        </div>
      </div>

      <div className="tz-banner">
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>🌐 Your timezone:</span>
        <select value={voterTz} onChange={e => setVoterTz(e.target.value)} style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', fontFamily: 'inherit', fontSize: 13, minWidth: 240 }}>
          {TZ_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <span className="tz-offset-badge" style={tzDiff !== 0 ? { background: tzDiff > 0 ? '#FFF5DC' : '#E8F0EB', color: tzDiff > 0 ? '#B8860B' : 'var(--accent)' } : {}}>
          {tzDiff === 0 ? 'Same as poll' : `${tzDiff >= 0 ? '+' : ''}${tzDiff}h from poll`}
        </span>
      </div>

      <div className="tab-bar">
        <button className={`tab-btn${tab === 'vote' ? ' active' : ''}`} onClick={() => setTab('vote')}>Vote</button>
        <button className={`tab-btn${tab === 'results' ? ' active' : ''}`} onClick={() => setTab('results')}>Results ({votes.length})</button>
      </div>

      {tab === 'vote' && <>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, padding: 16, background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <input type="text" value={voterName} onChange={e => setVoterName(e.target.value)} placeholder="Your name" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: 14 }} />
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Sending...' : 'Submit Vote'}</button>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--yes-bg)', border: '2px solid var(--yes)', display: 'inline-block' }} /> Available</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--maybe-bg)', border: '2px solid var(--maybe)', display: 'inline-block' }} /> Maybe</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--no-bg)', border: '2px solid var(--no)', display: 'inline-block' }} /> Unavailable</span>
        </div>
        <div className="vote-table-wrapper"><table className="vote-table"><thead><tr><th style={{ textAlign: 'left' }}>Participant</th>{renderHeaders()}</tr></thead><tbody>
          {votes.map(v => <tr key={v.id}><td>{v.voter_name}</td>{poll.slot_keys.map(k => { const c = v.choices[k] || 'no'; return <td key={k}><div className={`vote-cell ${c}`}>{c === 'yes' ? '✓' : c === 'maybe' ? '?' : '✗'}</div></td> })}</tr>)}
          <tr style={{ background: 'var(--accent-light)' }}><td style={{ background: 'var(--accent-light)', fontStyle: 'italic', color: 'var(--accent)' }}>Your vote</td>
            {poll.slot_keys.map(k => <td key={k}><div className={`vote-cell ${myVotes[k] || ''}`} onClick={() => cycleVote(k)} style={{ cursor: 'pointer' }}>{myVotes[k] === 'yes' ? '✓' : myVotes[k] === 'maybe' ? '?' : myVotes[k] === 'no' ? '✗' : '·'}</div></td>)}
          </tr>
        </tbody></table></div>
      </>}

      {tab === 'results' && <>
        {votes.length === 0 ? <p style={{ textAlign: 'center', padding: 40, color: 'var(--ink-muted)' }}>No votes yet.</p> : <>
          <div className="vote-table-wrapper"><table className="vote-table"><thead><tr><th style={{ textAlign: 'left' }}>Participant</th>{renderHeaders()}</tr></thead><tbody>
            {votes.map(v => <tr key={v.id}><td>{v.voter_name}</td>{poll.slot_keys.map(k => { const c = v.choices[k] || 'no'; return <td key={k}><div className={`vote-cell ${c}`} style={{ cursor: 'default' }}>{c === 'yes' ? '✓' : c === 'maybe' ? '?' : '✗'}</div></td> })}</tr>)}
          </tbody><tfoot><tr><td style={{ textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>Score</td>
            {poll.slot_keys.map(k => { const pct = Math.round(scores[k] / (votes.length * 2) * 100); return <td key={k} style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)' }}>{pct}%<div className="vote-bar"><div className="vote-bar-fill" style={{ width: pct + '%' }} /></div></td> })}
          </tr></tfoot></table></div>
          {bestKey && <div style={{ marginTop: 20, padding: 20, background: 'var(--yes-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--yes)' }}>
            <div style={{ fontWeight: 600, color: 'var(--yes)', fontSize: 15 }}>🎯 Best Time Slot</div>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, marginTop: 6 }}>{(() => { const [ds, t] = splitKey(bestKey); const d = new Date(ds + 'T00:00:00'); let txt = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); if (t !== 'allday') txt += ' at ' + t; if (showConv && t !== 'allday') { const c = convertTime(ds, t, poll.timezone, voterTz); txt += ` → ${c.time} your time` }; return txt })()}</div>
          </div>}
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={exportCSV}>📥 Export CSV</button>
        </>}
      </>}

      <div className="card" style={{ marginTop: 24 }}>
        <span className="section-label">Share this poll</span>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14 }}>Send this link — anyone can vote without signing up.</p>
        <div className="share-box">
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>Link:</span>
          <input readOnly value={typeof window !== 'undefined' ? window.location.href : ''} />
          <button className="btn btn-sm btn-primary" onClick={() => { navigator.clipboard.writeText(window.location.href); showToast('Link copied!') }}>Copy</button>
        </div>
      </div>

      <div className="toast" style={{ opacity: toast ? 1 : 0 }}>{toast}</div>
    </div>
  )
}
