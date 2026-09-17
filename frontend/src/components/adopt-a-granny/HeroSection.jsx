import { Link } from 'react-router-dom'

// Full-bleed hero, same visual language as Home.jsx's own hero (dark
// gradient over a large image, white text, two CTAs) — id="page-hero" is
// the marker the shared Header observes to switch from transparent-over-
// image to solid on scroll (see Header.jsx).
export default function HeroSection({ eyebrow, title, subheading, paragraph, image, imageAlt, primaryCta, secondaryCta }) {
  return <section id="page-hero" className="relative min-h-[600px] overflow-hidden bg-black">
    <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover object-center" />
    <div className="hero-overlay absolute inset-0" />
    <div className="container-k relative flex min-h-[600px] items-center py-20 text-white">
      <div className="max-w-2xl">
        {eyebrow && <div className="mb-5 font-display text-sm font-semibold italic text-kLime">{eyebrow}</div>}
        <h1 className="font-display text-5xl font-bold leading-[1.05] md:text-6xl">{title}</h1>
        {subheading && <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-white/90">{subheading}</p>}
        {paragraph && <p className="mt-4 max-w-xl text-base leading-7 text-white/75">{paragraph}</p>}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          {primaryCta && <Link className="btn-orange" to={primaryCta.to}>{primaryCta.label}</Link>}
          {secondaryCta && (secondaryCta.href
            ? <a className="btn-outline" href={secondaryCta.href}>{secondaryCta.label}</a>
            : <Link className="btn-outline" to={secondaryCta.to}>{secondaryCta.label}</Link>)}
        </div>
      </div>
    </div>
  </section>
}
