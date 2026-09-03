import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function getCardsPerView() {
  if (typeof window === 'undefined') return 3
  const w = window.innerWidth
  if (w < 640) return 1   // mobile
  if (w < 1024) return 2  // tablet
  return 3                // desktop
}

// Generic, dependency-free carousel: responsive cards-per-view (1/2/3),
// circular left/right arrows, swipe on touch, and keyboard support —
// built for the impact-stories homepage section but not specific to it,
// so any list of items + a renderItem can reuse it.
export default function Carousel({ items, renderItem, ariaLabel = 'Carousel' }) {
  const [cardsPerView, setCardsPerView] = useState(getCardsPerView)
  const [index, setIndex] = useState(0)
  const touchStartX = useRef(null)
  // Defense-in-depth against a browser synthesizing a click right after a
  // swipe's touchend (which would fire a card's own <Link> navigation
  // immediately after dragging across it) — belt-and-braces alongside the
  // touch-action: pan-y below, which is what actually suppresses that
  // synthetic click in every browser tested. A *time-bounded* window
  // rather than a one-shot "armed until consumed" flag matters here: if
  // nothing ever arrives to consume it (the normal case, since pan-y
  // already stops the synthetic click), a one-shot flag stays stuck
  // permanently armed and silently eats the next unrelated tap on any
  // card, no matter how much later it happens.
  const lastSwipeAt = useRef(0)
  const SWIPE_CLICK_SUPPRESS_MS = 500

  useEffect(() => {
    let raf
    function onResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setCardsPerView(getCardsPerView()))
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf) }
  }, [])

  const maxIndex = Math.max(0, items.length - cardsPerView)
  const canScroll = items.length > cardsPerView

  // Clamp whenever the visible count or item count changes (e.g. rotating
  // a phone, or more stories being added later) so the track never sits
  // past its new max offset.
  useEffect(() => { setIndex(i => Math.min(i, maxIndex)) }, [maxIndex])

  const goPrev = useCallback(() => { if (canScroll) setIndex(i => (i - 1 < 0 ? maxIndex : i - 1)) }, [canScroll, maxIndex])
  const goNext = useCallback(() => { if (canScroll) setIndex(i => (i + 1 > maxIndex ? 0 : i + 1)) }, [canScroll, maxIndex])

  function handleKeyDown(e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goNext() }
  }

  function handleTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (touchStartX.current == null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    lastSwipeAt.current = Date.now()
    if (delta < 0) goNext(); else goPrev()
  }
  // Swallow a click only if it lands within the suppression window right
  // after a swipe — a tap with no recent swipe (the overwhelmingly common
  // case) is untouched, so this can never end up eating a later, unrelated
  // tap on a card.
  function handleClickCapture(e) {
    if (Date.now() - lastSwipeAt.current < SWIPE_CLICK_SUPPRESS_MS) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const step = 100 / cardsPerView

  return (
    <div role="region" aria-roledescription="carousel" aria-label={ariaLabel} className="flex items-stretch gap-2 sm:gap-4" onKeyDown={handleKeyDown}>
      <button
        type="button" onClick={goPrev} disabled={!canScroll} aria-label="Previous stories"
        className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full border border-kBorder bg-kSurface text-kGreen shadow-soft transition hover:bg-kTint hover:text-kOrange disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-kSurface disabled:hover:text-kGreen dark:shadow-none sm:h-11 sm:w-11"
      >
        <ChevronLeft size={20} />
      </button>

      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
      >
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${index * step}%)` }}>
          {items.map((item, i) => (
            <div key={item.id ?? i} className="shrink-0 px-2.5" style={{ flex: `0 0 ${step}%` }}>
              {renderItem(item)}
            </div>
          ))}
        </div>
        <p className="sr-only" aria-live="polite">{`Showing story ${index + 1} of ${items.length}`}</p>
      </div>

      <button
        type="button" onClick={goNext} disabled={!canScroll} aria-label="Next stories"
        className="grid h-9 w-9 shrink-0 place-items-center self-center rounded-full border border-kBorder bg-kSurface text-kGreen shadow-soft transition hover:bg-kTint hover:text-kOrange disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-kSurface disabled:hover:text-kGreen dark:shadow-none sm:h-11 sm:w-11"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}
