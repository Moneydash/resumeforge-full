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
