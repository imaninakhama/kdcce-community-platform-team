import { Heart, Users, Utensils } from 'lucide-react'

// Single source of truth for KDCCE's headline impact numbers — used by
// components/Stats.jsx (rendered on About/Impact Stories) so every page
// that shows these figures pulls from the same real values instead of
// each hardcoding its own copy.
export const impactStats = [
  { icon: Users, value: '35+', label: 'Older Persons Associations' },
  { icon: Utensils, value: '68+', label: 'Meals Served Daily' },
  { icon: Users, value: '8K+', label: 'Elders Supported Weekly' },
  { icon: Heart, value: '93+', label: 'Beneficiaries Reached' },
]
