import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock, ThumbsUp, Undo2 } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import Modal from '../../components/admin/Modal'
import AssignmentConversation from '../../components/admin/AssignmentConversation'
import AssignmentPhoto from '../../components/admin/AssignmentPhoto'
import HomeVisitSummary from '../../components/volunteer/HomeVisitSummary'
import HomeVisitChecklist from '../../components/volunteer/HomeVisitChecklist'
import PageHeader from '../../components/shared/PageHeader'
import SectionCard from '../../components/shared/SectionCard'
import StatusBadge from '../../components/shared/StatusBadge'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'
import { RETURN_SECTIONS, statusLabel, statusTone } from '../../lib/homeVisitWorkflow'

const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' }

function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—' }

function Field({ label, value }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">{label}</div><div className="mt-1 text-sm leading-6 text-kInk">{value || <span className="text-kMuted">—</span>}</div></div>
}

function ApproveModal({ onClose, onConfirm, busy }) {
  return <Modal title="Approve this submission?" onClose={onClose}>
    <p className="text-sm text-kInk">This marks the home visit as Approved and notifies the volunteer. No comment is required.</p>
    <div className="mt-5 flex gap-3">
      <button onClick={onClose} className="rounded-xl border border-kBorder px-5 py-3 text-sm font-semibold text-kInk hover:bg-kTint">Cancel</button>
      <button onClick={onConfirm} disabled={busy} className="btn-green disabled:opacity-60"><CheckCircle2 size={16} /> {busy ? 'Approving…' : 'Approve Submission'}</button>
    </div>
  </Modal>
}

function ReturnModal({ onClose, onConfirm, busy }) {
  const [reason, setReason] = useState('')
  const [sections, setSections] = useState([])

  function toggleSection(key) {
    setSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key])
  }

  return <Modal title="Return for changes" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); onConfirm(reason, sections) }} className="grid gap-4">
      <label className="text-sm font-semibold">Reason for the volunteer<textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} required className="input-k mt-2" placeholder="e.g. Please add more detail to the health observation and confirm whether follow-up is required." /></label>
      <div>
        <span className="text-sm font-semibold">Sections needing correction (optional)</span>
        <p className="mt-1 text-xs text-kMuted">Leave all unchecked to unlock the whole form for editing.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {RETURN_SECTIONS.map(s => <label key={s.key} className="flex items-center gap-2 text-sm text-kInk"><input type="checkbox" checked={sections.includes(s.key)} onChange={() => toggleSection(s.key)} className="h-4 w-4" />{s.label}</label>)}
        </div>
      </div>
      <button disabled={busy || !reason.trim()} className="mt-2 flex w-fit items-center gap-2 rounded-xl bg-kWarning px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><Undo2 size={16} /> {busy ? 'Returning…' : 'Return for Changes'}</button>
    </form>
  </Modal>
}

