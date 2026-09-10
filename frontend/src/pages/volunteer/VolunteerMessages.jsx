import { useState, useEffect } from 'react'
import { ArrowLeft, MessageSquare, Home, HandHeart } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import AssignmentConversation from '../../components/admin/AssignmentConversation'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'

const icons = { Home, HandHeart }

// Reuses the existing per-assignment AssignmentMessage thread (see
// AssignmentConversation) — this page is just an index into the
// conversations a volunteer already has, not a new messaging system.
// Authorization is unchanged: each thread is still scoped exactly like the
// assignment it belongs to, so Volunteer A can never open Volunteer B's
// thread — there is nothing here beyond what the shared portal data
// (already identity-scoped) already returns.
export default function VolunteerMessages() {
  const { visits, requests, loading, error, reload } = useVolunteerData()
  const [selected, setSelected] = useState(null)

  const assignments = [
    ...visits.map(x => ({ kind: 'Home Visit', icon: 'Home', basePath: `/api/home-visits/${x.id}`, name: x.elderly_member_name, status: x.status })),
    ...requests.map(x => ({ kind: 'Assistance Request', icon: 'HandHeart', basePath: `/api/assistance-requests/${x.id}`, name: x.elderly_member_name, status: x.status })),
  ]

  // Default to the first conversation on desktop once the list has
  // loaded, so the two-column layout never shows an empty right pane
  // when threads exist — mobile still starts on the list (selected stays
  // null until tapped) via the responsive classes below.
  useEffect(() => { if (!selected && assignments.length > 0 && window.innerWidth >= 1024) setSelected(assignments[0]) }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <VolunteerShell><LoadingState label="messages" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={reload} /></VolunteerShell>

  return <VolunteerShell>
    <PageHeader eyebrow="Communication" title="Messages" subtitle="A private conversation with admin/staff for each of your assignments." />

    {assignments.length === 0 ? <div className="mt-7"><EmptyState icon={MessageSquare} title="No conversations yet" message="Conversations appear here once you have an assignment." /></div> : <div className="mt-7 grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
      <div className={`card-k overflow-hidden lg:block ${selected ? 'hidden' : 'block'}`}>
        <div className="max-h-[70vh] overflow-y-auto">
          {assignments.map(a => { const Icon = icons[a.icon]; const active = selected?.basePath === a.basePath; return <button key={a.basePath} onClick={() => setSelected(a)} className={`flex w-full items-center gap-3 border-b border-kBorderSoft p-4 text-left last:border-0 ${active ? 'bg-kGreen/5' : 'hover:bg-kTint/40'}`}>
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? 'bg-kGreen text-white' : 'bg-kTint text-kGreen'}`}><Icon size={17} /></div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-kInk">{a.name}</div><div className="text-xs text-kMuted">{a.kind}</div></div>
            <StatusBadge tone={a.status === 'Completed' ? 'success' : 'neutral'}>{a.status}</StatusBadge>
          </button> })}
        </div>
      </div>

      <div className={`card-k p-6 lg:block ${selected ? 'block' : 'hidden'}`}>
        {selected ? <>
          <button onClick={() => setSelected(null)} className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-kGreen lg:hidden"><ArrowLeft size={15} /> Back to conversations</button>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><div className="font-display text-lg font-bold text-kInk">{selected.name}</div><div className="text-xs text-kMuted">{selected.kind}</div></div>
            <StatusBadge tone={selected.status === 'Completed' ? 'success' : 'neutral'}>{selected.status}</StatusBadge>
          </div>
          <AssignmentConversation basePath={selected.basePath} />
        </> : <div className="grid h-full place-items-center py-20 text-center text-sm text-kMuted"><div><MessageSquare className="mx-auto mb-3 text-kMuted" size={28} /> Select a conversation to view messages.</div></div>}
      </div>
    </div>}
  </VolunteerShell>
}
