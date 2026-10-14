import type { MaintenanceStatus } from '@/maintenance/types';

interface StatusHeaderProps {
  status: MaintenanceStatus;
  startsAt: number | null;
  endsAt: number | null;
  mode: 'now' | 'schedule';
  busy: boolean;
  onPrimary: () => void;
}

const formatWhen = (timestamp: number) =>
  new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function StatusHeader({ status, startsAt, endsAt, mode, busy, onPrimary }: StatusHeaderProps) {
  let title = 'Everything is live';
  let detail = 'Users can use the app normally.';
  let label = mode === 'schedule' ? 'Schedule maintenance' : 'Start maintenance';

  if (status === 'scheduled' && startsAt !== null) {
    title = 'Maintenance is scheduled';
    detail = `Starts ${formatWhen(startsAt)}${endsAt !== null ? `, estimated end ${formatWhen(endsAt)}` : ''}.`;
    label = 'Cancel maintenance';
  } else if (status === 'active') {
    title = 'Maintenance is on';
    detail = `Only admins can use the app.${endsAt !== null ? ` Estimated end ${formatWhen(endsAt)}.` : ''}`;
    label = 'End maintenance';
  }

  return (
    <div className="ad-status app-card" role="status">
      <div>
        <p className="l-eyebrow l-muted m-0">Status</p>
        <p className="ad-status__title">{title}</p>
        <p className="l-muted m-0 text-sm">{detail}</p>
      </div>
      <button type="button" className="l-btn l-btn--primary" disabled={busy} onClick={onPrimary}>
        {label}
      </button>
    </div>
  );
}
