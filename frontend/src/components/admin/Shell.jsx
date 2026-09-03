import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Boxes, CalendarDays, ClipboardCheck, FileImage, Gauge, HandHeart, Heart, HeartPulse, HeartHandshake, Home, Inbox, KeyRound, LayoutDashboard, ListChecks, LogOut, Menu, Pill, ShieldAlert, UserRound, Users, Utensils, X } from 'lucide-react'
import ThemeToggle from '../../theme/ThemeToggle'
import NotificationBell from './NotificationBell'
import GlobalSearch from './GlobalSearch'
import { getStoredUser, endSession } from '../../lib/api'

// Single source of truth for the admin nav — every module page lives at
// its own route/file, but they all render inside this same Shell, so a
// new module only needs one entry added here to appear for everyone.
// Staff/admin only: a volunteer account never reaches /admin/* at all —
// AdminLogin redirects a volunteer straight to /volunteer, which has its
// own separate shell (components/volunteer/VolunteerShell.jsx) and its
// own approval gate (pages/VolunteerPortal.jsx).
const staffMenu = [
  ['Overview', '/admin', 'LayoutDashboard'],
  ['Analytics', '/admin/analytics', 'Gauge'],
  ['Elderly Members', '/admin/elderly', 'UserRound'],
  ['Attendance', '/admin/attendance', 'ClipboardCheck'],
  ['Health & Wellness', '/admin/health', 'HeartPulse'],
  ['Medication', '/admin/medication', 'Pill'],
  ['Volunteers', '/admin/volunteers', 'HeartHandshake'],
  ['Home Visits', '/admin/home-visits', 'Home'],
  ['Feeding', '/admin/feeding', 'Utensils'],
  ['Inventory', '/admin/inventory', 'Boxes'],
  ['Activities', '/admin/activities', 'Activity'],
  ['Assistance Requests', '/admin/assistance', 'HandHeart'],
  ['Incidents', '/admin/incidents', 'ShieldAlert'],
  ['Follow-ups', '/admin/followups', 'ListChecks'],
  ['Calendar', '/admin/calendar', 'CalendarDays'],
  ['Donations', '/admin/donations', 'Heart'],
  ['Gallery', '/admin/gallery', 'FileImage'],
  ['Team', '/admin/team', 'Users'],
  ['Inbox', '/admin/inbox', 'Inbox'],
]
// Admin only — a staff account must never even see the link, not just be
// blocked by the backend (which independently enforces this too; see
// roles_required("admin") on app/users/routes.py).
const adminOnlyMenu = [
  ['Admin & Staff Accounts', '/admin/users', 'KeyRound'],
]
const icons = { LayoutDashboard, Heart, HeartPulse, HeartHandshake, Home, Pill, FileImage, Users, Inbox, UserRound, ClipboardCheck, Utensils, Boxes, Activity, HandHeart, ShieldAlert, Gauge, ListChecks, CalendarDays, KeyRound }

function NavGroup({ label, items, activeLinkRef, isActiveTo, onNavigate }) {
  return <div>
    <div className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-widest text-kLime first:pt-0">{label}</div>
    <nav className="grid gap-1 px-2">
      {items.map(([itemLabel, to, icon]) => {
        const Icon = icons[icon]
        const active = isActiveTo(to)
        return <NavLink
          end={to === '/admin'}
          key={to}
          to={to}
          ref={active ? activeLinkRef : null}
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? 'bg-white text-kGreen' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
        ><Icon size={17} />{itemLabel}</NavLink>
      })}
    </nav>
  </div>
}

export default function Shell({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getStoredUser()
  async function signOut() { await endSession(); navigate('/admin/login') }

  // Each admin page mounts its own <Shell>, so the sidebar is a fresh DOM
  // node on every navigation — without this, a section reached via a
  // scrolled-out-of-view link (or a direct URL) would leave its own
  // active link scrolled off-screen instead of visibly highlighted.
  const activeLinkRef = useRef(null)
  useEffect(() => { activeLinkRef.current?.scrollIntoView({ block: 'nearest' }) }, [])
  function isActiveTo(to) { return to === '/admin' ? pathname === '/admin' : pathname.startsWith(to) }

  // The sidebar is always mounted (so desktop never has to wait on JS to
  // slide it in) and just translated off-screen on small viewports,
  // toggled by the header's menu button — same collapse-on-navigate UX
  // every off-canvas mobile nav needs.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const firstName = user?.name?.split(' ')[0]
  const initials = user?.name ? user.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : ''

  return <div className="min-h-screen bg-kCream lg:flex">
    {mobileNavOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileNavOpen(false)} />}

    {/* Sidebar — same dark navy + kLime section labels + kGreen active
        state the volunteer portal's sidebar already uses, just with the
        full staff/admin menu grouped into Main/Admin sections instead of
        the volunteer's flat list. */}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-[#071724] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-4 py-5">
        <Link to="/admin" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5"><img src="/images/logo.png" alt="KDCCE" className="h-full w-full object-contain" /></Link>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-kLime">Staff workspace</div>
          <div className="truncate font-display text-base font-bold leading-tight">Admin portal</div>
        </div>
        <button onClick={() => setMobileNavOpen(false)} className="ml-auto shrink-0 text-white/60 hover:text-white lg:hidden" aria-label="Close menu"><X size={20} /></button>
      </div>

      <NavGroup label="Main" items={staffMenu} activeLinkRef={activeLinkRef} isActiveTo={isActiveTo} onNavigate={() => setMobileNavOpen(false)} />
      {user?.role === 'admin' && <NavGroup label="Admin" items={adminOnlyMenu} activeLinkRef={activeLinkRef} isActiveTo={isActiveTo} onNavigate={() => setMobileNavOpen(false)} />}

      <div className="mt-auto px-2 pb-4 pt-5">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={16} /> Back to website</Link>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      {/* Top bar: greeting, global search, notifications, theme, account —
          same components (GlobalSearch/NotificationBell/ThemeToggle) as
          before, just restyled for a light header instead of a dark one
          now that navigation lives in the sidebar. */}
      <header className="sticky top-0 z-30 border-b border-kBorderSoft bg-kSurface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-kMuted hover:bg-kTint hover:text-kInk lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold text-kInk">Welcome back{firstName ? `, ${firstName}` : ''}</div>
              <div className="truncate text-xs text-kMuted">Here's what's happening today.</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <GlobalSearch variant="light" />
            <NotificationBell />
            <ThemeToggle />
            <div className="ml-1 flex items-center gap-2 border-l border-kBorderSoft pl-3">
              {user && <>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kGreen text-xs font-bold text-white">{initials}</div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold leading-tight text-kInk">{user.name}</div>
                  <div className="text-xs capitalize text-kMuted">{user.role}</div>
                </div>
              </>}
              <button onClick={signOut} title="Sign out" aria-label="Sign out" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-kMuted hover:bg-kTint hover:text-kOrange"><LogOut size={17} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-k py-8"><section>{children}</section></main>
    </div>
  </div>
}
