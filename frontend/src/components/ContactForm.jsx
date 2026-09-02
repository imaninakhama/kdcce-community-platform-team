import { Send, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { apiFetch, ApiError } from '../lib/api'

export default function ContactForm({ eyebrow = 'Send a message', title = 'How can we help?' }) {
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const f = new FormData(e.target)
    try {
      await apiFetch('/api/inbox', {
        method: 'POST',
        auth: false,
        body: {
          name: f.get('name'),
          email: f.get('email'),
          subject: f.get('subject'),
          message: f.get('message'),
        },
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) return <div className="py-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange"><Send/></div><h2 className="mt-5 font-display text-3xl font-bold text-kGreen">Message sent</h2><p className="mt-3 text-kMuted">Thank you — our team will get back to you soon.</p></div>

  return <form onSubmit={handleSubmit}>
    <div className="eyebrow">{eyebrow}</div>
    <h2 className="mt-2 font-display text-3xl font-bold text-kGreen">{title}</h2>
    {error && <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle size={16}/> {error}</div>}
    <div className="mt-7 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-semibold">Name<input name="name" className="input-k mt-2" required/></label>
      <label className="text-sm font-semibold">Email<input name="email" className="input-k mt-2" type="email" required/></label>
      <label className="text-sm font-semibold md:col-span-2">Subject<input name="subject" className="input-k mt-2" required/></label>
      <label className="text-sm font-semibold md:col-span-2">Message<textarea name="message" className="input-k mt-2 min-h-40" required/></label>
    </div>
    <button className="btn-orange mt-6" disabled={submitting}><Send size={16}/> {submitting ? 'Sending…' : 'Send Message'}</button>
  </form>
}
