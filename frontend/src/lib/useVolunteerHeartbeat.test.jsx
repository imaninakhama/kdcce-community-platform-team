import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { useVolunteerHeartbeat } from './useVolunteerHeartbeat'

vi.mock('./api', async importOriginal => ({ ...(await importOriginal()), apiFetch: vi.fn(() => Promise.resolve(null)) }))
import { apiFetch } from './api'

function HeartbeatProbe() {
  useVolunteerHeartbeat()
  return null
}

describe('useVolunteerHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    apiFetch.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('sends a heartbeat immediately on mount', () => {
    render(<HeartbeatProbe />)
    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch).toHaveBeenCalledWith('/api/auth/heartbeat', { method: 'POST' })
  })

  it('sends another heartbeat once the interval elapses', () => {
    render(<HeartbeatProbe />)
    vi.advanceTimersByTime(60_000)
    expect(apiFetch).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(60_000)
    expect(apiFetch).toHaveBeenCalledTimes(3)
  })

  it('stops sending heartbeats after unmount', () => {
    const { unmount } = render(<HeartbeatProbe />)
    unmount()
    apiFetch.mockClear()
    vi.advanceTimersByTime(180_000)
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('never lets a failed ping surface as an unhandled rejection', async () => {
    apiFetch.mockImplementationOnce(() => Promise.reject(new Error('offline')))
    expect(() => render(<HeartbeatProbe />)).not.toThrow()
  })
})
