import { Link } from 'react-router-dom';
import { CTA_COPY } from './content';

export default function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="l-inverse">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 lg:py-16">
        <div>
          <h2 id="cta-title" className="mb-2 text-3xl font-semibold tracking-[-0.03em]">
            {CTA_COPY.heading}
          </h2>
          <p className="l-inverse-muted m-0 text-lg">{CTA_COPY.sub}</p>
        </div>
        <Link to="/login" className="l-btn l-btn--inverse">
          {CTA_COPY.button}
        </Link>
      </div>
    </section>
  );
}
