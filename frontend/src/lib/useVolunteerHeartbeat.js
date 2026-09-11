import { useEffect } from 'react'
import { apiFetch } from './api'

// Kept comfortably below the backend's VOLUNTEER_SESSION_ONLINE_WINDOW
// (150s, see app/models.py) so one missed beat — a network blip, a
// backgrounded tab throttling timers — doesn't flap a volunteer's status
// to Offline and back.
const HEARTBEAT_INTERVAL_MS = 60_000

/** Pings POST /api/auth/heartbeat on an interval so this volunteer's
 * VolunteerSession.last_seen_at stays fresh while the portal is open —
 * this alone is what the admin "Currently Online" view is driven by.
 * A no-op server-side for anyone without an open session, so mounting
 * this is always safe. Errors are swallowed: a failed background ping
 * must never surface as a user-facing error or interrupt anything. */
export function useVolunteerHeartbeat() {
  useEffect(() => {
    let cancelled = false
    function beat() {
      apiFetch('/api/auth/heartbeat', { method: 'POST' }).catch(() => {})
    }
    beat()
    const id = window.setInterval(() => { if (!cancelled) beat() }, HEARTBEAT_INTERVAL_MS)
    return () => { cancelled = true; window.clearInterval(id) }
  }, [])
}
