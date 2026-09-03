import { useEffect, useRef } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Boxes, CalendarDays, ClipboardCheck, FileImage, Gauge, HandHeart, Heart, HeartPulse, HeartHandshake, Home, Inbox, KeyRound, LayoutDashboard, ListChecks, LogOut, Pill, ShieldAlert, UserRound, Users, Utensils } from 'lucide-react'
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

export default function Shell({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getStoredUser()
  const menu = user?.role === 'admin' ? [...staffMenu, ...adminOnlyMenu] : staffMenu
  async function signOut() { await endSession(); navigate('/admin/login') }

  // Each admin page mounts its own <Shell>, so this nav is a fresh DOM
  // node on every navigation — without this, a section reached via a
  // scrolled-out-of-view tab (or a direct URL) would leave its own
  // active tab scrolled off-screen instead of visibly highlighted.
  const activeLinkRef = useRef(null)
  useEffect(() => { activeLinkRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [])
  function isActiveTo(to) { return to === '/admin' ? pathname === '/admin' : pathname.startsWith(to) }

  return <div className="min-h-screen bg-kCream">
    {/* Top bar: brand, global search, notifications, theme, account —
        same dark navy the sidebar used to use, same components
        (GlobalSearch/NotificationBell/ThemeToggle) just relocated here
        with the same variant="dark" they already supported. */}
    <header className="bg-[#071724] text-white">
      <div className="container-k flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5"><img src="/images/logo.png" alt="KDCCE" className="h-full w-full object-contain" /></Link>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-kLime">Staff workspace</div>
            <div className="font-display text-base font-bold leading-tight">Admin portal</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <GlobalSearch />
          <NotificationBell variant="dark" />
          <ThemeToggle variant="dark" />
          <div className="ml-2 flex items-center gap-3 border-l border-white/10 pl-3">
            {user && <div className="hidden text-right sm:block"><div className="text-sm font-semibold leading-tight">{user.name}</div><div className="text-xs capitalize text-white/60">{user.role}</div></div>}
            <button onClick={signOut} title="Sign out" aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={17} /></button>
          </div>
        </div>
      </div>
    </header>

    {/* Horizontal nav — every item from the old sidebar, same routes,
        same active-state logic, just laid out as a scrollable row of
        tabs instead of a vertical list. Scrolls rather than wraps or
        hides anything behind a "more" menu, so all ~20 modules stay
        equally one click away regardless of viewport width. */}
    <nav className="border-b border-kBorderSoft bg-[#0b2233] text-white">
      <div className="container-k">
        <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
          {menu.map(([label, to, icon]) => {
            const Icon = icons[icon]
            return <NavLink end={to === '/admin'} key={to} to={to} ref={isActiveTo(to) ? activeLinkRef : null} className={({ isActive }) => `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-white text-kGreen' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}><Icon size={16} />{label}</NavLink>
          })}
          <Link to="/" className="ml-1 flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-white/50 hover:bg-white/10 hover:text-white"><LogOut size={16} /> Back to website</Link>
        </div>
      </div>
    </nav>

    <main className="container-k py-8"><section>{children}</section></main>
  </div>
}
