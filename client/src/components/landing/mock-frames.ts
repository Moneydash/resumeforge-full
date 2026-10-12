import type { SectionId } from '@/utils/section-layout';

export const MOCK_SECTIONS = ['summary', 'experience', 'education', 'projects', 'skills'] as const satisfies readonly SectionId[];

export type MockSection = (typeof MOCK_SECTIONS)[number];
export type MockFrame = Record<MockSection, boolean>;

const ALL_ON: MockFrame = { summary: true, experience: true, education: true, projects: true, skills: true };

/** Frame 0 is what renders without JS and under reduced motion. */
export const MOCK_FRAMES: readonly MockFrame[] = [
  { ...ALL_ON, projects: false },
  ALL_ON,
  { ...ALL_ON, education: false },
  ALL_ON,
];

export const FRAME_MS = 2800;
