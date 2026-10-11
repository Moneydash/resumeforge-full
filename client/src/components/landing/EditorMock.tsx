import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { SECTION_LABELS } from '@/utils/section-layout';
import { MOCK_COPY, SAMPLE_RESUME } from './content';
import { FRAME_MS, MOCK_FRAMES, MOCK_SECTIONS } from './mock-frames';
import type { MockFrame, MockSection } from './mock-frames';

export const SectionToggleList = ({ frame }: { frame: MockFrame }) => (
  <ul className="m-0 list-none p-0">
    {MOCK_SECTIONS.map((id) => (
      <li key={id} className="l-border flex items-center justify-between gap-2 border-b py-2 last:border-b-0">
        <span className="l-ink flex items-center gap-1.5 text-[0.8125rem]">
          <GripVertical aria-hidden="true" className="l-muted size-3.5" />
          {SECTION_LABELS[id]}
        </span>
        <span className="l-switch" data-on={frame[id]} />
      </li>
    ))}
  </ul>
);

const PaperSection = ({ id, title, children }: { id: MockSection; title: string; children: ReactNode }) => (
  <div data-paper-section={id} className="l-fade-in">
    <div className="l-paper-h">{title}</div>
    {children}
  </div>
);

const ResumePaper = ({ frame }: { frame: MockFrame }) => (
  <div className="l-paper">
    <div className="l-paper-name">{SAMPLE_RESUME.name}</div>
    <div className="l-paper-role">{SAMPLE_RESUME.role}</div>
    <div>{SAMPLE_RESUME.contact}</div>
    {frame.summary && (
      <PaperSection id="summary" title={SECTION_LABELS.summary}>
        <p className="m-0">{SAMPLE_RESUME.summary}</p>
      </PaperSection>
    )}
    {frame.experience && (
      <PaperSection id="experience" title={SECTION_LABELS.experience}>
        {SAMPLE_RESUME.experience.map((job) => (
          <div key={job.org} className="mb-1">
            <div>
              <b>{job.title}</b>, {job.org} · {job.dates}
            </div>
            <ul className="m-0 list-disc pl-3">
              {job.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </PaperSection>
    )}
    {frame.education && (
      <PaperSection id="education" title={SECTION_LABELS.education}>
        <div>
          <b>{SAMPLE_RESUME.education.degree}</b>, {SAMPLE_RESUME.education.school} · {SAMPLE_RESUME.education.dates}
        </div>
      </PaperSection>
    )}
    {frame.projects && (
      <PaperSection id="projects" title={SECTION_LABELS.projects}>
        <p className="m-0">{SAMPLE_RESUME.projects}</p>
      </PaperSection>
    )}
    {frame.skills && (
      <PaperSection id="skills" title={SECTION_LABELS.skills}>
        <p className="m-0">{SAMPLE_RESUME.skills}</p>
      </PaperSection>
    )}
  </div>
);

export default function EditorMock() {
  const [frameIndex, setFrameIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer === undefined) {
        timer = setInterval(() => setFrameIndex((i) => (i + 1) % MOCK_FRAMES.length), FRAME_MS);
      }
    };
    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    if (typeof IntersectionObserver === 'undefined') {
      start();
      return stop;
    }
    const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    observer.observe(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);

  const frame = MOCK_FRAMES[frameIndex];

  return (
    <div ref={rootRef} role="img" aria-label={MOCK_COPY.ariaLabel} className="l-window">
      <div className="l-border l-surface flex items-center justify-between border-b px-3 py-2 text-xs">
        <span className="l-ink font-medium">{MOCK_COPY.title}</span>
        <span className="l-border l-muted rounded-md border px-2 py-0.5">{MOCK_COPY.exportLabel}</span>
      </div>
      <div className="grid grid-cols-[7rem_1fr] sm:grid-cols-[8.5rem_1fr]">
        <div className="l-border l-surface border-r p-3">
          <p className="l-eyebrow l-muted mb-1">{MOCK_COPY.sectionsLabel}</p>
          <SectionToggleList frame={frame} />
        </div>
        <div className="l-canvas px-3 pt-4 sm:px-5">
          <ResumePaper frame={frame} />
        </div>
      </div>
    </div>
  );
}
