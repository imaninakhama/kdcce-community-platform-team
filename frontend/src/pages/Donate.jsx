import { useSearchParams } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { Check, Heart, ShieldCheck, Printer, Download, BadgeCheck, Smartphone, Phone, Mail, MapPin, AlertCircle, Loader2, XCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import PageHero from '../components/PageHero'
import { apiFetch, ApiError } from '../lib/api'
import { isValidKenyanPhone, PHONE_ERROR_MESSAGE, PHONE_MAX_LENGTH, sanitizePhoneInput } from '../lib/validation'

async function downloadReceiptPdf(node, receiptId) {
  // Receipts print on paper — always render them in light colors for the
  // PDF export regardless of the viewer's active site theme.
  const root = document.documentElement
  const wasDark = root.classList.contains('dark')
  if (wasDark) root.classList.remove('dark')
  try {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`${receiptId}.pdf`)
  } finally {
    if (wasDark) root.classList.add('dark')
  }
}

// M-Pesa polling: STK push confirmation is async (Safaricom calls our
// backend, not the browser), so the only way the browser finds out is by
// polling the donation's status. 3s is frequent enough to feel responsive
// without hammering the endpoint; 40 attempts (~2 minutes) covers a real
// donor entering their PIN, well past sandbox's usual few-second turnaround.
const MPESA_POLL_INTERVAL_MS = 3000
const MPESA_POLL_MAX_ATTEMPTS = 40

function buildReceipt(donation) {
  return {
    id: donation.receipt_id,
    txnId: donation.txn_id,
    mpesaReceiptNumber: donation.mpesa_receipt_number,
    status: donation.status,
    date: new Date(donation.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }),
    name: donation.donor_name,
    email: donation.donor_email,
    phone: donation.donor_phone,
    campaign: donation.campaign,
    amount: donation.amount,
    currency: donation.currency,
    frequency: donation.frequency,
    paymentMethod: donation.payment_method,
    message: donation.message
  }
}

