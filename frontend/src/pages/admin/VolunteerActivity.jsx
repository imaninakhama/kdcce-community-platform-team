import { useState, useEffect, useCallback } from 'react'
import { Wifi, History } from 'lucide-react'
import DataTable from '../../components/shared/DataTable'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'

// Same date/time formatting convention as the rest of the admin area
// (e.g. ActivityManager.jsx's fmt()) — the local browser's timezone via
// toLocaleString/toLocaleDateString/toLocaleTimeString, nothing bespoke.
function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) : '—' }
function fmtTime(iso) { return iso ? new Date(iso).toLocaleTimeString([], { timeStyle: 'short' }) : '—' }
function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—' }

function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '—'
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 1) return '<1m'
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`
}

// Refreshed on an interval so "Currently Online" stays live without the
// admin needing to manually reload — cheap GETs, and only while this tab
// is actually mounted (the interval is cleared on unmount/tab switch).
const REFRESH_INTERVAL_MS = 20_000

function useSessions(path) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(path)
      setSessions(res.sessions)
      setError('')
    } catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [path])

  useEffect(() => {
    setLoading(true)
    load()
    const id = window.setInterval(load, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [load])

  return { sessions, loading, error, reload: load }
}

function CurrentlyOnlineTab() {
  const { sessions, loading, error, reload } = useSessions('/api/admin/volunteer-sessions/online')

  if (loading) return <LoadingState label="online volunteers" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (sessions.length === 0) return <EmptyState icon={Wifi} title="No volunteers online" message="Volunteers currently signed in to the portal will show up here." />

  return <div className="card-k mt-6 overflow-hidden">
    <DataTable
      emptyMessage="No volunteers online."
      columns={[
        { key: 'volunteer', header: 'Volunteer', cell: s => <div><span className="font-semibold text-kInk">{s.volunteer_name}</span><p className="text-xs text-kMuted">{s.volunteer_email}</p></div> },
        { key: 'login', header: 'Login Time', cell: s => <span className="text-kMuted">{fmtDateTime(s.login_at)}</span> },
        { key: 'last_seen', header: 'Last Seen', cell: s => <span className="text-kMuted">{fmtDateTime(s.last_seen_at)}</span> },
        { key: 'status', header: 'Status', cell: s => <StatusBadge tone="success">{s.status}</StatusBadge> },
      ]}
      rows={sessions}
    />
  </div>
}

function LoginHistoryTab() {
  const { sessions, loading, error, reload } = useSessions('/api/admin/volunteer-sessions')

  if (loading) return <LoadingState label="login history" />
  if (error) return <ErrorState message={error} onRetry={reload} />
  if (sessions.length === 0) return <EmptyState icon={History} title="No login activity yet" message="Volunteer sign-ins will show up here once volunteers start using the portal." />

  return <div className="card-k mt-6 overflow-hidden">
    <DataTable
      emptyMessage="No login activity yet."
      columns={[
        { key: 'volunteer', header: 'Volunteer', cell: s => <div><span className="font-semibold text-kInk">{s.volunteer_name}</span><p className="text-xs text-kMuted">{s.volunteer_email}</p></div> },
        { key: 'date', header: 'Date', cell: s => <span className="text-kMuted">{fmtDate(s.login_at)}</span> },
        { key: 'login_time', header: 'Login Time', cell: s => <span className="text-kMuted">{fmtTime(s.login_at)}</span> },
        { key: 'logout_time', header: 'Logout Time', cell: s => s.logout_at ? <span className="text-kMuted">{fmtTime(s.logout_at)}</span> : <StatusBadge tone="info">Active</StatusBadge> },
        { key: 'duration', header: 'Session Duration', cell: s => <span className="text-kMuted">{formatDuration(s.duration_seconds)}</span> },
      ]}
      rows={sessions}
    />
  </div>
}

export default function VolunteerActivity() {
  const [tab, setTab] = useState('online')

  return <div>
    <div className="inline-flex rounded-xl border border-kBorder bg-kSurface p-1">
      <button onClick={() => setTab('online')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'online' ? 'bg-kGreen text-white' : 'text-kMuted hover:text-kInk'}`}><Wifi size={14} className="mr-1.5 inline" /> Currently Online</button>
      <button onClick={() => setTab('history')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'history' ? 'bg-kGreen text-white' : 'text-kMuted hover:text-kInk'}`}><History size={14} className="mr-1.5 inline" /> Login History</button>
    </div>

    {tab === 'online' ? <CurrentlyOnlineTab /> : <LoginHistoryTab />}
  </div>
}
