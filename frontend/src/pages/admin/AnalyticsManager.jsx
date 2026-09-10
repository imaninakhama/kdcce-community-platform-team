import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Activity, Boxes, Calendar, ClipboardCheck, Download, Handshake, Heart, HeartPulse,
  Home, ListChecks, ShieldAlert, Sparkles, Users, Utensils,
} from 'lucide-react'
import Shell from '../../components/admin/Shell'
import PageHeader from '../../components/shared/PageHeader'
import KpiCard from '../../components/shared/KpiCard'
import SectionCard from '../../components/shared/SectionCard'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import Row from '../../components/shared/Row'
import CollapsibleSection from '../../components/shared/CollapsibleSection'
import TrendBarChart from '../../components/shared/TrendBarChart'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'
import { downloadCsv } from '../../lib/csv'

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

function isoDate(d) { return d.toISOString().slice(0, 10) }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - (n - 1)); return d }
function monthStart() { const d = new Date(); d.setDate(1); return d }
function isThisMonth(iso) { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() }
function hasSeriesData(series) { return !!series && series.some(d => d.count > 0) }
function fmtDateTime(iso) { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }

// Small compact tile for dense secondary stats inside collapsible
// sections — deliberately lighter than KpiCard (no icon chip) to keep
// these grids tight, per the "reduce excessive card height" brief.
function Stat({ label, value, tone = 'neutral' }) {
  const toneClass = { neutral: 'text-kInk', danger: 'text-kDanger', warning: 'text-kWarning', success: 'text-kSuccess' }[tone]
  return <div className="rounded-xl bg-kBorderSoft p-3.5"><div className="text-xs text-kMuted">{label}</div><div className={`mt-1 font-display text-lg font-bold ${toneClass}`}>{value}</div></div>
}

function HorizontalBar({ label, value, max }) {
  const pct = Math.max((value / max) * 100, value > 0 ? 3 : 0)
  return <div>
    <div className="flex items-center justify-between text-sm"><span className="text-kInk">{label}</span><span className="font-semibold text-kInk">{value.toLocaleString()}</span></div>
    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-kBorderSoft"><div className="h-full rounded-full bg-kGreen transition-all" style={{ width: `${pct}%` }} /></div>
  </div>
}

