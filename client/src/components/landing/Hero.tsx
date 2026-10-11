import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import EditorMock from './EditorMock';
import { HERO_COPY } from './content';

export default function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-x-clip">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1fr_1.25fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="l-fade-up">
          <p className="l-eyebrow l-muted mb-4">{HERO_COPY.eyebrow}</p>
          <h1 id="hero-title" className="mb-5 text-4xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-[3.5rem]">
            {HERO_COPY.headline}
          </h1>
          <p className="l-muted mb-8 max-w-md text-lg leading-relaxed">{HERO_COPY.sub}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className="l-btn l-btn--primary">
              {HERO_COPY.primary}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a href="#templates" className="l-btn l-btn--ghost">
              {HERO_COPY.secondary}
            </a>
          </div>
          <p className="l-muted mt-5 text-sm">{HERO_COPY.note}</p>
        </div>
        <div className="l-fade-up lg:-mr-16">
          <EditorMock />
        </div>
      </div>
    </section>
  );
}
