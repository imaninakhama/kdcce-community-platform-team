// A single icon + title/subtitle list row, used inside SectionCard for
// feeds and lists (Needs Attention, Recent Activity, Upcoming Work, ...).
const ICON_TONE = {
  danger: 'bg-kDanger/10 text-kDanger',
  warning: 'bg-kWarning/10 text-kWarning',
  success: 'bg-kSuccess/10 text-kSuccess',
  primary: 'bg-kGreen/10 text-kGreen',
  accent: 'bg-kOrange/10 text-kOrange',
  neutral: 'bg-kBorderSoft text-kMuted',
}

export default function Row({ icon: Icon, tone = 'neutral', title, subtitle, right }) {
  return <div className="flex items-center gap-3 border-b border-kBorderSoft py-3 last:border-0">
    {Icon && <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${ICON_TONE[tone] || ICON_TONE.neutral}`}><Icon size={15} /></div>}
    <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-kInk">{title}</div>{subtitle && <div className="truncate text-xs text-kMuted">{subtitle}</div>}</div>
    {right}
  </div>
}
