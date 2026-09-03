import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { apiFetch, clearSession, ApiError } from '../../lib/api'

// Admin/staff only, matching backend/app/search/routes.py exactly — a
// volunteer has no elderly-record access anywhere else in this app, so
// this isn't rendered for them (see Shell.jsx, which only mounts for
// staff/admin in the first place).
const CATEGORIES = [
  ['elderly_members', 'Elderly Members', m => ({ to: `/admin/elderly/${m.id}`, title: m.full_name, subtitle: m.member_id })],
  ['volunteers', 'Volunteers', v => ({ to: '/admin/volunteers', title: v.name, subtitle: v.email })],
  ['home_visits', 'Home Visits', v => ({ to: '/admin/home-visits', title: v.elderly_member_name, subtitle: `${v.status} · ${v.reason?.slice(0, 40) || ''}` })],
  ['assistance_requests', 'Assistance Requests', r => ({ to: '/admin/assistance', title: r.elderly_member_name, subtitle: `${r.request_type} · ${r.status}` })],
  ['follow_ups', 'Follow-ups', f => ({ to: '/admin/followups', title: f.elderly_member_name, subtitle: f.reason?.slice(0, 50) })],
]

export default function GlobalSearch({ variant = 'dark' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const boxRef = useRef(null)
  const isLight = variant === 'light'

  useEffect(() => {
    if (q.trim().length < 2) { setResults(null); return }
    setLoading(true)
    const handle = setTimeout(() => {
      apiFetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        .then(d => setResults(d.results))
        .catch(err => {
          // A search typo or transient failure just shows "no matches" —
          // but an expired session (same 1h-token gap as NotificationBell)
          // should send the user back to login instead of quietly acting
          // like their search came up empty.
          if (err instanceof ApiError && err.status === 401) { clearSession(); navigate('/admin/login'); return }
          setResults(null)
        })
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(handle)
  }, [q, navigate])

  function close() { setOpen(false); setQ(''); setResults(null) }

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) { if (boxRef.current && !boxRef.current.contains(e.target)) close() }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const hasResults = results && CATEGORIES.some(([key]) => results[key]?.length > 0)

  return <div className="relative" ref={boxRef}>
    {open
      ? <div className={`flex items-center gap-2 rounded-full px-3 py-2 ${isLight ? 'border border-kBorder bg-kCream' : 'bg-white/10'}`}>
          <Search size={15} className={isLight ? 'text-kMuted' : 'text-white/60'} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search members, volunteers..." className={`w-40 bg-transparent text-sm focus:outline-none sm:w-64 ${isLight ? 'text-kInk placeholder:text-kMuted' : 'text-white placeholder:text-white/40'}`} />
          <button onClick={close} className={isLight ? 'text-kMuted hover:text-kInk' : 'text-white/60 hover:text-white'}><X size={15} /></button>
        </div>
      : isLight
        ? <button onClick={() => setOpen(true)} className="hidden items-center gap-2 rounded-full border border-kBorder bg-kCream px-4 py-2 text-sm text-kMuted transition hover:border-kGreen hover:text-kInk sm:flex sm:w-56 md:w-72" aria-label="Search">
            <Search size={15} /> <span className="truncate">Search donors, emails, or donations…</span>
          </button>
        : <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" aria-label="Search"><Search size={18} /></button>}
    {!open && isLight && <button onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-full text-kMuted hover:bg-kTint hover:text-kInk sm:hidden" aria-label="Search"><Search size={18} /></button>}

    {open && q.trim().length >= 2 && <div className="absolute right-0 z-30 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-kBorderSoft bg-kSurface text-kInk shadow-soft">
      {loading ? <p className="p-4 text-center text-sm text-kMuted">Searching…</p> : !hasResults ? <p className="p-4 text-center text-sm text-kMuted">No matches for "{q}".</p> : CATEGORIES.map(([key, label, render]) => {
        const items = results?.[key] || []
        if (items.length === 0) return null
        return <div key={key}>
          <div className="border-b border-t border-kBorderSoft bg-kCream px-4 py-2 text-xs font-bold uppercase tracking-wide text-kMuted first:border-t-0">{label}</div>
          {items.map((item, i) => {
            const { to, title, subtitle } = render(item)
            return <Link key={i} to={to} onClick={close} className="block border-b border-kBorderSoft px-4 py-3 text-sm last:border-0 hover:bg-kCream"><div className="font-semibold text-kInk">{title}</div>{subtitle && <div className="text-xs text-kMuted">{subtitle}</div>}</Link>
          })}
        </div>
      })}
    </div>}
  </div>
}
