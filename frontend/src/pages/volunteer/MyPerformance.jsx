import { useCallback, useEffect, useState } from 'react'
import { Award, Trophy } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import StatusBadge from '../../components/admin/StatusBadge'
import { LoadingState, ErrorState, errorMessage, timeAgo } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'
import { apiFetch } from '../../lib/api'

function StatCard({ value, label }) {
  return <div className="card-k p-6 text-center"><div className="font-display text-4xl font-bold text-kGreen">{value}</div><div className="mt-1 text-sm text-kMuted">{label}</div></div>
}

function fmtMinutes(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function HoursSection({ showToast }) {
  const [hours, setHours] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    apiFetch('/api/volunteers/me/hours').then(d => setHours(d.hours)).catch(err => showToast(errorMessage(err)))
  }, [showToast])
  useEffect(() => { load() }, [load])

  async function submit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    setSaving(true)
    try {
      await apiFetch('/api/volunteers/me/hours', {
        method: 'POST',
        body: { date: f.get('date'), duration_minutes: Number(f.get('duration_minutes')), category: f.get('category'), description: f.get('description') || null },
      })
      showToast('Hours submitted for approval')
      e.target.reset()
      load()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  if (!hours) return <LoadingState label="hours" />

  return <div className="mt-8">
    <h2 className="font-display text-xl font-bold text-kGreen">Service Hours</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-4">
      <StatCard value={fmtMinutes(hours.minutes_today)} label="Today" />
      <StatCard value={fmtMinutes(hours.minutes_this_week)} label="This week" />
      <StatCard value={fmtMinutes(hours.minutes_this_month)} label="This month" />
      <StatCard value={fmtMinutes(hours.minutes_lifetime)} label="Lifetime" />
    </div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Recent entries</div>
        <div className="mt-2 grid gap-1.5">
          {hours.recent_entries.map(e => <div key={`${e.kind}-${e.id}`} className="flex items-center justify-between rounded-xl bg-kCream px-3 py-2 text-sm">
            <div><span className="font-semibold text-kInk">{e.label}</span> <span className="text-xs text-kMuted">{e.date} &middot; {fmtMinutes(e.minutes)}</span></div>
            {e.kind === 'manual' && <StatusBadge value={e.status} />}
          </div>)}
          {hours.recent_entries.length === 0 && <p className="text-sm text-kMuted">No entries yet.</p>}
        </div>
      </div>
      <form onSubmit={submit} className="card-k grid gap-3 p-5">
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Log hours</div>
        <label className="text-sm font-semibold">Date<input name="date" type="date" max={new Date().toISOString().slice(0, 10)} className="input-k mt-1" required /></label>
        <label className="text-sm font-semibold">Duration (minutes)<input name="duration_minutes" type="number" min="1" max={24 * 60} className="input-k mt-1" required /></label>
        <label className="text-sm font-semibold">Category<select name="category" className="input-k mt-1" defaultValue="Other">
          <option>Home Visit</option><option>Assistance</option><option>Activity</option><option>Administrative</option><option>Other</option>
        </select></label>
        <label className="text-sm font-semibold">Notes (optional)<textarea name="description" rows={2} className="input-k mt-1" /></label>
        <button disabled={saving} className="btn-orange disabled:opacity-60">{saving ? 'Submitting…' : 'Submit for approval'}</button>
      </form>
    </div>
  </div>
}

function AchievementsSection({ showToast }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    apiFetch('/api/volunteers/me/achievements').then(d => setData(d.achievements)).catch(err => showToast(errorMessage(err)))
  }, [showToast])

  if (!data) return <LoadingState label="achievements" />

  return <div className="mt-8">
    <h2 className="font-display text-xl font-bold text-kGreen">Achievements</h2>
    <div className="mt-4 grid gap-6 lg:grid-cols-2">
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Earned ({data.earned.length})</div>
        <div className="mt-2 grid gap-2">
          {data.earned.map(e => <div key={e.achievement.code} className="flex items-center gap-3 rounded-xl bg-kCream px-3 py-2">
            <Award size={16} className="text-kOrange" />
            <div className="flex-1"><div className="text-sm font-semibold text-kInk">{e.achievement.name}</div><div className="text-xs text-kMuted">{e.source === 'manual' ? `Recognized by ${e.awarded_by || 'staff'}` : 'Earned automatically'} &middot; {timeAgo(e.awarded_at)}</div></div>
          </div>)}
          {data.earned.length === 0 && <p className="text-sm text-kMuted">No achievements yet — keep going!</p>}
        </div>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Progress toward milestones</div>
        <div className="mt-2 grid gap-2">
          {data.upcoming.map(a => <div key={a.code} className="flex items-center gap-3 rounded-xl bg-kCream px-3 py-2">
            <Trophy size={16} className="text-kMuted" />
            <div className="flex-1"><div className="text-sm font-semibold text-kInk">{a.name}</div><div className="text-xs text-kMuted">{a.threshold_type === 'service_minutes' ? `${fmtMinutes(a.current_value)} / ${fmtMinutes(a.threshold_value)}` : `${a.current_value} / ${a.threshold_value}`}</div></div>
          </div>)}
          {data.upcoming.length === 0 && <p className="text-sm text-kMuted">Nothing left to chase — you've earned every automatic badge.</p>}
        </div>
      </div>
    </div>
  </div>
}

export default function MyPerformance({ showToast }) {
  // Shared across the portal (see VolunteerDataContext) — computed from
  // the same already-scoped data every other portal page uses, nothing
  // fabricated or estimated.
  const { visits, requests, followups, loading, error, reload } = useVolunteerData()

  if (loading) return <VolunteerShell><LoadingState label="performance" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={reload} /></VolunteerShell>

  const allAssignments = [...visits, ...requests]
  const completed = allAssignments.filter(x => x.status === 'Completed').length
  const cancelled = allAssignments.filter(x => x.status === 'Cancelled').length
  const pending = allAssignments.length - completed - cancelled
  const decided = completed + cancelled
  const completionRate = decided > 0 ? Math.round((completed / decided) * 100) : null

  return <VolunteerShell>
    <div><div className="eyebrow">Private to you</div><h1 className="font-display text-3xl font-bold text-kGreen">My Performance</h1></div>

    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      <StatCard value={completed} label="Completed" />
      <StatCard value={pending} label="Pending" />
      <StatCard value={completionRate === null ? '—' : `${completionRate}%`} label="Completion Rate" />
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <StatCard value={visits.filter(x => x.status === 'Completed').length} label="Home visits completed" />
      <StatCard value={requests.filter(x => x.status === 'Completed').length} label="Assistance requests completed" />
      <StatCard value={followups.filter(x => x.status === 'Completed').length} label="Follow-ups completed" />
    </div>

    <HoursSection showToast={showToast} />
    <AchievementsSection showToast={showToast} />

    <p className="mt-6 text-xs text-kMuted">This is your own record only — no other volunteer's performance is visible here.</p>
  </VolunteerShell>
}
