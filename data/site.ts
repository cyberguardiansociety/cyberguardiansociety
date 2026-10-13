/**
 * Site copy and structure aligned to Original CGS Website Design mockups.
 */

export const org = {
  name: 'Cyber Guardian Society',
  fullName: 'CyberGuardianSociety',
  shortName: 'CGS',
  tagline: 'Defend. Learn. Conquer.',
  logo: '/cgs-logo-official.png',
  description:
    'Cyber Guardian Society is an independently volunteer-based cybersecurity firm. Our members share intelligence, build capability and strengthen collective defense without shareholders, sponsors or external owners.',
  joinHref: '/join-cgs',
  contactHref: '/contact',
  email: 'cyberguardiansociety@gmail.com',
  phone: '+92 182 868 289',
  phoneHref: 'tel:+92182868289',
  headquarters: 'Shaheed Benazirabad, Pakistan, 67450',
} as const

export const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Services', href: '/services' },
  { label: 'Team', href: '/team' },
  { label: 'Products', href: '/products' },
  { label: 'Testimonials', href: '/testimonials' },
  { label: 'Contact', href: '/contact' },
  { label: 'Browse sessions', href: '/#sessions' },
  { label: 'Join as a speaker', href: '/join-as-speaker' },
  { label: 'Attendance', href: '/attendance' },
  { label: 'Verify certificate', href: '/verify-certificate' },
  { label: 'Download certificate', href: '/download-certificate' },
] as const

/** Every official CGS channel, rendered in the footer and on the contact page. */
export const socials = [
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/127073910',
    handle: 'Cyber Guardian Society',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/cyberguardiansociety2026/',
    handle: '@cyberguardiansociety2026',
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp Community',
    href: 'https://chat.whatsapp.com/F6pOPqp7yCoGNYpEj8UKAT',
    handle: 'Join the community chat',
  },
  {
    key: 'discord',
    label: 'Discord',
    href: 'https://discord.gg/vqPh6VQ9F',
    handle: 'Live community server',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    href: 'https://www.youtube.com/@CyberGuardianSociety-j2w',
    handle: 'Talks, walkthroughs and labs',
  },
  {
    key: 'github',
    label: 'GitHub',
    href: 'https://github.com/cyberguardiansociety',
    handle: 'Open-source projects',
  },
] as const

export const images = {
  heroSoc:
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80',
  trustCollab:
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
  aboutBoardroom:
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1400&q=80',
  servicesControl:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
} as const

/* ─── Home (page_1) ─────────────────────────────────────────────────────── */

export type OnlineSession = {
  id: string
  title: string
  description: string
  date: string
  time: string
  platform: string
  href: string
}

export const onlineSessions: { current: OnlineSession[]; upcoming: OnlineSession[] } = {
  current: [],
  upcoming: [],
}

export const hero = {
  eyebrow: 'Cyber Guardian Society',
  headline: 'Security is stronger when knowledge moves.',
  sub: 'A volunteer-run community where defenders share what they know, practice together, and respond faster — because no team should face a threat alone.',
  primaryCta: { label: 'Become a member', href: '/join-cgs' },
  secondaryCta: { label: 'See what we do', href: '/services' },
  image: images.heroSoc,
} as const

export const trustedCommons = {
  eyebrow: 'Our commons',
  headline: 'Built by defenders, for defenders.',
  body: 'CGS is where practitioners share what they actually know — not polished press releases, but real playbooks, hard lessons, and live signals.',
  image: images.trustCollab,
  badge: 'A trusted home for the people defending our digital world.',
  points: [
    {
      title: 'Peer-driven',
      body: 'Real practitioners share context across org lines — no gatekeeping, no noise.',
    },
    {
      title: 'Open by design',
      body: 'Structured enough to be useful; open enough for you to shape what happens next.',
    },
    {
      title: 'Across every sector',
      body: 'Banks, hospitals, governments, builders — one shared network.',
    },
  ],
} as const

export const capabilities = {
  heading: 'What you actually get.',
  sub: 'Readiness you can run, intelligence you can act on, and training that sticks.',
  items: [
    {
      key: 'incident',
      icon: 'shield' as const,
      title: 'Incident Readiness',
      body: 'Tabletops and playbooks that prepare your team before the real thing arrives.',
      href: '/services',
      linkLabel: 'How it works →',
    },
    {
      key: 'intel',
      icon: 'scan' as const,
      title: 'Threat Intelligence',
      body: 'Community-sourced signals with context you can actually use — no noise.',
      href: '/products',
      linkLabel: 'See the tools →',
    },
    {
      key: 'training',
      icon: 'flag' as const,
      title: 'Cyber Training',
      body: 'Hands-on labs alongside practitioners who already know the terrain.',
      href: '/services',
      linkLabel: 'Explore training →',
    },
  ],
  band: {
    label: 'Ready to turn intelligence into action?',
    cta: { label: 'Become a member', href: '/join-cgs' },
  },
} as const

