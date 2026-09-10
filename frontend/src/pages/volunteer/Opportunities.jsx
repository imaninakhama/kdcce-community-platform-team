import { useState } from 'react'
import { Check, Home, HandHeart, Sparkles } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'
import { apiFetch } from '../../lib/api'

const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' }
function fmtDate(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled yet' }

// "Opportunities" = assignments already offered to this volunteer but not
// yet accepted — status 'Assigned' is the only status the backend's
// /accept endpoint actually allows accepting from (see homevisits/routes.py
// and assistance/routes.py), so that's the exact filter used here. There
// is no backend concept of unassigned work a volunteer can browse and
// self-claim — this reuses the same already-scoped data every other
// portal page draws from, just surfaced as its own "needs your response"
// view instead of buried inside My Assignments.
export default function Opportunities({ showToast }) {
  const { visits, requests, loading, error, reload } = useVolunteerData()
  const [busyKey, setBusyKey] = useState(null)

  if (loading) return <VolunteerShell><LoadingState label="opportunities" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={reload} /></VolunteerShell>

  const offered = [
    ...visits.filter(v => v.status === 'Assigned').map(v => ({ ...v, kind: 'Home Visit', icon: Home, basePath: `/api/home-visits/${v.id}`, subtitle: v.reason })),
    ...requests.filter(r => r.status === 'Assigned').map(r => ({ ...r, kind: 'Assistance Request', icon: HandHeart, basePath: `/api/assistance-requests/${r.id}`, subtitle: r.description })),
  ]

  async function accept(item) {
    const key = `${item.kind}-${item.id}`
    setBusyKey(key)
    try {
      await apiFetch(`${item.basePath}/accept`, { method: 'POST' })
      showToast(`Accepted — ${item.elderly_member_name}`)
      reload()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setBusyKey(null) }
  }

  return <VolunteerShell>
    <PageHeader eyebrow="Awaiting your response" title="Opportunities" subtitle="Assignments offered to you that still need to be accepted." />

    <div className="mt-7">
      {offered.length === 0 ? <EmptyState icon={Sparkles} tone="success" title="Nothing waiting on you" message="New assignments offered to you will show up here until you accept them." /> : <div className="grid gap-4">
        {offered.map(o => { const Icon = o.icon; return <div key={`${o.kind}-${o.id}`} className="card-k p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-kGreen/10 text-kGreen"><Icon size={18} /></div>
              <div>
                <div className="flex items-center gap-2"><span className="font-display text-lg font-bold text-kGreen">{o.elderly_member_name}</span><StatusBadge tone={PRIORITY_TONE[o.priority]}>{o.priority}</StatusBadge></div>
                <p className="mt-1 text-sm text-kMuted">{o.kind} &middot; {o.elderly_member_code} &middot; {fmtDate(o.scheduled_at)}</p>
                <p className="mt-3 text-sm text-kInk">{o.subtitle}</p>
              </div>
            </div>
            <button disabled={busyKey === `${o.kind}-${o.id}`} onClick={() => accept(o)} className="btn-green shrink-0 disabled:opacity-60"><Check size={15} /> Accept</button>
          </div>
        </div> })}
      </div>}
    </div>
  </VolunteerShell>
}