export default function Donate() {
  const [params] = useSearchParams()
  const [amount, setAmount] = useState(params.get('amount') || '1000')
  const [frequency, setFrequency] = useState(params.get('frequency') || 'one-time')
  const [receipt, setReceipt] = useState(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Set only while an M-Pesa STK push has been sent and we're polling for
  // Safaricom's callback to land: holds the just-created donation (so the
  // receipt can still be built once confirmed) plus whether polling gave
  // up waiting for a resolution.
  const [mpesaPending, setMpesaPending] = useState(null)
  const [mpesaTimedOut, setMpesaTimedOut] = useState(false)
  // Set only once Safaricom's callback comes back with a non-success
  // result — a dedicated state (not just the generic form `error`) so a
  // failed payment gets its own clear screen, distinct from a validation
  // error on the form itself.
  const [mpesaFailed, setMpesaFailed] = useState(null)
  const receiptRef = useRef(null)
  const pollTimerRef = useRef(null)
  const presets = ['500', '1000', '2500', '5000']

  useEffect(() => () => window.clearTimeout(pollTimerRef.current), [])

  function pollMpesaStatus(donation, attempt = 1) {
    pollTimerRef.current = window.setTimeout(async () => {
      let status
      try {
        status = await apiFetch(`/api/donations/${donation.id}/status`, { auth: false })
      } catch {
        // A transient network hiccup shouldn't end the wait — just retry.
        pollMpesaStatus(donation, attempt + 1)
        return
      }
      if (status.status === 'Paid') {
        // Receipt only ever gets built here, from a status response the
        // backend only includes receipt fields in once it's actually
        // Paid — never from the original STK-push-sent response.
        setMpesaPending(null)
        setReceipt(buildReceipt({ ...donation, ...status }))
      } else if (status.status === 'Failed') {
        setMpesaPending(null)
        setMpesaFailed(status.failure_reason || 'The payment could not be completed. Please try again.')
      } else if (attempt >= MPESA_POLL_MAX_ATTEMPTS) {
        setMpesaTimedOut(true)
      } else {
        pollMpesaStatus(donation, attempt + 1)
      }
    }, MPESA_POLL_INTERVAL_MS)
  }

  async function handleDownload() {
    setGeneratingPdf(true)
    try { await downloadReceiptPdf(receiptRef.current, receipt.id) }
    finally { setGeneratingPdf(false) }
  }

  function handlePhoneChange(e) { e.target.value = sanitizePhoneInput(e.target.value) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMpesaTimedOut(false)
    setMpesaFailed(null)
    const f = new FormData(e.target)
    const phone = f.get('phone')
    if (!isValidKenyanPhone(phone)) { setError(PHONE_ERROR_MESSAGE); return }
    setSubmitting(true)
    try {
      const { donation } = await apiFetch('/api/donations', {
        method: 'POST',
        auth: false,
        body: {
          donor_name: f.get('name'),
          donor_email: f.get('email'),
          donor_phone: phone,
          amount: Number(amount),
          currency: 'KES',
          frequency,
          campaign: f.get('campaign'),
          payment_method: 'M-Pesa',
          message: f.get('message')
        }
      })
      // An STK push having been sent is not a successful payment — this
      // response is always Pending (the backend never returns Paid here),
      // so the receipt is never built from it. Only pollMpesaStatus above,
      // reacting to a confirmed Paid status, ever calls setReceipt.
      setMpesaPending(donation)
      pollMpesaStatus(donation)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function cancelMpesaWait() {
    window.clearTimeout(pollTimerRef.current)
    setMpesaPending(null)
    setMpesaTimedOut(false)
  }

  function tryAgain() {
    setMpesaFailed(null)
    setError('')
  }

  return <>
    <div className="print:hidden"><PageHero title="Make a difference today" eyebrow="Support / Donate" text="Your contribution helps fund meals, healthcare support, activities and dignity for older persons at our centre." image="/images/mary.jpg" /></div>
    <section className="container-k grid gap-10 py-20 lg:grid-cols-[1fr_420px] print:block print:py-6">
      {receipt ? <div>
        <div className="text-center print:hidden"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kOrange text-white"><Check /></div><h2 className="mt-6 font-display text-3xl font-bold text-kGreen">Thank you for your support.</h2><p className="mx-auto mt-3 max-w-md leading-7 text-kMuted">A donation receipt has been generated below. In the live version this will also be emailed to you automatically.</p></div>

        <div ref={receiptRef} className="mx-auto mt-8 max-w-xl overflow-hidden rounded-2xl border border-kBorderSoft bg-kSurface shadow-soft dark:shadow-none print:mt-0 print:shadow-none print:border-slate-300 print:bg-white">
          <div className="h-2 bg-gradient-to-r from-kGreen via-kOrange to-kLime" />
          <div className="flex flex-wrap items-center justify-between gap-4 bg-kCream p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-white shadow-soft"><img src="/images/logo.png" alt="KDCCE" className="h-10 w-auto object-contain" /></div>
              <div><div className="font-display text-lg font-bold text-kGreen">Kibera Day Care Centre for the Elderly</div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Official Donation Receipt</div></div>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-kLime/20 px-4 py-2 text-sm font-bold text-[#3f7d0a] dark:bg-kLime/15 dark:text-kLime"><BadgeCheck size={18} /> {receipt.status} &middot; Successful</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-kBorder px-6 py-4 text-sm">
            <div><span className="text-kMuted">Receipt No.</span> <span className="font-mono font-bold text-kGreen">{receipt.id}</span></div>
            <div><span className="text-kMuted">Transaction ID</span> <span className="font-mono font-bold text-kGreen">{receipt.txnId}</span></div>
            {receipt.mpesaReceiptNumber && <div><span className="text-kMuted">M-Pesa Receipt No.</span> <span className="font-mono font-bold text-kGreen">{receipt.mpesaReceiptNumber}</span></div>}
          </div>

          <div className="grid gap-x-8 gap-y-4 p-6 text-sm sm:grid-cols-2">
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Date &amp; Time</div><div className="mt-1 font-semibold text-kInk">{receipt.date}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Donor Name</div><div className="mt-1 font-semibold text-kInk">{receipt.name}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Donor Email</div><div className="mt-1 font-semibold text-kInk">{receipt.email}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Phone</div><div className="mt-1 font-semibold text-kInk">{receipt.phone || '—'}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Campaign / Fund</div><div className="mt-1 font-semibold text-kInk">{receipt.campaign}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Frequency</div><div className="mt-1 font-semibold text-kInk">{receipt.frequency === 'monthly' ? 'Monthly (recurring)' : 'One-time'}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Payment Method</div><div className="mt-1 flex items-center gap-2 font-semibold text-kInk"><Smartphone size={16} className="text-kOrange" /> {receipt.paymentMethod}</div></div>
            <div><div className="text-xs font-semibold uppercase tracking-wide text-kMuted">Currency</div><div className="mt-1 font-semibold text-kInk">{receipt.currency}</div></div>
          </div>

          <div className="mx-6 rounded-2xl bg-gradient-to-r from-kGreen to-kGreen2 p-6 text-center text-white">
            <div className="text-xs font-semibold uppercase tracking-widest text-kLime">Total Donation</div>
            <div className="mt-1 font-display text-4xl font-bold">{receipt.currency} {Number(receipt.amount).toLocaleString()}{receipt.frequency === 'monthly' ? <span className="text-lg font-semibold"> / month</span> : null}</div>
          </div>

          {receipt.message ? <div className="mx-6 mt-6 rounded-xl border-l-4 border-kOrange bg-kTint p-4 text-sm italic leading-6 text-kInk">&ldquo;{receipt.message}&rdquo;</div> : null}

          <p className="px-6 pb-2 pt-6 text-sm leading-7 text-kMuted">Thank you for your generosity. Your {receipt.frequency === 'monthly' ? 'monthly' : ''} gift helps fund meals, healthcare support, activities and dignity for older persons at our centre.</p>

          <div className="mt-6 grid gap-3 border-t border-kBorderSoft bg-kCream px-6 py-5 text-xs text-kMuted sm:grid-cols-3">
            <div className="flex items-center gap-2"><Phone size={14} className="text-kOrange" /> <a href="tel:+254796755846" className="hover:underline">+254 796 755 846</a></div>
            <div className="flex items-center gap-2"><Mail size={14} className="text-kOrange" /> info@kdcce.org</div>
            <div className="flex items-center gap-2"><MapPin size={14} className="text-kOrange" /> Kibera, Nairobi, Kenya</div>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 sm:flex-row print:hidden"><button onClick={() => window.print()} className="btn-green flex-1"><Printer size={16} /> Print receipt</button><button onClick={handleDownload} disabled={generatingPdf} className="btn-orange flex-1 disabled:opacity-60"><Download size={16} /> {generatingPdf ? 'Preparing PDF…' : 'Download receipt (PDF)'}</button></div>
        <p className="mt-5 text-center print:hidden"><button onClick={() => setReceipt(null)} className="text-sm font-bold text-kOrange">Make another donation</button></p>
      </div> : mpesaFailed ? <div className="card-k p-7 text-center md:p-9">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange"><XCircle size={26} /></div>
        <h2 className="mt-6 font-display text-2xl font-bold text-kGreen">Payment not completed</h2>
        <p className="mx-auto mt-3 max-w-sm leading-7 text-kMuted">{mpesaFailed}</p>
        <div className="mt-7"><button onClick={tryAgain} className="btn-orange">Try again</button></div>
      </div> : mpesaPending ? <div className="card-k p-7 text-center md:p-9">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange">
          {mpesaTimedOut ? <Smartphone size={26} /> : <Loader2 size={26} className="animate-spin" />}
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-kGreen">{mpesaTimedOut ? 'Still waiting on that payment' : 'Check your phone'}</h2>
        <p className="mx-auto mt-3 max-w-sm leading-7 text-kMuted">
          {mpesaTimedOut
            ? "This is taking longer than usual. If you've completed the prompt on your phone, keep waiting — otherwise you can start over."
            : <>We've sent an M-Pesa prompt to <span className="font-semibold text-kInk">{mpesaPending.donor_phone}</span>. Enter your PIN on your phone to confirm the KES {Number(mpesaPending.amount).toLocaleString()} donation — we're still waiting for that confirmation.</>}
        </p>
        <div className="mt-7 flex flex-col items-center gap-3">
          {mpesaTimedOut && <button onClick={() => { setMpesaTimedOut(false); pollMpesaStatus(mpesaPending) }} className="btn-orange">Keep waiting</button>}
          <button onClick={cancelMpesaWait} className="text-sm font-bold text-kGreen">Cancel and start over</button>
        </div>
      </div> : <form className="card-k p-7 md:p-9" onSubmit={handleSubmit}>
        <div className="flex items-center justify-between gap-4"><div><div className="eyebrow">Donation details</div><h2 className="mt-1 font-display text-3xl font-bold text-kGreen">Choose your support</h2></div><ShieldCheck className="text-kOrange" /></div>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">{presets.map(x => <button key={x} type="button" onClick={() => setAmount(x)} className={`rounded-xl border p-3 font-bold ${amount === x ? 'border-kOrange bg-kTint text-kOrange' : 'border-kBorder text-kGreen'}`}>KES {Number(x).toLocaleString()}</button>)}</div>
        <label className="mt-5 block text-sm font-semibold">Custom amount<input className="input-k mt-2" type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setFrequency('one-time')} className={`rounded-xl border p-4 text-left ${frequency === 'one-time' ? 'border-kOrange bg-kTint' : 'border-kBorder'}`}><div className="font-bold text-kGreen">One-time</div><div className="mt-1 text-xs text-kMuted">A single contribution</div></button>
          <button type="button" onClick={() => setFrequency('monthly')} className={`rounded-xl border p-4 text-left ${frequency === 'monthly' ? 'border-kOrange bg-kTint' : 'border-kBorder'}`}><div className="font-bold text-kGreen">Monthly</div><div className="mt-1 text-xs text-kMuted">Recurring support</div></button>
        </div>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-kOrange bg-kTint p-3 text-xs font-bold text-kOrange"><Smartphone size={18} /> Paying with M-Pesa</div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold">Full name<input name="name" className="input-k mt-2" placeholder="Your name" required /></label>
          <label className="text-sm font-semibold">Email<input name="email" className="input-k mt-2" type="email" placeholder="you@example.com" required /></label>
          <label className="text-sm font-semibold">M-Pesa phone number<input name="phone" className="input-k mt-2" placeholder="07XXXXXXXX" inputMode="tel" maxLength={PHONE_MAX_LENGTH} onChange={handlePhoneChange} required /></label>
          <label className="text-sm font-semibold">Campaign<select name="campaign" className="input-k mt-2"><option>General support</option><option>Sponsor an Elder</option><option>Feeding program</option><option>Skills training</option></select></label>
        </div>
        <label className="mt-4 block text-sm font-semibold">Message or dedication (optional)<textarea name="message" className="input-k mt-2 min-h-28" placeholder="e.g. In memory of..." /></label>
        {error && <div className="mt-5 flex items-start gap-2 rounded-xl bg-kTint p-3 text-sm text-kOrange"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}
        <button disabled={submitting} className="btn-orange mt-6 w-full disabled:opacity-60"><Heart size={17} /> {submitting ? 'Sending M-Pesa prompt…' : 'Donate'}</button>
        <p className="mt-3 text-center text-xs text-kMuted">You can safely try this payment option. You may receive a prompt on your phone, but no money will be charged.</p>
      </form>}
      <aside className="self-start rounded-2xl bg-kGreen p-7 text-white lg:sticky lg:top-28 print:hidden">
        <div className="text-sm font-semibold italic text-kLime">Your impact</div>
        <h3 className="mt-2 font-display text-3xl font-bold">KES {Number(amount || 0).toLocaleString()} {frequency === 'monthly' ? '/ month' : ''}</h3>
        <p className="mt-4 leading-7 text-white/70">A simple contribution can help fund meals, community activities, wellness support or a home visit.</p>
        <div className="mt-7 grid gap-4 text-sm text-white/80">
          <div className="flex gap-3"><Check size={18} className="text-orange-300" /> Secure checkout</div>
          <div className="flex gap-3"><Check size={18} className="text-orange-300" /> Confirmation after payment</div>
          <div className="flex gap-3"><Check size={18} className="text-orange-300" /> Detailed donation receipt</div>
        </div>
      </aside>
    </section>
  </>
}
