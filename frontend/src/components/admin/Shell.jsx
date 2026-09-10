import { useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, BarChart3, Boxes, CalendarDays, ChevronDown, ClipboardCheck, FileImage, Gauge, HandHeart, Heart,
  HeartPulse, HeartHandshake, Home, Inbox, KeyRound, LayoutDashboard, ListChecks, LogOut, Menu, Pill, ShieldAlert,
  UserRound, Users, Utensils, X,
} from 'lucide-react'
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
//
// Grouped into the sections an operations/investor demo expects instead
// of one long flat list — group ids are used as the collapse-state key,
// so renaming a group's `label` later won't reset anyone's saved
// collapse/expand preference.
const NAV_GROUPS = [
  { id: 'overview', label: 'Overview', items: [
    ['Dashboard', '/admin', 'LayoutDashboard'],
    ['Analytics', '/admin/analytics', 'Gauge'],
    ['Impact & Reports', '/admin/impact', 'BarChart3'],
  ] },
  { id: 'people', label: 'People', items: [
    ['Elderly Members', '/admin/elderly', 'UserRound'],
    ['Volunteers', '/admin/volunteers', 'HeartHandshake'],
    ['Staff / Team', '/admin/team', 'Users'],
  ] },
  { id: 'care', label: 'Care & Programs', items: [
    ['Home Visits', '/admin/home-visits', 'Home'],
    ['Health & Wellness', '/admin/health', 'HeartPulse'],
    ['Medication', '/admin/medication', 'Pill'],
    ['Feeding', '/admin/feeding', 'Utensils'],
    ['Activities', '/admin/activities', 'Activity'],
    ['Attendance', '/admin/attendance', 'ClipboardCheck'],
  ] },
  { id: 'operations', label: 'Operations', items: [
    ['Assistance Requests', '/admin/assistance', 'HandHeart'],
    ['Incidents', '/admin/incidents', 'ShieldAlert'],
    ['Follow-ups', '/admin/followups', 'ListChecks'],
    ['Inventory', '/admin/inventory', 'Boxes'],
    ['Calendar', '/admin/calendar', 'CalendarDays'],
  ] },
  { id: 'fundraising', label: 'Fundraising & Content', items: [
    ['Donations', '/admin/donations', 'Heart'],
    ['Gallery', '/admin/gallery', 'FileImage'],
    ['Inbox', '/admin/inbox', 'Inbox'],
  ] },
]
// Admin only — a staff account must never even see the link, not just be
// blocked by the backend (which independently enforces this too; see
// roles_required("admin") on app/users/routes.py).
const SYSTEM_GROUP = { id: 'system', label: 'System', items: [
  ['Admin & Staff Accounts', '/admin/users', 'KeyRound'],
] }

const icons = {
  LayoutDashboard, Heart, HeartPulse, HeartHandshake, Home, Pill, FileImage, Users, Inbox, UserRound, ClipboardCheck,
  Utensils, Boxes, Activity, HandHeart, ShieldAlert, Gauge, ListChecks, CalendarDays, KeyRound, BarChart3,
}

const COLLAPSE_KEY = 'kdcce-admin-nav-collapsed'
function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}') } catch { return {} }
}

function NavGroup({ id, label, items, activeLinkRef, isActiveTo, onNavigate, collapsed, onToggle }) {
  const isOpen = !collapsed[id]
  return <div className="px-2">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="flex w-full items-center justify-between rounded-lg px-2 pb-1.5 pt-4 text-[11px] font-bold uppercase tracking-widest text-white/35 transition hover:text-white/60 first:pt-0"
      aria-expanded={isOpen}
    >
      {label}
      <ChevronDown size={13} className={`transition-transform ${isOpen ? '' : '-rotate-90'}`} />
    </button>
    {isOpen && <nav className="grid gap-0.5">
      {items.map(([itemLabel, to, icon]) => {
        const Icon = icons[icon]
        const active = isActiveTo(to)
        return <NavLink
          end={to === '/admin'}
          key={to}
          to={to}
          ref={active ? activeLinkRef : null}
          onClick={onNavigate}
          className={`nav-item ${active ? 'is-active' : ''}`}
        ><Icon size={16} />{itemLabel}</NavLink>
      })}
    </nav>}
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

  // Per-group collapse state, persisted so a returning admin's chosen
  // layout (e.g. collapsing "Fundraising & Content" if they never touch
  // it) survives a reload — purely a display preference, nothing server
  // side depends on it.
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  function toggleGroup(id) {
    setCollapsed(prev => {
      const next = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)) } catch { /* best effort */ }
      return next
    })
  }

  const firstName = user?.name?.split(' ')[0]
  const initials = user?.name ? user.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : ''

  return <div className="min-h-screen bg-kCream lg:flex">
    {mobileNavOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileNavOpen(false)} />}

    {/* Sidebar — dark navy with grouped, collapsible sections. Active
        state is a subtle dark fill + a blue indicator bar (see .nav-item
        in index.css), not a bright white pill. */}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-[#071724] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-4 py-5">
        <Link to="/admin" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5"><img src="/images/logo.png" alt="KDCCE" className="h-full w-full object-contain" /></Link>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-kLime">Staff workspace</div>
          <div className="truncate font-display text-base font-bold leading-tight">Admin portal</div>
        </div>
        <button onClick={() => setMobileNavOpen(false)} className="ml-auto shrink-0 text-white/60 hover:text-white lg:hidden" aria-label="Close menu"><X size={20} /></button>
      </div>

      <div className="flex-1 pb-2">
        {NAV_GROUPS.map(group => <NavGroup key={group.id} {...group} activeLinkRef={activeLinkRef} isActiveTo={isActiveTo} onNavigate={() => setMobileNavOpen(false)} collapsed={collapsed} onToggle={toggleGroup} />)}
        {user?.role === 'admin' && <NavGroup {...SYSTEM_GROUP} activeLinkRef={activeLinkRef} isActiveTo={isActiveTo} onNavigate={() => setMobileNavOpen(false)} collapsed={collapsed} onToggle={toggleGroup} />}
      </div>

      <div className="px-2 pb-4 pt-2">
        <Link to="/" className="nav-item text-white/50"><LogOut size={16} /> Back to website</Link>
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
            <NotificationBell variant="light" />
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
