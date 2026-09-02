import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, HeartHandshake, AlertCircle, Clock } from 'lucide-react'
import PageHero from '../components/PageHero'
import PasswordField from '../components/PasswordField'
import { apiFetch, setSession, ApiError } from '../lib/api'

const AREAS = ['Home visits', 'Feeding program', 'Health & wellness support', 'Activities & companionship', 'Fundraising & events', 'Admin & office support']
const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Flexible']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validates a single plain text/textarea/select field by name — email
// gets a format check on top of the shared "is it empty" rule, everything
// else here is required-and-non-blank only.
function validateField(name, rawValue) {
  const value = (rawValue || '').trim()
  switch (name) {
    case 'name': return value ? '' : 'Please enter your full name.'
    case 'email':
      if (!value) return 'Please enter your email address.'
      return EMAIL_RE.test(value) ? '' : 'Please enter a valid email address.'
    case 'phone': return value ? '' : 'Please enter your phone number.'
    case 'skills': return value ? '' : 'Please tell us about your skills.'
    case 'availability': return value ? '' : 'Please select your availability.'
    case 'motivation': return value ? '' : 'Please tell us why you want to volunteer with KDCCE.'
    default: return ''
  }
}
function validatePassword(value) {
  if (!value) return 'Please enter a password.'
  return value.length >= 8 ? '' : 'Password must be at least 8 characters.'
}
function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password.'
  return confirm === password ? '' : 'Passwords do not match.'
}

const REQUIRED_FIELDS = ['name', 'email', 'phone', 'password', 'confirm_password', 'skills', 'availability', 'motivation']

