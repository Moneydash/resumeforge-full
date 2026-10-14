import { Link } from 'react-router-dom';
import { useMaintenance } from '@/maintenance/hooks';
import { formatClock, inCountdown } from '@/maintenance/timing';
import '@/styles/maintenance.css';

interface MaintenanceBannerProps {
  /** 'editor' sits inside an editor page; 'page' sits at the top of any other page. */
  variant: 'editor' | 'page';
  /** For variant 'page': also show the "in progress" bar (landing, privacy and terms pages). */
  showActive?: boolean;
}

export default function MaintenanceBanner({ variant, showActive = false }: MaintenanceBannerProps) {
  const { status, adminBypass, startsAt, endsAt, serverNow } = useMaintenance();

  if (adminBypass) {
    return (
      <div className="mt-bar mt-bar--dark" role="status">
        <span>
          <b>Maintenance is on.</b> Only admins can use the app right now.
        </span>
        <Link to="/admin" className="mt-bar__link">Open admin page</Link>
      </div>
    );
  }

  if (status === 'scheduled' && startsAt !== null) {
    return (
      <div className="mt-bar mt-bar--dark" role="status">
        <span>
          Maintenance starts at <b>{formatClock(startsAt)}</b> ({inCountdown(startsAt - serverNow)}). Your work is saved.
        </span>
        <span className="mt-bar__time">{formatClock(startsAt)}</span>
      </div>
    );
  }

  if (status !== 'active') return null;

  if (variant === 'editor') {
    return (
      <div className="mt-bar mt-bar--light" role="status">
        <span>
          <b>Maintenance in progress.</b> Your edits are kept on this device and will save when we're back.
        </span>
      </div>
    );
  }

  if (!showActive) return null;
  return (
    <div className="mt-bar mt-bar--dark" role="status">
      <span>
        <b>Maintenance in progress.</b> Sign-in and the editor are unavailable{endsAt !== null ? ` until about ${formatClock(endsAt)}` : ' for now'}.
      </span>
    </div>
  );
}
