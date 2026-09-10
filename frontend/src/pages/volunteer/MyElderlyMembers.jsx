import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import Modal from '../../components/admin/Modal'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'
import { apiFetch } from '../../lib/api'

function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) : '—' }

function SnapshotModal({ memberId, onClose }) {
  const [snap, setSnap] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`/api/volunteers/me/elderly-members/${memberId}`)
      .then(d => setSnap(d.elderly_member))
      .catch(err => setError(errorMessage(err)))
  }, [memberId])

  return <Modal title={snap ? `${snap.full_name} — ${snap.member_id}` : 'Loading…'} onClose={onClose}>
    {error && <ErrorState message={error} onRetry={() => {}} />}
    {!snap && !error && <LoadingState label="care snapshot" />}
    {snap && <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card-k p-4"><div className="text-xs font-bold uppercase tracking-wide text-kMuted">Next assignment</div>
          {snap.next_assignment ? <p className="mt-2 text-sm text-kInk">{snap.next_assignment.kind === 'home_visit' ? 'Home visit' : 'Assistance request'} — {fmtDate(snap.next_assignment.scheduled_at)}</p> : <p className="mt-2 text-sm text-kMuted">Nothing scheduled.</p>}
        </div>
        <div className="card-k p-4"><div className="text-xs font-bold uppercase tracking-wide text-kMuted">Recent visit</div>
          {snap.recent_visit ? <p className="mt-2 text-sm text-kInk">Completed {fmtDate(snap.recent_visit.completed_at)}</p> : <p className="mt-2 text-sm text-kMuted">No completed visit yet.</p>}
        </div>
      </div>

      {snap.recent_visit && (snap.recent_visit.observations || snap.recent_visit.support_provided) && <div className="card-k p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Last visit notes</div>
        {snap.recent_visit.observations && <p className="mt-2 text-sm text-kInk">{snap.recent_visit.observations}</p>}
        {snap.recent_visit.support_provided && <p className="mt-1 text-sm text-kMuted">{snap.recent_visit.support_provided}</p>}
      </div>}

      {(snap.dietary_requirements || snap.allergies) && <div className="card-k p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Dietary / allergies</div>
        {snap.dietary_requirements && <p className="mt-2 text-sm text-kInk"><b>Dietary:</b> {snap.dietary_requirements}</p>}
        {snap.allergies && <p className="mt-1 text-sm text-kInk"><b>Allergies:</b> {snap.allergies}</p>}
      </div>}

      <div className="card-k p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Follow-ups</div>
        {snap.follow_ups.length === 0 ? <p className="mt-2 text-sm text-kMuted">None on record.</p> : <div className="mt-3 grid gap-2">
          {snap.follow_ups.map(f => <div key={f.id} className="rounded-xl border border-kBorderSoft p-3 text-sm">
            <div className="flex items-center justify-between gap-2"><span className="font-semibold text-kInk">{f.reason}</span><StatusBadge tone={f.is_overdue ? 'danger' : 'warning'}>{f.status}{f.is_overdue ? ' · overdue' : ''}</StatusBadge></div>
            {f.due_date && <p className="mt-1 text-xs text-kMuted">Due {fmtDate(f.due_date)}</p>}
          </div>)}
        </div>}
      </div>
    </div>}
  </Modal>
}

export default function MyElderlyMembers() {
  const { elderlyMembers, loading, error, reload } = useVolunteerData()
  const [viewId, setViewId] = useState(null)

  return <VolunteerShell>
    <PageHeader eyebrow="My people" title="People I Support" subtitle="Elderly members currently assigned to you." />

    {loading ? <LoadingState label="elderly members" /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="mt-7 grid gap-4 sm:grid-cols-2">
      {elderlyMembers.map(m => <div key={m.id} className="card-k p-5">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-kGreen/10 text-kGreen"><Users size={18} /></div><div><div className="font-display text-lg font-bold text-kGreen">{m.full_name}</div><div className="text-xs text-kMuted">{m.member_id}</div></div></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">Last visit</div><div className="mt-1 text-kInk">{fmtDate(m.last_visit)}</div></div>
          <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">Next assignment</div><div className="mt-1 text-kInk">{fmtDate(m.next_assignment)}</div></div>
        </div>
        <button onClick={() => setViewId(m.id)} className="mt-4 text-sm font-bold text-kGreen">View Details</button>
      </div>)}
      {elderlyMembers.length === 0 && <div className="sm:col-span-2"><EmptyState icon={Users} title="No one assigned yet" message="Elderly members assigned to you will show up here." /></div>}
    </div>}

    {viewId && <SnapshotModal memberId={viewId} onClose={() => setViewId(null)} />}
  </VolunteerShell>
}
