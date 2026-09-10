import { Search } from 'lucide-react'

// Search + filter row, styled to sit as the top strip of a card-k table
// wrapper (the pattern DonationsManager established). `children` holds any
// extra <select>/filter controls; pass none for a search-only bar.
export default function FilterBar({ value, onChange, placeholder = 'Search…', children }) {
  return <div className="flex flex-col gap-3 border-b border-kBorderSoft p-5 sm:flex-row">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-3.5 text-kMuted" size={17} />
      <input value={value} onChange={e => onChange(e.target.value)} className="input-k pl-10" placeholder={placeholder} />
    </div>
    {children}
  </div>
}
