import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import LandingFooter from '@/components/landing/LandingFooter';
import { isSignedIn, notFoundActions } from '@/components/not-found/actions';
import '@/styles/landing.css';
import '@/styles/notfound.css';

const NotFound: React.FC = () => {
  const { pathname } = useLocation();
  const { primary, secondary } = notFoundActions(isSignedIn());

  return (
    <div className="landing nf">
      <a href="#main" className="l-skip">
        Skip to content
      </a>

      <header className="nf__nav">
        <Link to="/" className="l-ink flex min-h-11 items-center gap-2.5 font-semibold no-underline">
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          ResumeForge
        </Link>
        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </header>

      <main id="main" tabIndex={-1} className="nf__main">
        <div className="nf__col">
          <p className="nf__code" aria-hidden="true">
            4<span>0</span>4
          </p>
          <p className="l-eyebrow l-muted m-0">Error 404</p>
          <h1 className="nf__title">This page doesn't exist.</h1>
          <p className="l-muted m-0 max-w-sm leading-relaxed">
            The link may be broken, or the page may have moved. Check the address, or head back to somewhere familiar.
          </p>
          <p className="nf__path">
            <span className="sr-only">Requested address: </span>
            {pathname}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={primary.to} className="l-btn l-btn--primary">
              {primary.label}
            </Link>
            <Link to={secondary.to} className="l-btn l-btn--ghost">
              {secondary.label}
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
};

export default NotFound;
