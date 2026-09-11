import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, Lock } from 'lucide-react'
import { HOME_VISIT_WORK_FIELDS, unlockedFieldKeys } from '../../lib/homeVisitWorkflow'
import { apiFetch } from '../../lib/api'
import { errorMessage } from '../admin/adminHelpers'

const AUTOSAVE_DELAY = 1200

function fieldValue(visit, field) {
  const v = visit[field.key]
  if (field.type === 'checkbox') return !!v
  return v ?? ''
}

// The IN PROGRESS / RETURNED FOR CHANGES working form — one component for
// both stages since they're the same editable fields, just with a
// possibly-narrowed set of unlocked keys on the Returned path (see
// unlockedFieldKeys). Autosaves each change via the existing PATCH
// endpoint (no new backend needed) and surfaces "Draft saved" so the
// volunteer never wonders whether their work survived a refresh.
export default function HomeVisitWorkForm({ basePath, visit, onSaved, unlockedKeys, showToast, saveRef }) {
  const [values, setValues] = useState(() => Object.fromEntries(HOME_VISIT_WORK_FIELDS.map(f => [f.key, fieldValue(visit, f)])))
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const timerRef = useRef(null)
  const valuesRef = useRef(values)
  valuesRef.current = values
  const unlocked = unlockedKeys || HOME_VISIT_WORK_FIELDS.map(f => f.key)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const save = useCallback(async (next) => {
    setSaving(true)
    try {
      const body = { ...next }
      for (const f of HOME_VISIT_WORK_FIELDS) {
        if (f.type === 'number' && body[f.key] === '') body[f.key] = null
        if (f.type === 'number' && typeof body[f.key] === 'string' && body[f.key] !== null) body[f.key] = Number(body[f.key])
      }
      const res = await apiFetch(basePath, { method: 'PATCH', body })
      setSavedAt(new Date())
      onSaved?.(res.visit)
    } catch (err) { showToast(errorMessage(err)) }
    finally { setSaving(false) }
  }, [basePath, onSaved, showToast])

  function update(key, value) {
    setValues(prev => {
      const next = { ...prev, [key]: value }
      window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => save(next), AUTOSAVE_DELAY)
      return next
    })
  }

  // Lets a parent (the Returned-for-Changes screen's explicit "Save
  // Draft" button) flush the pending autosave immediately instead of
  // waiting out the debounce — same `save` call either way.
  useEffect(() => {
    if (!saveRef) return
    saveRef.current = () => { window.clearTimeout(timerRef.current); return save(valuesRef.current) }
    return () => { if (saveRef) saveRef.current = null }
  }, [saveRef, save])

  function renderField(field) {
    const isLocked = !unlocked.includes(field.key)
    const common = `input-k mt-2 ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`
    const label = <span className="flex items-center gap-1.5 text-sm font-semibold">{field.label}{isLocked && <Lock size={12} className="text-kMuted" />}</span>

    if (field.type === 'select') return <label key={field.key} className="text-sm font-semibold">{label}
      <select disabled={isLocked} value={values[field.key]} onChange={e => update(field.key, e.target.value)} className={common}>
        <option value="">Not recorded</option>
        {field.options.map(o => <option key={o}>{o}</option>)}
      </select>
    </label>

    if (field.type === 'checkbox') return <label key={field.key} className="flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" disabled={isLocked} checked={!!values[field.key]} onChange={e => update(field.key, e.target.checked)} className="h-5 w-5 disabled:cursor-not-allowed disabled:opacity-60" />
      {field.label}{isLocked && <Lock size={12} className="text-kMuted" />}
    </label>

    if (field.type === 'textarea') return <label key={field.key} className="text-sm font-semibold">{label}
      <textarea disabled={isLocked} value={values[field.key]} onChange={e => update(field.key, e.target.value)} rows={2} placeholder={field.placeholder} className={common} />
    </label>

    return <label key={field.key} className="text-sm font-semibold">{label}
      <input disabled={isLocked} type={field.type} step={field.step} value={values[field.key]} onChange={e => update(field.key, e.target.value)} placeholder={field.placeholder} className={common} />
    </label>
  }

  const groupA = HOME_VISIT_WORK_FIELDS.filter(f => ['wellbeing_mood', 'vitals'].includes(f.section))
  const groupB = HOME_VISIT_WORK_FIELDS.filter(f => !['wellbeing_mood', 'vitals'].includes(f.section))

  return <div className="grid gap-5">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-bold uppercase tracking-wide text-kMuted">Visit form</h3>
      <span className="flex items-center gap-1.5 text-xs text-kMuted">
        {saving ? 'Saving…' : savedAt ? <><Check size={13} className="text-kSuccess" /> Draft saved {savedAt.toLocaleTimeString([], { timeStyle: 'short' })}</> : ''}
      </span>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">{groupA.map(renderField)}</div>
    <div className="grid gap-4">{groupB.map(renderField)}</div>
  </div>
}
