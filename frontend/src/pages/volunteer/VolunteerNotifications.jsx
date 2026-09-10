import { useState, useEffect, useCallback } from 'react'
import { Bell, Check } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import PageHeader from '../../components/shared/PageHeader'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function VolunteerNotifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setItems((await apiFetch('/api/notifications?per_page=50')).notifications) }
    catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(n) {
    if (n.is_read) return
    try {
      await apiFetch(`/api/notifications/${n.id}`, { method: 'PATCH', body: { is_read: true } })
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))
    } catch { /* non-critical */ }
  }

  async function markAllRead() {
    try {
      await apiFetch('/api/notifications/mark-all-read', { method: 'POST' })
      setItems(prev => prev.map(x => ({ ...x, is_read: true })))
    } catch { /* non-critical */ }
  }

  const unread = items.filter(n => !n.is_read).length

  return <VolunteerShell>
    <PageHeader eyebrow="Stay updated" title="Notifications" subtitle="Updates about your assignments and account." actions={unread > 0 && <button onClick={markAllRead} className="flex items-center gap-2 rounded-full bg-kGreen/10 px-4 py-2 text-sm font-bold text-kGreen"><Check size={14} /> Mark all read</button>} />

    {loading ? <LoadingState label="notifications" /> : error ? <ErrorState message={error} onRetry={load} /> : items.length === 0 ? <div className="mt-7"><EmptyState icon={Bell} title="No notifications yet" message="Updates about your assignments will show up here." /></div> : <div className="card-k mt-7 divide-y divide-kBorderSoft overflow-hidden">
      {items.map(n => <button key={n.id} onClick={() => markRead(n)} className={`flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-kTint/40 ${n.is_read ? '' : 'bg-kGreen/5'}`}>
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-kGreen'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3"><span className={`truncate text-sm ${n.is_read ? 'font-semibold text-kInk' : 'font-bold text-kInk'}`}>{n.title}</span><span className="shrink-0 text-xs text-kMuted">{timeAgo(n.created_at)}</span></div>
          <p className="mt-0.5 truncate text-sm text-kMuted">{n.message}</p>
        </div>
      </button>)}
    </div>}
  </VolunteerShell>
}
