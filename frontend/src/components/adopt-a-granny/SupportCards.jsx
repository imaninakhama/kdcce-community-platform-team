// Grid of support types — items: [{ icon, title, description }].
export default function SupportCards({ eyebrow, title, intro, items }) {
  return <section className="container-k py-20">
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && <div className="eyebrow justify-center">{eyebrow}</div>}
      {title && <h2 className="mt-3 font-display text-4xl font-bold text-kGreen">{title}</h2>}
      {intro && <p className="mt-4 leading-7 text-kMuted">{intro}</p>}
    </div>
    <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, title: cardTitle, description }) => (
        <div key={cardTitle} className="card-k p-7">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-kGreen/10 text-kGreen"><Icon size={22} /></div>
          <h3 className="mt-5 font-display text-lg font-bold text-kInk">{cardTitle}</h3>
          <p className="mt-2 text-sm leading-6 text-kMuted">{description}</p>
        </div>
      ))}
    </div>
  </section>
}
