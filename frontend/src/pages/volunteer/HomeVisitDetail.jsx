import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Clock, ListChecks, MessageSquare, ShieldCheck, Users,
} from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import Modal from '../../components/admin/Modal'
import AssignmentConversation from '../../components/admin/AssignmentConversation'
import HomeVisitWorkForm from '../../components/volunteer/HomeVisitWorkForm'
import HomeVisitSummary from '../../components/volunteer/HomeVisitSummary'
import HomeVisitChecklist from '../../components/volunteer/HomeVisitChecklist'
import PageHeader from '../../components/shared/PageHeader'
import SectionCard from '../../components/shared/SectionCard'
import StatusBadge from '../../components/shared/StatusBadge'
import Chip from '../../components/shared/Chip'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'
import { RETURN_SECTIONS, isInProgressStatus, statusLabel, statusTone, unlockedFieldKeys } from '../../lib/homeVisitWorkflow'

const PRIORITY_TONE = { Low: 'neutral', Medium: 'info', High: 'warning', Urgent: 'danger' }

function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled yet' }

function Field({ label, value }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">{label}</div><div className="mt-1 text-sm leading-6 text-kInk">{value || <span className="text-kMuted">Not provided</span>}</div></div>
}

function Stat({ label, value }) {
  return <div className="rounded-xl bg-kBorderSoft p-3.5"><div className="text-xs text-kMuted">{label}</div><div className="mt-1 text-sm font-bold text-kInk">{value}</div></div>
}

function ConversationSection({ basePath }) {
  return <div id="conversation"><SectionCard title="Conversation with staff"><AssignmentConversation basePath={basePath} /></SectionCard></div>
}

// ---------- Stage 1: ASSIGNED ----------
function AssignedStage({ visit, onAccept, busy }) {
  return <div className="mt-6 grid gap-6">
    <SectionCard title="Assignment details">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Elderly member" value={`${visit.elderly_member_name} · ${visit.elderly_member_code}`} />
        <Field label="Assignment type" value="Home Visit" />
        <Field label="Priority" value={<StatusBadge tone={PRIORITY_TONE[visit.priority]}>{visit.priority}</StatusBadge>} />
        <Field label="Scheduled / preferred date & time" value={fmtDateTime(visit.scheduled_at)} />
        <Field label="Location" value={visit.elderly_member_location} />
        <Field label="Assigned by" value={visit.requested_by} />
      </div>
      <div className="mt-4"><Field label="Purpose" value={visit.reason} /></div>
      <div className="mt-4"><Field label="Staff instructions" value={visit.instructions} /></div>
    </SectionCard>
    <div className="flex flex-wrap gap-3">
      <button onClick={onAccept} disabled={busy} className="btn-green disabled:opacity-60">{busy ? 'Accepting…' : 'Accept Assignment'}</button>
      <a href="#conversation" className="flex items-center gap-2 rounded-xl border border-kBorder px-5 py-3 text-sm font-semibold text-kInk hover:bg-kTint"><MessageSquare size={16} /> Message Coordinator</a>
    </div>
  </div>
}

// ---------- Stage 2: ACCEPTED ----------
function AcceptedStage({ visit, basePath, onStart, busy, showToast }) {
  return <div className="mt-6 grid gap-6">
    <div className="flex items-center gap-2 rounded-xl border-l-4 border-l-kSuccess bg-kSuccess/10 px-4 py-3 text-sm font-semibold text-kSuccess"><CheckCircle2 size={16} /> Assignment accepted</div>
    <SectionCard title="Visit summary">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Member" value={`${visit.elderly_member_name} · ${visit.elderly_member_code}`} />
        <Field label="Date & time" value={fmtDateTime(visit.scheduled_at)} />
      </div>
      <div className="mt-4"><Field label="Visit objective" value={visit.reason} /></div>
      <div className="mt-4"><Field label="Staff instructions" value={visit.instructions} /></div>
    </SectionCard>
    <SectionCard title="Preparation checklist"><HomeVisitChecklist basePath={basePath} locked={false} showToast={showToast} /></SectionCard>
    <div className="flex items-start gap-2 rounded-xl border-l-4 border-l-kDanger bg-kDanger/10 px-4 py-3 text-sm text-kInk">
      <ShieldCheck size={16} className="mt-0.5 shrink-0 text-kDanger" />
      <span><b>Safety reminder:</b> confirm your identity on arrival, respect the member's privacy and preferences, and use Report a Concern immediately if anything feels unsafe.</span>
    </div>
    <button onClick={onStart} disabled={busy} className="btn-green w-fit disabled:opacity-60">{busy ? 'Starting…' : 'Start Assignment'}</button>
  </div>
}

