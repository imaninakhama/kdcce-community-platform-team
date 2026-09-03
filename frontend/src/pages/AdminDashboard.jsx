import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import { BarChart3, Plus, Trash2 } from 'lucide-react'
import Modal from '../components/admin/Modal'
import Toast from '../components/admin/Toast'
import Shell from '../components/admin/Shell'
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
import InboxManager from './admin/InboxManager'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function StatCard({ a, b, c }) { return <div className="card-k p-5"><div className="text-sm text-kMuted">{a}</div><div className="mt-2 font-display text-3xl font-bold text-kGreen">{b}</div><div className="mt-2 text-xs font-semibold text-kOrange">{c}</div></div> }

function frequencyLabel(freq) { return freq === 'monthly' ? 'Monthly' : 'One-time' }

function Overview({ donations }) {
  // Only a confirmed-successful payment counts toward a money total —
  // Pending (still waiting on the M-Pesa callback) and Failed
  // (declined/cancelled/timed out) are real rows that must never be
  // summed in as received money. In-kind (Food/Equipment) donations
  // never go through this at all: donation_type === 'Cash' is what
  // "amount" means a real payment here, matching the same definition
  // used server-side (see cash_total in app/reports/routes.py).
  const paidCash = donations.filter(d => d.donation_type === 'Cash' && d.status === 'Paid')
  const total = paidCash.reduce((s, d) => s + Number(d.amount), 0)
  const stats = [['Total donations', `KES ${total.toLocaleString()}`, `${paidCash.length} donors`], ['This month', `KES ${total.toLocaleString()}`, `${paidCash.length} donors`]]
  const recent = [...donations].sort((a, b) => b.id - a.id).slice(0, 4)
  return <Shell>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="eyebrow">Overview</div><h1 className="font-display text-3xl font-bold text-kGreen">Good morning, staff.</h1></div><Link to="/admin/donations" className="btn-orange"><Plus size={16} /> Add donation</Link></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([a, b, c]) => <StatCard key={a} a={a} b={b} c={c} />)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <div className="card-k p-6"><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold text-kGreen">Recent donations</h2><Link to="/admin/donations" className="text-sm font-semibold text-kOrange">View all</Link></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-b border-kBorderSoft text-xs uppercase tracking-wider text-kMuted"><tr><th className="pb-3">Donor</th><th>Amount</th><th>Frequency</th><th>Status</th><th>Date</th></tr></thead><tbody>{recent.map(r => <tr key={r.id} className="border-b border-kBorderSoft"><td className="py-4 font-semibold text-kInk">{r.donor_name}</td><td className="text-kMuted">KES {Number(r.amount).toLocaleString()}</td><td className="text-kMuted">{frequencyLabel(r.frequency)}</td><td className="text-kMuted">{r.status}</td><td className="text-kMuted">{r.created_at.slice(0, 10)}</td></tr>)}</tbody></table></div></div>
      <div className="card-k p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-kTint text-kOrange"><BarChart3 /></div><div><h2 className="font-display text-xl font-bold text-kGreen">Impact pulse</h2><p className="text-sm text-kMuted">Donations this week</p></div></div><div className="mt-8 flex h-36 items-end justify-between gap-3">{[42, 66, 49, 80, 58, 72, 91].map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-lg bg-kOrange/75" style={{ height: `${v}%` }} /><span className="text-[10px] text-kMuted">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span></div>)}</div></div>
    </div>
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="eyebrow">Manage</div><h1 className="font-display text-3xl font-bold text-kGreen">Gallery manager</h1></div><button onClick={() => setModal({})} className="btn-orange"><Plus size={16} /> Add Photo</button></div>
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="eyebrow">Manage</div><h1 className="font-display text-3xl font-bold text-kGreen">Team manager</h1></div><button onClick={() => setModal({})} className="btn-orange"><Plus size={16} /> Add team member</button></div>
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
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><div className="eyebrow">Manage</div><h1 className="font-display text-3xl font-bold text-kGreen">Admin &amp; staff accounts</h1></div><button onClick={() => setModal(true)} className="btn-orange"><Plus size={16} /> Add account</button></div>
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
