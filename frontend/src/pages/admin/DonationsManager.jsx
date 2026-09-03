import { useState } from 'react'
import { Search, Plus, Download, Wallet, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import Modal from '../../components/admin/Modal'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useApiResource } from '../../lib/useApiResource'
import { downloadFile } from '../../lib/api'

const TYPES = ['Cash', 'Food', 'Equipment']
const CASH_STATUSES = ['Paid', 'Pending']
const IN_KIND_STATUSES = ['Received', 'Pending']
const TYPE_STYLES = { Cash: 'bg-kGreen/10 text-kGreen', Food: 'bg-kTint text-kOrange', Equipment: 'bg-kBorderSoft text-kMuted' }
// Received (in-kind) and Paid (cash) are both "the donation completed
// successfully" — same treatment, distinct from Pending/Failed.
const STATUS_STYLES = {
  Paid: { cls: 'bg-kGreen/10 text-kGreen', Icon: CheckCircle2 },
  Received: { cls: 'bg-kGreen/10 text-kGreen', Icon: CheckCircle2 },
  Pending: { cls: 'bg-amber-100 text-amber-700', Icon: Clock },
  Failed: { cls: 'bg-red-100 text-red-700', Icon: XCircle },
}

function frequencyLabel(freq) { return freq === 'monthly' ? 'Monthly' : 'One-time' }

function summaryOf(d) {
  return d.donation_type === 'Cash'
    ? `KES ${Number(d.amount || 0).toLocaleString()}`
    : `${d.quantity ?? ''} ${d.unit || ''}`.trim() || d.item_description || '—'
}

function fmtDate(iso) { return new Date(iso).toLocaleDateString([], { dateStyle: 'medium' }) }

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

function SummaryCard({ label, value, sub, Icon, tone }) {
  return <div className="card-k flex items-start gap-4 p-5">
    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={20} /></div>
    <div className="min-w-0"><div className="text-sm text-kMuted">{label}</div><div className="mt-1 font-display text-2xl font-bold text-kGreen">{value}</div><div className="mt-1 truncate text-xs text-kMuted">{sub}</div></div>
  </div>
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

  // Only a confirmed-successful CASH payment counts toward the money
  // total — same rule as the admin Overview stat card (see
  // AdminDashboard.jsx) and the server-side cash_total in
  // app/reports/routes.py: Pending/Failed rows are real records, never
  // received money. "Successful"/"Pending"/"Failed" below are a count
  // breakdown across EVERY donation record (Cash and in-kind alike) —
  // a different, non-monetary metric, so Received (an in-kind item
  // successfully handed over) counts as successful there too.
  const all = donationsApi.items
  const totalAmount = all.filter(d => d.donation_type === 'Cash' && d.status === 'Paid').reduce((s, d) => s + Number(d.amount || 0), 0)
  const successfulCount = all.filter(d => d.status === 'Paid' || d.status === 'Received').length
  const pendingCount = all.filter(d => d.status === 'Pending').length
  const failedCount = all.filter(d => d.status === 'Failed').length
  const successPct = all.length ? Math.round((successfulCount / all.length) * 100) : 0

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
      <div><h1 className="font-display text-3xl font-bold text-kGreen">Donations</h1><p className="mt-1 text-sm text-kMuted">Manage and track all donations to support the community.</p></div>
      <div className="flex gap-2"><button onClick={() => setFormOpen(true)} className="btn-green"><Plus size={16} /> Log donation</button><button onClick={downloadCsvExport} className="btn-orange"><Download size={16} /> Export CSV</button></div>
    </div>

    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryCard label="Total Donations" value={`KES ${totalAmount.toLocaleString()}`} sub="Confirmed cash payments" Icon={Wallet} tone="bg-kGreen/10 text-kGreen" />
      <SummaryCard label="Total Records" value={all.length.toLocaleString()} sub="All logged donations" Icon={Users} tone="bg-kTint text-kOrange" />
      <SummaryCard label="Successful" value={successfulCount.toLocaleString()} sub={`${successPct}% of all donations`} Icon={CheckCircle2} tone="bg-kGreen/10 text-kGreen" />
      <SummaryCard label="Pending" value={pendingCount.toLocaleString()} sub="Awaiting confirmation" Icon={Clock} tone="bg-amber-100 text-amber-700" />
      <SummaryCard label="Failed" value={failedCount.toLocaleString()} sub="Unsuccessful payments" Icon={XCircle} tone="bg-red-100 text-red-700" />
    </div>

    {donationsApi.loading ? <LoadingState label="donations" /> : donationsApi.error ? <ErrorState message={donationsApi.error} onRetry={donationsApi.reload} /> : <div className="card-k mt-6 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-kBorderSoft p-5 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-kMuted" size={17} /><input value={q} onChange={e => setQ(e.target.value)} className="input-k pl-10" placeholder="Search donor name or email address..." /></div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All status</option><option>Paid</option><option>Pending</option><option>Received</option><option>Failed</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-kBorderSoft text-xs uppercase tracking-wider text-kMuted"><tr><th className="px-5 py-4">Donor</th><th className="px-5 py-4">Type</th><th className="px-5 py-4">Value</th><th className="px-5 py-4">Frequency</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th></tr></thead><tbody>
        {filtered.map(d => { const status = STATUS_STYLES[d.status] || { cls: 'bg-kBorderSoft text-kMuted', Icon: Clock }; const StatusIcon = status.Icon; return <tr key={d.id} className="border-b border-kBorderSoft">
          <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kTint text-xs font-bold text-kGreen">{initialsOf(d.donor_name)}</div><div><div className="font-semibold text-kInk">{d.donor_name}</div><div className="text-xs text-kMuted">{d.donor_email || 'No email given'}</div></div></div></td>
          <td className="px-5 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_STYLES[d.donation_type]}`}>{d.donation_type}</span></td>
          <td className="px-5 py-4 text-kMuted">{summaryOf(d)}</td>
          <td className="px-5 py-4 text-kMuted">{frequencyLabel(d.frequency)}</td>
          <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.cls}`}><StatusIcon size={13} /> {d.status}</span></td>
          <td className="px-5 py-4 text-kMuted">{fmtDate(d.created_at)}</td>
        </tr> })}
        {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-kMuted">No donations match your search.</td></tr>}
      </tbody></table></div>
      <div className="border-t border-kBorderSoft px-5 py-4 text-sm text-kMuted">Showing {filtered.length.toLocaleString()} of {all.length.toLocaleString()} donations</div>
    </div>}
    {formOpen && <Modal title="Log donation" onClose={() => setFormOpen(false)}>
      <DonationForm onSubmit={save} saving={saving} />
    </Modal>}
  </Shell>
}
