import React from 'react'
import Carousel from './Carousel'
import StoryCard from './StoryCard'
import { impactStories } from '../data/impactStories'

export default function ImpactStoriesSection() {
  if (impactStories.length === 0) return null
  return (
    <section className="bg-kCream py-20">
      <div className="container-k">
        <div className="mx-auto max-w-2xl text-center">
          <div className="eyebrow">Latest Updates</div>
          <h2 className="mt-2 font-display text-3xl font-bold text-kGreen md:text-4xl">Read Our Impact Stories</h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-kOrange" />
        </div>
        <div className="mt-12">
          <Carousel items={impactStories} ariaLabel="Impact stories" renderItem={story => <StoryCard story={story} />} />
        </div>
      </div>
    </section>
  )
}
