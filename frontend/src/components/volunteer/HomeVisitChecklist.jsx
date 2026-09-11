import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import { apiFetch } from '../../lib/api'
import { errorMessage } from '../admin/adminHelpers'

// Thin wrapper over the existing, unmodified checklist endpoints
// (GET/PATCH .../checklist) — read-only when `locked`, matching the
// same lock the backend now enforces for a volunteer once the visit is
// Under Review / Completed (see homevisits/routes.py::_locked_for_volunteer).
export default function HomeVisitChecklist({ basePath, locked, showToast }) {
  const [items, setItems] = useState(null)

  const load = useCallback(async () => {
    try { setItems((await apiFetch(`${basePath}/checklist`)).checklist) }
    catch (err) { showToast(errorMessage(err)) }
  }, [basePath, showToast])

  useEffect(() => { load() }, [load])

  async function toggle(item) {
    if (locked) return
    try { setItems((await apiFetch(`${basePath}/checklist`, { method: 'PATCH', body: { item_key: item.item_key, checked: !item.checked } })).checklist) }
    catch (err) { showToast(errorMessage(err)) }
  }

  if (!items) return null

  return <div>
    <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-kMuted">Home visit checklist{locked && <Lock size={12} />}</h3>
    <div className="mt-3 grid gap-2">
      {items.map(item => <button key={item.item_key} type="button" disabled={locked} onClick={() => toggle(item)} className={`flex items-center gap-2 text-left text-sm ${locked ? 'cursor-not-allowed' : ''}`}>
        {item.checked ? <CheckCircle2 size={18} className="shrink-0 text-kSuccess" /> : <Circle size={18} className="shrink-0 text-kBorderSoft" />}
        <span className={item.checked ? 'text-kMuted line-through' : 'text-kInk'}>{item.label}</span>
      </button>)}
    </div>
  </div>
}
