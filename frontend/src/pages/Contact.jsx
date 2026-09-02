import { Mail, MapPin, Phone } from 'lucide-react'
import PageHero from '../components/PageHero'
import ContactForm from '../components/ContactForm'

export default function Contact(){
  return <><PageHero title="Let's stay connected" eyebrow="Contact" text="Questions, partnerships, volunteering or a message for the team? Send it through the form." image="/images/contact.jpg"/><section className="container-k grid gap-8 py-20 md:grid-cols-[.8fr_1.2fr]"><div className="rounded-2xl bg-kGreen p-8 text-white"><h2 className="font-display text-3xl font-bold">Contact details</h2><p className="mt-3 leading-7 text-white/70">Messages sent through this form go straight to our team's inbox.</p><div className="mt-8 grid gap-5"><div className="flex gap-3"><Phone className="text-orange-300"/> <div><b className="block">Phone</b><a href="tel:+254796755846" className="text-sm text-white/65 hover:text-white">+254 796 755 846</a></div></div><div className="flex gap-3"><Mail className="text-orange-300"/> <div><b className="block">Email</b><span className="text-sm text-white/65">info@kdcce.org</span></div></div><div className="flex gap-3"><MapPin className="text-orange-300"/> <div><b className="block">Location</b><span className="text-sm text-white/65">Kibera, Nairobi, Kenya</span></div></div></div></div><div className="card-k p-7 md:p-9"><ContactForm/></div></section></>
}
