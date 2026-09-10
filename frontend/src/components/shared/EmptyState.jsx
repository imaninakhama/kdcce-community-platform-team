// Standalone empty state for a whole page/section (not inside a table —
// DataTable handles its own empty row). Used for e.g. "no assignments yet".
// tone="accent" (default) reads as neutral/informational ("nothing here
// yet"); tone="success" for a positive empty state ("all caught up").
const ICON_TONE = {
  accent: 'bg-kOrange/10 text-kOrange',
  success: 'bg-kSuccess/10 text-kSuccess',
  neutral: 'bg-kBorderSoft text-kMuted',
}

export default function EmptyState({ icon: Icon, title, message, action, tone = 'accent' }) {
  return <div className="card-k p-10 text-center">
    {Icon && <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${ICON_TONE[tone] || ICON_TONE.accent}`}><Icon size={20} /></div>}
    {title && <h3 className="mt-4 font-display text-base font-bold text-kInk">{title}</h3>}
    {message && <p className="mt-1 text-sm text-kMuted">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
}
