import { useState } from 'react'
import { Search, Plus, Download } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import Modal from '../../components/admin/Modal'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useApiResource } from '../../lib/useApiResource'
import { downloadFile } from '../../lib/api'

const TYPES = ['Cash', 'Food', 'Equipment']
const CASH_STATUSES = ['Paid', 'Pending']
const IN_KIND_STATUSES = ['Received', 'Pending']
const TYPE_STYLES = { Cash: 'bg-kGreen/10 text-kGreen', Food: 'bg-kTint text-kOrange', Equipment: 'bg-kBorderSoft text-kMuted' }

function frequencyLabel(freq) { return freq === 'monthly' ? 'Monthly' : 'One-time' }

function summaryOf(d) {
  return d.donation_type === 'Cash'
    ? `KES ${Number(d.amount || 0).toLocaleString()}`
    : `${d.quantity ?? ''} ${d.unit || ''}`.trim() || d.item_description || '—'
}

function DonationForm({ onSubmit, saving }) {
  const [type, setType] = useState('Cash')
  const isCash = type === 'Cash'
  const statuses = isCash ? CASH_STATUSES : IN_KIND_STATUSES

  function submit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const payload = isCash
      ? {
          donation_type: 'Cash',
          donor_name: f.get('donor_name'), donor_email: f.get('donor_email'), donor_phone: f.get('donor_phone') || null,
          amount: Number(f.get('amount')), payment_method: f.get('payment_method') || null,
          campaign: f.get('campaign') || null, status: f.get('status'),
        }
      : {
          donation_type: type,
          donor_name: f.get('donor_name'), donor_email: f.get('donor_email') || null, donor_phone: f.get('donor_phone') || null,
          item_description: f.get('item_description'), quantity: Number(f.get('quantity')), unit: f.get('unit'),
          amount: f.get('amount') ? Number(f.get('amount')) : null,
          campaign: f.get('campaign') || null, status: f.get('status'),
        }
    onSubmit(payload)
  }

  return <form onSubmit={submit} className="grid gap-4">
    <label className="text-sm font-semibold">Type<select name="donation_type" value={type} onChange={e => setType(e.target.value)} className="input-k mt-2">{TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-4">
      <label className="text-sm font-semibold">Donor name<input name="donor_name" className="input-k mt-2" required /></label>
      <label className="text-sm font-semibold">Email{!isCash && ' (optional)'}<input name="donor_email" type="email" className="input-k mt-2" required={isCash} /></label>
    </div>
    <label className="text-sm font-semibold">Phone (optional)<input name="donor_phone" className="input-k mt-2" /></label>

    {isCash ? <>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-sm font-semibold">Amount (KES)<input name="amount" type="number" min="1" className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Payment method<select name="payment_method" defaultValue="M-Pesa" className="input-k mt-2"><option>M-Pesa</option><option>Card (Stripe)</option><option>PayPal</option></select></label>
      </div>
    </> : <>
      <label className="text-sm font-semibold">Item description<textarea name="item_description" rows={2} className="input-k mt-2" required /></label>
      <div className="grid grid-cols-3 gap-4">
        <label className="text-sm font-semibold">Quantity<input name="quantity" type="number" min="0.01" step="0.01" className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Unit<input name="unit" placeholder="kg, units..." className="input-k mt-2" required /></label>
        <label className="text-sm font-semibold">Est. value (optional)<input name="amount" type="number" min="0" className="input-k mt-2" /></label>
      </div>
    </>}

    <div className="grid grid-cols-2 gap-4">
      <label className="text-sm font-semibold">Purpose / category<input name="campaign" placeholder="e.g. Feeding program" className="input-k mt-2" /></label>
      <label className="text-sm font-semibold">Status<select name="status" defaultValue={statuses[0]} className="input-k mt-2">{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
    </div>
    <button disabled={saving} className="btn-orange mt-2 disabled:opacity-60">{saving ? 'Saving…' : 'Log donation'}</button>
  </form>
}

export default function DonationsManager({ showToast }) {
  const donationsApi = useApiResource('/api/donations', { listKey: 'donations', itemKey: 'donation' })
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const filtered = donationsApi.items.filter(d =>
    (typeFilter === 'All' || d.donation_type === typeFilter) &&
    (statusFilter === 'All' || d.status === statusFilter) &&
    (d.donor_name.toLowerCase().includes(q.toLowerCase()) || (d.donor_email || '').toLowerCase().includes(q.toLowerCase()))
  )

  // Logging a new donation is the only write path here — payment
  // details/status are view-only once recorded (no edit/patch action
  // anywhere in this page, and the backend no longer exposes one either).
  async function save(payload) {
    setSaving(true)
    try {
      await donationsApi.create(payload, '/api/admin/donations')
      showToast('Donation logged')
      setFormOpen(false)
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  async function downloadCsvExport() {
    try { await downloadFile('/api/donations/export.csv', 'donations.csv') }
    catch (err) { showToast(errorMessage(err)) }
  }

  return <Shell>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><div className="eyebrow">Manage</div><h1 className="font-display text-3xl font-bold text-kGreen">Donations</h1></div>
      <div className="flex gap-2"><button onClick={() => setFormOpen(true)} className="btn-green"><Plus size={16} /> Log donation</button><button onClick={downloadCsvExport} className="btn-orange"><Download size={16} /> CSV</button></div>
    </div>
    {donationsApi.loading ? <LoadingState label="donations" /> : donationsApi.error ? <ErrorState message={donationsApi.error} onRetry={donationsApi.reload} /> : <div className="card-k mt-7 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-kBorderSoft p-5 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-kMuted" size={17} /><input value={q} onChange={e => setQ(e.target.value)} className="input-k pl-10" placeholder="Search donor or email..." /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All</option><option>Paid</option><option>Pending</option><option>Received</option><option>Failed</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-kBorderSoft text-xs uppercase tracking-wider text-kMuted"><tr><th className="px-5 py-4">Donor</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Value</th><th className="px-5 py-4">Frequency</th><th className="px-5 py-4">Status</th></tr></thead><tbody>
        {filtered.map(d => <tr key={d.id} className="border-b border-kBorderSoft"><td className="px-5 py-4"><div className="font-semibold text-kInk">{d.donor_name}</div><div className="text-xs text-kMuted">{d.donor_email || 'No email given'}</div></td><td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_STYLES[d.donation_type]}`}>{d.donation_type}</span></td><td className="px-5 py-4 text-kMuted">{summaryOf(d)}</td><td className="px-5 py-4 text-kMuted">{frequencyLabel(d.frequency)}</td><td className="px-5 py-4 text-kMuted">{d.status}</td></tr>)}
        {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-kMuted">No donations match your search.</td></tr>}
      </tbody></table></div>
    </div>}
    {formOpen && <Modal title="Log donation" onClose={() => setFormOpen(false)}>
      <DonationForm onSubmit={save} saving={saving} />
    </Modal>}
  </Shell>
}
