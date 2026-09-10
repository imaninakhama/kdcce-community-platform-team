import { useEffect, useRef, useState, useCallback } from 'react'
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import {
  AlertCircle, AlertTriangle, Boxes, CalendarClock, CheckCircle2, ClipboardCheck, Heart, HeartHandshake,
  Home as HomeIcon, ListChecks, Plus, ShieldAlert, Sparkles, Trash2, TrendingUp, UserRound, Utensils,
} from 'lucide-react'
import Modal from '../components/admin/Modal'
import Toast from '../components/admin/Toast'
import Shell from '../components/admin/Shell'
import PageHeader from '../components/shared/PageHeader'
import KpiCard from '../components/shared/KpiCard'
import StatusBadge from '../components/shared/StatusBadge'
import EmptyState from '../components/shared/EmptyState'
import SectionCard from '../components/shared/SectionCard'
import Row from '../components/shared/Row'
import TrendBarChart from '../components/shared/TrendBarChart'
import { useToast, errorMessage, LoadingState, ErrorState } from '../components/admin/adminHelpers'
import { useApiResource } from '../lib/useApiResource'
import { apiFetch, clearSession, getStoredUser, getToken, uploadFile } from '../lib/api'
import ElderlyManager from './admin/ElderlyManager'
import ElderlyProfile from './admin/ElderlyProfile'
import FollowUpsManager from './admin/FollowUpsManager'
import AssignmentCalendar from './admin/AssignmentCalendar'
import AttendanceManager from './admin/AttendanceManager'
import HealthManager from './admin/HealthManager'
import MedicationManager from './admin/MedicationManager'
import VolunteerManager from './admin/VolunteerManager'
import HomeVisitManager from './admin/HomeVisitManager'
import DonationsManager from './admin/DonationsManager'
import FeedingManager from './admin/FeedingManager'
import InventoryManager from './admin/InventoryManager'
import ActivityManager from './admin/ActivityManager'
import AssistanceManager from './admin/AssistanceManager'
import IncidentManager from './admin/IncidentManager'
import AnalyticsManager from './admin/AnalyticsManager'
import ImpactReports from './admin/ImpactReports'
import InboxManager from './admin/InboxManager'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// The one figure the dashboard leads with — deliberately heavier than
// the KpiCards next to it (filled kGreen/blue background, bigger number)
// so it reads as the headline, not just one more tile in the grid.
function TotalDonationsCard({ amount, donorCount }) {
  return <div className="rounded-2xl bg-kGreen p-5 text-white shadow-soft dark:shadow-none">
    <div className="flex items-center gap-2 text-sm text-white/75"><Heart size={15} className="fill-current" /> Confirmed donations (this month)</div>
    <div className="mt-2 font-display text-4xl font-bold">KES {amount.toLocaleString()}</div>
    <div className="mt-2 text-xs font-semibold text-kLime">{donorCount} confirmed {donorCount === 1 ? 'donor' : 'donors'}</div>
  </div>
}

