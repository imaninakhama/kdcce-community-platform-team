import { useState, useEffect, useCallback } from 'react'
import { Check, Pencil, Home, HandHeart } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import Modal from '../../components/admin/Modal'
import AssignmentWorkflow from '../../components/volunteer/AssignmentWorkflow'
import AssignmentConversation from '../../components/admin/AssignmentConversation'
import AssignmentReview from '../../components/admin/AssignmentReview'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import EmptyState from '../../components/shared/EmptyState'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useVolunteerData } from '../../lib/VolunteerDataContext'
import { apiFetch } from '../../lib/api'

const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' }
function statusTone(s) { if (s === 'Completed') return 'success'; if (s === 'Cancelled') return 'danger'; if (['Started', 'In Progress'].includes(s)) return 'info'; return 'warning' }
function fmtDate(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled yet' }

const HOME_VISIT_WORK_FIELDS = [
  { name: 'observations', label: 'What was done?', placeholder: 'What you observed and did during the visit' },
  { name: 'support_provided', label: 'Outcome', placeholder: 'Support provided / outcome of the visit' },
]
const ASSISTANCE_WORK_FIELDS = [
  { name: 'outcome_notes', label: 'What was done / Outcome', placeholder: 'What happened, how it went', rows: 3 },
]

// One modal shell reused for both assignment types — only the fields
// passed in (workFields/hasChecklist/basePath/assignmentType) differ,
// same as the two separate pages this replaces used underneath.
function UpdateModal({ basePath, assignmentType, workFields, hasChecklist, onClose, onListChanged, showToast }) {
  const [item, setItem] = useState(null)

  // The two resource shapes wrap the record under different keys (visit
  // vs request) — read whichever key is present in the response.
  const load = useCallback(async () => {
    try {
      const res = await apiFetch(basePath)
      setItem(res.visit || res.request)
    } catch (err) { showToast(errorMessage(err)) }
  }, [basePath, showToast])

  useEffect(() => { load() }, [load])

  function refreshed() { load(); onListChanged() }

  if (!item) return <Modal title="Loading…" onClose={onClose}><LoadingState label="assignment" /></Modal>

  return <Modal title={`${item.elderly_member_name} — ${item.elderly_member_code}`} onClose={onClose}>
    <div className="mb-4 rounded-xl bg-kCream p-3 text-sm text-kMuted">{item.reason || item.description}</div>
    <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
      <StatusBadge tone={PRIORITY_TONE[item.priority]}>{item.priority}</StatusBadge>
      <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
      {item.request_type && <span className="text-kMuted">{item.request_type}</span>}
      {item.scheduled_at && <span className="text-kMuted">{fmtDate(item.scheduled_at)}</span>}
    </div>

    <AssignmentWorkflow
      basePath={basePath} assignmentType={assignmentType} status={item.status} startedAt={item.started_at}
      workFields={workFields} hasChecklist={hasChecklist} showToast={showToast} onSaved={refreshed}
    />

    <div className="mt-6 border-t border-kBorderSoft pt-5"><AssignmentReview basePath={basePath} status={item.status} showToast={showToast} /></div>
    <div className="mt-6 border-t border-kBorderSoft pt-5"><AssignmentConversation basePath={basePath} /></div>
  </Modal>
}

function HomeVisitsTab({ showToast }) {
  const { visits, loading, error, reload } = useVolunteerData()
  const [editId, setEditId] = useState(null)

  if (loading) return <LoadingState label="home visits" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return <>
    {visits.length === 0 ? <EmptyState icon={Home} title="No home visits yet" message="Home visits assigned to you will show up here." /> : <div className="grid gap-4">
      {visits.map(v => <div key={v.id} className="card-k p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="font-display text-lg font-bold text-kGreen">{v.elderly_member_name}</span><StatusBadge tone={PRIORITY_TONE[v.priority]}>{v.priority}</StatusBadge></div>
            <p className="mt-1 text-sm text-kMuted">{v.elderly_member_code} &middot; {fmtDate(v.scheduled_at)}</p>
            <p className="mt-3 text-sm text-kInk">{v.reason}</p>
          </div>
          <div className="flex items-center gap-3"><StatusBadge tone={statusTone(v.status)}>{v.status}</StatusBadge><button onClick={() => setEditId(v.id)} className="text-kGreen"><Pencil size={16} /></button></div>
        </div>
      </div>)}
    </div>}

    {editId && <UpdateModal basePath={`/api/home-visits/${editId}`} assignmentType="home_visit" workFields={HOME_VISIT_WORK_FIELDS} hasChecklist onClose={() => setEditId(null)} onListChanged={reload} showToast={showToast} />}
  </>
}

function AssistanceTab({ showToast }) {
  const { requests, loading, error, reload } = useVolunteerData()
  const [editId, setEditId] = useState(null)
  const [acceptingId, setAcceptingId] = useState(null)

  async function accept(req) {
    setAcceptingId(req.id)
    try {
      await apiFetch(`/api/assistance-requests/${req.id}/accept`, { method: 'POST' })
      showToast(`Accepted — ${req.elderly_member_name}`)
      reload()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setAcceptingId(null) }
  }

  if (loading) return <LoadingState label="assistance requests" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  return <>
    {requests.length === 0 ? <EmptyState icon={HandHeart} title="No assistance requests yet" message="Requests assigned to you will show up here." /> : <div className="grid gap-4">
      {requests.map(r => <div key={r.id} className="card-k p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><span className="font-display text-lg font-bold text-kGreen">{r.elderly_member_name}</span><StatusBadge tone={PRIORITY_TONE[r.priority]}>{r.priority}</StatusBadge></div>
            <p className="mt-1 text-sm text-kMuted">{r.request_type} &middot; {r.elderly_member_code}</p>
            <p className="mt-3 text-sm text-kInk">{r.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
            {r.status === 'Assigned'
              ? <button disabled={acceptingId === r.id} onClick={() => accept(r)} className="btn-green disabled:opacity-60"><Check size={15} /> Accept</button>
              : <button onClick={() => setEditId(r.id)} className="text-kGreen"><Pencil size={16} /></button>}
          </div>
        </div>
      </div>)}
    </div>}

    {editId && <UpdateModal basePath={`/api/assistance-requests/${editId}`} assignmentType="assistance_request" workFields={ASSISTANCE_WORK_FIELDS} hasChecklist={false} onClose={() => setEditId(null)} onListChanged={reload} showToast={showToast} />}
  </>
}

export default function MyAssignments({ showToast }) {
  const [tab, setTab] = useState('visits')

  return <VolunteerShell>
    <PageHeader eyebrow="My work" title="My Assignments" subtitle="Home visits and assistance requests assigned to you." />

    <div className="mt-6 inline-flex rounded-xl border border-kBorder bg-kSurface p-1">
      <button onClick={() => setTab('visits')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'visits' ? 'bg-kGreen text-white' : 'text-kMuted hover:text-kInk'}`}><Home size={14} className="mr-1.5 inline" /> Home Visits</button>
      <button onClick={() => setTab('assistance')} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === 'assistance' ? 'bg-kGreen text-white' : 'text-kMuted hover:text-kInk'}`}><HandHeart size={14} className="mr-1.5 inline" /> Assistance Requests</button>
    </div>

    <div className="mt-6">{tab === 'visits' ? <HomeVisitsTab showToast={showToast} /> : <AssistanceTab showToast={showToast} />}</div>
  </VolunteerShell>
}
