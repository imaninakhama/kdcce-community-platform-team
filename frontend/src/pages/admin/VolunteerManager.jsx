import { useState } from 'react'
import { Search } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import VolunteerDetailModal from '../../components/admin/VolunteerDetailModal'
import { LoadingState, ErrorState } from '../../components/admin/adminHelpers'
import { useApiResource } from '../../lib/useApiResource'

const STATUS_STYLES = {
  Pending: 'bg-kTint text-kOrange',
  Verified: 'bg-kGreen/10 text-kGreen',
  Rejected: 'bg-red-100 text-red-700',
}

export default function VolunteerManager({ showToast }) {
  const volunteersApi = useApiResource('/api/volunteers', { listKey: 'volunteers', itemKey: 'volunteer' })
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [reviewing, setReviewing] = useState(null)

  const filtered = volunteersApi.items.filter(v =>
    (statusFilter === 'All' || v.status === statusFilter) &&
    (v.name.toLowerCase().includes(q.toLowerCase()) || v.email.toLowerCase().includes(q.toLowerCase()))
  )

  return <Shell>
    <div><div className="eyebrow">Manage</div><h1 className="font-display text-3xl font-bold text-kGreen">Volunteer Applications</h1></div>

    {volunteersApi.loading ? <LoadingState label="volunteers" /> : volunteersApi.error ? <ErrorState message={volunteersApi.error} onRetry={volunteersApi.reload} /> : <div className="card-k mt-7 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-kBorderSoft p-5 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-kMuted" size={17} /><input value={q} onChange={e => setQ(e.target.value)} className="input-k pl-10" placeholder="Search name or email..." /></div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All</option><option>Pending</option><option>Verified</option><option>Rejected</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-kBorderSoft text-xs uppercase tracking-wider text-kMuted"><tr><th className="px-5 py-4">Name</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Skills</th><th className="px-5 py-4">Availability</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody>
        {filtered.map(v => <tr key={v.id} className="border-b border-kBorderSoft"><td className="px-5 py-4 font-semibold text-kInk">{v.name}</td><td className="px-5 py-4 text-kMuted">{v.email}{v.phone ? ` · ${v.phone}` : ''}</td><td className="px-5 py-4 text-kMuted">{v.skills || '—'}</td><td className="px-5 py-4 text-kMuted">{v.availability || '—'}</td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[v.status]}`}>{v.status}</span></td><td className="px-5 py-4"><button onClick={() => setReviewing(v)} className="text-xs font-bold text-kOrange">{v.status === 'Pending' ? 'Review' : 'View'}</button></td></tr>)}
        {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-kMuted">No volunteers match your search.</td></tr>}
      </tbody></table></div>
    </div>}

    {reviewing && <VolunteerDetailModal volunteer={reviewing} onClose={() => setReviewing(null)} onDecide={(id, data) => volunteersApi.patch(id, data)} showToast={showToast} />}
  </Shell>
}
