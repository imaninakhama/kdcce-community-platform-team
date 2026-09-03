import React from 'react'
import PageHero from '../components/PageHero'
import StoryCard from '../components/StoryCard'
import { impactStories } from '../data/impactStories'

export default function ImpactStories() {
  return <>
    <PageHero
      title="Impact Stories"
      eyebrow="Latest updates"
      text="Stories about the volunteers, teams, and communities behind everyday impact."
      image={impactStories[0]?.image || '/images/community.jpg'}
    />
    <section className="container-k py-20">
      <div className="grid gap-6 md:grid-cols-3">
        {impactStories.map(story => <StoryCard key={story.id} story={story} />)}
      </div>
    </section>
  </>
}
