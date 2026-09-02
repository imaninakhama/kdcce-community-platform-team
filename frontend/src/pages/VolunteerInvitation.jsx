import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, Clock, HeartHandshake, XCircle } from 'lucide-react'
import ThemeToggle from '../theme/ThemeToggle'
import { apiFetch, setSession, ApiError } from '../lib/api'

const ERROR_COPY = {
  404: { icon: <XCircle />, title: 'Invitation not found', text: "This invitation link isn't valid. Double-check the link from your email, or sign in if you already have an account." },
  409: { icon: <CheckCircle2 />, title: 'Already used', text: 'This invitation has already been used. You can sign in with your existing account any time.' },
  410: { icon: <Clock />, title: 'Invitation expired', text: 'This invitation link has expired. Your account is still there — you can sign in any time with the email and password you registered with.' },
}
const DEFAULT_ERROR = { icon: <XCircle />, title: "Something didn't work", text: 'We ran into a problem opening this invitation. Please try again in a moment, or sign in directly.' }

function Screen({ icon, title, children, action }) {
  return <div className="grid min-h-[80vh] place-items-center bg-kCream px-5">
    <div className="w-full max-w-md text-center">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <div className="card-k p-9">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange">{icon}</div>
        <h1 className="mt-5 font-display text-2xl font-bold text-kGreen">{title}</h1>
        <div className="mt-3 text-sm leading-6 text-kMuted">{children}</div>
        {action}
      </div>
    </div>
  </div>
}

export default function VolunteerInvitation() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | ready | accepting | accepted | error
  const [volunteerName, setVolunteerName] = useState('')
  const [errorInfo, setErrorInfo] = useState(DEFAULT_ERROR)

  useEffect(() => {
    let cancelled = false
    apiFetch(`/api/volunteers/invitations/${token}`, { auth: false })
      .then(res => { if (!cancelled) { setVolunteerName(res.volunteer_name); setStatus('ready') } })
      .catch(err => {
        if (cancelled) return
        setErrorInfo((err instanceof ApiError && ERROR_COPY[err.status]) || { ...DEFAULT_ERROR, text: err instanceof ApiError ? err.message : DEFAULT_ERROR.text })
        setStatus('error')
      })
    return () => { cancelled = true }
  }, [token])

  async function accept() {
    setStatus('accepting')
    try {
      const { access_token, refresh_token, user } = await apiFetch(`/api/volunteers/invitations/${token}/accept`, { method: 'POST', auth: false })
      setSession(access_token, user, refresh_token)
      setStatus('accepted')
    } catch (err) {
      setErrorInfo((err instanceof ApiError && ERROR_COPY[err.status]) || { ...DEFAULT_ERROR, text: err instanceof ApiError ? err.message : DEFAULT_ERROR.text })
      setStatus('error')
    }
  }

  if (status === 'checking') {
    return <Screen icon={<HeartHandshake />} title="Checking your invitation…">Just a moment.</Screen>
  }

  if (status === 'error') {
    return <Screen icon={errorInfo.icon} title={errorInfo.title} action={<Link to="/admin/login" className="btn-orange mt-7 inline-flex">Sign in</Link>}>
      {errorInfo.text}
    </Screen>
  }

  if (status === 'accepted') {
    return <Screen icon={<CheckCircle2 />} title="You're all set!" action={<button onClick={() => navigate('/volunteer')} className="btn-orange mt-7 w-full">Go to your volunteer portal</button>}>
      Welcome to the team — your account is ready and you're signed in.
    </Screen>
  }

  return <Screen
    icon={<HeartHandshake />}
    title={volunteerName ? `Welcome, ${volunteerName.split(' ')[0]}!` : 'Welcome!'}
    action={<button onClick={accept} disabled={status === 'accepting'} className="btn-orange mt-7 w-full disabled:opacity-60">{status === 'accepting' ? 'Accepting…' : 'Accept & Continue'}</button>}
  >
    Your KDCCE volunteer application has been approved. Accept this invitation to get straight into your volunteer portal.
  </Screen>
}
