import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, X } from 'lucide-react'

// Full-story lightbox opened from a StoryCard click — mirrors the visual
// pattern of the public Gallery page's image lightbox (dark full-screen
// backdrop, large centered panel, circular close button) while adding
// Escape-to-close and a stopPropagation guard on the panel itself so a
// click on the story's own content (paragraphs, the CTA button) can't be
// mistaken for a click on the backdrop and close the modal underneath it.
export default function StoryModal({ story, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-kSurface text-kInk shadow-soft dark:shadow-none"
        onClick={e => e.stopPropagation()}
      >
        {story.image && (
          <img src={story.image} alt={story.imageAlt} className="h-56 w-full object-cover sm:h-72" />
        )}
        <div className="p-6 sm:p-8">
          <div className="inline-flex rounded-full bg-kTint px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-kOrange">{story.category}</div>
          <h2 className="mt-4 font-display text-2xl font-bold text-kGreen sm:text-3xl">{story.title}</h2>
          <div className="mt-4">
            {story.intro && <p className="font-display text-lg font-semibold leading-7 text-kGreen">{story.intro}</p>}
            {story.body?.map((paragraph, i) => (
              <p key={i} className="mt-3 text-sm leading-7 text-kMuted sm:text-base">{paragraph}</p>
            ))}
          </div>
          {story.cta && (
            <Link to={story.cta.to} onClick={onClose} className="btn-orange mt-8 inline-flex">
              {story.cta.label} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