export const finalCta = {
  heading: 'Make your next response faster.',
  sub: 'Join the society, share what you know, and help strengthen the next team that needs it.',
  primaryCta: { label: 'Apply to join', href: '/join-cgs' },
  secondaryCta: { label: 'Talk to us first', href: '/contact' },
} as const

/* ─── About (page_2) ────────────────────────────────────────────────────── */

export const aboutPage = {
  eyebrow: 'Who we are',
  headline: 'Volunteer-run. Practitioner-led. No shareholders.',
  body: 'CGS brings defenders together so no team faces a shared threat alone. Every workshop, drill, and response is led by volunteers — people who give their own time because they believe defense works better as a team sport.',
  image: images.aboutBoardroom,
  badge: 'Member-led since day one',
  heroMeta: [
    { value: 'Volunteer-run', label: 'No shareholders or sponsors' },
    { value: 'Open membership', label: 'Applications reviewed by peers' },
    { value: 'Peer-led', label: 'Shared practice across the community' },
  ],
  why: {
    eyebrow: 'Why we exist',
    headline: 'Cyber risk is shared. Defense should be too.',
    body: 'Defenders need somewhere to compare decisions and strengthen collective response — before incidents happen, not after.',
    link: { label: 'Read our principles →', href: '#principles' },
  },
  principles: {
    eyebrow: 'How we work',
    headline: 'Principles that change how we work together.',
    sub: 'Not slogans. Rules that actually shape what happens inside CGS.',
    items: [
      { id: '01', title: 'Actionable intelligence', body: 'Signals must be useful under pressure — not just interesting in hindsight.' },
      { id: '02', title: 'Truly collaborative', body: 'Peers share context across org lines without exposing sensitive ops.' },
      { id: '03', title: 'Private by design', body: 'Trust is engineered into how we store, share, and discuss sensitive work.' },
      { id: '04', title: 'Inclusive and diverse', body: 'Defense improves when more vantage points are in the room.' },
    ],
  },
  cta: {
    heading: 'Want to help shape what CGS becomes?',
    sub: 'Join a volunteer-led community focused on shared cyber defense.',
    primaryCta: { label: 'Apply for membership', href: '/join-cgs' },
    secondaryCta: { label: 'Ask us anything', href: '/contact' },
  },
} as const

/* ─── Services (page_3) ─────────────────────────────────────────────────── */

export const servicesPage = {
  eyebrow: 'What we offer',
  headline: 'From readiness to response — we cover the whole lifecycle.',
  body: 'Whether you need sharper detection, better playbooks, or a network to call on when things get serious — this is where you start.',
  image: images.servicesControl,
  gridHeading: 'Six ways we support your team.',
  gridSub: 'Pick what fits now. Everything is designed to work together when you need more.',
  items: [
    { title: 'Incident readiness', body: 'Shared playbooks and rehearsals so your team knows exactly what to do when it counts.', href: '/contact' },
    { title: 'Threat intelligence exchange', body: 'Trusted signals with context — not just indicators dumped in a feed.', href: '/contact' },
    { title: 'Detection engineering', body: 'Peer-reviewed rules and patterns that actually find what matters.', href: '/contact' },
    { title: 'Workforce development', body: 'Labs and learning tracks that grow operators and leaders side by side.', href: '/contact' },
    { title: 'Leadership advisory', body: 'Clear-headed support for executives managing shared cyber risk.', href: '/contact' },
    { title: 'Response capacity', body: 'Coordinated mutual aid when a campaign stretches beyond one team.', href: '/contact' },
  ],
  faq: {
    heading: 'Common questions, honest answers.',
    sub: 'Practical details about working with CGS and what to expect.',
    items: [
      {
        id: 1,
        title: 'What kinds of support do you actually provide?',
        content: 'Incident readiness, threat intel exchange, detection engineering, workforce development, leadership advisory, and response coordination. Tell us where you are and we will tell you what fits.',
      },
      {
        id: 2,
        title: 'How do you share intelligence without exposing sensitive ops?',
        content: 'We focus on useful indicators and context — not raw operational details. Before anything moves, we agree on scope, handling requirements, and boundaries.',
      },
      {
        id: 3,
        title: 'Is this only for large security teams?',
        content: 'No. We work with teams at every size and stage. Contact us to describe your situation and we will be straight with you about whether we are the right fit.',
      },
      {
        id: 4,
        title: 'Can I call CGS for emergency incident response?',
        content: 'Not as a guaranteed hotline. Response coordination depends on situation, agreed scope, and available capacity. Talk to us in advance so we can set realistic expectations.',
      },
      {
        id: 5,
        title: 'How do we get started?',
        content: 'Send a message or request a demo. We will ask about your goals and constraints, then walk through the options that make sense for you.',
      },
    ],
  },
  cta: {
    heading: 'Build the capability your next incident will demand.',
    sub: 'Let\'s talk readiness, intelligence, and training.',
    primaryCta: { label: 'Book a demo', href: '/contact' },
    secondaryCta: { label: 'Send us a message', href: '/contact' },
  },
} as const

