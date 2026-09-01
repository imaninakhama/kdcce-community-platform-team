import { useState } from 'react'
import { LockKeyhole, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../theme/ThemeToggle'
import { apiFetch, setSession, ApiError } from '../lib/api'

export default function AdminLogin(){
  const navigate = useNavigate()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')
  const [challengeToken, setChallengeToken] = useState(null)
  const [useRecovery, setUseRecovery] = useState(false)

  function finishLogin({ access_token, refresh_token, user }) {
    setSession(access_token, user, refresh_token)
    navigate(user.role === 'volunteer' ? '/volunteer' : '/admin')
  }

  async function handleSubmit(e){
    e.preventDefault()
    setError('')
    setSigningIn(true)
    const f = new FormData(e.target)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: f.get('email'), password: f.get('password') }
      })
      if (res.two_factor_required) {
        setChallengeToken(res.challenge_token)
        setSigningIn(false)
        return
      }
      finishLogin(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.')
      setSigningIn(false)
    }
  }

  async function handleTwoFactor(e){
    e.preventDefault()
    setError('')
    setSigningIn(true)
    const f = new FormData(e.target)
    try {
      const res = useRecovery
        ? await apiFetch('/api/auth/2fa/recovery', { method: 'POST', auth: false, body: { challenge_token: challengeToken, recovery_code: f.get('recovery_code') } })
        : await apiFetch('/api/auth/2fa/verify-login', { method: 'POST', auth: false, body: { challenge_token: challengeToken, code: f.get('code') } })
      finishLogin(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.')
      setSigningIn(false)
    }
  }

  return <div className="relative min-h-[75vh] overflow-hidden py-20">
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/admin-login-bg.jpg')" }} />
    <div className="absolute inset-0 bg-gradient-to-b from-kInk/80 via-kInk/70 to-kInk/85" />
    <div className="relative mx-auto max-w-md px-5">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <div className="mb-6 text-center"><img src="/images/logo.png" alt="KDCCE" className="mx-auto h-20 w-auto object-contain"/><div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-kGreen text-white"><ShieldCheck/></div><h1 className="mt-5 font-display text-3xl font-bold text-white">Staff portal</h1><p className="mt-2 text-sm text-white/80">{challengeToken ? 'Enter your two-factor authentication code.' : 'Sign in with your staff, admin, or volunteer account.'}</p></div>

      {!challengeToken ? (
        <form className="card-k p-7" onSubmit={handleSubmit}>
          {error && <div className="mb-5 flex items-start gap-2 rounded-xl bg-kTint p-3 text-sm text-kOrange"><AlertCircle size={16} className="mt-0.5 shrink-0"/> {error}</div>}
          <label className="text-sm font-semibold">Email<input name="email" className="input-k mt-2" type="email" placeholder="staff@kdcce.org" required/></label>
          <label className="mt-4 block text-sm font-semibold">Password<input name="password" className="input-k mt-2" type="password" placeholder="••••••••" required/></label>
          <button disabled={signingIn} className="btn-orange mt-6 w-full disabled:opacity-60"><LockKeyhole size={16}/> {signingIn ? 'Signing in…' : 'Sign in'}</button>
        </form>
      ) : (
        <form className="card-k p-7" onSubmit={handleTwoFactor}>
          {error && <div className="mb-5 flex items-start gap-2 rounded-xl bg-kTint p-3 text-sm text-kOrange"><AlertCircle size={16} className="mt-0.5 shrink-0"/> {error}</div>}
          {!useRecovery ? (
            <label className="text-sm font-semibold">Authenticator code<input name="code" className="input-k mt-2" inputMode="numeric" maxLength={6} placeholder="123456" required autoFocus/></label>
          ) : (
            <label className="text-sm font-semibold">Recovery code<input name="recovery_code" className="input-k mt-2" placeholder="xxxxxxxxxx-xxxxxxxxxx" required autoFocus/></label>
          )}
          <button disabled={signingIn} className="btn-orange mt-6 w-full disabled:opacity-60"><KeyRound size={16}/> {signingIn ? 'Verifying…' : 'Verify'}</button>
          <button type="button" onClick={() => { setUseRecovery(u => !u); setError('') }} className="mt-4 w-full text-center text-sm font-semibold text-kOrange">
            {useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
          </button>
          <button type="button" onClick={() => { setChallengeToken(null); setUseRecovery(false); setError('') }} className="mt-2 w-full text-center text-sm text-kMuted">Back to sign in</button>
        </form>
      )}
    </div>
  </div>
}
