export const MOCK_COPY = {
  ariaLabel: 'Editor preview: turning resume sections on and off updates a live preview of a sample resume.',
  title: 'Sample resume',
  exportLabel: 'Export PDF',
  sectionsLabel: 'Sections',
} as const;

/** Fictional sample shown in the hero mock. Not a real person. */
export const SAMPLE_RESUME = {
  name: 'Alex Morgan',
  role: 'Backend Engineer',
  contact: 'alex.morgan@example.com · Portland, OR',
  summary: 'Backend engineer building reliable APIs and data pipelines for logistics and payments teams.',
  experience: [
    {
      title: 'Senior Backend Engineer',
      org: 'Northwind Freight',
      dates: '2021 – Present',
      points: ['Led the move of the order service to an event-driven design.', 'Mentored four engineers through their first on-call rotations.'],
    },
    {
      title: 'Software Engineer',
      org: 'Brightline Pay',
      dates: '2018 – 2021',
      points: ['Built the reconciliation service used by the finance team.'],
    },
  ],
  education: { degree: 'B.S. Computer Science', school: 'State University', dates: '2018' },
  projects: 'Open-source command-line tool for validating OpenAPI specs.',
  skills: 'Go · PostgreSQL · Kafka · Docker · AWS',
} as const;

export type NavItem = { label: string; href: string } | { label: string; to: string };

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Features', href: '#features' },
  { label: 'Templates', href: '#templates' },
  { label: 'Privacy', to: '/privacy-policy' },
];

export const NAV_COPY = {
  brand: 'ResumeForge',
  signIn: 'Sign in',
  cta: 'Get started',
  skip: 'Skip to content',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
} as const;

export const HERO_COPY = {
  eyebrow: 'Resume & cover letter builder',
  headline: 'Build a resume you can stand behind.',
  sub: 'Pick a template, shape every section, preview it live and export a clean PDF.',
  primary: 'Build your resume',
  secondary: 'Browse templates',
  note: 'No credit card required · PDF export · Sign in with Google or GitHub',
} as const;
