// Shared KPI tile used across admin/volunteer dashboards and manager
// pages — same shape as the tiles DonationsManager pioneered, generalized
// with a tone so callers don't hand-roll bg-*/10 text-* combos per page.
const ICON_TONE = {
  primary: 'bg-kGreen/10 text-kGreen',
  success: 'bg-kSuccess/10 text-kSuccess',
  warning: 'bg-kWarning/10 text-kWarning',
  danger: 'bg-kDanger/10 text-kDanger',
  accent: 'bg-kOrange/10 text-kOrange',
  neutral: 'bg-kBorderSoft text-kMuted',
}
const VALUE_TONE = {
  primary: 'text-kGreen',
  success: 'text-kSuccess',
  warning: 'text-kWarning',
  danger: 'text-kDanger',
  accent: 'text-kOrange',
  neutral: 'text-kInk',
}

export default function KpiCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  return <div className="card-k flex items-start gap-4 p-5">
    {Icon && <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${ICON_TONE[tone] || ICON_TONE.primary}`}><Icon size={20} /></div>}
    <div className="min-w-0">
      <div className="text-sm text-kMuted">{label}</div>
      <div className={`mt-1 truncate font-display text-2xl font-bold ${VALUE_TONE[tone] || VALUE_TONE.primary}`}>{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-kMuted">{sub}</div>}
    </div>
  </div>
}