// Every figure here is read straight off existing, unmodified backend
// endpoints — GET /api/analytics/dashboard for the rolling-window
// summary, GET /api/reports/home-visits and GET /api/reports/attendance
// (both already support date_from/date_to) for the two figures that are
// genuinely period-scoped ("this month" and the trend-range filter), and
// GET /api/donations (already fetched elsewhere in the app) for this
// month's confirmed cash total. No new endpoints, no client-side
// fabrication — a metric with nothing behind it renders a compact empty
// state instead of a chart drawn from zeros.
export default function AnalyticsManager() {
  const [data, setData] = useState(null)
  const [monthlyVisits, setMonthlyVisits] = useState(null)
  const [monthlyDonations, setMonthlyDonations] = useState({ total: 0, count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [rangeDays, setRangeDays] = useState(30)
  const [trend, setTrend] = useState(null)
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const today = isoDate(new Date())
      const mStart = isoDate(monthStart())
      const [dashboardRes, visitsRes, donationsRes] = await Promise.all([
        apiFetch('/api/analytics/dashboard'),
        apiFetch(`/api/reports/home-visits?date_from=${mStart}&date_to=${today}`),
        apiFetch('/api/donations'),
      ])
      setData(dashboardRes.dashboard)
      setMonthlyVisits(visitsRes.report)
      const paidThisMonth = donationsRes.donations.filter(d => d.donation_type === 'Cash' && d.status === 'Paid' && isThisMonth(d.created_at))
      setMonthlyDonations({ total: paidThisMonth.reduce((s, d) => s + Number(d.amount), 0), count: paidThisMonth.length })
    } catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const loadTrend = useCallback(async (days) => {
    setTrendLoading(true); setTrendError('')
    try {
      const res = await apiFetch(`/api/reports/attendance?date_from=${isoDate(daysAgo(days))}&date_to=${isoDate(new Date())}`)
      setTrend(res.report)
    } catch (err) { setTrendError(errorMessage(err)) }
    finally { setTrendLoading(false) }
  }, [])

  useEffect(() => { loadTrend(rangeDays) }, [rangeDays, loadTrend])

  const rangeLabel = RANGE_OPTIONS.find(r => r.value === rangeDays)?.label || ''

  function handleExport() {
    if (!data) return
    downloadCsv(`analytics-overview-${isoDate(new Date())}.csv`, ['Metric', 'Value'], [
      ['Total Elderly Members', data.elderly_care.total_elderly_members],
      ['New Registrations (30d)', data.elderly_care.new_registrations_30d],
      ['Active Volunteers', data.home_community.active_volunteers],
      ['Volunteer Completion Rate', `${data.volunteer_performance.completion_rate}%`],
      ['Home Visits This Month', monthlyVisits?.total ?? 0],
      ['Donations This Month (KES)', monthlyDonations.total],
      ['Donations This Month (count)', monthlyDonations.count],
      ['Meals Served (7d)', data.feeding_resources.meals_served_7d],
      ['Health Checks (30d)', data.health.health_checks_30d],
      ['Activities Attended (30d)', data.activities.attended_30d],
      ['Overdue Follow-ups', data.follow_ups.overdue],
      ['Open Incidents', data.incidents.open],
      ['Critical Open Incidents', data.incidents.critical_open],
      ['Low-stock Items', data.feeding_resources.low_stock_items],
      ['Pending Assistance Requests', data.home_community.assistance_pending],
      ['Attendance Trend Period', rangeLabel],
    ])
  }

  if (loading) return <Shell><PageHeader eyebrow="Overview" title="Analytics Overview" subtitle="Executive summary of KDCCE's operations." /><LoadingState label="analytics" /></Shell>
  if (error) return <Shell><PageHeader eyebrow="Overview" title="Analytics Overview" subtitle="Executive summary of KDCCE's operations." /><ErrorState message={error} onRetry={load} /></Shell>

  const programActivity = [
    { label: 'Home Visits (this month)', value: monthlyVisits?.total ?? 0 },
    { label: 'Feeding — meals served (7d)', value: data.feeding_resources.meals_served_7d },
    { label: 'Health checks (30d)', value: data.health.health_checks_30d },
    { label: 'Activities attended (30d)', value: data.activities.attended_30d },
  ]
  const programMax = Math.max(...programActivity.map(p => p.value), 1)
  const hasProgramActivity = programActivity.some(p => p.value > 0)

  const attentionItems = [
    { label: 'Overdue follow-ups', value: data.follow_ups.overdue, to: '/admin/followups', icon: ListChecks },
    { label: 'Open incidents', value: data.incidents.open, to: '/admin/incidents', icon: ShieldAlert },
    { label: 'Low-stock items', value: data.feeding_resources.low_stock_items, to: '/admin/inventory', icon: Boxes },
    { label: 'Pending assistance requests', value: data.home_community.assistance_pending, to: '/admin/assistance', icon: Handshake },
  ].filter(i => i.value > 0)

  const snapshot = [
    { label: 'Meals served (7d)', value: data.feeding_resources.meals_served_7d },
    { label: "Today's attendance", value: data.elderly_care.today_attendance },
    { label: 'Health checks (30d)', value: data.health.health_checks_30d },
    { label: 'Assistance requests', value: data.home_community.assistance_pending + data.home_community.assistance_completed },
  ]

  const todayActivityCount = data.today_activity.attendance.length + data.today_activity.home_visits.length
    + data.today_activity.assistance_requests.length + data.today_activity.health_observations.length

  return <Shell>
    <PageHeader
      eyebrow="Overview"
      title="Analytics Overview"
      subtitle={`As of ${new Date().toLocaleDateString([], { dateStyle: 'long' })} · attendance trend shown for the ${rangeLabel.toLowerCase()}`}
      actions={<>
        <select value={rangeDays} onChange={e => setRangeDays(Number(e.target.value))} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk">
          {RANGE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button onClick={handleExport} className="flex items-center gap-2 rounded-xl border border-kBorder px-4 py-3 text-sm font-semibold text-kInk hover:bg-kTint"><Download size={15} /> Export</button>
      </>}
    />

    {/* KPI row — exactly the four headline numbers, each with real
        trend/comparison text only when the underlying count is nonzero. */}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={Users} label="Total Elderly Members" value={data.elderly_care.total_elderly_members.toLocaleString()} tone="primary"
        sub={data.elderly_care.new_registrations_30d > 0 ? `+${data.elderly_care.new_registrations_30d} new in 30 days` : 'No new registrations in 30 days'} />
      <KpiCard icon={Heart} label="Active Volunteers" value={data.home_community.active_volunteers.toLocaleString()} tone="primary"
        sub={data.volunteer_performance.total_assignments > 0 ? `${data.volunteer_performance.completion_rate}% assignment completion` : 'No assignments yet'} />
      <KpiCard icon={Home} label="Home Visits This Month" value={(monthlyVisits?.total ?? 0).toLocaleString()} tone="success"
        sub={monthlyVisits?.total ? `${monthlyVisits.by_status.Completed || 0} completed` : 'No home visits logged this month yet'} />
      <KpiCard icon={Sparkles} label="Donations This Month" value={`KES ${monthlyDonations.total.toLocaleString()}`} tone="accent"
        sub={monthlyDonations.count > 0 ? `${monthlyDonations.count} confirmed donor${monthlyDonations.count > 1 ? 's' : ''}` : 'No donations logged this month yet'} />
    </div>

    {/* Second row — program activity at a glance, and what needs action. */}
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SectionCard title="Program Activity">
        {hasProgramActivity ? <div className="grid gap-4">{programActivity.map(p => <HorizontalBar key={p.label} label={p.label} value={p.value} max={programMax} />)}</div>
          : <EmptyState icon={Activity} title="No program activity yet" message="Home visits, meals, health checks and activities will appear here once recorded." />}
      </SectionCard>

      <SectionCard title="Needs Attention">
        {attentionItems.length === 0 ? <EmptyState icon={ClipboardCheck} tone="success" title="All caught up" message="Nothing needs attention right now." />
          : <div className="grid gap-1">{attentionItems.map(i => <Link key={i.label} to={i.to} className="block -mx-2 rounded-lg px-2 hover:bg-kTint/40">
              <Row icon={i.icon} tone={i.label === 'Low-stock items' || i.label === 'Pending assistance requests' ? 'warning' : 'danger'} title={i.label} right={<StatusBadge tone={i.label === 'Low-stock items' || i.label === 'Pending assistance requests' ? 'warning' : 'danger'}>{i.value}</StatusBadge>} />
            </Link>)}</div>}
        {data.incidents.critical_open > 0 && <div className="mt-3 flex items-center gap-2 rounded-xl border-l-4 border-l-kDanger bg-kDanger/10 px-4 py-2.5 text-xs font-bold text-kDanger"><AlertTriangle size={14} /> {data.incidents.critical_open} of these {data.incidents.critical_open > 1 ? 'are' : 'is'} CRITICAL severity</div>}
      </SectionCard>
    </div>

    {/* Third row — the one real trend chart, and a compact community snapshot. */}
    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <SectionCard title="Activity Trend" action={<span className="text-xs font-semibold text-kMuted">{rangeLabel}</span>}>
        {trendLoading ? <p className="py-8 text-center text-sm text-kMuted">Loading trend…</p>
          : trendError ? <ErrorState message={trendError} onRetry={() => loadTrend(rangeDays)} />
          : hasSeriesData(trend?.by_day) ? <TrendBarChart data={trend.by_day} valueLabel="check-ins" />
          : <EmptyState icon={Calendar} title="No attendance activity yet" message="Trends will appear once records are added." />}
      </SectionCard>

      <SectionCard title="Community Snapshot">
        <div className="grid grid-cols-2 gap-3">{snapshot.map(s => <Stat key={s.label} label={s.label} value={s.value.toLocaleString()} />)}</div>
      </SectionCard>
    </div>

    {/* Detail sections — everything the old page showed, just organized
        into on-demand detail instead of one long scroll. Collapsed by
        default so the summary above stays the first thing visible. */}
    <div className="mt-8 grid gap-1.5"><h2 className="px-1 font-display text-lg font-bold text-kInk">Detail</h2></div>
    <div className="mt-3 grid gap-3">
      <CollapsibleSection title="Elderly Care" icon={Users}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="New registrations (30d)" value={data.elderly_care.new_registrations_30d} />
          <Stat label="Today's attendance" value={data.elderly_care.today_attendance} />
          <Stat label="Pending follow-ups" value={data.follow_ups.pending} tone={data.follow_ups.pending > 0 ? 'warning' : 'neutral'} />
        </div>
        <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Attendance — last 7 days</div>
          <div className="mt-3">{hasSeriesData(data.elderly_care.attendance_trend_7d) ? <TrendBarChart data={data.elderly_care.attendance_trend_7d} valueLabel="check-ins" /> : <EmptyState icon={Calendar} title="No attendance activity yet" message="Trends will appear once records are added." />}</div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Health" icon={HeartPulse}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Follow-ups required" value={data.health.follow_ups_required} tone={data.health.follow_ups_required > 0 ? 'warning' : 'neutral'} />
          <Stat label="Medication activity (7d)" value={data.health.medication_administrations_7d} />
          <Stat label="Clinic visits" value="Not tracked yet" />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Feeding & Resources" icon={Utensils}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Inventory movements (7d)" value={data.feeding_resources.inventory_movements_7d} />
          <Stat label="Low stock items" value={data.feeding_resources.low_stock_items} tone={data.feeding_resources.low_stock_items > 0 ? 'warning' : 'neutral'} />
          <Stat label="Donations (30d)" value={data.feeding_resources.donations_30d} />
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Meals served — last 7 days</div>
            <div className="mt-3">{hasSeriesData(data.feeding_resources.meals_trend_7d) ? <TrendBarChart data={data.feeding_resources.meals_trend_7d} valueLabel="meals" /> : <EmptyState icon={Utensils} title="No meals logged yet" message="Trends will appear once records are added." />}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Donations — last 14 days</div>
            <div className="mt-3">{hasSeriesData(data.feeding_resources.donations_trend_14d) ? <TrendBarChart data={data.feeding_resources.donations_trend_14d} valueLabel="donations" /> : <EmptyState icon={Sparkles} title="No donations logged yet" message="Trends will appear once records are added." />}</div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Activities" icon={Activity}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Upcoming activities" value={data.activities.upcoming_count} />
          <Stat label="Home visits pending" value={data.home_community.home_visits_pending} />
          <Stat label="Home visits active" value={data.home_community.home_visits_active} />
          <Stat label="Total assignments" value={data.volunteer_performance.total_assignments} />
          <Stat label="Assignments completed" value={data.volunteer_performance.completed_assignments} />
          <Stat label="Happening today" value={todayActivityCount} />
        </div>
        {data.activities.upcoming.length > 0 && <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Next up</div>
          <div className="mt-2 grid gap-1">{data.activities.upcoming.map(a => <Row key={a.id} icon={Calendar} tone="accent" title={a.title} subtitle={a.activity_type} right={<span className="shrink-0 text-xs text-kMuted">{fmtDateTime(a.scheduled_at)}</span>} />)}</div>
        </div>}
        {data.upcoming_visits.upcoming.length > 0 && <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Upcoming home visits</div>
          <div className="mt-2 grid gap-1">{data.upcoming_visits.upcoming.map(v => <Row key={v.id} icon={Home} tone="primary" title={v.elderly_member_name} subtitle={v.assigned_to || 'Unassigned'} right={<span className="shrink-0 text-xs text-kMuted">{fmtDateTime(v.scheduled_at)}</span>} />)}</div>
        </div>}
      </CollapsibleSection>

      <CollapsibleSection title="Safety / Incidents" icon={ShieldAlert}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Open" value={data.incidents.open} tone={data.incidents.open > 0 ? 'danger' : 'neutral'} />
          <Stat label="Critical (open)" value={data.incidents.critical_open} tone={data.incidents.critical_open > 0 ? 'danger' : 'neutral'} />
          <Stat label="Follow-up required" value={data.incidents.follow_up_required} tone={data.incidents.follow_up_required > 0 ? 'warning' : 'neutral'} />
        </div>
        {data.incidents.recent.length > 0 ? <div className="mt-5">
          <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Recent incidents</div>
          <div className="mt-2 grid gap-1">{data.incidents.recent.map(i => <Row key={i.id} icon={ShieldAlert} tone={i.status === 'Open' ? 'danger' : 'neutral'} title={i.elderly_member_name} subtitle={i.incident_type} right={<StatusBadge tone={i.status === 'Open' ? 'danger' : 'neutral'}>{i.status}</StatusBadge>} />)}</div>
        </div> : <div className="mt-5"><EmptyState icon={ShieldAlert} tone="success" title="No incidents on record" message="Recent incidents will show up here." /></div>}
      </CollapsibleSection>
    </div>
  </Shell>
}