/* ─── Products (page_4) ─────────────────────────────────────────────────── */

export const productsPage = {
  eyebrow: 'Products',
  headline: 'Tools built the way defenders actually work.',
  body: 'Products shaped by real hunting, response, and sharing — focused on intelligence and resilience, not dashboards.',
  heroNote: org.tagline,
  heroMarks: ['Defender-shaped', 'Peer-reviewed', 'Runs under pressure'],
  /** The hero walks the signal path instead of showing the CGS mark. */
  flow: [
    { icon: 'collect', title: 'Collect', body: 'Indicators land in one trusted channel instead of five inboxes.' },
    { icon: 'context', title: 'Contextualise', body: 'Peer annotation turns a raw signal into something you can act on.' },
    { icon: 'act', title: 'Act', body: 'Shared playbooks move a finding straight into response.' },
    { icon: 'share', title: 'Share', body: 'Outcomes return to the network as training and patterns.' },
  ],
  primaryCta: { label: 'Book a demo', href: '/contact' },
  secondaryCta: { label: 'Apply to join', href: '/join-cgs' },
  promise: {
    eyebrow: 'Our promise',
    headline: 'Built for sensitive work.',
    body: 'Every infrastructure and process decision reflects the sensitivity of what defenders share.',
    items: [
      { title: 'Secure infrastructure', body: 'Hardened platforms for collaborative work.' },
      { title: 'Data isolation', body: 'Clear boundaries between member contexts.' },
      { title: 'Real-time storage', body: 'Fast access without careless retention.' },
      { title: 'Independent testing', body: 'External validation of what we claim.' },
    ],
  },
  cta: {
    heading: 'Put collective intelligence to work.',
    sub: 'Talk with us about how shared intelligence can support your team.',
    primaryCta: { label: 'Talk to an expert', href: '/contact' },
    secondaryCta: { label: 'Apply to join', href: '/join-cgs' },
  },
} as const

/* ─── Testimonials (page_5) ─────────────────────────────────────────────── */

export const testimonialsPage = {
  eyebrow: 'Community stories',
  headline: 'Member stories',
  body: 'No member testimonials have been published yet.',
  cta: {
    heading: 'Have a story to share?',
    sub: 'Contact the team to discuss contributing a member story.',
    primaryCta: { label: 'Contact us', href: '/contact' },
    secondaryCta: { label: 'Join CGS', href: '/join-cgs' },
  },
} as const

/* ─── Team ─────────────────────────────────────────────────────────────── */

/**
 * Team member data for the org-chart design.
 * Level 1: Founder (one card)
 * Level 2: Co-Founder, Deputy Lead (two cards)
 * Level 3: Co-Deputy Lead (one card)
 * Level 4: Department leads (three cards)
 */
export type TeamMember = {
  id: string
  name: string
  roleBadge: string
  title: string
  subtitle: string
  bio: string
  photo?: string
  photoFocus?: string
  skills?: string[]
  highlightBadge?: { label: string; logo?: string }
  socials: {
    linkedin?: string
    github?: string
    email?: string
    instagram?: string
    website?: string
    whatsapp?: string
  }
  level: 1 | 2 | 3 | 4
  parentId?: string
  team?: TeamMember[]
}

