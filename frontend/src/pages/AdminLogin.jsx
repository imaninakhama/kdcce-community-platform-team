import { useRef, useState } from 'react'
import { LockKeyhole, ShieldCheck, AlertCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '../theme/ThemeToggle'
import PasswordField from '../components/PasswordField'
import { apiFetch, setSession, ApiError } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function AdminLogin(){
  const navigate = useNavigate()
  const location = useLocation()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const fieldRefs = useRef({})

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    const f = new FormData(e.target)

    const email = (f.get('email') || '').trim()
    const password = f.get('password') || ''
    const newErrors = {
      email: !email ? 'Please enter your email address.' : !EMAIL_RE.test(email) ? 'Please enter a valid email address.' : '',
      password: !password ? 'Please enter your password.' : '',
    }
    setFieldErrors(newErrors)
    const firstInvalid = ['email', 'password'].find(name => newErrors[name])
    if (firstInvalid) { fieldRefs.current[firstInvalid]?.focus(); return }

    setSigningIn(true)
    try {
      const { access_token, refresh_token, user } = await apiFetch('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: f.get('email'), password: f.get('password') }
      })
      setSession(access_token, user, refresh_token)
      if (user.role === 'volunteer') { navigate('/volunteer'); return }
      // Return to the admin page originally requested (AdminDashboard's
      // auth gate redirects here with the attempted location in state) —
      // only for a staff/admin account, never for a path a volunteer was
      // bounced from, since that path was never meant for them.
      const from = location.state?.from
      navigate(from && `${from.pathname}${from.search || ''}`.startsWith('/admin') && from.pathname !== '/admin/login' ? `${from.pathname}${from.search || ''}` : '/admin')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.')
      setSigningIn(false)
    }
  }

  return <div className="relative min-h-[75vh] overflow-hidden py-20">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/admin-login-bg.jpg')" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-kInk/80 via-kInk/70 to-kInk/85" />
    <div className="relative mx-auto max-w-md px-5">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <div className="mb-6 text-center">
        <img src="/images/logo.png" alt="KDCCE" className="mx-auto h-20 w-auto object-contain"/>
        <div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-kGreen text-white"><ShieldCheck/></div>
        <h1 className="mt-5 font-display text-3xl font-bold text-white">Staff portal</h1>
        <p className="mt-2 text-sm text-white/80">Sign in with your staff, admin, or volunteer account.</p>
      </div>
      <form className="card-k p-7" onSubmit={handleSubmit} noValidate>
        {error && <div className="mb-5 flex items-start gap-2 rounded-xl bg-kTint p-3 text-sm text-kOrange"><AlertCircle size={16} className="mt-0.5 shrink-0"/> {error}</div>}
        <label htmlFor="login-email" className="text-sm font-semibold">
          Email <span className="text-kOrange" aria-hidden="true">*</span>
          <input
            ref={el => (fieldRefs.current.email = el)}
            id="login-email" name="email" className={`input-k mt-2 ${fieldErrors.email ? 'border-red-400' : ''}`}
            type="email" placeholder="staff@kdcce.org" required
            aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            onChange={() => fieldErrors.email && setFieldErrors(er => ({ ...er, email: '' }))}
          />
          {fieldErrors.email && <p id="login-email-error" role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{fieldErrors.email}</p>}
        </label>
        <div className="mt-4">
          <PasswordField
            ref={el => (fieldRefs.current.password = el)}
            id="login-password" label="Password" name="password" placeholder="••••••••" required
            error={fieldErrors.password}
            onChange={() => fieldErrors.password && setFieldErrors(er => ({ ...er, password: '' }))}
          />
        </div>
        <button disabled={signingIn} className="btn-orange mt-6 w-full disabled:opacity-60"><LockKeyhole size={16}/> {signingIn ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  </div>
}
