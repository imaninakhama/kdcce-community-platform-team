import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Heart, Menu, X, ChevronDown } from 'lucide-react'
import { PrimaryButton } from './Button'
import ThemeToggle from '../theme/ThemeToggle'

const nav = [
  ['Home', '/'],
  ['About Us', '/about'],
  ['Programs', '/programs'],
  ['Gallery', '/gallery'],
  ['Get Involved', '/sponsor'],
  ['Adopt a Granny', '/adopt-a-granny'],
  ['Contact', '/contact']
]

// Roughly this header's own rendered height — used as the
// IntersectionObserver's top rootMargin so the transparent-to-solid
// handoff happens exactly as a page's hero scrolls up under the header,
// with no gap where a transparent bar would sit over plain content.
const HEADER_CLEARANCE = 84

export default function Header() {
  const [open, setOpen] = useState(false)
  const [solid, setSolid] = useState(false)
  const { pathname } = useLocation()

  // Transparent-over-hero at the top of every public page, solid once
  // that page's hero section scrolls up under the header. Observing the
  // hero itself (rather than a fixed scroll-Y number) keeps the handoff
  // exact regardless of how tall a given page's hero is — every public
  // page that renders this Header always renders a #page-hero as its
  // first section (see PageHero.jsx and Home.jsx), so re-querying on
  // each route change reliably finds the new page's hero. A page with no
  // hero (shouldn't happen today, but defensively) falls back to solid.
  useEffect(() => {
    const hero = document.getElementById('page-hero')
    if (!hero) { setSolid(true); return }
    setSolid(false)
    const observer = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting),
      { rootMargin: `-${HEADER_CLEARANCE}px 0px 0px 0px`, threshold: 0 }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [pathname])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${solid ? 'bg-kSurface/95 backdrop-blur glass-nav' : 'bg-gradient-to-b from-black/55 via-black/25 to-transparent'}`}>
      <div className="container-k flex min-h-[82px] items-center justify-between gap-6 py-2">
        <Link to="/" className="flex items-center" onClick={() => setOpen(false)} aria-label="KDCCE home">
          <img src="/images/logo.png" alt="Kibera Day Care Centre for the Elderly" className={`h-[66px] w-auto max-w-[210px] object-contain object-left transition-[filter] duration-300 ${solid ? '' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]'}`} />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {nav.map(([label, to]) => (
            <NavLink key={label} to={to} end className={({ isActive }) => `relative text-[13px] font-semibold transition-colors ${isActive ? (solid ? 'text-kOrange' : 'text-kLime') : (solid ? 'text-kInk' : 'text-white/90 hover:text-white')}`}>
              {label}
              {label === 'Get Involved' && <ChevronDown className="ml-1 inline h-3 w-3" />}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle variant={solid ? 'light' : 'dark'} />
          <PrimaryButton to="/donate"><Heart className="h-4 w-4" fill="currentColor" /> Donate Now</PrimaryButton>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle variant={solid ? 'light' : 'dark'} />
          <button
            className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors lg:hidden ${solid ? 'border-kBorder text-kInk hover:bg-kTint' : 'border-white/40 text-white hover:bg-white/10'}`}
            onClick={() => setOpen(!open)} aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-kBorderSoft bg-kSurface px-5 pb-5 lg:hidden">
          <div className="mx-auto flex max-w-[1180px] flex-col gap-2 pt-3">
            {nav.map(([label, to]) => (
              <NavLink key={label} end to={to} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-lg px-3 py-3 font-semibold ${isActive ? 'bg-kTint text-kOrange' : 'text-kInk hover:bg-kTint'}`}>
                {label}
              </NavLink>
            ))}
            <PrimaryButton to="/donate" className="mt-2"><Heart className="h-4 w-4" /> Donate Now</PrimaryButton>
          </div>
        </div>
      )}
    </header>
  )
}
