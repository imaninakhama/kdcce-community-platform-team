// Shared vocabulary for the home-visit review workflow — used by both the
// volunteer-facing stage screens and the admin review screen, so labels,
// tones, and the work-form field list can never drift between them.
//
// Status labels shown in the UI intentionally differ from the raw
// backend `status` string in two places: the backend keeps "Started" as
// a legacy alias for the same working stage as "In Progress" (both
// stamp started_at — see homevisits/routes.py), and "Completed" is
// always labeled "Approved" here — the workflow's true terminology
// ("Admin Approves a submission") — while the stored value stays
// "Completed" so every existing dashboard/report/impact page that
// already counts completed home visits keeps working unchanged.
export const STATUS_LABELS = {
  Pending: 'Pending',
  Assigned: 'Assigned',
  Accepted: 'Accepted',
  Scheduled: 'Scheduled',
  Started: 'In Progress',
  'In Progress': 'In Progress',
  'Under Review': 'Under Review',
  'Returned for Changes': 'Returned for Changes',
  Completed: 'Approved',
  Cancelled: 'Cancelled',
}

export const STATUS_TONES = {
  Pending: 'neutral',
  Assigned: 'warning',
  Accepted: 'info',
  Scheduled: 'info',
  Started: 'info',
  'In Progress': 'info',
  'Under Review': 'info',
  'Returned for Changes': 'warning',
  Completed: 'success',
  Cancelled: 'danger',
}

export function statusLabel(status) { return STATUS_LABELS[status] || status }
export function statusTone(status) { return STATUS_TONES[status] || 'neutral' }
export function isInProgressStatus(status) { return status === 'Started' || status === 'In Progress' }

export const WELLBEING_OPTIONS = ['Good', 'Fair', 'Poor']

// The working-visit form fields, in display order — shared by the
// editable form, the read-only summary, and the review-submission
// preview so all three always show exactly the same set.
export const HOME_VISIT_WORK_FIELDS = [
  { key: 'wellbeing', label: 'General wellbeing', type: 'select', options: WELLBEING_OPTIONS, section: 'wellbeing_mood' },
  { key: 'mood', label: 'Mood', type: 'text', placeholder: 'e.g. Cheerful, withdrawn, anxious', section: 'wellbeing_mood' },
  { key: 'blood_pressure_systolic', label: 'BP systolic', type: 'number', section: 'vitals' },
  { key: 'blood_pressure_diastolic', label: 'BP diastolic', type: 'number', section: 'vitals' },
  { key: 'pulse_bpm', label: 'Pulse (bpm)', type: 'number', section: 'vitals' },
  { key: 'temperature_celsius', label: 'Temperature (°C)', type: 'number', step: '0.1', section: 'vitals' },
  { key: 'weight_kg', label: 'Weight (kg)', type: 'number', step: '0.1', section: 'vitals' },
  { key: 'physical_activity', label: 'Physical activity', type: 'textarea', placeholder: 'e.g. Walked 20 minutes with support', section: 'physical_activity' },
  { key: 'basic_needs_confirmed', label: 'Basic needs confirmed', type: 'checkbox', section: 'basic_needs' },
  { key: 'observations', label: 'Health observations', type: 'textarea', section: 'health_observations' },
  { key: 'concerns_discussed', label: 'Concerns discussed', type: 'textarea', section: 'concerns' },
  { key: 'follow_up_required', label: 'Follow-up required', type: 'checkbox', section: 'follow_up' },
  { key: 'follow_up_notes', label: 'Follow-up notes', type: 'textarea', section: 'follow_up' },
  { key: 'support_provided', label: 'Visit notes', type: 'textarea', section: 'visit_notes' },
]

// Matches backend HOME_VISIT_RETURN_SECTIONS exactly (models.py) — the
// sections admin can flag when returning a submission for changes.
export const RETURN_SECTIONS = [
  { key: 'wellbeing_mood', label: 'Wellbeing & mood' },
  { key: 'vitals', label: 'Vitals (BP, pulse, temperature, weight)' },
  { key: 'physical_activity', label: 'Physical activity' },
  { key: 'basic_needs', label: 'Basic needs' },
  { key: 'health_observations', label: 'Health observations' },
  { key: 'concerns', label: 'Concerns discussed' },
  { key: 'follow_up', label: 'Follow-up' },
  { key: 'visit_notes', label: 'Visit notes' },
  { key: 'checklist', label: 'Home visit checklist' },
]

// Which work-field keys are unlocked for editing while Returned for
// Changes. An empty `sections` list means admin didn't narrow it down —
// unlock everything rather than lock the volunteer out of fields with no
// way to know why.
export function unlockedFieldKeys(sections) {
  if (!sections || sections.length === 0) return HOME_VISIT_WORK_FIELDS.map(f => f.key)
  return HOME_VISIT_WORK_FIELDS.filter(f => sections.includes(f.section)).map(f => f.key)
}
