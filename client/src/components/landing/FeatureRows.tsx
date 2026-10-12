import type { ReactNode } from 'react';
import { CheckCircle2, FileText, ScanText } from 'lucide-react';
import clTemplates from '@/utils/cl-templates-type';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { SectionToggleList } from './EditorMock';
import { ATS_STEPS, FEATURES_COPY, FEATURE_ROWS, LETTER_PREVIEW_IDS } from './content';
import { MOCK_FRAMES } from './mock-frames';

const ATS_ICONS = [FileText, ScanText, CheckCircle2];

const letterPreviews = LETTER_PREVIEW_IDS.flatMap((id) => {
  const template = clTemplates.find((t) => t.id === id);
  const src = TEMPLATE_THUMBS[id];
  return template && src ? [{ id, src, name: template.name }] : [];
});

const VISUALS: Record<(typeof FEATURE_ROWS)[number]['id'], ReactNode> = {
  controls: (
    <div className="l-window max-w-xs p-4">
      <SectionToggleList frame={MOCK_FRAMES[0]} />
    </div>
  ),
  ats: (
    <ol className="l-window m-0 max-w-xs list-none p-4">
      {ATS_STEPS.map((step, index) => {
        const Icon = ATS_ICONS[index];
        return (
          <li key={step} className="l-border flex items-center gap-3 border-b py-2.5 text-sm last:border-b-0">
            <Icon aria-hidden="true" className="l-accent size-4 shrink-0" />
            {step}
          </li>
        );
      })}
    </ol>
  ),
  letters: (
    <div className="grid max-w-sm grid-cols-3 gap-3">
      {letterPreviews.map((preview) => (
        <img
          key={preview.id}
          src={preview.src}
          alt={`${preview.name} cover letter template`}
          width={280}
          height={362}
          loading="lazy"
          className="l-border aspect-[17/22] w-full rounded-sm border object-cover object-top"
        />
      ))}
    </div>
  ),
};

export default function FeatureRows() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mb-12 max-w-xl">
        <h2 id="features-title" className="mb-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          {FEATURES_COPY.heading}
        </h2>
        <p className="l-muted m-0 text-lg leading-relaxed">{FEATURES_COPY.sub}</p>
      </div>
      <div className="flex flex-col gap-14 lg:gap-20">
        {FEATURE_ROWS.map((row, index) => (
          <div
            key={row.id}
            className={`l-border grid items-center gap-8 border-t pt-10 md:grid-cols-2 md:gap-12 ${index % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
          >
            <div>
              <h3 className="mb-2 text-xl font-semibold tracking-[-0.02em]">{row.title}</h3>
              <p className="l-muted m-0 max-w-md leading-relaxed">{row.body}</p>
            </div>
            <div className={index % 2 === 1 ? 'md:justify-self-start' : 'md:justify-self-end'}>{VISUALS[row.id]}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
