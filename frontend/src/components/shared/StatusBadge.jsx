// Shared status/priority pill. Callers pass an explicit tone (never
// auto-guessed from the status word — "Open" means "needs action" on an
// incident but "not yet started" on a follow-up, so only the call site
// knows which it is) — this component just standardizes the visual
// language: green = success, amber = warning, red = danger, blue = info,
// pink = accent, grey = neutral.
const TONE_CLASSES = {
  success: 'bg-kSuccess/10 text-kSuccess',
  warning: 'bg-kWarning/10 text-kWarning',
  danger: 'bg-kDanger/10 text-kDanger',
  info: 'bg-kGreen/10 text-kGreen',
  accent: 'bg-kOrange/10 text-kOrange',
  neutral: 'bg-kBorderSoft text-kMuted',
}

export default function StatusBadge({ tone = 'neutral', icon: Icon, children }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${TONE_CLASSES[tone] || TONE_CLASSES.neutral}`}>
    {Icon && <Icon size={13} />}{children}
  </span>
}
