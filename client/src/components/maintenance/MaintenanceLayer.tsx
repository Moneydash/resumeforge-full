import { useLocation } from 'react-router-dom';
import { useMaintenancePolling } from '@/maintenance/hooks';
import MaintenanceBanner from './MaintenanceBanner';

// The editors render their own banner inside the page, so the root bar stays out of their way.
const EDITOR_PATHS = ['/preview', '/cl-preview'];
// Pages that stay up during maintenance: the "in progress" bar explains why sign-in does not work.
const PUBLIC_PATHS = ['/', '/terms-of-service', '/privacy-policy'];

/** Mount once inside the router: runs the status polling and shows the root banner. */
export default function MaintenanceLayer() {
  useMaintenancePolling();
  const { pathname } = useLocation();
  if (EDITOR_PATHS.includes(pathname)) return null;
  return <MaintenanceBanner variant="page" showActive={PUBLIC_PATHS.includes(pathname)} />;
}
