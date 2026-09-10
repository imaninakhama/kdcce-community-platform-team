import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Home, HandHeart, CalendarClock, ShieldCheck, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import KpiCard from '../../components/shared/KpiCard'
import SectionCard from '../../components/shared/SectionCard'
import Row from '../../components/shared/Row'
import StatusBadge from '../../components/shared/StatusBadge'
import { LoadingState, ErrorState } from '../../components/admin/adminHelpers'
import { getStoredUser } from '../../lib/api'
import { useVolunteerData } from '../../lib/VolunteerDataContext'
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_STYLES } from '../../lib/volunteerStatus'

function isThisMonth(iso) {
  if (!iso) return false
  const d = new Date(iso), now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}
function fmtWhen(iso) { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) }

const STATUS_TONE = { Pending: 'warning', Verified: 'success', Rejected: 'danger' }

export default function VolunteerDashboard({ profile }) {
  const user = getStoredUser()
  // profile comes from VolunteerPortal's own gate check (already fetched
  // to decide whether to even render this page) — no second /me call.
  // Everything else is derived from the shared VolunteerDataProvider, so
  // navigating here from another portal page is instant, not a re-fetch.
  const { visits, requests, followups, elderlyMembers: elderly, loading, error, reload } = useVolunteerData()

  if (loading) return <VolunteerShell><LoadingState label="dashboard" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={reload} /></VolunteerShell>

  const allAssignments = [
    ...visits.map(v => ({ ...v, kind: 'Home Visit', to: '/volunteer/assignments', when: v.scheduled_at })),
    ...requests.map(r => ({ ...r, kind: 'Assistance Request', to: '/volunteer/assignments', when: r.scheduled_at })),
  ]
  const offered = allAssignments.filter(x => x.status === 'Assigned')
  const openAssignments = allAssignments.filter(x => !['Completed', 'Cancelled'].includes(x.status))
  const completedThisMonth = allAssignments.filter(x => x.status === 'Completed' && isThisMonth(x.completed_at)).length
  const completedTotal = allAssignments.filter(x => x.status === 'Completed').length
  const followupsDueToday = followups.filter(fu => fu.status !== 'Completed' && fu.due_date && new Date(fu.due_date).toDateString() === new Date().toDateString())
  const upcoming = openAssignments.filter(x => x.when).sort((a, b) => new Date(a.when) - new Date(b.when))
  const nextAssignment = upcoming[0] || null

  return <VolunteerShell>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="eyebrow">Welcome</div>
        <h1 className="font-display text-2xl font-bold text-kGreen sm:text-[26px]">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h1>
        <div className="mt-2"><StatusBadge tone={STATUS_TONE[profile.status]} icon={ShieldCheck}>{VOLUNTEER_STATUS_LABELS[profile.status]}</StatusBadge></div>
      </div>
    </div>

    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={CalendarClock} label="Today's assignments" value={openAssignments.filter(x => x.when && new Date(x.when).toDateString() === new Date().toDateString()).length} tone="primary" />
      <KpiCard icon={Sparkles} label="Awaiting your response" value={offered.length} tone={offered.length > 0 ? 'warning' : 'success'} />
      <KpiCard icon={CheckCircle2} label="Completed this month" value={completedThisMonth} tone="success" />
      <KpiCard icon={TrendingUp} label="Completed all time" value={completedTotal} tone="neutral" />
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="grid gap-6">
        <SectionCard title="Next assignment">
          {nextAssignment ? <Row
            icon={nextAssignment.kind === 'Home Visit' ? Home : HandHeart}
            tone="primary"
            title={`${nextAssignment.kind} — ${nextAssignment.elderly_member_name}`}
            subtitle={fmtWhen(nextAssignment.when)}
            right={<Link to={nextAssignment.to} className="text-xs font-bold text-kGreen">View</Link>}
          /> : <p className="text-sm text-kMuted">Nothing scheduled yet — check Opportunities for new offers.</p>}
        </SectionCard>

        <SectionCard title="Pending assignments" action={<Link to="/volunteer/opportunities" className="text-sm font-semibold text-kGreen">View opportunities</Link>}>
          {offered.length === 0 ? <p className="text-sm text-kMuted">Nothing waiting on your response right now.</p> : <div className="grid gap-1">
            {offered.slice(0, 5).map(x => <Row key={`${x.kind}-${x.id}`} icon={x.kind === 'Home Visit' ? Home : HandHeart} tone="warning" title={`${x.kind} — ${x.elderly_member_name}`} subtitle="Offered to you" right={<StatusBadge tone="warning">Assigned</StatusBadge>} />)}
          </div>}
        </SectionCard>

        <SectionCard title="Upcoming schedule" action={<Link to="/volunteer/assignments" className="text-sm font-semibold text-kGreen">View all</Link>}>
          {upcoming.length === 0 ? <p className="text-sm text-kMuted">Nothing scheduled yet.</p> : <div className="grid gap-1">
            {upcoming.slice(0, 5).map(x => <Row key={`up-${x.kind}-${x.id}`} icon={x.kind === 'Home Visit' ? Home : HandHeart} tone="primary" title={`${x.kind} — ${x.elderly_member_name}`} subtitle={fmtWhen(x.when)} right={<Link to={x.to} className="shrink-0 text-xs font-bold text-kGreen">View</Link>} />)}
          </div>}
        </SectionCard>
      </div>

      <div className="grid gap-6">
        {(followupsDueToday.length > 0) && <div className="card-k border-l-4 border-l-kWarning p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-kInk"><AlertTriangle size={18} className="text-kWarning" /> Attention required</h2>
          <p className="mt-2 text-sm text-kMuted">{followupsDueToday.length} follow-up{followupsDueToday.length > 1 ? 's' : ''} due today.</p>
        </div>}

        <SectionCard title="Your impact" action={<Link to="/volunteer/impact" className="text-sm font-semibold text-kGreen">Full breakdown</Link>}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">People supported</div><div className="mt-1 font-display text-xl font-bold text-kInk">{elderly.length}</div></div>
            <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Completed all time</div><div className="mt-1 font-display text-xl font-bold text-kInk">{completedTotal}</div></div>
          </div>
        </SectionCard>

        <div className="grid gap-3">
          <Link to="/volunteer/assignments" className="card-k flex items-center gap-3 p-5 hover:border-kGreen"><CalendarClock className="text-kGreen" /><span className="font-semibold text-kInk">My Assignments</span></Link>
          <Link to="/volunteer/report-concern" className="card-k flex items-center gap-3 p-5 hover:border-kOrange"><AlertTriangle className="text-kOrange" /><span className="font-semibold text-kInk">Report a Concern</span></Link>
        </div>
      </div>
    </div>

    <div className="mt-6 flex items-center gap-1 text-xs text-kMuted"><Clock size={12} /> Hours volunteered aren't tracked in this system yet — see My Impact for what is.</div>
  </VolunteerShell>
}
