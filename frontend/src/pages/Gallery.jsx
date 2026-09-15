import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import PageHero from '../components/PageHero'
import { useApiList } from '../lib/useApiList'

export default function Gallery(){
  const [selectedIndex,setSelectedIndex]=useState(null)
  // A url that 404s or fails to load (bad admin-entered link, moved/
  // deleted file) is dropped from the grid rather than left showing the
  // browser's broken-image icon — tracked by id so it's a one-time,
  // per-image decision instead of re-checking every render.
  const [broken,setBroken]=useState(()=>new Set())
  const { items: allImages, loading, error } = useApiList('/api/gallery', 'images')
  const images = allImages.filter(img=>!broken.has(img.id))
  function markBroken(id){ setBroken(prev=>new Set(prev).add(id)) }

  const selected = selectedIndex !== null ? images[selectedIndex] : null
  const hasPrev = selectedIndex !== null && selectedIndex > 0
  const hasNext = selectedIndex !== null && selectedIndex < images.length - 1
  const close = useCallback(() => setSelectedIndex(null), [])
  const goPrev = useCallback(() => setSelectedIndex(i => (i !== null && i > 0 ? i - 1 : i)), [])
  const goNext = useCallback(() => setSelectedIndex(i => (i !== null && i < images.length - 1 ? i + 1 : i)), [images.length])

  // Left/Right/Escape only matter while the lightbox is actually open —
  // no listener at all otherwise, so this never intercepts arrow-key
  // scrolling or anything else on the plain gallery grid.
  useEffect(() => {
    if (selectedIndex === null) return
    function onKeyDown(e) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIndex, close, goPrev, goNext])

  return <><PageHero title="Moments from the community" eyebrow="Gallery" text="A visual preview of meals, conversations, learning and shared moments." image="/images/community-market.jpg"/><section className="container-k py-20">
    {loading && <p className="text-kMuted">Loading gallery…</p>}
    {error && <p className="text-kOrange">{error}</p>}
    {!loading && !error && images.length === 0 && <p className="text-kMuted">No photos yet — check back soon.</p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{images.map((img,i)=><button key={img.id} onClick={()=>setSelectedIndex(i)} className="group relative overflow-hidden rounded-2xl text-left"><img src={img.url} alt={img.caption || 'Community moment'} onError={()=>markBroken(img.id)} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"/>{img.caption && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8"><p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{img.caption}</p></div>}</button>)}</div>
  </section>{selected&&<div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-5" onClick={close}>
    <button aria-label="Close" className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" onClick={close}><X/></button>
    {hasPrev && <button aria-label="Previous image" onClick={e=>{e.stopPropagation();goPrev()}} className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-5"><ChevronLeft size={26}/></button>}
    {hasNext && <button aria-label="Next image" onClick={e=>{e.stopPropagation();goNext()}} className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-5"><ChevronRight size={26}/></button>}
    <div className="max-w-5xl text-center"><img src={selected.url} alt={selected.caption || 'Gallery item'} onError={()=>{markBroken(selected.id);setSelectedIndex(null)}} className="max-h-[75vh] w-full rounded-2xl object-contain"/>{selected.caption && <p className="mt-4 text-sm font-semibold text-white/90">{selected.caption}</p>}</div>
  </div>}</> }
