import { CheckCircle2, Clock, Home, HeartHandshake, ListChecks, Lock, TrendingUp, Users } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import PageHeader from '../../components/shared/PageHeader'
import KpiCard from '../../components/shared/KpiCard'
import SectionCard from '../../components/shared/SectionCard'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'

function fmtDay(iso) { return new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) }

// Milestone thresholds are just a presentation of real, already-computed
// counts — not a new tracked value — so crossing one is nothing the
// backend needs to know about.
const MILESTONES = [
  { at: 1, label: 'First assignment completed' },
  { at: 5, label: '5 assignments completed' },
  { at: 10, label: '10 assignments completed' },
  { at: 25, label: '25 assignments completed' },
  { at: 50, label: '50 assignments completed' },
]

export default function MyImpact() {
  // Shared across the portal (see VolunteerDataContext) — computed from
  // the same already-scoped data every other portal page uses, nothing
  // fabricated or estimated.
  const { visits, requests, followups, loading, error, reload } = useVolunteerData()

  if (loading) return <VolunteerShell><LoadingState label="impact" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={reload} /></VolunteerShell>

  const completedVisits = visits.filter(x => x.status === 'Completed')
  const completedRequests = requests.filter(x => x.status === 'Completed')
  const completedFollowups = followups.filter(x => x.status === 'Completed')
  const allAssignments = [...visits, ...requests]
  const completed = completedVisits.length + completedRequests.length
  const cancelled = allAssignments.filter(x => x.status === 'Cancelled').length
  const pending = allAssignments.length - completed - cancelled
  const decided = completed + cancelled
  const completionRate = decided > 0 ? Math.round((completed / decided) * 100) : null
  const peopleSupported = new Set([...completedVisits, ...completedRequests].map(x => x.elderly_member_id)).size

  const entries = [
    ...completedVisits.map(x => ({ date: x.completed_at, label: `Home visit — ${x.elderly_member_name}` })),
    ...completedRequests.map(x => ({ date: x.completed_at, label: `${x.request_type} — ${x.elderly_member_name}` })),
    ...completedFollowups.map(x => ({ date: x.completed_at, label: `Follow-up completed — ${x.elderly_member_name}` })),
  ].filter(x => x.date).sort((a, b) => new Date(b.date) - new Date(a.date))

  const byDay = {}
  for (const e of entries) { const day = fmtDay(e.date); byDay[day] = byDay[day] || []; byDay[day].push(e) }

  return <VolunteerShell>
    <PageHeader eyebrow="Private to you" title="My Impact" subtitle="Your contribution so far — visible only to you." />

    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard icon={Clock} label="Hours volunteered" value="Not tracked yet" sub="This system doesn't record duration/time-on-task" tone="neutral" />
      <KpiCard icon={Home} label="Visits completed" value={completedVisits.length.toLocaleString()} tone="primary" />
      <KpiCard icon={Users} label="People supported" value={peopleSupported.toLocaleString()} sub="Distinct elderly members" tone="primary" />
      <KpiCard icon={TrendingUp} label="Completion rate" value={completionRate === null ? '—' : `${completionRate}%`} sub={`${pending} pending`} tone="success" />
    </div>

    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <KpiCard icon={HeartHandshake} label="Assistance requests completed" value={completedRequests.length.toLocaleString()} tone="neutral" />
      <KpiCard icon={ListChecks} label="Follow-ups completed" value={completedFollowups.length.toLocaleString()} tone="neutral" />
      <KpiCard icon={CheckCircle2} label="Total completed" value={completed.toLocaleString()} tone="neutral" />
    </div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
      <SectionCard title="Milestones">
        <div className="grid gap-2">
          {MILESTONES.map(m => {
            const earned = completed >= m.at
            return <div key={m.at} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${earned ? 'border-kSuccess/30 bg-kSuccess/5' : 'border-kBorderSoft'}`}>
              {earned ? <CheckCircle2 size={18} className="shrink-0 text-kSuccess" /> : <Lock size={16} className="shrink-0 text-kMuted" />}
              <span className={`text-sm font-semibold ${earned ? 'text-kInk' : 'text-kMuted'}`}>{m.label}</span>
            </div>
          })}
        </div>
      </SectionCard>

      <SectionCard title="Activity history">
        {Object.keys(byDay).length === 0 ? <EmptyState icon={Clock} title="No completed work yet" message="It'll show up here once you finish your first assignment." /> : <div className="grid gap-6">
          {Object.entries(byDay).map(([day, items]) => <div key={day}>
            <h3 className="text-xs font-bold uppercase tracking-wide text-kMuted">{day}</h3>
            <div className="mt-2 grid gap-2">
              {items.map((e, i) => <div key={i} className="flex items-center gap-3 rounded-xl border border-kBorderSoft px-4 py-3"><CheckCircle2 size={16} className="shrink-0 text-kSuccess" /><span className="text-sm text-kInk">{e.label}</span></div>)}
            </div>
          </div>)}
        </div>}
      </SectionCard>
    </div>

    <p className="mt-6 text-xs text-kMuted">This is your own record only — no other volunteer's impact is visible here.</p>
  </VolunteerShell>
}
