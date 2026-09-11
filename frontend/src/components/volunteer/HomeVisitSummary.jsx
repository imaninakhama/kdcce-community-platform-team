import { HOME_VISIT_WORK_FIELDS } from '../../lib/homeVisitWorkflow'

function displayValue(field, raw) {
  if (field.type === 'checkbox') return raw ? 'Yes' : 'No'
  if (raw === null || raw === undefined || raw === '') return null
  return String(raw)
}

// Read-only rendering of everything captured on the visit-work form —
// the single source of truth for "what did the volunteer submit" used by
// the Review Submission preview, the Under Review screen, the admin
// review screen, and the final Approved record. Same field list and
// order as HomeVisitWorkForm so nothing ever appears in one and not the
// other.
export default function HomeVisitSummary({ visit }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    {HOME_VISIT_WORK_FIELDS.map(field => {
      const value = displayValue(field, visit[field.key])
      return <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
        <div className="text-xs font-bold uppercase tracking-wide text-kMuted">{field.label}</div>
        <p className="mt-1 text-sm leading-6 text-kInk">{value ?? <span className="text-kMuted">Not recorded</span>}</p>
      </div>
    })}
  </div>
}
