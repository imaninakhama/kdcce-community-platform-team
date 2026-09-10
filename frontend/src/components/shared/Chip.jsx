// Small pill for tag-like values — volunteer skills/interests/availability,
// program categories, etc. — instead of raw comma-separated text.
const TONE_CLASSES = {
  neutral: 'bg-kTint text-kInk',
  accent: 'bg-kOrange/10 text-kOrange',
  primary: 'bg-kGreen/10 text-kGreen',
}

export default function Chip({ children, tone = 'neutral' }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${TONE_CLASSES[tone] || TONE_CLASSES.neutral}`}>{children}</span>
}
