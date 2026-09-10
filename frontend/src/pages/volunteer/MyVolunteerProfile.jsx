import { useState, useEffect, useCallback } from 'react'
import { Pencil, Phone, ShieldCheck } from 'lucide-react'
import VolunteerShell from '../../components/volunteer/VolunteerShell'
import Modal from '../../components/admin/Modal'
import PageHeader from '../../components/shared/PageHeader'
import Chip from '../../components/shared/Chip'
import { LoadingState, ErrorState, errorMessage } from '../../components/admin/adminHelpers'
import { apiFetch } from '../../lib/api'
import { VOLUNTEER_STATUS_LABELS, VOLUNTEER_STATUS_STYLES } from '../../lib/volunteerStatus'
import { isValidKenyanPhone, PHONE_ERROR_MESSAGE, PHONE_MAX_LENGTH, sanitizePhoneInput } from '../../lib/validation'

const STATUS_COPY = {
  Pending: 'Your profile is awaiting review by KDCCE staff. You can update your details below any time while you wait — approval-only features (home visits, assistance requests) stay locked until an admin approves your application.',
  Verified: "You're approved — staff can now assign you to home visits and activities.",
  Rejected: 'Your volunteer application was not approved. Contact KDCCE staff with any questions.',
}

// Free-text fields (skills/availability/areas_of_interest) are stored and
// edited as plain strings — the backend schema never changed to arrays —
// this only splits them for a nicer read-only display; editing still goes
// through the same textarea it always did.
function splitTags(value) {
  return (value || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
}

function Field({ label, value }) {
  return <div><div className="text-xs font-bold uppercase tracking-wide text-kMuted">{label}</div><p className="mt-1 text-sm leading-6 text-kInk">{value || <span className="text-kMuted">Not provided yet</span>}</p></div>
}

function ProfileCard({ title, onEdit, children }) {
  return <div className="card-k p-6">
    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold text-kInk">{title}</h2><button onClick={onEdit} className="flex items-center gap-1.5 text-sm font-semibold text-kGreen"><Pencil size={14} /> Edit</button></div>
    <div className="mt-4 grid gap-4">{children}</div>
  </div>
}

function EditProfileModal({ profile, onClose, onSaved, showToast }) {
  const [saving, setSaving] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  function handlePhoneChange(e) {
    e.target.value = sanitizePhoneInput(e.target.value)
    if (phoneError) setPhoneError('')
  }
  function handlePhoneBlur(e) {
    const value = sanitizePhoneInput(e.target.value)
    e.target.value = value
    setPhoneError(value && !isValidKenyanPhone(value) ? PHONE_ERROR_MESSAGE : '')
  }

  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const phone = f.get('phone') || null
    if (phone && !isValidKenyanPhone(phone)) { setPhoneError(PHONE_ERROR_MESSAGE); return }
    setPhoneError('')
    const data = {
      phone,
      skills: f.get('skills') || null,
      availability: f.get('availability') || null,
      areas_of_interest: f.get('areas_of_interest') || null,
      experience: f.get('experience') || null,
      motivation: f.get('motivation') || null,
      bio: f.get('bio') || null,
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/volunteers/me', { method: 'PATCH', body: data })
      onSaved(res.volunteer)
      showToast('Profile updated')
      onClose()
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }

  return <Modal title="Edit profile" onClose={onClose}>
    <form onSubmit={save} className="grid gap-4">
      <label className="text-sm font-semibold">Phone
        <input
          name="phone" defaultValue={profile.phone || ''} placeholder="07XXXXXXXX"
          inputMode="tel" maxLength={PHONE_MAX_LENGTH}
          className={`input-k mt-2 ${phoneError ? 'border-red-400' : ''}`}
          onChange={handlePhoneChange} onBlur={handlePhoneBlur}
          aria-invalid={!!phoneError}
        />
        {phoneError && <p role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{phoneError}</p>}
      </label>
      <label className="text-sm font-semibold">Skills<textarea name="skills" defaultValue={profile.skills || ''} rows={2} className="input-k mt-2" placeholder="e.g. First aid, cooking, transport" /></label>
      <label className="text-sm font-semibold">Availability<textarea name="availability" defaultValue={profile.availability || ''} rows={2} className="input-k mt-2" placeholder="e.g. Weekday mornings" /></label>
      <label className="text-sm font-semibold">Areas of interest<textarea name="areas_of_interest" defaultValue={profile.areas_of_interest || ''} rows={2} className="input-k mt-2" placeholder="e.g. Elderly care, home visits, companionship" /></label>
      <label className="text-sm font-semibold">Experience<textarea name="experience" defaultValue={profile.experience || ''} rows={2} className="input-k mt-2" /></label>
      <label className="text-sm font-semibold">Motivation<textarea name="motivation" defaultValue={profile.motivation || ''} rows={2} className="input-k mt-2" placeholder="Why you want to volunteer with KDCCE" /></label>
      <label className="text-sm font-semibold">About you<textarea name="bio" defaultValue={profile.bio || ''} rows={3} className="input-k mt-2" /></label>
      <button disabled={saving} className="btn-green mt-2 w-fit disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  </Modal>
}

export default function MyVolunteerProfile({ showToast }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try { setProfile((await apiFetch('/api/volunteers/me')).volunteer) }
    catch (err) { setError(errorMessage(err)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return <VolunteerShell>
    <PageHeader eyebrow="My account" title="Profile" subtitle="Your volunteer details on file with KDCCE." />

    {loading ? <LoadingState label="profile" /> : error ? <ErrorState message={error} onRetry={load} /> : <>
      <div className="card-k mt-7 flex flex-wrap items-center gap-4 p-6">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-kGreen text-lg font-bold text-white">{profile.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold text-kInk">{profile.name}</div>
          <div className="text-sm text-kMuted">{profile.email}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${VOLUNTEER_STATUS_STYLES[profile.status]}`}><ShieldCheck size={13} /> {VOLUNTEER_STATUS_LABELS[profile.status]}</span>
      </div>
      <p className="mt-3 text-sm text-kMuted">{STATUS_COPY[profile.status]}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProfileCard title="Contact" onEdit={() => setEditing(true)}>
          <Field label="Phone" value={<span className="flex items-center gap-1.5">{profile.phone && <Phone size={13} />}{profile.phone}</span>} />
        </ProfileCard>

        <ProfileCard title="Skills & interests" onEdit={() => setEditing(true)}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Skills</div>
            <div className="mt-2 flex flex-wrap gap-2">{splitTags(profile.skills).length ? splitTags(profile.skills).map(s => <Chip key={s}>{s}</Chip>) : <span className="text-sm text-kMuted">Not provided yet</span>}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-kMuted">Areas of interest</div>
            <div className="mt-2 flex flex-wrap gap-2">{splitTags(profile.areas_of_interest).length ? splitTags(profile.areas_of_interest).map(s => <Chip key={s} tone="primary">{s}</Chip>) : <span className="text-sm text-kMuted">Not provided yet</span>}</div>
          </div>
        </ProfileCard>

        <ProfileCard title="Availability" onEdit={() => setEditing(true)}>
          <div className="flex flex-wrap gap-2">{splitTags(profile.availability).length ? splitTags(profile.availability).map(s => <Chip key={s} tone="accent">{s}</Chip>) : <span className="text-sm text-kMuted">Not provided yet</span>}</div>
        </ProfileCard>

        <ProfileCard title="About you" onEdit={() => setEditing(true)}>
          <Field label="Experience" value={profile.experience} />
          <Field label="Motivation" value={profile.motivation} />
          <Field label="Bio" value={profile.bio} />
        </ProfileCard>
      </div>

      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={setProfile} showToast={showToast} />}
    </>}
  </VolunteerShell>
}
