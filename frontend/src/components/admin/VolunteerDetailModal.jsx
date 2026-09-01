import { useState, useEffect, useCallback } from 'react'
import { Award, Check, Trophy, X as XIcon } from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { errorMessage, timeAgo } from './adminHelpers'
import { apiFetch } from '../../lib/api'

const TABS = ['Overview', 'Hours', 'Performance', 'Achievements']

function fmtMinutes(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function Field({ label, value }) {
  if (!value) return null
  return <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">{label}</div><p className="mt-1 text-sm leading-6 text-kInk">{value}</p></div>
}

function OverviewTab({ volunteer, onDecide, showToast, onClose }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function approve() {
    if (!window.confirm(`Approve ${volunteer.name} as a volunteer? They will immediately gain access to the volunteer portal.`)) return
    setSaving(true)
    try { await onDecide(volunteer.id, { status: 'Verified' }); showToast(`${volunteer.name} approved`); onClose() }
    catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }
  async function reject() {
    if (!window.confirm(`Reject ${volunteer.name}'s application? They will not gain volunteer portal access.`)) return
    setSaving(true)
    try { await onDecide(volunteer.id, { status: 'Rejected', rejection_reason: reason || null }); showToast(`${volunteer.name} rejected`); onClose() }
    catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  return <div className="grid gap-4">
    <div className="flex items-center justify-between"><div><div className="font-display text-lg font-bold text-kGreen">{volunteer.name}</div><div className="text-sm text-kMuted">{volunteer.email}{volunteer.phone ? ` · ${volunteer.phone}` : ''}</div></div><StatusBadge value={volunteer.status} /></div>
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
    {volunteer.status !== 'Pending' && <div className="mt-2 border-t border-kBorderSoft pt-5"><button disabled={saving} onClick={() => onDecide(volunteer.id, { status: volunteer.status === 'Verified' ? 'Rejected' : 'Verified' }).then(() => { showToast('Status updated'); onClose() }).catch(err => showToast(errorMessage(err)))} className="text-sm font-semibold text-kOrange">{volunteer.status === 'Verified' ? 'Revoke verification' : 'Verify instead'}</button></div>}
  </div>
}

function HoursTab({ volunteerId, showToast }) {
  const [hours, setHours] = useState(null)
  const load = useCallback(() => { apiFetch(`/api/volunteers/${volunteerId}/hours`).then(d => setHours(d.hours)).catch(err => showToast(errorMessage(err))) }, [volunteerId, showToast])
  useEffect(() => { load() }, [load])
  if (!hours) return <p className="text-sm text-kMuted">Loading…</p>

  async function review(id, status) {
    try { await apiFetch(`/api/volunteers/hours/${id}`, { method: 'PATCH', body: { status, rejection_reason: status === 'Rejected' ? 'Not approved' : null } }); showToast(`Entry ${status.toLowerCase()}`); load() }
    catch (err) { showToast(errorMessage(err)) }
  }

  return <div className="grid gap-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{fmtMinutes(hours.minutes_today)}</div><div className="text-xs text-kMuted">Today</div></div>
      <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{fmtMinutes(hours.minutes_this_week)}</div><div className="text-xs text-kMuted">This week</div></div>
      <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{fmtMinutes(hours.minutes_this_month)}</div><div className="text-xs text-kMuted">This month</div></div>
      <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{fmtMinutes(hours.minutes_lifetime)}</div><div className="text-xs text-kMuted">Lifetime</div></div>
    </div>
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Recent entries</div>
      <div className="mt-2 grid gap-1.5">
        {hours.recent_entries.map(e => <div key={`${e.kind}-${e.id}`} className="flex items-center justify-between rounded-xl bg-kCream px-3 py-2 text-sm">
          <div><span className="font-semibold text-kInk">{e.label}</span> <span className="text-xs text-kMuted">{e.date} &middot; {fmtMinutes(e.minutes)}</span></div>
          {e.kind === 'manual' && e.status === 'Pending' && <div className="flex gap-2"><button onClick={() => review(e.id, 'Approved')} className="text-xs font-bold text-emerald-600">Approve</button><button onClick={() => review(e.id, 'Rejected')} className="text-xs font-bold text-red-600">Reject</button></div>}
          {e.kind === 'manual' && e.status !== 'Pending' && <StatusBadge value={e.status} />}
        </div>)}
        {hours.recent_entries.length === 0 && <p className="text-sm text-kMuted">No entries yet.</p>}
      </div>
    </div>
  </div>
}

function PerformanceTab({ volunteerId, showToast }) {
  const [perf, setPerf] = useState(null)
  useEffect(() => { apiFetch(`/api/volunteers/${volunteerId}/performance`).then(d => setPerf(d.performance)).catch(err => showToast(errorMessage(err))) }, [volunteerId, showToast])
  if (!perf) return <p className="text-sm text-kMuted">Loading…</p>
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.total_completed_assignments}</div><div className="text-xs text-kMuted">Completed</div></div>
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.pending_assignments}</div><div className="text-xs text-kMuted">Pending</div></div>
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.completion_rate === null ? '—' : `${perf.completion_rate}%`}</div><div className="text-xs text-kMuted">Completion rate</div></div>
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.completed_home_visits}</div><div className="text-xs text-kMuted">Home visits</div></div>
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.completed_assistance_requests}</div><div className="text-xs text-kMuted">Assistance</div></div>
    <div className="card-k p-4 text-center"><div className="font-display text-2xl font-bold text-kGreen">{perf.cancelled_assignments}</div><div className="text-xs text-kMuted">Cancelled</div></div>
  </div>
}