export const teamData: TeamMember[] = [
  {
    id: 'founder',
    name: 'Shayan Ahmed',
    roleBadge: 'FOUNDER / CEO',
    title: 'Lead Security Consultant',
    subtitle: 'Founder / CEO',
    bio: 'Shayan founded CGS to turn shared cyber knowledge into a strong, volunteer-led defense network. He guides the society with a focus on strategy, community growth, and high-trust leadership.',
    photo: '/team/shayan-ahmed.png',
    photoFocus: 'center 18%',
    skills: ['Cybersecurity', 'Leadership', 'Community', 'Strategy'],
    socials: {
      linkedin: 'https://www.linkedin.com/in/shayanahmedmughal',
      instagram: 'https://www.instagram.com/shayanahmed806?dlrf=MWM4dGJvNHN2M2lnYg==',
      github: 'https://github.com/OperationZero-GHH',
    },
    level: 1,
  },
  {
    id: 'deputy-lead',
    name: 'Esha Javeed',
    roleBadge: 'DEPUTY LEAD',
    title: 'Operations Lead',
    subtitle: 'Deputy Lead',
    bio: 'Esha supports the CGS mission by coordinating team operations, structure, and momentum across the organization.',
    photo: '/team/Esha%20Javeed.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/esha-javeed-148345346/',
    },
    level: 2,
  },
  {
    id: 'business-division',
    name: 'Minahil Javeed',
    roleBadge: 'DIVISION LEAD',
    title: 'Business Division Lead',
    subtitle: 'Buisness Division',
    bio: 'Minahil leads the business division and helps coordinate the strategic growth and operational planning of the society.',
    socials: {
      linkedin: 'https://www.linkedin.com/in/minahill-javed-b104b731b?utm_source=share_via&utm_content=profile&utm_medium=member_androi',
    },
    level: 3,
    team: [
      {
        id: 'hassan-mahmood',
        name: 'Hassan Mahmood',
        roleBadge: 'MEMBER',
        title: 'Business Division Member',
        subtitle: 'Business Division',
        bio: 'Hassan Mahmood contributes through consistent support to the society’s goals and growth.',
        photo: '/team/hassan-mahmood.jpeg',
        photoFocus: 'center 18%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/hassan-mehmood-cybersecurity?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
      {
        id: 'muhammad-zaid',
        name: 'Muhammad Zaid',
        roleBadge: 'MEMBER',
        title: 'Business Division Member',
        subtitle: 'Business Division',
        bio: 'Muhammad Zaid contributes to CGS with commitment and a clear collaborative mindset.',
        socials: {},
        level: 4,
      },
    ],
  },
  {
    id: 'hr-pr-division',
    name: 'Muzammil',
    roleBadge: 'DIVISION LEAD',
    title: 'HR & PR Division Lead',
    subtitle: 'HR & PR Management Division',
    bio: 'Muzammil leads the HR and public relations division, supporting internal coordination and external communication for the community.',
    photo: '/team/Muzamil.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/muzzamil-memon-1a1ab22b4?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    },
    level: 3,
    team: [
      {
        id: 'neelam',
        name: 'Neelam',
        roleBadge: 'MEMBER',
        title: 'HR & PR Division Member',
        subtitle: 'HR & PR Management Division',
        bio: 'Neelam supports the community with active participation and a positive collaborative spirit.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/neelam-shahzadi-b08481316?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
      {
        id: 'syed-ahmer',
        name: 'Syed Ahmer',
        roleBadge: 'MEMBER',
        title: 'HR & PR Division Member',
        subtitle: 'HR & PR Management Division',
        bio: 'Syed Ahmer contributes through steady engagement and dependable support.',
        photo: '/team/syed-ahmer.jpeg',
        photoFocus: 'center 18%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/syed-ahmer-bin-aziz-527329234?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
      {
        id: 'touheed-ahmed',
        name: 'Touheed Ahmed',
        roleBadge: 'MEMBER',
        title: 'HR & PR Division Member',
        subtitle: 'HR & PR Management Division',
        bio: 'Touheed Ahmed contributes to the society with active support and community-driven effort.',
        photo: '/team/touheed-ahmed.jpeg',
        photoFocus: 'center 24%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/touheedahmed/',
        },
        level: 4,
      },
    ],
  },
  {
    id: 'writing-division',
    name: 'Wania Fatima',
    roleBadge: 'DIVISION LEAD',
    title: 'Writing & Documentation Division Lead',
    subtitle: 'Writing & Documentation Division',
    bio: 'Wania leads the writing and documentation team, shaping clear communication and structured knowledge for the community.',
    photo: '/team/Wania%20Fatima.png',
    socials: {
      linkedin: 'https://www.linkedin.com/in/wania-fatima',
    },
    level: 3,
    team: [
      {
        id: 'ayesha-majeed',
        name: 'Ayesha Majeed',
        roleBadge: 'MEMBER',
        title: 'Writing & Documentation Division Member',
        subtitle: 'Writing & Documentation Division',
        bio: 'Ayesha contributes to the CGS community with professionalism and a strong sense of purpose.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/ayesha-majeed-154925436/?isSelfProfile=true',
        },
        level: 4,
      },
      {
        id: 'muhammad-oun',
        name: 'Muhammad Oun',
        roleBadge: 'MEMBER',
        title: 'Writing & Documentation Division Member',
        subtitle: 'Writing & Documentation Division',
        bio: 'Muhammad Oun brings reliability and active involvement to the society’s initiatives.',
        photo: '/team/muhammad-oun.jpeg',
        photoFocus: 'center 18%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/muhammad-oun-6b2860374?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app',
        },
        level: 4,
      },
      {
        id: 'waris-hussain',
        name: 'Waris Hussain',
        roleBadge: 'MEMBER',
        title: 'Writing & Documentation Division Member',
        subtitle: 'Writing & Documentation Division',
        bio: 'Waris supports the team through consistent contribution and community-focused effort.',
        photo: '/team/waris-hussain.jpeg',
        photoFocus: 'center 18%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/waris-hussain-215b55418?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
    ],
  },
  {
    id: 'technical-division',
    name: 'Mahnoor Shuaib',
    roleBadge: 'DIVISION LEAD',
    title: 'Technical Division Lead',
    subtitle: 'Technical Division',
    bio: 'Mahnoor leads the technical division and contributes to CGS with practical execution, systems thinking, and research-driven leadership.',
    photo: '/team/mahnoor-shuaib.jpeg',
    photoFocus: 'center 24%',
    socials: {
      linkedin: 'https://www.linkedin.com/in/mahnoor-shuaib-46ba59327/',
    },
    level: 3,
    team: [
      {
        id: 'muhammad-taha',
        name: 'Muhammad Taha',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'Muhammad Taha is an active contributor supporting the technical side of the CGS mission.',
        photo: '/team/muhammad-taha.png',
        photoFocus: 'center 24%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/muhammad-taha-571a343a8/',
        },
        level: 4,
      },
      {
        id: 'abdul-rauf',
        name: 'Abdul Rauf',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'Abdul Rauf contributes with commitment to the broader CGS objectives and projects.',
        photo: '/team/abdul-rauf.jpeg',
        photoFocus: 'center 26%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/abdul-raufcyber',
        },
        level: 4,
      },
      {
        id: 'hamna-rehman',
        name: 'Hamna Rehman',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'Hamna contributes through thoughtful engagement and support of the society’s mission.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/hamna-rehman-a54849397/',
        },
        level: 4,
      },
      {
        id: 'm-zohaib-shahzad',
        name: 'M. Zohaib Shahzad',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'M. Zohaib Shahzad contributes to CGS through active participation and technical responsibility.',
        photo: '/team/muhammad-zohaib-shahzad.png',
        photoFocus: 'center 30%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/mzohaibshahzad-sec/',
        },
        level: 4,
      },
      {
        id: 'muhammad-umair',
        name: 'Muhammad Umair',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'Muhammad Umair supports CGS with technical contribution and community involvement.',
        photo: '/team/muhammad-umair.jpeg',
        photoFocus: 'center 40%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/mumair-cyber-expert/',
        },
        level: 4,
      },
      {
        id: 'qazi-mustafa',
        name: 'Qazi Mustafa',
        roleBadge: 'MEMBER',
        title: 'Technical Division Member',
        subtitle: 'Technical Division',
        bio: 'Qazi Mustafa contributes with enthusiasm and a strong sense of community responsibility.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/qazi-ghulam-mustafa-a77b68362?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
    ],
  },
  {
    id: 'social-division',
    name: 'Jannat Fatima',
    roleBadge: 'DIVISION LEAD',
    title: 'Social Media & Marketing Division Lead',
    subtitle: 'Social Media Management Division',
    bio: 'Jannat leads the social media and marketing division, helping amplify the society’s message and community reach.',
    photo: '/team/jannat-fatima.png',
    photoFocus: 'center 26%',
    socials: {
      linkedin: 'https://www.linkedin.com/in/jannat-rajput-2367a038b?utm_source=share_via&utm_content=profile&utm_medium=member_android',
    },
    level: 3,
    team: [
      {
        id: 'sonia-farheen',
        name: 'Sonia Farheen',
        roleBadge: 'MEMBER',
        title: 'Social Media & Marketing Division Member',
        subtitle: 'Social Media Management Division',
        bio: 'Sonia contributes to the CGS mission through active participation and support across the community.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/sonia-farheen-112b18385?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
      {
        id: 'maha-fatima',
        name: 'Maha Fatima',
        roleBadge: 'MEMBER',
        title: 'Social Media & Marketing Division Member',
        subtitle: 'Social Media Management Division',
        bio: 'Maha contributes to the society through creative and collaborative engagement.',
        photo: '/team/maha-fatima.png',
        photoFocus: 'center 24%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/maha-fatima-cyberdesign/',
        },
        level: 4,
      },
      {
        id: 'aban-aisha',
        name: 'Aban Aisha',
        roleBadge: 'MEMBER',
        title: 'Social Media & Marketing Division Member',
        subtitle: 'Social Media Management Division',
        bio: 'Aban Aisha supports the team with a motivated and collaborative approach.',
        socials: {},
        level: 4,
      },
      {
        id: 'bisma-soomro',
        name: 'Bisma Soomro',
        roleBadge: 'MEMBER',
        title: 'Social Media & Marketing Division Member',
        subtitle: 'Social Media Management Division',
        bio: 'Bisma supports CGS social media and marketing with creative contributions and community engagement.',
        photo: '/team/bisma-soomro-1.png',
        photoFocus: 'center 25%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/bisma-soomro/',
        },
        level: 4,
      },
    ],
  },
  {
    id: 'event-division',
    name: 'Asad Malik',
    roleBadge: 'DIVISION LEAD',
    title: 'Event Management Division Lead',
    subtitle: 'Event Management Division',
    bio: 'Asad leads the event management division and brings energy, planning, and coordination to CGS initiatives and community gatherings.',
    photo: '/team/asad-malik.png',
    photoFocus: 'center 22%',
    socials: {
      linkedin: 'https://www.linkedin.com/in/asad-malik-9624883b6/',
    },
    level: 3,
    team: [
      {
        id: 'm-mashood',
        name: 'M. Mashood',
        roleBadge: 'MEMBER',
        title: 'Event Management Division Member',
        subtitle: 'Event Management Division',
        bio: 'M. Mashood contributes through community support and a strong commitment to CGS goals.',
        photo: '/team/m-mashood.jpeg',
        photoFocus: 'center 20%',
        socials: {
          linkedin: 'https://www.linkedin.com/in/muhammad-mashhood?utm_source=share_via&utm_content=profile&utm_medium=member_android',
        },
        level: 4,
      },
      {
        id: 'siraj',
        name: 'Muhammad Siraj',
        roleBadge: 'MEMBER',
        title: 'Event Management Division Member',
        subtitle: 'Event Management Division',
        bio: 'Muhammad Siraj supports the community with active participation and a collaborative spirit.',
        socials: {
          linkedin: 'https://www.linkedin.com/in/siraj-mahmood-4374ba274/',
        },
        level: 4,
      },
    ],
  },
]

