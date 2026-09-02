// Volunteer-facing display labels for VolunteerProfile.status — kept
// separate from the raw "Pending"/"Verified"/"Rejected" backend enum
// (which admin pages' StatusBadge still renders as-is) so the volunteer
// portal can use friendlier wording without touching that shared value
// or its API contract.
export const VOLUNTEER_STATUS_LABELS = {
  Pending: 'Pending approval',
  Verified: 'Approved',
  Rejected: 'Not approved',
}

export const VOLUNTEER_STATUS_STYLES = {
  Pending: 'bg-kTint text-kOrange',
  Verified: 'bg-kGreen/10 text-kGreen',
  Rejected: 'bg-red-100 text-red-700',
}
