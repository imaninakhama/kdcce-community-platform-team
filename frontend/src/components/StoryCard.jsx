import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// Shared card for an impact story — used by both the homepage carousel
// and the /impact-stories index page. A fixed aspect-ratio image crop
// (object-cover, never stretched) keeps every card the same height
// regardless of the source photo's own dimensions.
export default function StoryCard({ story }) {
  return (
    <Link
      to={`/impact-stories/${story.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-kBorderSoft bg-kSurface shadow-soft transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-kOrange focus-visible:ring-offset-2 dark:shadow-none"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-kTint">
        <img
          src={story.image}
          alt={story.imageAlt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="text-xs font-semibold uppercase tracking-[.12em] text-kOrange">{story.category}</div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-6 text-kGreen">{story.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-6 text-kMuted">{story.summary}</p>
        <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-kOrange">
          Read Story <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