export const teamPage = {
  eyebrow: 'Our team',
  headline: 'Meet the crew',
  headlineAccent: 'crew',
  body: 'The minds behind CGS: security researchers, developers, and CTF enthusiasts working together to strengthen collective defense.',
  cta: {
    heading: 'Want to join the team?',
    sub: "Whether you're a security researcher, developer, or student, CGS is for you.",
    primaryCta: { label: 'Apply Now', href: '/join-cgs' },
  },
} as const

/* ─── Contact (page_7) ──────────────────────────────────────────────────── */

/** Contact page rows. Typed so every row may optionally carry a link. */
const contactDetails: readonly {
  label: string
  value: string
  href?: string
  icon: 'map' | 'phone' | 'mail' | 'whatsapp' | 'community' | 'hours'
}[] = [
  {
    label: 'Headquarters',
    value: org.headquarters,
    icon: 'map',
  },
  { label: 'WhatsApp number', value: org.phone, href: org.phoneHref, icon: 'phone' },
  {
    label: 'Email',
    value: org.email,
    href: `mailto:${org.email}`,
    icon: 'mail',
  },
  {
    label: 'Contact hours',
    value: 'Volunteer-led; typical reply within 1-2 business days',
    icon: 'hours',
  },
  {
    label: 'WhatsApp Community',
    value: 'Open community chat',
    href: socials.find((s) => s.key === 'whatsapp')?.href ?? '#',
    icon: 'whatsapp',
  },
]

