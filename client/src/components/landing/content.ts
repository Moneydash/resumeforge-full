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
  note: 'No credit card required · PDF export · Sign in with Google, GitHub or LinkedIn',
} as const;

export const TRUST_ITEMS = [
  {
    title: 'Check ATS readability',
    body: 'Upload a PDF to the built-in scanner and see what an applicant tracking system can read from it.',
  },
  {
    title: 'Control the details',
    body: 'Reorder, hide and rename sections. Choose fonts, and recolor selected templates.',
  },
  {
    title: 'Straightforward privacy',
    body: 'We do not sell your personal information. Export your resume as a PDF whenever you need it.',
    link: { label: 'Read the privacy policy', to: '/privacy-policy' },
  },
] as const;

export const FEATURES_COPY = {
  srTrustHeading: 'Why ResumeForge',
  heading: 'What you can do',
  sub: 'The tools are the same whether you are writing a first resume or updating an old one.',
} as const;

export const FEATURE_ROWS = [
  {
    id: 'controls',
    title: 'Shape every section',
    body: 'Reorder sections, hide what does not apply, rename headings to suit your field, and pick fonts and colors. The preview updates as you work.',
  },
  {
    id: 'ats',
    title: 'See what an ATS reads',
    body: 'Upload your exported PDF to the scanner. It reads the text layer, checks sections and structure, and reports what it could extract.',
  },
  {
    id: 'letters',
    title: 'Match it with a cover letter',
    body: 'Write a cover letter in the same editor, with its own templates and the same font choices.',
  },
] as const;

/** Mirrors the scanner's own progress steps in ATSScanner.tsx. */
export const ATS_STEPS = ['Reading the text layer', 'Checking sections and structure', 'Evaluating results'] as const;

export const LETTER_PREVIEW_IDS = ['aether', 'aqua', 'terra'] as const;

export const templateStripCopy = (resumeCount: number, letterCount: number) => ({
  heading: 'Pick a template, then make it yours.',
  sub: `${resumeCount} resume templates and ${letterCount} cover letter templates. Every one is editable, and any of them can use any font.`,
});

export const CTA_COPY = {
  heading: 'Start your resume today.',
  sub: 'Sign in with Google, GitHub or LinkedIn to begin.',
  button: 'Get started',
} as const;

export const FOOTER_COPY = {
  brand: 'ResumeForge',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
} as const;
