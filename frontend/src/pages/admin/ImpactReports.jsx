import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Heart, HeartHandshake, Home, TrendingUp, UserRound, Utensils } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import PageHeader from '../../components/shared/PageHeader'
import KpiCard from '../../components/shared/KpiCard'
import SectionCard from '../../components/shared/SectionCard'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'

// Investor/board-facing summary of all-time program performance — every
// number is read straight off the existing GET /api/reports/* endpoints
// (no date filter = all time, see parse_date_range in app/utils.py), the
// same aggregates AnalyticsManager already relies on for its rolling
// windows. This page is the all-time, narrative view; Analytics stays the
// operational day-to-day one.
function Breakdown({ title, entries, total }) {
  return <div>
    <div className="text-xs font-bold uppercase tracking-wide text-kMuted">{title}</div>
    <div className="mt-3 grid gap-2">
      {Object.entries(entries).map(([label, count]) => {
        const pct = total ? Math.round((count / total) * 100) : 0
        return <div key={label}>
          <div className="flex items-center justify-between text-sm"><span className="text-kInk">{label}</span><span className="text-kMuted">{count.toLocaleString()} ({pct}%)</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-kBorderSoft"><div className="h-full rounded-full bg-kGreen" style={{ width: `${pct}%` }} /></div>
        </div>
      })}
      {Object.keys(entries).length === 0 && <p className="text-sm text-kMuted">No records yet.</p>}
    </div>
  </div>
}

export default function ImpactReports() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [donations, feeding, attendance, volunteers, homeVisits, assistance, activities] = await Promise.all([
        apiFetch('/api/reports/donations'),
        apiFetch('/api/reports/feeding'),
        apiFetch('/api/reports/attendance'),
        apiFetch('/api/reports/volunteers'),
        apiFetch('/api/reports/home-visits'),
        apiFetch('/api/reports/assistance'),
        apiFetch('/api/reports/activities'),
      ])
      setData({
        donations: donations.report, feeding: feeding.report, attendance: attendance.report, volunteers: volunteers.report,
        homeVisits: homeVisits.report, assistance: assistance.report, activities: activities.report,
      })
    } catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  return <Shell>
    <PageHeader eyebrow="For funders & the board" title="Impact & Reports" subtitle="All-time program performance across KDCCE's care, volunteering, and fundraising work." />

    {loading ? <LoadingState label="impact report" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={UserRound} label="Elderly people supported" value={data.attendance.registered_count.toLocaleString()} sub="Registered members" tone="primary" />
        <KpiCard icon={Home} label="Home visits completed" value={(data.homeVisits.by_status.Completed || 0).toLocaleString()} sub={`of ${data.homeVisits.total.toLocaleString()} total visits`} tone="success" />
        <KpiCard icon={Utensils} label="Meals served" value={data.feeding.meals_served.toLocaleString()} sub={`${data.feeding.meals_planned.toLocaleString()} meals planned`} tone="accent" />
        <KpiCard icon={HeartHandshake} label="Active volunteers" value={data.volunteers.active_volunteers.toLocaleString()} sub="Verified & assignable" tone="primary" />
        <KpiCard icon={TrendingUp} label="Volunteer hours" value="Not tracked yet" sub="No duration/time-on-task is recorded in this system" tone="neutral" />
        <KpiCard icon={Heart} label="Total donations (confirmed)" value={`KES ${data.donations.cash_total.toLocaleString()}`} sub={`${data.donations.total_count.toLocaleString()} donation records`} tone="accent" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Attendance & wellbeing">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Attendance rate</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.attendance.attendance_percentage}%</div></div>
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Avg. daily check-ins</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.attendance.average_daily}</div></div>
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Total records</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.attendance.total_records.toLocaleString()}</div></div>
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Dietary/allergy flagged</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.feeding.dietary_flagged_attendees}</div></div>
          </div>
        </SectionCard>

        <SectionCard title="Volunteer program performance">
          <Breakdown title="Volunteers by status" entries={data.volunteers.by_status} total={Object.values(data.volunteers.by_status).reduce((s, n) => s + n, 0)} />
          <div className="mt-5 text-xs font-bold uppercase tracking-wide text-kMuted">Top contributors</div>
          <div className="mt-2 grid gap-2">
            {[...data.volunteers.workload].sort((a, b) => (b.home_visits_completed + b.assistance_requests_completed) - (a.home_visits_completed + a.assistance_requests_completed)).slice(0, 5).map(v => <div key={v.user_id} className="flex items-center justify-between border-b border-kBorderSoft py-2 text-sm last:border-0">
              <span className="font-semibold text-kInk">{v.name}</span>
              <span className="text-kMuted">{v.home_visits_completed + v.assistance_requests_completed} completed · {v.completion_rate}%</span>
            </div>)}
            {data.volunteers.workload.length === 0 && <p className="text-sm text-kMuted">No verified volunteers yet.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Home visits & assistance requests" action={<Link to="/admin/home-visits" className="text-sm font-semibold text-kGreen">Manage</Link>}>
          <Breakdown title="Home visits by status" entries={data.homeVisits.by_status} total={data.homeVisits.total} />
          <div className="mt-5"><Breakdown title="Assistance requests by status" entries={data.assistance.by_status} total={data.assistance.total} /></div>
        </SectionCard>

        <SectionCard title="Programs & activities" action={<Link to="/admin/activities" className="text-sm font-semibold text-kGreen">Manage</Link>}>
          <div className="mb-4 rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Activities conducted</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.activities.activities_conducted.toLocaleString()}</div></div>
          <Breakdown title="By type" entries={data.activities.by_type} total={data.activities.activities_conducted} />
          <div className="mt-5"><Breakdown title="Participation" entries={data.activities.participant_status_breakdown} total={Object.values(data.activities.participant_status_breakdown).reduce((s, n) => s + n, 0)} /></div>
        </SectionCard>
      </div>

      <div className="mt-6"><SectionCard title="Fundraising" action={<Link to="/admin/donations" className="text-sm font-semibold text-kGreen">View all donations</Link>}>
        <Breakdown title="Donations by type" entries={data.donations.by_type} total={data.donations.total_count} />
      </SectionCard></div>
      <div className="flex items-center gap-2 text-xs text-kMuted"><Activity size={13} /> Figures reflect all-time activity as of today.</div>
    </>}
  </Shell>
}