export const contactPage = {
  eyebrow: 'Talk to us',
  headline: 'Tell us what you need. We\'ll take it from there.',
  body: 'Whether it\'s a demo, membership, a partnership, or just a question — we read every message and reply within two business days.',
  form: {
    eyebrow: 'Send us a message',
    headline: 'We\'ll get it to the right person.',
    body: 'A bit of context helps us reply faster and more usefully.',
    submitLabel: 'Send message',
    sendingLabel: 'Sending…',
    successTitle: 'Got it — thanks!',
    successBody: 'A real member of the team will reply within 1–2 business days.',
    resetLabel: 'Send another message',
    privacyNote: 'We only use your details to answer this message.',
    responseNote: 'Typical reply: 1–2 business days',
    topics: [
      'Book a demo',
      'Membership question',
      'Training & labs',
      'Partnership',
      'Press or speaking',
      'Something else',
    ],
    countries: [
      'Americas',
      'EMEA',
      'Asia Pacific',
      'Middle East & Africa',
      'Other / multiple regions',
    ],
  },
  details: contactDetails,
  offices: {
    eyebrow: 'Where we operate',
    headline: 'Global reach, local context.',
    items: [
      { title: 'Americas', body: 'Regional coordination and member events.', href: '/contact' },
      { title: 'EMEA', body: 'Exercise facilitation and partner outreach.', href: '/contact' },
      { title: 'Asia Pacific', body: 'Chapter growth and threat exchange windows.', href: '/contact' },
      { title: 'Virtual HQ', body: 'Always-on community and support channels.', href: '/contact' },
    ],
  },
} as const

