import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Shared show/hide-password input — a real, focusable, keyboard-operable
// <button type="button"> (never a bare icon/div) so Tab reaches it and
// Enter/Space toggles it without submitting the form. Toggling only
// swaps the input's type; it never touches the field's value, so the
// entered password is never cleared. Forwards its ref to the <input> so
// a parent form can focus it as the first invalid field on submit.
const PasswordField = forwardRef(function PasswordField({ label, error, id: idProp, className = '', ...inputProps }, ref) {
  const [visible, setVisible] = useState(false)
  const autoId = useId()
  const id = idProp || autoId
  const errorId = `${id}-error`

  return (
    <label htmlFor={id} className="text-sm font-semibold">
      {label} {inputProps.required && <span className="text-kOrange" aria-hidden="true">*</span>}
      <div className="relative mt-2">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className={`input-k pr-11 ${error ? 'border-red-400' : ''} ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-kMuted hover:text-kInk focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
    </label>
  )
})

export default PasswordField
