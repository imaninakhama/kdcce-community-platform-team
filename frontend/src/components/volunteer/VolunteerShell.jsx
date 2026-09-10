import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Bell as BellIcon, Home as HomeIcon, ListChecks, LogOut, Menu, MessageSquare, Sparkles,
  TrendingUp, User, Users, X,
} from 'lucide-react'
import ThemeToggle from '../../theme/ThemeToggle'
import NotificationBell from '../admin/NotificationBell'
import { getStoredUser, endSession } from '../../lib/api'

// A separate shell from components/admin/Shell.jsx on purpose: the
// volunteer portal is its own workspace (its own nav, its own route
// space at /volunteer/*), not a role-switched view inside the staff
// admin dashboard — see VolunteerPortal.jsx for the approval gate that
// decides whether a volunteer ever reaches this shell at all. Only
// volunteer-relevant nav here — never the admin/staff management menu.
// Simplified to the 9 items a volunteer actually needs, flat (no groups
// — nine items doesn't need them), matching the same dark-sidebar /
// light-header structure as the admin Shell for a consistent product feel.
const menu = [
  ['Home', '/volunteer', 'HomeIcon'],
  ['My Assignments', '/volunteer/assignments', 'ListChecks'],
  ['People I Support', '/volunteer/people', 'Users'],
  ['Opportunities', '/volunteer/opportunities', 'Sparkles'],
  ['Messages', '/volunteer/messages', 'MessageSquare'],
  ['Notifications', '/volunteer/notifications', 'BellIcon'],
  ['My Impact', '/volunteer/impact', 'TrendingUp'],
  ['Profile', '/volunteer/profile', 'User'],
  ['Report a Concern', '/volunteer/report-concern', 'AlertTriangle'],
]
const icons = { HomeIcon, ListChecks, Users, Sparkles, MessageSquare, BellIcon, TrendingUp, User, AlertTriangle }

export default function VolunteerShell({ children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const user = getStoredUser()
  async function signOut() { await endSession(); navigate('/admin/login') }
  function isActiveTo(to) { return to === '/volunteer' ? pathname === '/volunteer' : pathname.startsWith(to) }

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  const firstName = user?.name?.split(' ')[0]
  const initials = user?.name ? user.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : ''

  return <div className="min-h-screen bg-kCream lg:flex">
    {mobileNavOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileNavOpen(false)} />}

    <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-y-auto bg-[#071724] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 px-4 py-5">
        <Link to="/volunteer" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5"><img src="/images/logo.png" alt="KDCCE" className="h-full w-full object-contain" /></Link>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-kLime">Volunteer portal</div>
          <div className="truncate font-display text-base font-bold leading-tight">{user?.name || 'Volunteer'}</div>
        </div>
        <button onClick={() => setMobileNavOpen(false)} className="ml-auto shrink-0 text-white/60 hover:text-white lg:hidden" aria-label="Close menu"><X size={20} /></button>
      </div>

      <nav className="grid gap-0.5 px-2">
        {menu.map(([label, to, icon]) => {
          const Icon = icons[icon]
          const active = isActiveTo(to)
          return <NavLink end={to === '/volunteer'} key={to} to={to} onClick={() => setMobileNavOpen(false)} className={`nav-item ${active ? 'is-active' : ''}`}><Icon size={16} />{label}</NavLink>
        })}
      </nav>

      <div className="mt-auto px-2 pb-4 pt-5">
        <Link to="/" className="nav-item text-white/50"><LogOut size={16} /> Back to website</Link>
      </div>
    </aside>

    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-kBorderSoft bg-kSurface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-kMuted hover:bg-kTint hover:text-kInk lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold text-kInk">Welcome back{firstName ? `, ${firstName}` : ''}</div>
              <div className="truncate text-xs text-kMuted">Here's what's happening with your assignments.</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell variant="light" />
            <ThemeToggle />
            <div className="ml-1 flex items-center gap-2 border-l border-kBorderSoft pl-3">
              {user && <>
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kGreen text-xs font-bold text-white">{initials}</div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold leading-tight text-kInk">{user.name}</div>
                  <div className="text-xs capitalize text-kMuted">Volunteer</div>
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