/* ─── Login (page_8) ────────────────────────────────────────────────────── */

export const loginPage = {
  eyebrow: 'Secure login · Global access',
  headline: 'Welcome back to the network.',
  body: 'Sign in to access labs, intelligence exchanges, and member spaces.',
  status: 'Network status: operational',
} as const

/* ─── Join (application wizard) ──────────────────────────────────────────── */

/**
 * ISO 3166-1 alpha-2 codes. The UI turns these into country names with
 * Intl.DisplayNames, which keeps this file readable and the list correct.
 */
export const COUNTRY_CODES = [
  'AF','AX','AL','DZ','AS','AD','AO','AI','AQ','AG','AR','AM','AW','AU','AT','AZ','BS','BH','BD','BB',
  'BY','BE','BZ','BJ','BM','BT','BO','BA','BW','BR','BN','BG','BF','BI','CV','KH','CM','CA','KY',
  'CF','TD','CL','CN','CO','KM','CG','CD','CR','CI','HR','CU','CW','CY','CZ','DK','DJ','DM','DO',
  'EC','EG','SV','GQ','ER','EE','SZ','ET','FJ','FI','FR','GA','GM','GE','DE','GH','GR','GD','GT',
  'GN','GW','GY','HT','HN','HK','HU','IS','IN','ID','IR','IQ','IE','IL','IT','JM','JP','JO','KZ',
  'KE','KI','KP','KR','KW','KG','LA','LV','LB','LS','LR','LY','LI','LT','LU','MO','MG','MW','MY',
  'MV','ML','MT','MH','MR','MU','MX','FM','MD','MC','MN','ME','MA','MZ','MM','NA','NR','NP','NL',
  'NZ','NI','NE','NG','NU','NF','MK','MP','NO','OM','PK','PW','PS','PA','PG','PY','PE','PH','PL',
  'PT','QA','RO','RU','RW','KN','LC','VC','WS','SM','ST','SA','SN','RS','SC','SL','SG','SK','SI',
  'SB','SO','ZA','GS','SS','ES','LK','SD','SR','SJ','SE','CH','SY','TW','TJ','TZ','TH','TL','TG',
  'TK','TO','TT','TN','TR','TM','TC','TV','UG','UA','AE','GB','US','UY','UZ','VU','VE','VN','VG',
  'VI','WF','EH','YE','ZM','ZW',
] as const

