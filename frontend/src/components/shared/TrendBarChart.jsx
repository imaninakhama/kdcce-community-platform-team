import { useState } from 'react'

// A compact inline time-series bar chart for dashboard widgets — thin
// bars with rounded, baseline-anchored tops and a lightweight hover
// tooltip showing the exact date/value. Single series only: per the
// dataviz skill, a lone series needs no legend box — the widget's own
// label already names it. `data` is [{ date: 'YYYY-MM-DD', count }].
export default function TrendBarChart({ data, valueLabel = 'value' }) {
  const [hoverIndex, setHoverIndex] = useState(null)
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(d => d.count), 1)
  const hovered = hoverIndex !== null ? data[hoverIndex] : null

  function fmtDate(iso) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return <div className="relative">
    {hovered && <div
      className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0b1721] px-2.5 py-1.5 text-xs font-semibold text-white shadow-soft"
      style={{ left: `${((hoverIndex + 0.5) / data.length) * 100}%` }}
    >
      {hovered.count} {valueLabel} · {fmtDate(hovered.date)}
    </div>}
    <div className="flex h-24 items-end gap-[3px]">
      {data.map((d, i) => (
        // h-full (not the row's default items-end sizing) so the child
        // bar's percentage height below has an actual height to resolve
        // against — without it every bar's height:X% resolves to 0.
        <div key={d.date} className="group relative h-full flex-1" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
          <div
            className={`absolute bottom-0 w-full rounded-t transition-colors ${hoverIndex === i ? 'bg-kGreen2' : 'bg-kGreen/70 group-hover:bg-kGreen2'}`}
            style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 6 : 2)}%` }}
          />
        </div>
      ))}
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-kMuted">
      <span>{fmtDate(data[0].date)}</span>
      <span>{fmtDate(data[data.length - 1].date)}</span>
    </div>
  </div>
}