function fmtDateTime(iso) { return iso ? new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—' }
function isThisMonth(iso) { const d = new Date(iso), n = new Date(); return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() }

// Every figure here comes straight from GET /api/analytics/dashboard
// (already aggregated server-side, see app/analytics/routes.py) plus the
// donations list this route already fetches — no new endpoints, no
// client-side guessing at numbers the backend doesn't provide.
function Overview({ donations }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const user = getStoredUser()

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData((await apiFetch('/api/analytics/dashboard')).dashboard) }
    catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  // Only a confirmed-successful payment counts toward a money total —
  // Pending (still waiting on the M-Pesa callback) and Failed
  // (declined/cancelled/timed out) are real rows that must never be
  // summed in as received money — same rule as DonationsManager and the
  // server-side cash_total in app/reports/routes.py.
  const paidCashThisMonth = donations.filter(d => d.donation_type === 'Cash' && d.status === 'Paid' && isThisMonth(d.created_at))
  const totalThisMonth = paidCashThisMonth.reduce((s, d) => s + Number(d.amount), 0)
  const recentDonations = [...donations].sort((a, b) => b.id - a.id).slice(0, 4)

  const firstName = user?.name?.split(' ')[0]

  return <Shell>
    <PageHeader
      eyebrow="Executive overview"
      title={`Good morning${firstName ? `, ${firstName}` : ''}.`}
      subtitle="Here's how KDCCE is doing today."
      actions={<>
        <Link to="/admin/impact" className="btn-green"><TrendingUp size={16} /> Impact &amp; Reports</Link>
        <Link to="/admin/donations" className="btn-orange"><Plus size={16} /> Add donation</Link>
      </>}
    />

    {loading ? <LoadingState label="dashboard" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TotalDonationsCard amount={totalThisMonth} donorCount={paidCashThisMonth.length} />
        <KpiCard icon={UserRound} label="Elderly members supported" value={data.elderly_care.total_elderly_members.toLocaleString()} sub={`${data.elderly_care.new_registrations_30d} new in 30 days`} tone="primary" />
        <KpiCard icon={HeartHandshake} label="Active volunteers" value={data.home_community.active_volunteers.toLocaleString()} sub={`${data.volunteer_performance.completion_rate}% assignment completion`} tone="primary" />
        <KpiCard icon={ShieldAlert} label="Open incidents" value={data.incidents.open.toLocaleString()} sub={data.incidents.critical_open > 0 ? `${data.incidents.critical_open} critical` : 'None critical'} tone={data.incidents.open > 0 ? 'danger' : 'success'} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ClipboardCheck} label="Today's attendance" value={data.elderly_care.today_attendance.toLocaleString()} tone="success" />
        <KpiCard icon={ListChecks} label="Pending follow-ups" value={data.follow_ups.pending.toLocaleString()} sub={data.follow_ups.overdue > 0 ? `${data.follow_ups.overdue} overdue` : 'None overdue'} tone={data.follow_ups.overdue > 0 ? 'danger' : 'warning'} />
        <KpiCard icon={Utensils} label="Meals served (7d)" value={data.feeding_resources.meals_served_7d.toLocaleString()} tone="neutral" />
        <KpiCard icon={Boxes} label="Low stock items" value={data.feeding_resources.low_stock_items.toLocaleString()} tone={data.feeding_resources.low_stock_items > 0 ? 'warning' : 'success'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="grid gap-6">
          <SectionCard title="Needs attention">
            {(() => {
              const items = [
                data.incidents.critical_open > 0 && { icon: AlertCircle, tone: 'danger', title: `${data.incidents.critical_open} critical incident${data.incidents.critical_open > 1 ? 's' : ''} open`, subtitle: 'Immediate review required', to: '/admin/incidents' },
                data.incidents.open > data.incidents.critical_open && { icon: ShieldAlert, tone: 'warning', title: `${data.incidents.open - data.incidents.critical_open} other open incident${(data.incidents.open - data.incidents.critical_open) > 1 ? 's' : ''}`, subtitle: 'Needs follow-up', to: '/admin/incidents' },
                data.follow_ups.overdue > 0 && { icon: ListChecks, tone: 'danger', title: `${data.follow_ups.overdue} overdue follow-up${data.follow_ups.overdue > 1 ? 's' : ''}`, subtitle: 'Past their due date', to: '/admin/followups' },
                data.feeding_resources.low_stock_items > 0 && { icon: Boxes, tone: 'warning', title: `${data.feeding_resources.low_stock_items} item${data.feeding_resources.low_stock_items > 1 ? 's' : ''} at or below minimum stock`, subtitle: 'Restock soon', to: '/admin/inventory' },
                data.home_community.home_visits_pending > 0 && { icon: HomeIcon, tone: 'warning', title: `${data.home_community.home_visits_pending} home visit${data.home_community.home_visits_pending > 1 ? 's' : ''} awaiting assignment`, subtitle: 'Not yet assigned to a volunteer', to: '/admin/home-visits' },
              ].filter(Boolean)
              if (items.length === 0) return <EmptyState icon={CheckCircle2} tone="success" title="All caught up" message="Nothing needs attention right now." />
              return items.map(item => <Link key={item.title} to={item.to} className="block hover:bg-kTint/40 -mx-2 rounded-lg px-2"><Row icon={item.icon} tone={item.tone} title={item.title} subtitle={item.subtitle} right={<StatusBadge tone={item.tone}>Review</StatusBadge>} /></Link>)
            })()}
          </SectionCard>

          <SectionCard title="Recent activity">
            {(() => {
              const entries = [
                ...data.today_activity.attendance.map(a => ({ icon: ClipboardCheck, tone: 'success', title: a.elderly_member_name, subtitle: `Checked in ${fmtDateTime(a.check_in_at)}` })),
                ...data.today_activity.home_visits.map(v => ({ icon: HomeIcon, tone: 'primary', title: v.elderly_member_name, subtitle: `Home visit — ${v.status}` })),
                ...data.today_activity.assistance_requests.map(r => ({ icon: HeartHandshake, tone: 'primary', title: r.elderly_member_name, subtitle: `Assistance request — ${r.status}` })),
                ...data.today_activity.health_observations.map(h => ({ icon: AlertTriangle, tone: 'neutral', title: h.elderly_member_name, subtitle: `Health observation — ${h.wellbeing || 'recorded'}` })),
              ]
              if (entries.length === 0) return <p className="text-sm text-kMuted">No activity recorded yet today.</p>
              return entries.slice(0, 8).map((e, i) => <Row key={i} {...e} />)
            })()}
          </SectionCard>

          <SectionCard title="Upcoming work" action={<Link to="/admin/calendar" className="text-sm font-semibold text-kGreen">View calendar</Link>}>
            {(() => {
              const items = [
                ...data.upcoming_visits.upcoming.map(v => ({ icon: HomeIcon, tone: 'primary', title: v.elderly_member_name, subtitle: `Home visit · ${v.assigned_to || 'Unassigned'}`, when: v.scheduled_at })),
                ...data.activities.upcoming.map(a => ({ icon: CalendarClock, tone: 'accent', title: a.title, subtitle: a.activity_type, when: a.scheduled_at })),
              ].sort((a, b) => new Date(a.when) - new Date(b.when))
              if (items.length === 0) return <p className="text-sm text-kMuted">Nothing scheduled yet.</p>
              return items.slice(0, 6).map((e, i) => <Row key={i} icon={e.icon} tone={e.tone} title={e.title} subtitle={e.subtitle} right={<span className="shrink-0 text-xs text-kMuted">{fmtDateTime(e.when)}</span>} />)
            })()}
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Program activity" action={<Link to="/admin/analytics" className="text-sm font-semibold text-kGreen">Full analytics</Link>}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Activities (30d)</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.activities.attended_30d}</div></div>
              <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Medication (7d)</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.health.medication_administrations_7d}</div></div>
              <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Health checks (30d)</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.health.health_checks_30d}</div></div>
              <div className="rounded-xl bg-kBorderSoft p-4"><div className="text-xs text-kMuted">Inventory moves (7d)</div><div className="mt-1 font-display text-xl font-bold text-kInk">{data.feeding_resources.inventory_movements_7d}</div></div>
            </div>
          </SectionCard>

          <SectionCard title="Donations & impact" action={<Link to="/admin/donations" className="text-sm font-semibold text-kGreen">View all</Link>}>
            <div className="flex items-center gap-3 rounded-xl bg-kBorderSoft p-4"><Sparkles size={18} className="shrink-0 text-kOrange" /><p className="text-sm text-kInk">{data.feeding_resources.donations_30d} donation{data.feeding_resources.donations_30d === 1 ? '' : 's'} logged in the last 30 days.</p></div>
            <div className="mt-5">
              <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Donations — last 14 days</div>
              <div className="mt-3"><TrendBarChart data={data.feeding_resources.donations_trend_14d} valueLabel="donations" /></div>
            </div>
            <div className="mt-5 grid gap-2">
              {recentDonations.map(r => <div key={r.id} className="flex items-center justify-between gap-3 border-b border-kBorderSoft py-2.5 text-sm last:border-0">
                <div className="min-w-0"><div className="truncate font-semibold text-kInk">{r.donor_name}</div><div className="text-xs text-kMuted">{r.created_at.slice(0, 10)}</div></div>
                <StatusBadge tone={r.status === 'Paid' || r.status === 'Received' ? 'success' : r.status === 'Failed' ? 'danger' : 'warning'}>{r.status}</StatusBadge>
              </div>)}
              {recentDonations.length === 0 && <p className="text-sm text-kMuted">No donations logged yet.</p>}
            </div>
          </SectionCard>
        </div>
      </div>
    </>}
  </Shell>
}

