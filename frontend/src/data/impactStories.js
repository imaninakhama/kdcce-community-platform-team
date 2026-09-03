// Reusable story-data structure for the "Impact Stories" homepage carousel
// and its dedicated list/detail pages — mirrors how `programs` in
// siteData.js drives ProgramCard/Programs/ProgramDetail. There is no
// backend story/blog model (blog_posts was dropped in migration
// 9a3f5c7e1d24); this is frontend-only data, kept in one array so more
// stories can be added later just by appending an entry here.
//
// Photos here are illustrative stock/course-project imagery, not
// documentation of a specific KDCCE event — summaries and body copy are
// kept general on purpose (see Home.jsx's "course-project design" framing
// and the footer's non-affiliation notice) and never claim a photographed
// scene is a real, dated KDCCE activity.
export const impactStories = [
  {
    id: 'volunteers-at-the-heart-of-community-support',
    title: 'Volunteers at the Heart of Community Support',
    category: 'Volunteering',
    image: '/images/stories/volunteers-heart-of-community-support.jpg',
    imageAlt: 'A smiling volunteer standing beside stacked boxes of community aid supplies',
    summary: 'Behind every successful outreach is a team of people willing to serve. Volunteers help organize, prepare, and distribute essential support while bringing energy, compassion, and dignity to every community activity.',
    intro: 'Behind every successful outreach is a team of people willing to serve.',
    body: [
      'Community programs rarely run on good intentions alone — they run on people who show up, again and again, to do the unglamorous work of organizing, carrying, sorting and preparing. Volunteers are often the first to arrive and the last to leave, quietly making sure everything is ready before anyone else sees it.',
      'What volunteers bring goes beyond logistics. A friendly greeting, a patient explanation, a moment of eye contact — small gestures like these shape how someone experiences a community activity, whether they are receiving support or simply passing through. Dignity is built in details like these.',
      'At KDCCE, volunteers support activities across our programs — from preparing materials ahead of an event to helping things run smoothly on the day itself. Every role, whether visible or behind the scenes, adds up to a more organized, more welcoming experience for the people we serve.',
      "Volunteering is also a two-way relationship. People who give their time often come away with a stronger sense of connection to their community, new skills, and a better understanding of the everyday realities older persons face — part of why we keep inviting more people to join us.",
    ],
    cta: { label: 'Become a Volunteer', to: '/become-a-volunteer' },
  },
  {
    id: 'working-together-to-reach-more-families',
    title: 'Working Together to Reach More Families',
    category: 'Volunteering',
    image: '/images/stories/working-together-to-reach-more-families.jpg',
    imageAlt: 'Volunteers and community members working together outdoors to prepare and pack supply boxes',
    summary: 'Community impact takes teamwork. From preparing packages to coordinating distribution, volunteers work together behind the scenes so support can reach families efficiently and respectfully.',
    intro: 'Community impact takes teamwork.',
    body: [
      'No single person delivers a community program on their own. Behind any distribution or outreach activity is a chain of coordinated effort — people sorting supplies, others packing them, others keeping track of who has received what, and still others managing the flow of the day itself.',
      "That coordination takes practice and patience. Teams have to communicate clearly, adapt when something doesn't go as planned, and keep the focus on the people they are there to support — even when the work itself is repetitive or physically demanding.",
      'Working as a team also means sharing the load in ways that make the experience better for everyone involved, volunteers included. When tasks are divided sensibly and communication stays open, activities run more smoothly and community members spend less time waiting and more time being seen and cared for.',
      'This kind of teamwork is at the core of how KDCCE approaches its programs — coordinating staff, volunteers and partners so that support reaches people efficiently and respectfully, without cutting corners on care.',
    ],
    cta: { label: 'Become a Volunteer', to: '/become-a-volunteer' },
  },
  {
    id: 'delivering-food-support-with-dignity',
    title: 'Delivering Food Support With Dignity',
    category: 'Community Impact',
    image: '/images/stories/delivering-food-support-with-dignity.jpg',
    imageAlt: 'Community members kneeling on the ground to receive and pack food supplies into bags',
    summary: 'Access to food can make a meaningful difference for families facing difficult circumstances. Community distributions help ensure essential supplies reach people who need them while creating moments of connection and care.',
    intro: 'Access to food can make a meaningful difference for families facing difficult circumstances.',
    body: [
      'Food insecurity affects people in ways that go well beyond an empty pantry. It can shape daily routines, add stress to already difficult circumstances, and make it harder to focus on anything else. A reliable source of food support can ease some of that pressure, even temporarily.',
      'Distributing food well is about more than handing over a box. It means organizing supplies so they reach the people who need them, communicating clearly about what is available, and treating each person with the same respect regardless of their circumstances.',
      'These moments of distribution are also moments of connection — a chance for volunteers, staff and community members to interact directly, ask how someone is doing, and understand needs that a spreadsheet or a report could never fully capture.',
      'At KDCCE, this same principle guides our feeding program and other forms of practical support: dignity first, logistics second. Every interaction, not just every food parcel, should reflect the respect people deserve.',
    ],
    cta: { label: 'Support Our Programs', to: '/donate' },
  },
]

export function getStoryById(id) {
  return impactStories.find(s => s.id === id)
}
