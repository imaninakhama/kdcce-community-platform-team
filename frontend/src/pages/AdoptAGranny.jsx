import {
  AlertTriangle, Coins, ShieldOff, Utensils, HeartPulse, MessageCircle,
  Home as HomeIcon, Accessibility, ShieldCheck, Quote, CheckCircle2,
} from 'lucide-react'
import HeroSection from '../components/adopt-a-granny/HeroSection'
import StatsSection from '../components/adopt-a-granny/StatsSection'
import SupportCards from '../components/adopt-a-granny/SupportCards'
import ThemeAccordion from '../components/adopt-a-granny/ThemeAccordion'
import CTASection from '../components/adopt-a-granny/CTASection'
import MissionVisionSection from '../components/MissionVisionSection'

const STATS = [
  { icon: AlertTriangle, value: '10,000+', label: 'Older persons in Kibera facing extreme vulnerability' },
  { icon: Coins, value: 'Less than $1/day', label: 'The income many elderly people survive on' },
  { icon: ShieldOff, value: 'Limited Protection', label: 'Social support systems rarely reach older persons consistently' },
]

const SUPPORT_TYPES = [
  { icon: Utensils, title: 'Food & Nutrition', description: 'Regular, nutritious meals that help guard against hunger and malnutrition.' },
  { icon: HeartPulse, title: 'Healthcare & Medication', description: 'Access to check-ups, treatment, and the medication chronic conditions require.' },
  { icon: MessageCircle, title: 'Emotional Support', description: 'Companionship and connection that ease isolation and loneliness.' },
  { icon: HomeIcon, title: 'Home Visits & Caregiving', description: 'Regular visits and hands-on care for elders who cannot easily leave home.' },
  { icon: Accessibility, title: 'Mobility & Daily Living', description: 'Practical support with the everyday tasks that become harder with age.' },
  { icon: ShieldCheck, title: 'Safe Shelter & Basic Needs', description: 'Help maintaining a safe home and meeting essential household needs.' },
]

const THEMES = [
  {
    title: 'Aging in an Urban Informal Settlement',
    content: 'What does it mean to grow old in Kibera? The film explores the physical, emotional, and social realities of aging within a densely populated informal settlement where access to healthcare, housing, and social protection remains limited.',
  },
  {
    title: 'Health Care and Well-being',
    content: 'The documentary examines how older persons manage chronic illness, mobility challenges, medication needs, and mental well-being.',
    bullets: [
      'What happens to disabled older persons in the community?',
      'What happens when family support is limited?',
      'How does community care complement formal care systems?',
    ],
  },
  {
    title: 'Food Security and Nutrition',
    content: 'For many older persons in Kibera, access to regular and nutritious meals remains a daily challenge. Limited income, rising food costs, declining physical ability, and the absence of family support often place elders at risk of hunger and malnutrition.',
    question: 'What does aging with dignity mean when access to food is uncertain?',
  },
  {
    title: 'Community Care and Mutual Support',
    content: 'At the heart of the film is the idea that care is collective.',
    bullets: [
      'Home visits to bedridden elders',
      'Peer support among elderly members',
      'Volunteer caregivers',
      'Community networks that sustain older persons',
    ],
    question: 'What does dignity look like when care comes from the community itself?',
  },
  {
    title: 'Housing, Safety, and Aging in Informal Settlements',
    content: 'Growing old in an informal settlement presents unique challenges. Many elders live in fragile housing, face mobility barriers, and navigate unsafe environments not designed for aging populations.',
    bullets: [
      'Housing insecurity among older residents',
      'Accessibility challenges',
      'Living alone in old age',
      'Community responses to elder vulnerability',
    ],
    closing: 'Through personal stories, the documentary reveals how the built environment shapes the aging experience.',
  },
  {
    title: 'Social Inclusion, Visibility, and Belonging',
    content: 'This theme examines the visibility of older persons in community life, social isolation and loneliness, participation in community decision-making, and the importance of being seen, heard, and valued.',
    closing: 'The documentary challenges viewers to consider how older persons are often excluded from public conversations about development, innovation, and the future of cities. In Kibera, narratives frequently focus on youth, while elders become socially invisible despite their continued contributions.',
  },
]

