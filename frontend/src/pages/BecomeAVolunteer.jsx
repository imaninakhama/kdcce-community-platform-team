import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import PageHero from '../components/PageHero'

const REQUIREMENTS = [
  'Be at least 18 years old (or meet our youth-volunteer policy)',
  'Be willing to support community programs',
  "Respect others' rights, beliefs, and cultures",
  'Follow the KDCCE Code of Conduct',
  'Provide accurate personal and emergency contact information',
  'Complete required orientation/training',
  'Be dependable and available for your chosen schedule',
  'Maintain professional behavior at all times',
  'Consent to safeguarding and background checks where applicable',
  "Agree to KDCCE's privacy and data-use policies",
]

export default function BecomeAVolunteer() {
  return <>
    <PageHero title="Become a Volunteer" eyebrow="Get involved" text="Join a community of volunteers supporting elderly members through home visits, activities, and everyday care." image="/images/healthcare.jpg" />

    <section className="container-k py-20">
      <div className="mx-auto max-w-3xl card-k p-8 md:p-10">
        <div className="eyebrow">Volunteer requirements</div>
        <h2 className="mt-2 font-display text-2xl font-bold text-kGreen md:text-3xl">What we ask of every volunteer</h2>
        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {REQUIREMENTS.map(req => (
            <li key={req} className="flex items-start gap-3 text-sm leading-6 text-kInk">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-kOrange" />
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>

    <section className="bg-kGreen py-20 text-white">
      <div className="container-k text-center">
        <div className="text-sm font-semibold italic text-kOrange">Ready to serve?</div>
        <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Sign up to be a volunteer today!</h2>
        <Link to="/volunteer/signup" className="btn-orange mt-8 inline-flex">Sign Up →</Link>
      </div>
    </section>
  </>
}
