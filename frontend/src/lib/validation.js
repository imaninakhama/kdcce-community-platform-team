// Kenyan phone number validation, shared by every form that collects a
// phone number (Become a Volunteer, the volunteer self-service profile,
// the Donate page's M-Pesa field, and the two admin phone fields) so the
// accepted formats and error message never drift between them. Mirrors
// backend/app/utils.py's KENYA_PHONE_REGEX/PHONE_ERROR_MESSAGE exactly —
// only 07XXXXXXXX (10 digits) or +2547XXXXXXXX (+254 then 9 digits
// starting with 7) are accepted.
export const KENYA_PHONE_REGEX = /^(07\d{8}|\+2547\d{8})$/
export const PHONE_ERROR_MESSAGE = 'Enter a valid phone number starting with 07 or +2547.'
export const PHONE_MAX_LENGTH = 13 // "+2547XXXXXXXX"

export function isValidKenyanPhone(value) {
  return KENYA_PHONE_REGEX.test(value || '')
}

// Restricts a phone input to what a valid number can ever contain: digits,
// plus a "+" only as the very first character. Meant to be run on every
// keystroke (via onChange) so a user simply can't type a letter, a space,
// or a misplaced "+" into a phone field, rather than only catching those
// at submit time.
export function sanitizePhoneInput(value) {
  if (!value) return value
  const plus = value.startsWith('+') ? '+' : ''
  const digits = value.replace(/\D/g, '')
  return plus + digits
}