// ---------- Stage 3: IN PROGRESS (also reused, unlocked, for RETURNED) ----------
function WorkStage({ visit, basePath, onSaved, onReview, unlockedKeys, saveRef, showToast, checklistLocked }) {
  return <div className="mt-6 grid gap-6">
    <SectionCard title="Visit form"><HomeVisitWorkForm basePath={basePath} visit={visit} onSaved={onSaved} unlockedKeys={unlockedKeys} saveRef={saveRef} showToast={showToast} /></SectionCard>
    <SectionCard title="Home visit checklist"><HomeVisitChecklist basePath={basePath} locked={!!checklistLocked} showToast={showToast} /></SectionCard>
    <Link to="/volunteer/report-concern" className="card-k flex items-center gap-2 p-4 text-sm font-semibold text-kDanger hover:border-kDanger"><AlertTriangle size={16} /> Report a Concern</Link>
    <div className="flex justify-end"><button onClick={onReview} className="btn-green">Review Submission</button></div>
  </div>
}

// ---------- Stage 4: REVIEW SUBMISSION (preview, client-side only) ----------
function ReviewSubmissionStage({ visit, onBack, onSubmit, busy }) {
  const [confirmed, setConfirmed] = useState(false)
  return <div className="mt-6 grid gap-6">
    <div className="card-k border-l-4 border-l-kWarning bg-kWarning/10 p-5">
      <div className="flex items-center gap-2 font-display text-base font-bold text-kWarning"><AlertTriangle size={18} /> Please review carefully</div>
      <p className="mt-2 text-sm text-kInk">Please review all information carefully. Once submitted, you cannot edit this assignment unless KDCCE staff returns it for changes.</p>
    </div>
    <SectionCard title="Submission preview"><HomeVisitSummary visit={visit} /></SectionCard>
    <label className="flex items-center gap-2 text-sm font-semibold text-kInk">
      <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="h-5 w-5" />
      I confirm this information is accurate and ready for staff review.
    </label>
    <div className="flex gap-3">
      <button onClick={onBack} className="rounded-xl border border-kBorder px-5 py-3 text-sm font-semibold text-kInk hover:bg-kTint">Back &amp; Edit</button>
      <button onClick={onSubmit} disabled={!confirmed || busy} className="btn-green disabled:opacity-50">{busy ? 'Submitting…' : 'Submit for Review'}</button>
    </div>
  </div>
}

// ---------- Stage 5: UNDER REVIEW ----------
function UnderReviewStage({ visit, basePath }) {
  return <div className="mt-6 grid gap-6">
    <div className="card-k border-l-4 border-l-kGreen bg-kGreen/5 p-5">
      <p className="text-sm text-kInk">Your work has been submitted for review. KDCCE staff will review it and notify you when a decision is made.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Submitted" value={fmtDateTime(visit.submitted_at)} />
      <Stat label="Member" value={visit.elderly_member_name} />
      <Stat label="Assignment" value="Home Visit" />
    </div>
    <SectionCard title="Submitted record"><HomeVisitSummary visit={visit} /></SectionCard>
    <ConversationSection basePath={basePath} />
  </div>
}

// ---------- Stage 6: RETURNED FOR CHANGES ----------
function ReturnedStage({ visit, basePath, onSaved, onReview, showToast }) {
  const saveRef = useRef(null)
  const unlocked = unlockedFieldKeys(visit.return_sections)
  const checklistLocked = visit.return_sections?.length > 0 && !visit.return_sections.includes('checklist')

  async function saveDraft() {
    if (saveRef.current) { await saveRef.current(); showToast('Draft saved') }
  }

  return <div className="mt-6 grid gap-6">
    <div className="card-k border-l-4 border-l-kWarning bg-kWarning/10 p-5">
      <div className="flex items-center gap-2 font-display text-base font-bold text-kWarning"><AlertTriangle size={18} /> Changes requested by KDCCE staff</div>
      <p className="mt-2 text-sm text-kInk">{visit.return_reason}</p>
      <p className="mt-2 text-xs text-kMuted">Returned {fmtDateTime(visit.returned_at)}</p>
      {visit.return_sections?.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{visit.return_sections.map(s => <Chip key={s} tone="accent">{RETURN_SECTIONS.find(r => r.key === s)?.label || s}</Chip>)}</div>}
    </div>
    <SectionCard title="Update your visit record"><HomeVisitWorkForm basePath={basePath} visit={visit} onSaved={onSaved} unlockedKeys={unlocked} saveRef={saveRef} showToast={showToast} /></SectionCard>
    <SectionCard title="Home visit checklist"><HomeVisitChecklist basePath={basePath} locked={checklistLocked} showToast={showToast} /></SectionCard>
    <div className="flex flex-wrap justify-end gap-3">
      <button onClick={saveDraft} className="rounded-xl border border-kBorder px-5 py-3 text-sm font-semibold text-kInk hover:bg-kTint">Save Draft</button>
      <button onClick={onReview} className="btn-green">Review Changes</button>
    </div>
  </div>
}

