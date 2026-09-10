import { useState } from 'react'
import { Plus, Download, Wallet, Users, CheckCircle2, Clock, XCircle } from 'lucide-react'
import Shell from '../../components/admin/Shell'
import Modal from '../../components/admin/Modal'
import PageHeader from '../../components/shared/PageHeader'
import KpiCard from '../../components/shared/KpiCard'
import StatusBadge from '../../components/shared/StatusBadge'
import FilterBar from '../../components/shared/FilterBar'
import DataTable from '../../components/shared/DataTable'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { useApiResource } from '../../lib/useApiResource'
import { downloadFile } from '../../lib/api'
import { isValidKenyanPhone, PHONE_ERROR_MESSAGE, PHONE_MAX_LENGTH, sanitizePhoneInput } from '../../lib/validation'

const TYPES = ['Cash', 'Food', 'Equipment']
const CASH_STATUSES = ['Paid', 'Pending']
const IN_KIND_STATUSES = ['Received', 'Pending']
const TYPE_TONE = { Cash: 'success', Food: 'accent', Equipment: 'neutral' }
// Received (in-kind) and Paid (cash) are both "the donation completed
// successfully" — same treatment, distinct from Pending/Failed.
const STATUS_STYLES = {
  Paid: { tone: 'success', Icon: CheckCircle2 },
  Received: { tone: 'success', Icon: CheckCircle2 },
  Pending: { tone: 'warning', Icon: Clock },
  Failed: { tone: 'danger', Icon: XCircle },
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

function DonationForm({ onSubmit, saving }) {
  const [type, setType] = useState('Cash')
  const [phoneError, setPhoneError] = useState('')
  const isCash = type === 'Cash'
  const statuses = isCash ? CASH_STATUSES : IN_KIND_STATUSES

  function handlePhoneChange(e) {
    e.target.value = sanitizePhoneInput(e.target.value)
    if (phoneError) setPhoneError('')
  }
  function handlePhoneBlur(e) {
    const value = sanitizePhoneInput(e.target.value)
    e.target.value = value
    setPhoneError(value && !isValidKenyanPhone(value) ? PHONE_ERROR_MESSAGE : '')
  }

  function submit(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const phone = f.get('donor_phone') || null
    if (phone && !isValidKenyanPhone(phone)) { setPhoneError(PHONE_ERROR_MESSAGE); return }
    setPhoneError('')
    const payload = isCash
      ? {
          donation_type: 'Cash',
          donor_name: f.get('donor_name'), donor_email: f.get('donor_email'), donor_phone: phone,
          amount: Number(f.get('amount')), payment_method: f.get('payment_method') || null,
          campaign: f.get('campaign') || null, status: f.get('status'),
        }
      : {
          donation_type: type,
          donor_name: f.get('donor_name'), donor_email: f.get('donor_email') || null, donor_phone: phone,
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
    <label className="text-sm font-semibold">Phone (optional)
      <input
        name="donor_phone" placeholder="07XXXXXXXX" inputMode="tel" maxLength={PHONE_MAX_LENGTH}
        className={`input-k mt-2 ${phoneError ? 'border-red-400' : ''}`}
        onChange={handlePhoneChange} onBlur={handlePhoneBlur}
        aria-invalid={!!phoneError}
      />
      {phoneError && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{phoneError}</p>}
    </label>

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
    <PageHeader eyebrow="Fundraising & content" title="Donations" subtitle="Manage and track all donations to support the community." actions={<>
      <button onClick={() => setFormOpen(true)} className="btn-green"><Plus size={16} /> Log donation</button>
      <button onClick={downloadCsvExport} className="btn-orange"><Download size={16} /> Export CSV</button>
    </>} />

    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard label="Total Donations" value={`KES ${totalAmount.toLocaleString()}`} sub="Confirmed cash payments" icon={Wallet} tone="primary" />
      <KpiCard label="Total Records" value={all.length.toLocaleString()} sub="All logged donations" icon={Users} tone="neutral" />
      <KpiCard label="Successful" value={successfulCount.toLocaleString()} sub={`${successPct}% of all donations`} icon={CheckCircle2} tone="success" />
      <KpiCard label="Pending" value={pendingCount.toLocaleString()} sub="Awaiting confirmation" icon={Clock} tone="warning" />
      <KpiCard label="Failed" value={failedCount.toLocaleString()} sub="Unsuccessful payments" icon={XCircle} tone="danger" />
    </div>

    {donationsApi.loading ? <LoadingState label="donations" /> : donationsApi.error ? <ErrorState message={donationsApi.error} onRetry={donationsApi.reload} /> : <div className="card-k mt-6 overflow-hidden">
      <FilterBar value={q} onChange={setQ} placeholder="Search donor name or email address...">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="rounded-xl border border-kBorder bg-kSurface px-4 py-3 text-sm text-kInk"><option>All status</option><option>Paid</option><option>Pending</option><option>Received</option><option>Failed</option></select>
      </FilterBar>
      <DataTable
        emptyMessage="No donations match your search."
        columns={[
          { key: 'donor', header: 'Donor', cell: d => <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-kGreen/10 text-xs font-bold text-kGreen">{initialsOf(d.donor_name)}</div><div><div className="font-semibold text-kInk">{d.donor_name}</div><div className="text-xs text-kMuted">{d.donor_email || 'No email given'}</div></div></div> },
          { key: 'type', header: 'Type', cell: d => <StatusBadge tone={TYPE_TONE[d.donation_type]}>{d.donation_type}</StatusBadge> },
          { key: 'value', header: 'Value', cell: d => <span className="text-kMuted">{summaryOf(d)}</span> },
          { key: 'frequency', header: 'Frequency', cell: d => <span className="text-kMuted">{frequencyLabel(d.frequency)}</span> },
          { key: 'status', header: 'Status', cell: d => { const s = STATUS_STYLES[d.status] || { tone: 'neutral', Icon: Clock }; return <StatusBadge tone={s.tone} icon={s.Icon}>{d.status}</StatusBadge> } },
          { key: 'date', header: 'Date', cell: d => <span className="text-kMuted">{fmtDate(d.created_at)}</span> },
        ]}
        rows={filtered}
      />
      <div className="border-t border-kBorderSoft px-5 py-4 text-sm text-kMuted">Showing {filtered.length.toLocaleString()} of {all.length.toLocaleString()} donations</div>
    </div>}
    {formOpen && <Modal title="Log donation" onClose={() => setFormOpen(false)}>
      <DonationForm onSubmit={save} saving={saving} />
    </Modal>}
  </Shell>
}
