import { useState } from 'react'
import { X } from 'lucide-react'
import PageHero from '../components/PageHero'
import { useApiList } from '../lib/useApiList'

export default function Gallery(){
  const [selected,setSelected]=useState(null)
  // A url that 404s or fails to load (bad admin-entered link, moved/
  // deleted file) is dropped from the grid rather than left showing the
  // browser's broken-image icon — tracked by id so it's a one-time,
  // per-image decision instead of re-checking every render.
  const [broken,setBroken]=useState(()=>new Set())
  const { items: allImages, loading, error } = useApiList('/api/gallery', 'images')
  const images = allImages.filter(img=>!broken.has(img.id))
  function markBroken(id){ setBroken(prev=>new Set(prev).add(id)) }
  return <><PageHero title="Moments from the community" eyebrow="Gallery" text="A visual preview of meals, conversations, learning and shared moments." image="/images/community-market.jpg"/><section className="container-k py-20">
    {loading && <p className="text-kMuted">Loading gallery…</p>}
    {error && <p className="text-kOrange">{error}</p>}
    {!loading && !error && images.length === 0 && <p className="text-kMuted">No photos yet — check back soon.</p>}
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{images.map(img=><button key={img.id} onClick={()=>setSelected(img)} className="group relative overflow-hidden rounded-2xl text-left"><img src={img.url} alt={img.caption || 'Community moment'} onError={()=>markBroken(img.id)} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105"/>{img.caption && <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8"><p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{img.caption}</p></div>}</button>)}</div>
  </section>{selected&&<div className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-5" onClick={()=>setSelected(null)}><button className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/10 text-white" onClick={()=>setSelected(null)}><X/></button><div className="max-w-5xl text-center"><img src={selected.url} alt={selected.caption || 'Gallery item'} onError={()=>{markBroken(selected.id);setSelected(null)}} className="max-h-[75vh] w-full rounded-2xl object-contain"/>{selected.caption && <p className="mt-4 text-sm font-semibold text-white/90">{selected.caption}</p>}</div></div>}</> }
