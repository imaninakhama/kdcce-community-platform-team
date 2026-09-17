// Full-width, ~50/50 text+image split — used on the homepage for the
// Mission and Vision statements.
export default function MissionVisionSection({ title, description, supportingText, image, imageAlt, imagePosition = 'right' }) {
  const imageFirst = imagePosition === 'left'

  return <section className="grid md:min-h-[560px] md:grid-cols-2">
    <div className={`relative h-[280px] sm:h-[380px] md:h-auto ${imageFirst ? 'md:order-1' : 'md:order-2'}`}>
      <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
    </div>
    <div className={`flex items-center bg-kBg px-6 py-14 sm:px-10 sm:py-16 md:px-14 md:py-20 lg:px-20 ${imageFirst ? 'md:order-2' : 'md:order-1'}`}>
      <div className="max-w-xl">
        <h1 className="font-display text-3xl font-bold text-kInk sm:text-4xl lg:text-[44px]">{title}</h1>
        <span className="mt-5 block h-1 w-16 rounded-full bg-kGreen" />
        <p className="mt-6 text-base leading-7 text-kMuted sm:text-lg sm:leading-8">{description}</p>
        {supportingText && <p className="mt-4 text-base leading-7 text-kMuted sm:text-lg">{supportingText}</p>}
      </div>
    </div>
  </section>
}
