import React from 'react'
import { impactStats } from '../data/impactStats'

export default function Stats() {
  return <section id="impact" className="container-k py-12">
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
      {impactStats.map(({ icon: Icon, value, label }) => (
        <div key={label} className="card-k flex items-center gap-3 px-6 py-7">
          <div className="text-kOrange"><Icon size={24} /></div>
          <div>
            <div className="font-display text-2xl font-bold text-kGreen">{value}</div>
            <div className="mt-1 max-w-[125px] text-xs font-semibold leading-5 text-kMuted">{label}</div>
          </div>
        </div>
      ))}
    </div>
  </section>
}
