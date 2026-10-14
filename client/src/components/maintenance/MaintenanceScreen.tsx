import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeToggle from '@/components/ThemeToggle';
import { isSignedIn } from '@/components/not-found/actions';
import { useMaintenance } from '@/maintenance/hooks';
import { formatClock, progressPercent, timeLeftLabel } from '@/maintenance/timing';
import '@/styles/landing.css';
import '@/styles/maintenance.css';

const DEFAULT_MESSAGE = "We're making improvements to ResumeForge.";

export default function MaintenanceScreen() {
  const { startsAt, endsAt, message, serverNow } = useMaintenance();
  const percent = progressPercent(startsAt, endsAt, serverNow);

  return (
    <div className="landing mt-screen">
      <header className="mt-screen__nav">
        <span className="l-ink flex min-h-11 items-center gap-2.5 font-semibold">
          <img src="/icon.png" alt="" width={28} height={28} className="size-7 rounded-md" />
          ResumeForge
        </span>
        <ThemeToggle styleClass="inline-flex min-h-11 min-w-11 items-center justify-center" />
      </header>

      <main id="main" tabIndex={-1} className="mt-screen__main">
        <h1 className="mt-screen__title">Scheduled maintenance</h1>
        <p className="mt-screen__lead">
          {message || DEFAULT_MESSAGE}{' '}
          {endsAt !== null ? (
            <>Back around <b>{formatClock(endsAt)}</b>.</>
          ) : (
            <>We'll be back soon.</>
          )}
        </p>

        {percent !== null && endsAt !== null && (
          <>
            <div
              className="mt-progress"
              role="progressbar"
              aria-label="Maintenance progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <i style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-screen__left">{timeLeftLabel(endsAt - serverNow)}</p>
          </>
        )}

        <ul className="mt-checks">
          <li><Check aria-hidden="true" className="size-4" /> Your saved resumes are safe</li>
          <li><Check aria-hidden="true" className="size-4" /> Drafts typed on this device are kept</li>
          <li><Check aria-hidden="true" className="size-4" /> No action needed from you</li>
        </ul>

        <p className="mt-screen__foot">
          This page updates on its own. The <Link to="/">landing page</Link>, privacy policy and terms are still available.
          {!isSignedIn() && <> Admins can <Link to="/login">sign in</Link>.</>}
        </p>
      </main>
    </div>
  );
}