export default function HomeVisitReviewScreen({ showToast }) {
  const { id } = useParams()
  const basePath = `/api/home-visits/${id}`
  const [visit, setVisit] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [visitRes, subsRes] = await Promise.all([apiFetch(basePath), apiFetch(`${basePath}/submissions`)])
      setVisit(visitRes.visit)
      setSubmissions(subsRes.submissions)
    } catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [basePath])
  useEffect(() => { load() }, [load])

  async function approve() {
    setBusy(true)
    try { await apiFetch(`${basePath}/approve`, { method: 'POST' }); showToast('Submission approved'); setApproveOpen(false); await load() }
    catch (err) { showToast(errorMessage(err)) } finally { setBusy(false) }
  }
  async function returnForChanges(reason, sections) {
    setBusy(true)
    try { await apiFetch(`${basePath}/return`, { method: 'POST', body: { reason, sections } }); showToast('Returned for changes'); setReturnOpen(false); await load() }
    catch (err) { showToast(errorMessage(err)) } finally { setBusy(false) }
  }

  if (loading) return <Shell><LoadingState label="submission" /></Shell>
  if (error) return <Shell><ErrorState message={error} onRetry={load} /></Shell>

  return <Shell>
    <PageHeader
      eyebrow="Home visit review"
      title={visit.elderly_member_name}
      subtitle={`${visit.elderly_member_code} · Volunteer: ${visit.assigned_to || 'Unassigned'}`}
      actions={<>
        <StatusBadge tone={statusTone(visit.status)}>{statusLabel(visit.status)}</StatusBadge>
        <Link to="/admin/home-visits" className="flex items-center gap-1.5 text-sm font-semibold text-kGreen"><ArrowLeft size={15} /> Back to home visits</Link>
      </>}
    />

    <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="grid gap-6">
        <SectionCard title="Assignment details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Volunteer" value={visit.assigned_to} />
            <Field label="Priority" value={<StatusBadge tone={PRIORITY_TONE[visit.priority]}>{visit.priority}</StatusBadge>} />
            <Field label="Started" value={fmtDateTime(visit.started_at)} />
            <Field label="Submitted" value={fmtDateTime(visit.submitted_at)} />
          </div>
          <div className="mt-4"><Field label="Purpose" value={visit.reason} /></div>
          {visit.instructions && <div className="mt-4"><Field label="Staff instructions" value={visit.instructions} /></div>}
        </SectionCard>

        <SectionCard title="Vitals, wellbeing & visit record"><HomeVisitSummary visit={visit} /></SectionCard>
        <SectionCard title="Checklist"><HomeVisitChecklist basePath={basePath} locked showToast={showToast} /></SectionCard>
        <SectionCard title="Photo"><AssignmentPhoto basePath={basePath} /></SectionCard>

        {submissions.length > 0 && <SectionCard title="Submission history">
          <div className="grid gap-3">
            {submissions.map(s => <div key={s.id} className="rounded-xl border border-kBorderSoft p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-kInk">Submitted {fmtDateTime(s.submitted_at)} by {s.submitted_by}</span>
                {s.decision
                  ? <StatusBadge tone={s.decision === 'Approved' ? 'success' : 'warning'}>{s.decision}</StatusBadge>
                  : <StatusBadge tone="info">Pending decision</StatusBadge>}
              </div>
              {s.decided_at && <p className="mt-1 text-xs text-kMuted">Decided {fmtDateTime(s.decided_at)} by {s.decided_by}</p>}
              {s.return_reason && <p className="mt-2 text-sm text-kInk">{s.return_reason}</p>}
            </div>)}
          </div>
        </SectionCard>}

        <SectionCard title="Conversation with volunteer"><AssignmentConversation basePath={basePath} /></SectionCard>
      </div>

      <div className="grid content-start gap-4">
        {visit.status === 'Under Review' ? <div className="card-k p-5">
          <h3 className="font-display text-base font-bold text-kInk">Review decision</h3>
          <p className="mt-1 text-sm text-kMuted">Approve this submission, or send it back with a reason.</p>
          <div className="mt-4 grid gap-2">
            <button onClick={() => setApproveOpen(true)} className="btn-green"><ThumbsUp size={16} /> Approve Submission</button>
            <button onClick={() => setReturnOpen(true)} className="flex items-center justify-center gap-2 rounded-xl border border-kWarning px-5 py-3 text-sm font-bold text-kWarning hover:bg-kWarning/10"><Undo2 size={16} /> Return for Changes</button>
          </div>
        </div> : visit.status === 'Completed' ? <div className="card-k border-l-4 border-l-kSuccess bg-kSuccess/10 p-5 text-sm text-kInk">
          <div className="flex items-center gap-2 font-bold text-kSuccess"><CheckCircle2 size={16} /> Approved</div>
          <p className="mt-2">Reviewed {fmtDateTime(visit.reviewed_at)} by {visit.reviewed_by}.</p>
        </div> : <div className="card-k p-5 text-sm text-kMuted"><Clock size={16} className="mb-2" /> Nothing to review yet — this visit hasn't been submitted.</div>}
      </div>
    </div>

    {approveOpen && <ApproveModal onClose={() => setApproveOpen(false)} onConfirm={approve} busy={busy} />}
    {returnOpen && <ReturnModal onClose={() => setReturnOpen(false)} onConfirm={returnForChanges} busy={busy} />}
  </Shell>
}
