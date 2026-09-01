import { useState } from 'react'
import { ApiError } from '../../lib/api'

export function useToast() {
  const [toast, setToast] = useState('')
  function show(message) { setToast(message); window.clearTimeout(show._t); show._t = window.setTimeout(() => setToast(''), 2200) }
  return [toast, show]
}

export function errorMessage(err) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export function LoadingState({ label }) { return <div className="card-k mt-7 p-10 text-center text-sm text-kMuted">Loading {label}…</div> }
export function ErrorState({ message, onRetry }) { return <div className="card-k mt-7 p-10 text-center"><p className="text-sm text-kOrange">{message}</p><button onClick={onRetry} className="mt-4 text-sm font-bold text-kGreen">Try again</button></div> }

export function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="card-k mt-7 p-10 text-center">
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-kMuted" />}
      <p className="text-sm font-bold text-kInk">{title}</p>
      {message && <p className="mt-1 text-sm text-kMuted">{message}</p>}
    </div>
  )
}

export function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
