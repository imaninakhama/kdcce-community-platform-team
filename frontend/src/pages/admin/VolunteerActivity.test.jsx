import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VolunteerActivity from './VolunteerActivity'

vi.mock('../../lib/api', async importOriginal => ({ ...(await importOriginal()), apiFetch: vi.fn() }))
import { apiFetch } from '../../lib/api'

const ONLINE_SESSION = {
  id: 1,
  volunteer_id: 7,
  volunteer_name: 'Amina Otieno',
  volunteer_email: 'amina@example.com',
  login_at: '2026-09-11T08:00:00+00:00',
  logout_at: null,
  last_seen_at: '2026-09-11T08:05:00+00:00',
  duration_seconds: 300,
  status: 'Online',
}

const CLOSED_SESSION = {
  id: 2,
  volunteer_id: 8,
  volunteer_name: 'Brian Kamau',
  volunteer_email: 'brian@example.com',
  login_at: '2026-09-10T08:00:00+00:00',
  logout_at: '2026-09-10T09:30:00+00:00',
  last_seen_at: '2026-09-10T09:29:00+00:00',
  duration_seconds: 5400,
  status: 'Offline',
}

function mockApi(onlineSessions, allSessions) {
  apiFetch.mockImplementation(path => {
    if (path === '/api/admin/volunteer-sessions/online') return Promise.resolve({ sessions: onlineSessions })
    if (path === '/api/admin/volunteer-sessions') return Promise.resolve({ sessions: allSessions })
    return Promise.reject(new Error(`unexpected path: ${path}`))
  })
}

describe('VolunteerActivity', () => {
  beforeEach(() => { apiFetch.mockReset() })
  afterEach(() => { cleanup() })

  it('shows currently-online volunteers by default', async () => {
    mockApi([ONLINE_SESSION], [ONLINE_SESSION, CLOSED_SESSION])
    render(<VolunteerActivity />)

    expect(await screen.findByText('Amina Otieno')).toBeInTheDocument()
    expect(screen.getByText('amina@example.com')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/admin/volunteer-sessions/online')
  })

  it('switches to Login History and shows every session with its duration', async () => {
    mockApi([ONLINE_SESSION], [ONLINE_SESSION, CLOSED_SESSION])
    render(<VolunteerActivity />)
    await screen.findByText('Amina Otieno')

    await userEvent.click(screen.getByRole('button', { name: /Login History/i }))

    expect(await screen.findByText('Brian Kamau')).toBeInTheDocument()
    expect(screen.getByText('Amina Otieno')).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledWith('/api/admin/volunteer-sessions')
  })

  it('shows an active badge instead of a logout time for an open session', async () => {
    mockApi([ONLINE_SESSION], [ONLINE_SESSION])
    render(<VolunteerActivity />)
    await screen.findByText('Amina Otieno')
    await userEvent.click(screen.getByRole('button', { name: /Login History/i }))

    const row = (await screen.findByText('Amina Otieno')).closest('tr')
    expect(within(row).getByText('Active')).toBeInTheDocument()
  })

  it('shows an empty state when nobody is currently online', async () => {
    mockApi([], [])
    render(<VolunteerActivity />)
    expect(await screen.findByText('No volunteers online')).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    apiFetch.mockRejectedValue(new Error('boom'))
    render(<VolunteerActivity />)
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument()
  })
})
