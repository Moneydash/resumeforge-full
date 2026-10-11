import { Link } from 'react-router-dom';
import { FEATURES_COPY, TRUST_ITEMS } from './content';

export default function TrustStrip() {
  return (
    <section aria-labelledby="trust-title" className="l-border border-y">
      <h2 id="trust-title" className="sr-only">
        {FEATURES_COPY.srTrustHeading}
      </h2>
      <div className="l-border mx-auto grid max-w-6xl md:grid-cols-3 md:divide-x">
        {TRUST_ITEMS.map((item) => (
          <div key={item.title} className="l-border border-b px-4 py-6 last:border-b-0 sm:px-6 md:border-b-0 lg:px-8">
            <h3 className="mb-1.5 text-[0.9375rem] font-semibold">{item.title}</h3>
            <p className="l-muted m-0 text-sm leading-relaxed">{item.body}</p>
            {'link' in item && (
              <Link to={item.link.to} className="l-link mt-2 inline-block text-sm">
                {item.link.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
