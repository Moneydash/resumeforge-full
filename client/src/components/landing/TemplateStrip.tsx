import { Link } from 'react-router-dom';
import templates from '@/utils/templates-type';
import clTemplates from '@/utils/cl-templates-type';
import { TEMPLATE_THUMBS } from '@/utils/template-thumbs';
import { templateStripCopy } from './content';

// A template without a thumbnail is omitted rather than rendered as a broken image.
const shown = (list: typeof templates) => list.filter((t) => t.available && TEMPLATE_THUMBS[t.id]);
const resumeTemplates = shown(templates);
const letterCount = shown(clTemplates).length;

export default function TemplateStrip() {
  const copy = templateStripCopy(resumeTemplates.length, letterCount);

  return (
    <section id="templates" aria-labelledby="templates-title" className="l-surface l-border border-y">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mb-10 max-w-xl">
          <h2 id="templates-title" className="mb-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
            {copy.heading}
          </h2>
          <p className="l-muted m-0 text-lg leading-relaxed">{copy.sub}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 sm:grid-cols-3 lg:grid-cols-5">
          {resumeTemplates.map((template) => (
            <li key={template.id}>
              <Link to="/login" className="block no-underline">
                <img
                  src={TEMPLATE_THUMBS[template.id]}
                  alt={`${template.name} resume template`}
                  width={280}
                  height={362}
                  loading="lazy"
                  className="l-thumb aspect-[17/22] w-full rounded-sm object-cover object-top"
                />
                <span className="l-ink mt-2 block text-sm font-medium">{template.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