export const joinPage = {
  eyebrow: 'Membership application',
  headline: 'Join Cyber Guardian Society.',
  sub: 'Four short steps. Tell us who you are, what you do, and where you want to contribute.',
  successLabel: 'Application received',
  steps: [
    { id: 'personal', title: 'Personal', caption: 'Identity & contact' },
    { id: 'academic', title: 'Academic', caption: 'Study or work' },
    { id: 'skills', title: 'Divisions', caption: 'Focus & experience' },
    { id: 'agreement', title: 'Agreement', caption: 'Declaration' },
  ],
  nextSteps: [
    { title: 'We review your application', body: 'A CGS lead reads every submission for ethics alignment.' },
    { title: 'You get a confirmation call', body: 'We reach out on the number you shared to finalise onboarding.' },
    { title: 'You join a division', body: 'You are placed in your primary division with a mentor.' },
  ],
  statusOptions: [
    'School Student',
    'College Student',
    'University Student',
    'Graduate',
    'Working Professional',
    'Freelancer',
    'Other',
  ],
  yearOptions: [
    'Not applicable',
    '1st year',
    '2nd year',
    '3rd year',
    '4th year',
    '5th year / final year',
    'Postgraduate',
    'PhD / Doctorate',
  ],
  divisions: [
    { value: 'cybersecurity', label: 'Cybersecurity / Technical', emoji: '🛡️' },
    { value: 'design', label: 'Graphic Design', emoji: '🎨' },
    { value: 'marketing', label: 'Social Media & Marketing', emoji: '📱' },
    { value: 'writing', label: 'Writing & Documentation', emoji: '✍️' },
    { value: 'events', label: 'Event Management', emoji: '🎤' },
    { value: 'hr', label: 'HR / People Management', emoji: '👥' },
    { value: 'business', label: 'Business & Partnerships', emoji: '💼' },
    { value: 'community', label: 'Community & Outreach', emoji: '🌐' },
    { value: 'other', label: 'Other', emoji: '➕' },
  ],
  skills: [
    'Cybersecurity fundamentals',
    'Network security',
    'Web security',
    'Reverse engineering',
    'Malware analysis',
    'Digital forensics',
    'OSINT',
    'Scripting & automation',
    'Cloud security',
    'UI / UX design',
    'Graphic design',
    'Video editing',
    'Content writing',
    'Technical writing',
    'Social media management',
    'SEO',
    'Community management',
    'Public speaking',
    'Event planning',
    'Leadership',
    'HR & recruitment',
    'Sales & partnerships',
  ],
  skillLevels: ['Beginner', 'Intermediate', 'Advanced'] as const,
  cyberAreas: [
    'Web Security',
    'Network Security',
    'Digital Forensics',
    'OSINT',
    'Penetration Testing',
    'Cryptography',
    'Reverse Engineering',
    'Malware Analysis',
    'Cloud Security',
    'SOC / Blue Team',
    'CTF',
    'Security Research',
    'Other',
  ],
  declarations: [
    {
      id: 'accuracy',
      label:
        'I confirm that the information provided in this application is accurate and complete.',
    },
    {
      id: 'conduct',
      label:
        'I agree to follow CGS rules, maintain professional conduct, respect other members, and represent CGS responsibly.',
    },
    {
      id: 'commitment',
      label:
        'I understand that joining CGS requires active participation and responsible completion of assigned responsibilities.',
    },
    {
      id: 'notice',
      label:
        'I understand that CGS may use the information provided in this form for membership evaluation, communication, onboarding, and organizational purposes.',
    },
  ],
  uploads: {
    cv: {
      label: 'Upload CV / Resume',
      hint: 'PDF only · maximum 5 MB',
      maxMb: 5,
    },
  },
  success: {
    title: 'Your application is in.',
    body: 'Keep your reference code — it is how the CGS team tracks your onboarding.',
    next: [
      'A CGS lead reviews your application within 3 working days.',
      'We confirm your onboarding call on the phone number you shared.',
      'You receive your division handbook and first task list.',
    ],
    home: 'Back to home',
    again: 'Submit another application',
  },
  emailFallback: {
    title: 'Send this to us by email instead',
    body: 'Only PDF files up to 5 MB can be uploaded here. Email your CV and the details below and we will add you to the same queue.',
    cta: 'Email cyberguardiansociety@gmail.com',
  },
  requiredNote: 'Fields marked * are required.',
} as const

export const footer = {
  description:
    'CGS is a volunteer-run cybersecurity community. Every workshop, drill, and response is led by people who give their own time — no shareholders, no sponsors, no external owners.',
  copyright: `© ${new Date().getFullYear()} Cyber Guardian Society. All rights reserved.`,
  credit: 'Independently volunteer-run.',
  columns: [
    {
      title: 'Product',
      links: [
        { label: 'Services', href: '/services' },
        { label: 'Products', href: '/products' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Team', href: '/team' },
        { label: 'Contact', href: org.contactHref },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Testimonials', href: '/testimonials' },
        { label: 'Join CGS', href: org.joinHref },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Code of Conduct', href: '/code-of-conduct' },
        { label: 'Terms of Service', href: '/terms' },
      ],
    },
  ],
  contactBlock: {
    title: 'Talk to a real person',
    body: 'Tell us what you\'re working on — a real member replies.',
    cta: { label: 'Send us a message', href: org.contactHref },
  },
  joinBox: {
    title: 'Help make the network stronger',
    body: 'Membership starts with a conversation, not a payment.',
    primary: { label: 'Apply to join', href: org.joinHref },
    secondary: { label: 'Talk to us first', href: org.contactHref },
  },
} as const