const IMPACT_GOALS = [
  'Increase visibility of older persons living in informal settlements',
  'Challenge stereotypes about aging and dependency',
  'Highlight community-based elder care models',
  'Advocate for dignified aging and elder rights',
  'Foster intergenerational understanding',
  'Encourage policymakers and development actors to include older persons in urban planning and social protection programs',
]

export default function AdoptAGranny() {
  return <>
    <HeroSection
      eyebrow="A KDCCE Initiative"
      title="Adopt a Granny"
      subheading="We hope to build meaningful relationships where individuals, both locally and internationally, commit to supporting one elderly person living in Kibera."
      paragraph="This initiative connects families across communities while helping older persons access dignity, care, and essential support in daily life."
      image="/images/community-gratitude.jpg"
      imageAlt="Elderly women in Kibera receiving community support"
      primaryCta={{ label: 'Support a Granny', to: '/donate?frequency=monthly' }}
      secondaryCta={{ label: 'Learn More', href: '#about-program' }}
    />

    <StatsSection
      eyebrow="Why This Matters"
      title="The reality older persons in Kibera face"
      items={STATS}
    />

    <div id="about-program">
      <MissionVisionSection
        title="What is Adopt a Granny?"
        description="The Adopt a Granny initiative seeks to create a supportive relationship between an elderly person living in Kibera and an individual supporter, either locally or internationally. The goal is to connect more families together while helping older persons access care, dignity, and practical support according to their needs."
        supportingText="Support can be received as needs arise and may include food, healthcare, emotional support, home-based care, and other essential assistance."
        image="/images/wheelchair-care.jpg"
        imageAlt="A KDCCE caregiver supporting an elderly woman"
        imagePosition="right"
      />
    </div>

    <SupportCards
      eyebrow="How Support Helps"
      title="The kinds of support a Granny may need"
      intro="Every relationship is different — support is guided by what each elder actually needs."
      items={SUPPORT_TYPES}
    />

    <section className="container-k grid gap-12 py-20 md:grid-cols-2 md:items-center">
      <img src="/images/feeding.jpg" alt="A group of elderly women in Kibera together" className="order-2 h-[420px] w-full rounded-2xl object-cover md:order-1" />
      <div className="order-1 md:order-2">
        <div className="eyebrow">Central Question</div>
        <div className="mt-4 rounded-2xl border-l-4 border-kOrange bg-kCream p-6">
          <Quote className="text-kOrange" size={22} />
          <p className="mt-3 font-display text-xl font-semibold leading-8 text-kInk">How are older persons shaping their community while navigating aging, health care, memory, and community care in Kibera?</p>
        </div>
        <p className="mt-6 leading-7 text-kMuted">In Nairobi's Kibera settlement, a community of older persons continues to shape life, preserve collective memory, care for one another, and contribute to their community while navigating the realities of aging, health challenges, and social invisibility.</p>
        <p className="mt-4 leading-7 text-kMuted">Through intimate interactions of daily life, <em>Seen &amp; Unseen: Aging with Dignity</em> reveals how growing old in one of Africa's most dynamic urban communities is both a struggle and an act of resilience.</p>
      </div>
    </section>

    <ThemeAccordion
      eyebrow="Key Themes"
      title="What the initiative explores"
      intro="Six themes shape how we understand aging, care, and dignity in Kibera."
      items={THEMES}
    />

    <section className="container-k py-20">
      <div className="mx-auto max-w-2xl text-center">
        <div className="eyebrow justify-center">Our Goals</div>
        <h2 className="mt-3 font-display text-4xl font-bold text-kGreen">Intended Impact</h2>
      </div>
      <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
        {IMPACT_GOALS.map(goal => (
          <div key={goal} className="card-k flex gap-3 p-5">
            <CheckCircle2 className="mt-0.5 shrink-0 text-kGreen" size={20} />
            <span className="text-sm leading-6 text-kInk">{goal}</span>
          </div>
        ))}
      </div>
    </section>

    <CTASection
      title="Be Part of Restoring Dignity"
      text="Your support can help an older person in Kibera access care, connection, and dignity. Join us in building a community where no elder is unseen or unsupported."
      primaryCta={{ label: 'Support a Granny', to: '/donate?frequency=monthly' }}
      secondaryCta={{ label: 'Contact Us', to: '/contact' }}
    />
  </>
}
