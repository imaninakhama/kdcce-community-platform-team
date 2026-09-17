import { Link } from 'react-router-dom'

// Closing CTA band — a page-specific sibling of the site-wide CtaBanner,
// with its own heading/copy/links rather than the generic donate pitch.
export default function CTASection({ title, text, primaryCta, secondaryCta }) {
  return <section className="container-k py-20">
    <div className="overflow-hidden rounded-2xl bg-kGreen px-6 py-14 text-center text-white sm:px-10 md:px-16">
      <h2 className="font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-4 max-w-xl leading-7 text-white/80">{text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {primaryCta && <Link className="btn-orange" to={primaryCta.to}>{primaryCta.label}</Link>}
        {secondaryCta && <Link className="btn-outline" to={secondaryCta.to}>{secondaryCta.label}</Link>}
      </div>
    </div>
  </section>
}
