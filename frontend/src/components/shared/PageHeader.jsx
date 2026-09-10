// Standard admin/volunteer page header: eyebrow + title + subtitle on the
// left, primary action(s) on the right. Title size is deliberately smaller
// than the old text-3xl used across every page — see design-system note in
// the redesign brief ("reduce oversized page headings slightly").
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1 className="truncate font-display text-2xl font-bold text-kGreen sm:text-[26px]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-kMuted">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
}
