import { Link } from 'react-router-dom';
import { FOOTER_COPY } from './content';

export default function LandingFooter() {
  return (
    <footer className="l-border l-bg border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <p className="l-muted m-0 text-sm">
          © {new Date().getFullYear()} {FOOTER_COPY.brand}
        </p>
        <nav aria-label="Footer" className="flex gap-2">
          <Link to="/privacy-policy" className="l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-sm">
            {FOOTER_COPY.privacy}
          </Link>
          <Link to="/terms-of-service" className="l-navlink inline-flex min-h-11 items-center rounded-md px-2 text-sm">
            {FOOTER_COPY.terms}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