// Field wrapper shared by the input/textarea/select fields on this form
// (not PasswordField — that's the separately reusable show/hide-password
// component used across every password input in the app). Handles the
// required-asterisk, red-border-on-error, and inline message consistently
// so each field below only supplies its name/label/type.
function Field({ as = 'input', label, name, required, error, className = '', children, inputRef, ...rest }) {
  const id = `bv-${name}`
  const errorId = `${id}-error`
  const commonProps = {
    id, name, ref: inputRef,
    className: `input-k mt-2 ${error ? 'border-red-400' : ''} ${className}`,
    required,
    'aria-invalid': !!error,
    'aria-describedby': error ? errorId : undefined,
    ...rest,
  }
  return (
    <label htmlFor={id} className="text-sm font-semibold">
      {label} {required && <span className="text-kOrange" aria-hidden="true">*</span>}
      {as === 'textarea' ? <textarea {...commonProps} />
        : as === 'select' ? <select {...commonProps}>{children}</select>
        : <input {...commonProps} />}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
}

export default function BecomeAVolunteer() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const fieldRefs = useRef({})

  // Before a submit attempt, a field's error only shows once the user has
  // left it (blur) — not while they're still mid-typing their first pass.
  // After a failed submit attempt, everything shows live so fixing one
  // field immediately clears its own error instead of waiting for blur.
  function shouldShow(name) { return submitAttempted || touched[name] }

  function handleBlur(e) {
    const { name, value } = e.target
    setTouched(t => ({ ...t, [name]: true }))
    setErrors(er => ({ ...er, [name]: validateField(name, value) }))
  }
  function handleChange(e) {
    if (!submitAttempted) return
    const { name, value } = e.target
    setErrors(er => ({ ...er, [name]: validateField(name, value) }))
  }

  function handlePasswordChange(e) {
    const value = e.target.value
    setPassword(value)
    setErrors(er => ({
      ...er,
      password: validatePassword(value),
      // Re-check the confirm field too whenever the password it must
      // match changes, so fixing the password can also clear a stale
      // "Passwords do not match" on confirm without touching it again.
      confirm_password: (touched.confirm_password || submitAttempted) ? validateConfirmPassword(value, confirmPassword) : er.confirm_password,
    }))
  }
  function handlePasswordBlur(e) {
    setTouched(t => ({ ...t, password: true }))
    setErrors(er => ({ ...er, password: validatePassword(e.target.value) }))
  }
  function handleConfirmChange(e) {
    const value = e.target.value
    setConfirmPassword(value)
    setErrors(er => ({ ...er, confirm_password: validateConfirmPassword(password, value) }))
  }
  function handleConfirmBlur(e) {
    setTouched(t => ({ ...t, confirm_password: true }))
    setErrors(er => ({ ...er, confirm_password: validateConfirmPassword(password, e.target.value) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitAttempted(true)
    const form = e.target
    const f = new FormData(form)

    const newErrors = {
      name: validateField('name', f.get('name')),
      email: validateField('email', f.get('email')),
      phone: validateField('phone', f.get('phone')),
      password: validatePassword(password),
      confirm_password: validateConfirmPassword(password, confirmPassword),
      skills: validateField('skills', f.get('skills')),
      availability: validateField('availability', f.get('availability')),
      motivation: validateField('motivation', f.get('motivation')),
    }
    setErrors(newErrors)
    const firstInvalid = REQUIRED_FIELDS.find(name => newErrors[name])
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus()
      return
    }

    const areas = AREAS.filter(a => f.get(`area_${a}`)).join(', ')

    setSubmitting(true)
    try {
      // Registration and the application are two calls against existing
      // endpoints, not a new combined one: POST /api/auth/register creates
      // the account (always role=volunteer, always starts Pending), then
      // this PATCH fills in everything a plain register doesn't collect.
      const { access_token, refresh_token, user } = await apiFetch('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: { name: f.get('name'), email: f.get('email'), password },
      })
      setSession(access_token, user, refresh_token)

      try {
        await apiFetch('/api/volunteers/me', {
          method: 'PATCH',
          body: {
            phone: f.get('phone') || null,
            skills: f.get('skills') || null,
            availability: f.get('availability') || null,
            areas_of_interest: areas || null,
            experience: f.get('experience') || null,
            motivation: f.get('motivation') || null,
            bio: f.get('bio') || null,
          },
        })
      } catch {
        // The account exists either way — an applicant who lands here can
        // still see/complete their application from the volunteer portal's
        // pending-review screen, so this isn't a dead end.
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <><PageHero title="Application submitted" eyebrow="Become a volunteer" text="Thank you for applying to volunteer with KDCCE." image="/images/healthcare.jpg" />
      <section className="container-k py-20"><div className="mx-auto max-w-xl card-k p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange"><Clock /></div>
        <h2 className="mt-5 font-display text-3xl font-bold text-kGreen">Your application is under review</h2>
        <p className="mt-3 leading-7 text-kMuted">KDCCE staff will review your application and get back to you. You can sign in any time to check your status.</p>
        <Link to="/admin/login" className="btn-orange mt-7 inline-flex">Sign in to check status</Link>
      </div></section>
    </>
  }

  return <>
    <PageHero title="Become a Volunteer" eyebrow="Get involved" text="Tell us about yourself and how you'd like to help. Our team reviews every application before granting portal access." image="/images/healthcare.jpg" />
    <section className="container-k grid gap-10 py-20 md:grid-cols-[.7fr_1.3fr]">
      <div className="rounded-2xl bg-kGreen p-8 text-white">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-kOrange"><HeartHandshake /></div>
        <h2 className="mt-6 font-display text-2xl font-bold">What happens next?</h2>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-white/75">
          <p>1. Submit your application below.</p>
          <p>2. Our staff reviews it — usually within a few days.</p>
          <p>3. Once approved, you'll get full access to the volunteer portal: your assignments, home visits and assistance requests.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card-k p-7 md:p-9">
        {error && <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle size={16} /> {error}</div>}

        <div className="eyebrow">Personal information</div>
        <p className="mt-1 text-xs text-kMuted">Fields marked <span className="text-kOrange" aria-hidden="true">*</span> are required.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Full name" name="name" required
            inputRef={el => (fieldRefs.current.name = el)}
            error={shouldShow('name') ? errors.name : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field
            label="Email" name="email" type="email" required
            inputRef={el => (fieldRefs.current.email = el)}
            error={shouldShow('email') ? errors.email : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field
            label="Phone number" name="phone" placeholder="07XXXXXXXX" required
            inputRef={el => (fieldRefs.current.phone = el)}
            error={shouldShow('phone') ? errors.phone : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <div />
          <PasswordField
            ref={el => (fieldRefs.current.password = el)}
            label="Password" name="password" required minLength={8} autoComplete="new-password"
            error={shouldShow('password') ? errors.password : ''}
            onChange={handlePasswordChange} onBlur={handlePasswordBlur}
          />
          <PasswordField
            ref={el => (fieldRefs.current.confirm_password = el)}
            label="Confirm password" name="confirm_password" required minLength={8} autoComplete="new-password"
            error={shouldShow('confirm_password') ? errors.confirm_password : ''}
            onChange={handleConfirmChange} onBlur={handleConfirmBlur}
          />
        </div>

        <div className="eyebrow mt-8">Volunteer information</div>
        <div className="mt-4 grid gap-4">
          <Field
            as="textarea" label="Skills" name="skills" rows={2} required
            placeholder="e.g. First aid, cooking, transport, counselling"
            inputRef={el => (fieldRefs.current.skills = el)}
            error={shouldShow('skills') ? errors.skills : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field
            as="select" label="Availability" name="availability" required
            defaultValue=""
            inputRef={el => (fieldRefs.current.availability = el)}
            error={shouldShow('availability') ? errors.availability : ''}
            onBlur={handleBlur} onChange={handleChange}
          >
            <option value="" disabled>Select your availability</option>
            {AVAILABILITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </Field>
          <div>
            <span className="text-sm font-semibold">Areas of interest</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {AREAS.map(a => <label key={a} className="flex items-center gap-2 text-sm text-kInk"><input type="checkbox" name={`area_${a}`} className="h-4 w-4" /> {a}</label>)}
            </div>
          </div>
          <Field as="textarea" label="Relevant experience" name="experience" rows={2} placeholder="Any past volunteering or related experience" />
          <Field
            as="textarea" label="Why do you want to volunteer with KDCCE?" name="motivation" rows={3} required
            inputRef={el => (fieldRefs.current.motivation = el)}
            error={shouldShow('motivation') ? errors.motivation : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field as="textarea" label="About you" name="bio" rows={3} placeholder="A short bio our staff can get to know you by" />
        </div>

        <button disabled={submitting} className="btn-orange mt-7 w-full disabled:opacity-60"><CheckCircle2 size={16} /> {submitting ? 'Submitting…' : 'Submit application'}</button>
      </form>
    </section>
  </>
}