function AchievementsTab({ volunteer, showToast }) {
  const [data, setData] = useState(null)
  const [allAchievements, setAllAchievements] = useState([])
  const [awarding, setAwarding] = useState(false)

  const load = useCallback(() => { apiFetch(`/api/volunteers/${volunteer.id}/achievements`).then(d => setData(d.achievements)).catch(err => showToast(errorMessage(err))) }, [volunteer.id, showToast])
  useEffect(() => { load() }, [load])
  useEffect(() => { apiFetch('/api/achievements').then(d => setAllAchievements(d.achievements.filter(a => a.threshold_type === 'manual'))).catch(() => {}) }, [])

  async function award(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    setAwarding(true)
    try {
      await apiFetch(`/api/volunteers/${volunteer.id}/recognition`, { method: 'POST', body: { achievement_id: Number(f.get('achievement_id')), notes: f.get('notes') || null } })
      showToast('Recognition awarded')
      e.target.reset()
      load()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setAwarding(false) }
  }

  if (!data) return <p className="text-sm text-kMuted">Loading…</p>
  const availableToAward = allAchievements.filter(a => !data.earned.some(e => e.achievement.code === a.code))

  return <div className="grid gap-5">
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Earned ({data.earned.length})</div>
      <div className="mt-2 grid gap-2">
        {data.earned.map(e => <div key={e.achievement.code} className="flex items-center gap-3 rounded-xl bg-kCream px-3 py-2">
          <Award size={16} className="text-kOrange" />
          <div className="flex-1"><div className="text-sm font-semibold text-kInk">{e.achievement.name}</div><div className="text-xs text-kMuted">{e.source === 'manual' ? `Recognized by ${e.awarded_by || 'staff'}` : 'Earned automatically'} &middot; {timeAgo(e.awarded_at)}</div></div>
        </div>)}
        {data.earned.length === 0 && <p className="text-sm text-kMuted">No achievements yet.</p>}
      </div>
    </div>
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Progress toward milestones</div>
      <div className="mt-2 grid gap-1.5">
        {data.upcoming.map(a => <div key={a.code} className="flex items-center justify-between text-sm"><span className="text-kInk">{a.name}</span><span className="text-xs text-kMuted">{a.threshold_type === 'service_minutes' ? `${fmtMinutes(a.current_value)}/${fmtMinutes(a.threshold_value)}` : `${a.current_value}/${a.threshold_value}`}</span></div>)}
      </div>
    </div>
    {availableToAward.length > 0 && <form onSubmit={award} className="grid gap-3 border-t border-kBorderSoft pt-4">
      <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Award recognition</div>
      <select name="achievement_id" className="input-k" required><option value="">Choose a recognition…</option>{availableToAward.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
      <textarea name="notes" rows={2} className="input-k" placeholder="Optional note shown to the volunteer" />
      <button disabled={awarding} className="btn-orange w-fit disabled:opacity-60"><Trophy size={15} /> {awarding ? 'Awarding…' : 'Award recognition'}</button>
    </form>}
  </div>
}

export default function VolunteerDetailModal({ volunteer, onClose, onDecide, showToast }) {
  const [tab, setTab] = useState('Overview')

  return <Modal title="Volunteer details" onClose={onClose} wide>
    <div className="-mt-2 mb-4 flex gap-1 overflow-x-auto border-b border-kBorderSoft pb-2">
      {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === t ? 'bg-kOrange text-white' : 'text-kMuted hover:bg-kCream'}`}>{t}</button>)}
    </div>
    {tab === 'Overview' && <OverviewTab volunteer={volunteer} onDecide={onDecide} showToast={showToast} onClose={onClose} />}
    {tab === 'Hours' && <HoursTab volunteerId={volunteer.id} showToast={showToast} />}
    {tab === 'Performance' && <PerformanceTab volunteerId={volunteer.id} showToast={showToast} />}
    {tab === 'Achievements' && <AchievementsTab volunteer={volunteer} showToast={showToast} />}
  </Modal>
}
