import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

// Single-open accordion — items: [{ title, content, bullets?, question? }].
function AccordionItem({ item, isOpen, onToggle }) {
  return <div className="card-k overflow-hidden">
    <button onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left" aria-expanded={isOpen}>
      <span className="font-display text-lg font-bold text-kInk">{item.title}</span>
      <ChevronDown size={20} className={`shrink-0 text-kGreen transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="border-t border-kBorderSoft px-6 pb-7 pt-5">
      <p className="leading-7 text-kMuted">{item.content}</p>
      {item.bullets && <ul className="mt-4 grid gap-2.5">
        {item.bullets.map(b => <li key={b} className="flex gap-2.5 text-sm leading-6 text-kInk"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kOrange" />{b}</li>)}
      </ul>}
      {item.question && <p className="mt-5 border-l-2 border-kGreen pl-4 font-display text-base font-semibold italic text-kGreen">{item.question}</p>}
      {item.closing && <p className="mt-4 leading-7 text-kMuted">{item.closing}</p>}
    </div>}
  </div>
}

export default function ThemeAccordion({ eyebrow, title, intro, items }) {
  const [openIndex, setOpenIndex] = useState(0)
  return <section className="bg-kCream py-20">
    <div className="container-k">
      <div className="mx-auto max-w-2xl text-center">
        {eyebrow && <div className="eyebrow justify-center">{eyebrow}</div>}
        {title && <h2 className="mt-3 font-display text-4xl font-bold text-kGreen">{title}</h2>}
        {intro && <p className="mt-4 leading-7 text-kMuted">{intro}</p>}
      </div>
      <div className="mx-auto mt-12 grid max-w-3xl gap-3">
        {items.map((item, i) => <AccordionItem key={item.title} item={item} isOpen={openIndex === i} onToggle={() => setOpenIndex(openIndex === i ? -1 : i)} />)}
      </div>
    </div>
  </section>
}
