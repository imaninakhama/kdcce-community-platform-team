import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, AlertCircle, HeartHandshake } from 'lucide-react'
import ThemeToggle from '../theme/ThemeToggle'
import PasswordField from '../components/PasswordField'
import { apiFetch, setSession, ApiError } from '../lib/api'
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_STYLES } from '../lib/volunteerStatus'

const AREAS = ['Home visits', 'Feeding program', 'Health & wellness support', 'Activities & companionship', 'Fundraising & events', 'Admin & office support']
const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Flexible']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const AGREEMENT_FIELDS = [
  { key: 'agree_conduct', label: 'I agree to follow the KDCCE Code of Conduct and volunteer policies.' },
  { key: 'agree_privacy', label: 'I consent to KDCCE collecting and using my information for volunteer-management purposes.' },
  { key: 'agree_accuracy', label: 'I confirm that the information provided in this application is accurate.' },
]

function calcAge(dob, today) {
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age -= 1
  return age
}

function validateDateOfBirth(rawValue) {
  const value = (rawValue || '').trim()
  if (!value) return 'Please enter your date of birth.'
  const dob = new Date(`${value}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return 'Please enter a valid date of birth.'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dob > today) return 'Date of birth cannot be in the future.'
  if (calcAge(dob, today) < 18) return 'You must be at least 18 years old to apply.'
  return ''
}

function validateMinHours(rawValue) {
  const value = (rawValue || '').trim()
  if (!value) return 'Please enter your minimum available hours.'
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) return 'Please enter a positive whole number of hours.'
  return ''
}

// Validates a single plain text/textarea/select/date field by name — email
// and date of birth get their own checks on top of the shared "is it
// empty" rule, everything else here is required-and-non-blank only.
function validateField(name, rawValue) {
  const value = (rawValue || '').trim()
  switch (name) {
    case 'name': return value ? '' : 'Please enter your full name.'
    case 'email':
      if (!value) return 'Please enter your email address.'
      return EMAIL_RE.test(value) ? '' : 'Please enter a valid email address.'
    case 'phone': return value ? '' : 'Please enter your phone number.'
    case 'date_of_birth': return validateDateOfBirth(rawValue)
    case 'county': return value ? '' : 'Please enter your county/location.'
    case 'emergency_contact_name': return value ? '' : "Please enter your emergency contact's name."
    case 'emergency_contact_phone': return value ? '' : "Please enter your emergency contact's phone number."
    case 'availability': return value ? '' : 'Please select your availability.'
    case 'min_hours_available': return validateMinHours(rawValue)
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

const REQUIRED_FIELDS = [
  'name', 'email', 'phone', 'date_of_birth', 'county', 'password', 'confirm_password',
  'emergency_contact_name', 'emergency_contact_phone', 'areas', 'availability', 'min_hours_available', 'motivation',
  'agree_conduct', 'agree_privacy', 'agree_accuracy',
]

// Field wrapper shared by the input/textarea/select fields on this form
// (not PasswordField — that's the separately reusable show/hide-password
// component). Handles the required-asterisk, red-border-on-error, and
// inline message consistently so each field below only supplies its
// name/label/type.
function Field({ as = 'input', label, name, required, error, className = '', children, inputRef, ...rest }) {
  const id = `vs-${name}`
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

export default function VolunteerSignUp() {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [firstName, setFirstName] = useState('')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [areas, setAreas] = useState([])
  const [agreements, setAgreements] = useState({ agree_conduct: false, agree_privacy: false, agree_accuracy: false })
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

  function handleAreaChange(area, checked) {
    setAreas(prev => checked ? [...prev, area] : prev.filter(a => a !== area))
    if (submitAttempted) {
      const next = checked ? [...areas, area] : areas.filter(a => a !== area)
      setErrors(er => ({ ...er, areas: next.length ? '' : 'Please select at least one area of interest.' }))
    }
  }

  function handleAgreementChange(key, checked) {
    setAgreements(prev => ({ ...prev, [key]: checked }))
    if (submitAttempted) {
      setErrors(er => ({ ...er, [key]: checked ? '' : 'This agreement is required.' }))
    }
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
      date_of_birth: validateField('date_of_birth', f.get('date_of_birth')),
      county: validateField('county', f.get('county')),
      password: validatePassword(password),
      confirm_password: validateConfirmPassword(password, confirmPassword),
      emergency_contact_name: validateField('emergency_contact_name', f.get('emergency_contact_name')),
      emergency_contact_phone: validateField('emergency_contact_phone', f.get('emergency_contact_phone')),
      areas: areas.length ? '' : 'Please select at least one area of interest.',
      availability: validateField('availability', f.get('availability')),
      min_hours_available: validateField('min_hours_available', f.get('min_hours_available')),
      motivation: validateField('motivation', f.get('motivation')),
      agree_conduct: agreements.agree_conduct ? '' : 'This agreement is required.',
      agree_privacy: agreements.agree_privacy ? '' : 'This agreement is required.',
      agree_accuracy: agreements.agree_accuracy ? '' : 'This agreement is required.',
    }
    setErrors(newErrors)
    const firstInvalid = REQUIRED_FIELDS.find(name => newErrors[name])
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus()
      return
    }

    const name = f.get('name')
    const email = f.get('email')

    setSubmitting(true)
    try {
      // Registration and the application are two calls against existing
      // endpoints, not a new combined one: POST /api/auth/register creates
      // the account (always role=volunteer, always starts Pending), then
      // PATCH /api/volunteers/me fills in everything a plain register
      // doesn't collect.
      const { access_token, refresh_token, user } = await apiFetch('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: { name, email, password },
      })
      setSession(access_token, user, refresh_token)
      setFirstName((user.name || '').split(' ')[0])

      try {
        await apiFetch('/api/volunteers/me', {
          method: 'PATCH',
          body: {
            phone: f.get('phone'),
            date_of_birth: f.get('date_of_birth'),
            county: f.get('county'),
            emergency_contact_name: f.get('emergency_contact_name'),
            emergency_contact_phone: f.get('emergency_contact_phone'),
            areas_of_interest: areas.join(', '),
            availability: f.get('availability'),
            min_hours_available: Number(f.get('min_hours_available')),
            motivation: f.get('motivation'),
            skills: f.get('skills') || null,
            experience: f.get('experience') || null,
            code_of_conduct_agreed: true,
            privacy_consent_agreed: true,
            accuracy_declaration_agreed: true,
          },
        })
        setSubmitted(true)
      } catch (err) {
        // The account was already created above — this only fills in the
        // rest of the application, so a failure here must not be silently
        // swallowed the way an optional pre-fill could be: the applicant
        // needs to know their application details didn't save.
        setError(err instanceof ApiError ? `Your account was created, but we couldn't save your application details: ${err.message} Please sign in to finish your application.` : "Your account was created, but we couldn't save your application details. Please sign in to finish your application.")
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return <div className="grid min-h-[80vh] place-items-center bg-kCream px-5">
      <div className="w-full max-w-md text-center">
        <div className="mb-4 flex justify-end"><ThemeToggle /></div>
        <div className="card-k p-9">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-kTint text-kOrange"><Clock /></div>
          <span className={`mx-auto mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${VOLUNTEER_STATUS_STYLES.Pending}`}>{VOLUNTEER_STATUS_LABELS.Pending}</span>
          <h1 className="mt-5 font-display text-2xl font-bold text-kGreen">Your application is under review</h1>
          <p className="mt-3 text-sm leading-6 text-kMuted">
            Thanks for applying{firstName ? `, ${firstName}` : ''}. KDCCE staff are reviewing your application and will get back to you soon. You can sign in any time to check your status.
          </p>
          <Link to="/volunteer" className="btn-orange mt-7 inline-flex w-full">Go to your volunteer portal</Link>
        </div>
      </div>
    </div>
  }

  return <div className="min-h-screen bg-kCream px-5 py-14">
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex justify-end"><ThemeToggle /></div>
      <div className="mb-8 text-center">
        <img src="/images/logo.png" alt="KDCCE" className="mx-auto h-20 w-auto object-contain" />
        <div className="mx-auto mt-4 grid h-12 w-12 place-items-center rounded-2xl bg-kGreen text-white"><HeartHandshake /></div>
        <h1 className="mt-5 font-display text-3xl font-bold text-kGreen">Volunteer sign up</h1>
        <p className="mt-2 text-sm text-kMuted">Create your account and tell us about yourself — our team reviews every application before granting portal access.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="card-k p-7 md:p-9">
        {error && <div className="mb-6 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</div>}

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
          <Field
            label="Date of birth" name="date_of_birth" type="date" required
            inputRef={el => (fieldRefs.current.date_of_birth = el)}
            error={shouldShow('date_of_birth') ? errors.date_of_birth : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field
            label="County / location" name="county" required
            inputRef={el => (fieldRefs.current.county = el)}
            error={shouldShow('county') ? errors.county : ''}
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

        <div className="eyebrow mt-8">Emergency contact</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field
            label="Emergency contact name" name="emergency_contact_name" required
            inputRef={el => (fieldRefs.current.emergency_contact_name = el)}
            error={shouldShow('emergency_contact_name') ? errors.emergency_contact_name : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field
            label="Emergency contact phone" name="emergency_contact_phone" placeholder="07XXXXXXXX" required
            inputRef={el => (fieldRefs.current.emergency_contact_phone = el)}
            error={shouldShow('emergency_contact_phone') ? errors.emergency_contact_phone : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
        </div>

        <div className="eyebrow mt-8">Volunteer information</div>
        <div className="mt-4 grid gap-4">
          <div>
            <span className="text-sm font-semibold">Areas of interest <span className="text-kOrange" aria-hidden="true">*</span></span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {AREAS.map((a, i) => (
                <label key={a} className="flex items-center gap-2 text-sm text-kInk">
                  <input
                    ref={i === 0 ? el => (fieldRefs.current.areas = el) : undefined}
                    type="checkbox"
                    className="h-4 w-4"
                    checked={areas.includes(a)}
                    onChange={e => handleAreaChange(a, e.target.checked)}
                  /> {a}
                </label>
              ))}
            </div>
            {shouldShow('areas') && errors.areas && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{errors.areas}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
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
            <Field
              label="Minimum volunteer hours available (per week)" name="min_hours_available" type="number" min="1" step="1" required
              inputRef={el => (fieldRefs.current.min_hours_available = el)}
              error={shouldShow('min_hours_available') ? errors.min_hours_available : ''}
              onBlur={handleBlur} onChange={handleChange}
            />
          </div>
          <Field
            as="textarea" label="Why do you want to volunteer with KDCCE?" name="motivation" rows={3} required
            inputRef={el => (fieldRefs.current.motivation = el)}
            error={shouldShow('motivation') ? errors.motivation : ''}
            onBlur={handleBlur} onChange={handleChange}
          />
          <Field as="textarea" label="Skills / experience" name="skills" rows={2} placeholder="e.g. First aid, cooking, transport, counselling (optional)" />
          <Field as="textarea" label="Previous volunteer experience" name="experience" rows={2} placeholder="Any past volunteering (optional)" />
        </div>

        <div className="eyebrow mt-8">Agreements</div>
        <div className="mt-4 grid gap-3">
          {AGREEMENT_FIELDS.map(({ key, label }, i) => (
            <div key={key}>
              <label className="flex items-start gap-2 text-sm text-kInk">
                <input
                  ref={el => (fieldRefs.current[key] = el)}
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  checked={agreements[key]}
                  onChange={e => handleAgreementChange(key, e.target.checked)}
                  aria-invalid={!!(shouldShow(key) && errors[key])}
                />
                <span>{label} <span className="text-kOrange" aria-hidden="true">*</span></span>
              </label>
              {shouldShow(key) && errors[key] && <p role="alert" className="mt-1 pl-6 text-xs font-semibold text-red-600">{errors[key]}</p>}
            </div>
          ))}
        </div>

        <button disabled={submitting} className="btn-orange mt-7 w-full disabled:opacity-60"><CheckCircle2 size={16} /> {submitting ? 'Submitting…' : 'Submit application'}</button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        <Link to="/become-a-volunteer" className="font-semibold text-kGreen hover:underline">← Back to Become a Volunteer</Link>
        <p className="text-kMuted">Already have an account? <Link to="/admin/login" className="font-semibold text-kOrange hover:underline">Sign in</Link></p>
      </div>
    </div>
  </div>
}
