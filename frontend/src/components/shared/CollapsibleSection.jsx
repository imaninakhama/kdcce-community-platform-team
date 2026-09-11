import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Compact accordion wrapper for a group of secondary detail stats —
// collapsed by default so a dense detail section doesn't push the page's
// most important numbers below the fold, while staying one click away.
export default function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return <div className="card-k overflow-hidden">
    <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left" aria-expanded={open}>
      <span className="flex items-center gap-3">
        {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-kGreen/10 text-kGreen"><Icon size={16} /></span>}
        <span className="font-display text-base font-bold text-kInk">{title}</span>
      </span>
      <ChevronDown size={18} className={`shrink-0 text-kMuted transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="border-t border-kBorderSoft p-5">{children}</div>}
  </div>
}