function GalleryManager({ images, loading, error, reload, deleteImage, showToast }) {
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  async function save(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { showToast('Choose a photo first'); return }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) { showToast('Please choose a JPEG, PNG, or WebP image'); return }
    setSaving(true)
    try {
      await uploadFile('/api/admin/gallery/upload', 'image', file)
      showToast('Photo added')
      setModal(null)
      reload()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }
  async function remove(img) {
    if (!window.confirm('Remove this image?')) return
    try { await deleteImage(img.id); showToast('Image removed') }
    catch (err) { showToast(errorMessage(err)) }
  }

  return <Shell>
    <PageHeader eyebrow="Fundraising & content" title="Gallery" subtitle="Photos shown on the public site." actions={<button onClick={() => setModal({})} className="btn-orange"><Plus size={16} /> Add Photo</button>} />
    {loading ? <LoadingState label="images" /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{images.map(img => <div key={img.id} className="group relative overflow-hidden rounded-2xl"><img src={img.url} alt="" className="h-48 w-full object-cover" /><button onClick={() => remove(img)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><Trash2 size={16} /></button></div>)}
      {images.length === 0 && <p className="text-sm text-kMuted">No images yet — add one to get started.</p>}
    </div>}
    {modal && <Modal title="Add Photo" onClose={() => setModal(null)}>
      <form onSubmit={save} className="grid gap-4">
        <label className="text-sm font-semibold">Photo<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="input-k mt-2" required /></label>
        <button disabled={saving} className="btn-orange mt-2 disabled:opacity-60">{saving ? 'Uploading…' : 'Add Photo'}</button>
      </form>
    </Modal>}
  </Shell>
}

function TeamManager({ team, loading, error, reload, addMember, patchMember, deleteMember, showToast }) {
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const data = { name: f.get('name'), role: f.get('role'), image: f.get('image'), social_link: f.get('social_link') || null }
    setSaving(true)
    try {
      if (modal.data) { await patchMember(modal.data.id, data); showToast('Team member updated') }
      else { await addMember(data); showToast('Team member added') }
      setModal(null)
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }
  async function remove(t) {
    if (!window.confirm(`Remove ${t.name} from the team?`)) return
    try { await deleteMember(t.id); showToast('Team member removed') }
    catch (err) { showToast(errorMessage(err)) }
  }

  return <Shell>
    <PageHeader eyebrow="People" title="Staff / Team" subtitle="Team profiles shown on the public site." actions={<button onClick={() => setModal({})} className="btn-orange"><Plus size={16} /> Add team member</button>} />
    {loading ? <LoadingState label="team" /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{team.map(t => <div key={t.id} className="card-k overflow-hidden"><img src={t.image} alt={t.name} className="h-44 w-full object-cover" /><div className="p-5"><h3 className="font-display text-lg font-semibold text-kGreen">{t.name}</h3><p className="mt-1 text-sm text-kMuted">{t.role}</p><div className="mt-4 flex gap-3"><button onClick={() => setModal({ data: t })} className="text-sm font-semibold text-kOrange">Edit</button><button onClick={() => remove(t)} className="text-sm font-semibold text-kMuted hover:text-red-600">Remove</button></div></div></div>)}
    </div>}
    {modal && <Modal title={modal.data ? 'Edit team member' : 'Add team member'} onClose={() => setModal(null)}>
      <form onSubmit={save} className="grid gap-4">
        <label className="text-sm font-semibold">Name<input name="name" defaultValue={modal.data?.name} className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Role<input name="role" defaultValue={modal.data?.role} className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Photo URL<input name="image" defaultValue={modal.data?.image} className="input-k mt-2" placeholder="/images/example.jpg" required /></label>
        <label className="text-sm font-semibold">Social link (optional)<input name="social_link" defaultValue={modal.data?.social_link || ''} className="input-k mt-2" placeholder="https://linkedin.com/in/..." /></label>
        <button disabled={saving} className="btn-orange mt-2 disabled:opacity-60">{saving ? 'Saving…' : modal.data ? 'Save changes' : 'Add team member'}</button>
      </form>
    </Modal>}
  </Shell>
}


function UsersManager({ users, loading, error, reload, addUser, deleteUser, showToast, currentUserId }) {
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const data = { name: f.get('name'), email: f.get('email'), password: f.get('password'), role: f.get('role') }
    setSaving(true)
    try { await addUser(data); showToast('Account created'); setModal(false) }
    catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }
  async function remove(u) {
    if (!window.confirm(`Remove ${u.name}'s ${u.role} account? They will no longer be able to sign in.`)) return
    try { await deleteUser(u.id); showToast('Account removed') }
    catch (err) { showToast(errorMessage(err)) }
  }

  return <Shell>
    <PageHeader eyebrow="System" title="Admin & staff accounts" subtitle="Who can sign in to the staff workspace." actions={<button onClick={() => setModal(true)} className="btn-orange"><Plus size={16} /> Add account</button>} />
    {loading ? <LoadingState label="accounts" /> : error ? <ErrorState message={error} onRetry={reload} /> : <div className="mt-7 overflow-x-auto card-k"><table className="w-full min-w-[500px] text-left text-sm"><thead className="border-b border-kBorderSoft text-xs uppercase tracking-wider text-kMuted"><tr><th className="p-4">Name</th><th>Email</th><th>Role</th><th></th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-b border-kBorderSoft"><td className="p-4 font-semibold text-kInk">{u.name}</td><td className="text-kMuted">{u.email}</td><td className="text-kMuted capitalize">{u.role}</td><td className="p-4 text-right">{u.id !== currentUserId && <button onClick={() => remove(u)} className="text-sm font-semibold text-kMuted hover:text-red-600">Remove</button>}</td></tr>)}
      {users.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-kMuted">No other admin/staff accounts yet.</td></tr>}
    </tbody></table></div>}
    {modal && <Modal title="Add admin or staff account" onClose={() => setModal(false)}>
      <form onSubmit={save} className="grid gap-4">
        <label className="text-sm font-semibold">Name<input name="name" className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Email<input name="email" type="email" className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Temporary password<input name="password" type="password" minLength={8} className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Role<select name="role" className="input-k mt-2" defaultValue="staff"><option value="staff">Staff — content only</option><option value="admin">Admin — full access</option></select></label>
        <button disabled={saving} className="btn-orange mt-2 disabled:opacity-60">{saving ? 'Creating…' : 'Add account'}</button>
      </form>
    </Modal>}
  </Shell>
}


// Only mounted once AdminDashboard below has positively confirmed the
// session is valid — every useApiResource hook here fetches on mount, so
// none of this (or the Shell/nav it renders inside) must exist in the
// component tree until auth is confirmed, or those calls would fire, and
// this content would flash, while a stale/expired/missing token is still
// being checked.
function AdminDashboardRoutes() {
  const currentUser = getStoredUser()
  const donationsApi = useApiResource('/api/donations', { listKey: 'donations', itemKey: 'donation' })
  const galleryApi = useApiResource('/api/gallery', { listKey: 'images', itemKey: 'image' })
  const teamApi = useApiResource('/api/team', { listKey: 'team', itemKey: 'member' })
  const usersApi = useApiResource('/api/admin/users', { listKey: 'users', itemKey: 'user' })
  const [toast, showToast] = useToast()

  return <>
    <Routes>
      <Route index element={<Overview donations={donationsApi.items} />} />
      <Route path="elderly" element={<ElderlyManager showToast={showToast} />} />
      <Route path="elderly/:id" element={<ElderlyProfile showToast={showToast} />} />
      <Route path="followups" element={<FollowUpsManager showToast={showToast} />} />
      <Route path="calendar" element={<AssignmentCalendar />} />
      <Route path="attendance" element={<AttendanceManager showToast={showToast} />} />
      <Route path="health" element={<HealthManager showToast={showToast} />} />
      <Route path="medication" element={<MedicationManager showToast={showToast} />} />
      <Route path="volunteers" element={<VolunteerManager showToast={showToast} />} />
      <Route path="home-visits" element={<HomeVisitManager showToast={showToast} />} />
      <Route path="donations" element={<DonationsManager showToast={showToast} />} />
      <Route path="feeding" element={<FeedingManager showToast={showToast} />} />
      <Route path="inventory" element={<InventoryManager showToast={showToast} />} />
      <Route path="activities" element={<ActivityManager showToast={showToast} />} />
      <Route path="assistance" element={<AssistanceManager showToast={showToast} />} />
      <Route path="incidents" element={<IncidentManager showToast={showToast} />} />
      <Route path="analytics" element={<AnalyticsManager />} />
      <Route path="impact" element={<ImpactReports />} />
      <Route path="gallery" element={<GalleryManager
        images={galleryApi.items} loading={galleryApi.loading} error={galleryApi.error} reload={galleryApi.reload}
        deleteImage={id => galleryApi.remove(id, '/api/admin/gallery')}
        showToast={showToast} />} />
      <Route path="team" element={<TeamManager
        team={teamApi.items} loading={teamApi.loading} error={teamApi.error} reload={teamApi.reload}
        addMember={body => teamApi.create(body, '/api/admin/team')}
        patchMember={(id, body) => teamApi.patch(id, body, '/api/admin/team')}
        deleteMember={id => teamApi.remove(id, '/api/admin/team')}
        showToast={showToast} />} />
      <Route path="inbox" element={<InboxManager showToast={showToast} />} />
      <Route path="users" element={currentUser?.role === 'admin' ? <UsersManager
        users={usersApi.items} loading={usersApi.loading} error={usersApi.error} reload={usersApi.reload}
        addUser={body => usersApi.create(body)}
        deleteUser={id => usersApi.remove(id)}
        showToast={showToast} currentUserId={currentUser?.id} /> : <Navigate to="/admin" replace />} />
    </Routes>
    <Toast message={toast} />
  </>
}

function AuthChecking() {
  return <div className="grid min-h-[80vh] place-items-center bg-kCream text-sm font-semibold text-kMuted">Checking your session…</div>
}

const ADMIN_AREA_ROLES = ['admin', 'staff']

// Gate for every /admin/* route except /admin/login: verifies the stored
// token against the server (a token can be present but expired/revoked)
// before AdminDashboardRoutes — and the Shell/data/nav it renders — ever
// mounts, so an unauthenticated visit goes straight to the login form
// with no dashboard flash. Also checks the returned user's role — a
// valid token alone isn't enough, since /api/auth/me succeeds for any
// authenticated account regardless of role; a volunteer's own valid
// session must not be treated as admin access.
export default function AdminDashboard() {
  const location = useLocation()
  const [status, setStatus] = useState('checking') // 'checking' | 'authenticated' | 'unauthenticated' | 'forbidden'
  const [forbiddenRole, setForbiddenRole] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!getToken()) { setStatus('unauthenticated'); return }
    apiFetch('/api/auth/me')
      .then(({ user }) => {
        if (cancelled) return
        if (!ADMIN_AREA_ROLES.includes(user.role)) { setForbiddenRole(user.role); setStatus('forbidden'); return }
        setStatus('authenticated')
      })
      .catch(() => { clearSession(); if (!cancelled) setStatus('unauthenticated') })
    return () => { cancelled = true }
  }, [])

  // A bfcache restore (e.g. hitting Back after navigating away to another
  // site or tab) can bring this component's DOM back exactly as it was
  // rendered, without re-running the effect above — so a page frozen
  // mid-session while authenticated could otherwise reappear intact after
  // a subsequent logout. Forcing a full reload on a persisted restore
  // makes the effect above run again from scratch against current
  // storage/session state.
  useEffect(() => {
    function onPageShow(e) { if (e.persisted) window.location.reload() }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  if (status === 'checking') return <AuthChecking />
  if (status === 'unauthenticated') return <Navigate to="/admin/login" state={{ from: location }} replace />
  if (status === 'forbidden') return <Navigate to={forbiddenRole === 'volunteer' ? '/volunteer' : '/admin/login'} replace />
  return <AdminDashboardRoutes />
}