// ---------- Stage 7: APPROVED ----------
function ApprovedStage({ visit }) {
  return <div className="mt-6 grid gap-6">
    <div className="card-k border-l-4 border-l-kSuccess bg-kSuccess/10 p-6 text-center">
      <CheckCircle2 className="mx-auto text-kSuccess" size={36} />
      <h2 className="mt-3 font-display text-xl font-bold text-kSuccess">Approved</h2>
      <p className="mt-2 text-sm text-kMuted">This home visit has been reviewed and approved by KDCCE staff.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Completed" value={fmtDateTime(visit.completed_at)} />
      <Stat label="Reviewed" value={fmtDateTime(visit.reviewed_at)} />
      <Stat label="Reviewer" value={visit.reviewed_by || '—'} />
    </div>
    <SectionCard title="Impact summary">
      <div className="grid gap-2 text-sm text-kInk">
        <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-kSuccess" /> 1 home visit completed</div>
        <div className="flex items-center gap-2"><Users size={16} className="text-kSuccess" /> 1 elderly member supported</div>
        {visit.follow_up_required && <div className="flex items-center gap-2"><ListChecks size={16} className="text-kWarning" /> Follow-up created for continued care</div>}
      </div>
    </SectionCard>
    <SectionCard title="Final record"><HomeVisitSummary visit={visit} /></SectionCard>
  </div>
}

export default function HomeVisitDetail({ showToast }) {
  const { id } = useParams()
  const basePath = `/api/home-visits/${id}`
  const [visit, setVisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('edit')
  const [busy, setBusy] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setVisit((await apiFetch(basePath)).visit) }
    catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [basePath])
  useEffect(() => { load() }, [load])

  async function accept() {
    setBusy(true)
    try { await apiFetch(`${basePath}/accept`, { method: 'POST' }); showToast('Assignment accepted'); await load() }
    catch (err) { showToast(errorMessage(err)) } finally { setBusy(false) }
  }
  async function start() {
    setBusy(true)
    try { await apiFetch(basePath, { method: 'PATCH', body: { status: 'In Progress' } }); showToast('Assignment started'); await load() }
    catch (err) { showToast(errorMessage(err)) } finally { setBusy(false) }
  }
  async function doSubmit() {
    setBusy(true)
    try { await apiFetch(`${basePath}/submit`, { method: 'POST' }); showToast('Submitted for review'); setMode('edit'); setConfirmSubmit(false); await load() }
    catch (err) { showToast(errorMessage(err)) } finally { setBusy(false) }
  }

  if (loading) return <VolunteerShell><LoadingState label="assignment" /></VolunteerShell>
  if (error) return <VolunteerShell><ErrorState message={error} onRetry={load} /></VolunteerShell>

  const editable = isInProgressStatus(visit.status) || visit.status === 'Returned for Changes'

  return <VolunteerShell>
    <PageHeader
      eyebrow="Home visit"
      title={visit.elderly_member_name}
      subtitle={visit.elderly_member_code}
      actions={<>
        <StatusBadge tone={statusTone(visit.status)}>{statusLabel(visit.status)}</StatusBadge>
        <Link to="/volunteer/assignments" className="flex items-center gap-1.5 text-sm font-semibold text-kGreen"><ArrowLeft size={15} /> Back to assignments</Link>
      </>}
    />

    {visit.status === 'Assigned' && <AssignedStage visit={visit} onAccept={accept} busy={busy} />}
    {visit.status === 'Accepted' && <AcceptedStage visit={visit} basePath={basePath} onStart={start} busy={busy} showToast={showToast} />}

    {editable && mode === 'edit' && (
      visit.status === 'Returned for Changes'
        ? <ReturnedStage visit={visit} basePath={basePath} onSaved={setVisit} onReview={() => setMode('preview')} showToast={showToast} />
        : <WorkStage visit={visit} basePath={basePath} onSaved={setVisit} onReview={() => setMode('preview')} showToast={showToast} />
    )}
    {editable && mode === 'preview' && <ReviewSubmissionStage visit={visit} onBack={() => setMode('edit')} onSubmit={() => setConfirmSubmit(true)} busy={busy} />}

    {visit.status === 'Under Review' && <UnderReviewStage visit={visit} basePath={basePath} />}
    {visit.status === 'Completed' && <ApprovedStage visit={visit} />}
    {visit.status === 'Cancelled' && <div className="card-k mt-6 p-6 text-center text-sm text-kMuted">This assignment was cancelled.</div>}

    {visit.status !== 'Under Review' && visit.status !== 'Completed' && <div className="mt-6"><ConversationSection basePath={basePath} /></div>}

    {confirmSubmit && <Modal title="Submit for review?" onClose={() => setConfirmSubmit(false)}>
      <p className="text-sm text-kInk">Once submitted, you won't be able to edit this assignment unless KDCCE staff returns it for changes. Submit now?</p>
      <div className="mt-5 flex gap-3">
        <button onClick={() => setConfirmSubmit(false)} className="rounded-xl border border-kBorder px-5 py-3 text-sm font-semibold text-kInk hover:bg-kTint">Cancel</button>
        <button onClick={doSubmit} disabled={busy} className="btn-green disabled:opacity-60"><Clock size={15} /> {busy ? 'Submitting…' : 'Confirm & Submit'}</button>
      </div>
    </Modal>}
  </VolunteerShell>
}
