import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PageHero from '../components/PageHero'
import { impactStories, getStoryById } from '../data/impactStories'

export default function ImpactStoryDetail() {
  const { id } = useParams()
  const story = getStoryById(id) || impactStories[0]

  return <>
    <PageHero title={story.title} eyebrow={story.category} text={story.summary} image={story.image} />
    <article className="container-k max-w-3xl py-20">
      <img src={story.image} alt={story.imageAlt} className="h-[420px] w-full rounded-2xl object-cover" />
      <div className="mt-8 inline-flex rounded-full bg-kTint px-3 py-1 text-xs font-bold uppercase tracking-[.12em] text-kOrange">{story.category}</div>
      <div className="prose prose-slate mt-4 max-w-none">
        <p className="font-display text-xl font-semibold text-kGreen">{story.intro}</p>
        {story.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link to="/impact-stories" className="inline-flex items-center gap-2 font-semibold text-kOrange"><ArrowLeft size={16} /> Back to Impact Stories</Link>
        <Link to={story.cta.to} className="btn-orange">{story.cta.label} <ArrowRight size={16} /></Link>
      </div>
    </article>
  </>
}
