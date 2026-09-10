import { useState } from 'react'
import { Check, X as XIcon } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import Modal from '../../components/admin/Modal'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import FilterBar from '../../components/shared/FilterBar'
import DataTable from '../../components/shared/DataTable'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useApiResource } from '../../lib/useApiResource'

const STATUS_TONE = { Pending: 'warning', Verified: 'success', Rejected: 'danger' }

function Field({ label, value }) {
  if (!value) return null
  return <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">{label}</div><p className="mt-1 text-sm leading-6 text-kInk">{value}</p></div>
}

function ReviewModal({ volunteer, onClose, onDecide, showToast }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function approve() {
    if (!window.confirm(`Approve ${volunteer.name} as a volunteer? They will immediately gain access to the volunteer portal.`)) return
    setSaving(true)
    try {
      const updated = await onDecide(volunteer.id, { status: 'Verified' })
      showToast(updated.email_sent === false
        ? `${volunteer.name} approved — but the invitation email could not be sent`
        : `${volunteer.name} approved and emailed`)
      onClose()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  async function reject() {
    if (!window.confirm(`Reject ${volunteer.name}'s application? They will not gain volunteer portal access.`)) return
    setSaving(true)
    try {
      const updated = await onDecide(volunteer.id, { status: 'Rejected', rejection_reason: reason || null })
      showToast(updated.email_sent === false
        ? `${volunteer.name} rejected — but the notification email could not be sent`
        : `${volunteer.name} rejected and notified by email`)
      onClose()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  return <Modal title="Volunteer application" onClose={onClose}>
    <div className="grid gap-4">
      <div className="flex items-center justify-between"><div><div className="font-display text-lg font-bold text-kGreen">{volunteer.name}</div><div className="text-sm text-kMuted">{volunteer.email}{volunteer.phone ? ` · ${volunteer.phone}` : ''}</div></div><StatusBadge tone={STATUS_TONE[volunteer.status]}>{volunteer.status}</StatusBadge></div>

      <Field label="Skills" value={volunteer.skills} />
      <Field label="Availability" value={volunteer.availability} />
      <Field label="Areas of interest" value={volunteer.areas_of_interest} />
      <Field label="Experience" value={volunteer.experience} />
      <Field label="Motivation" value={volunteer.motivation} />
      <Field label="About" value={volunteer.bio} />
      {volunteer.rejection_reason && <div className="rounded-xl bg-red-50 p-3"><Field label="Rejection reason on file" value={volunteer.rejection_reason} /></div>}
      {volunteer.reviewed_by && <p className="text-xs text-kMuted">Last reviewed by {volunteer.reviewed_by} on {new Date(volunteer.reviewed_at).toLocaleDateString()}</p>}

      {volunteer.status === 'Pending' && <div className="mt-2 grid gap-3 border-t border-kBorderSoft pt-5">
        {!rejecting ? <div className="flex gap-3">
          <button disabled={saving} onClick={approve} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-kGreen px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><Check size={16} /> Approve</button>
          <button disabled={saving} onClick={() => setRejecting(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-kBorder px-4 py-3 text-sm font-bold text-kMuted disabled:opacity-60"><XIcon size={16} /> Reject</button>
        </div> : <>
          <label className="text-sm font-semibold">Reason (optional, shown to the applicant)<textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="input-k mt-2" placeholder="e.g. We currently have sufficient volunteers for this area." /></label>
          <div className="flex gap-3"><button disabled={saving} onClick={reject} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Rejecting…' : 'Confirm rejection'}</button><button onClick={() => setRejecting(false)} className="rounded-xl border border-kBorder px-4 py-3 text-sm font-bold text-kMuted">Back</button></div>
        </>}
      </div>}

      {volunteer.status !== 'Pending' && <div className="mt-2 border-t border-kBorderSoft pt-5"><button disabled={saving} onClick={() => onDecide(volunteer.id, { status: volunteer.status === 'Verified' ? 'Rejected' : 'Verified' }).then(updated => { showToast(updated.email_sent === false ? 'Status updated — but the email could not be sent' : 'Status updated and emailed'); onClose() }).catch(err => showToast(errorMessage(err)))} className="text-sm font-semibold text-kOrange">{volunteer.status === 'Verified' ? 'Revoke verification' : 'Verify instead'}</button></div>}
    </div>
  </Modal>
}

export default function VolunteerManager({ showToast }) {
  const volunteersApi = useApiResource('/api/volunteers', { listKey: 'volunteers', itemKey: 'volunteer' })
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [reviewing, setReviewing] = useState(null)

  const filtered = volunteersApi.items.filter(v =>
    (statusFilter === 'All' || v.status === statusFilter) &&
    (v.name.toLowerCase().includes(q.toLowerCase()) || v.email.toLowerCase().includes(q.toLowerCase()))
  )

  return <Shell>
    <PageHeader eyebrow="People" title="Volunteer applications" subtitle="Review, approve, and manage volunteer applications." />

    {volunteersApi.loading ? <LoadingState label="volunteers" /> : volunteersApi.error ? <ErrorState message={volunteersApi.error} onRetry={volunteersApi.reload} /> : <div className="card-k mt-7 overflow-hidden">
      <FilterBar value={q} onChange={setQ} placeholder="Search name or email...">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All</option><option>Pending</option><option>Verified</option><option>Rejected</option></select>
      </FilterBar>
      <DataTable
        emptyMessage="No volunteers match your search."
        columns={[
          { key: 'name', header: 'Name', cell: v => <span className="font-semibold text-kInk">{v.name}</span> },
          { key: 'contact', header: 'Contact', cell: v => <span className="text-kMuted">{v.email}{v.phone ? ` · ${v.phone}` : ''}</span> },
          { key: 'skills', header: 'Skills', cell: v => <span className="text-kMuted">{v.skills || '—'}</span> },
          { key: 'availability', header: 'Availability', cell: v => <span className="text-kMuted">{v.availability || '—'}</span> },
          { key: 'status', header: 'Status', cell: v => <StatusBadge tone={STATUS_TONE[v.status]}>{v.status}</StatusBadge> },
          { key: 'action', header: 'Action', cell: v => <button onClick={() => setReviewing(v)} className="text-xs font-bold text-kGreen">{v.status === 'Pending' ? 'Review' : 'View'}</button> },
        ]}
        rows={filtered}
      />
    </div>}

    {reviewing && <ReviewModal volunteer={reviewing} onClose={() => setReviewing(null)} onDecide={(id, data) => volunteersApi.patch(id, data)} showToast={showToast} />}
  </Shell>
}
