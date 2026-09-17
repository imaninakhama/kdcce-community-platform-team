// Three highlight cards used to open "Why This Matters" — items:
// [{ icon, value, label }]. Deliberately plain fact cards (no donation
// pitch here), matching the rest of the site's stat-card styling.
export default function StatsSection({ eyebrow, title, intro, items }) {
  return <section className="bg-kCream py-20">
    <div className="container-k">
      <div className="mx-auto max-w-2xl text-center">
        {eyebrow && <div className="eyebrow justify-center">{eyebrow}</div>}
        {title && <h2 className="mt-3 font-display text-4xl font-bold text-kGreen">{title}</h2>}
        {intro && <p className="mt-4 leading-7 text-kMuted">{intro}</p>}
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="card-k p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kOrange/10 text-kOrange"><Icon size={26} /></div>
            <div className="mt-5 font-display text-3xl font-bold text-kGreen">{value}</div>
            <p className="mt-2 text-sm leading-6 text-kMuted">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
}
