import { useRef, type ReactNode } from 'react';
import Loader from '@/components/SuspenseLoader';
import { useMaintenance } from '@/maintenance/hooks';
import { useMaintenanceStore } from '@/maintenance/store';
import MaintenanceScreen from './MaintenanceScreen';

interface MaintenanceGateProps {
  children: ReactNode;
  /**
   * Editor routes: only block if maintenance was already active when the route mounted, so someone who
   * is already editing keeps their editor (the soft lock) when maintenance starts.
   */
  softLock?: boolean;
}

export default function MaintenanceGate({ children, softLock = false }: MaintenanceGateProps) {
  const checked = useMaintenanceStore((s) => s.checked);
  const { status } = useMaintenance();
  const activeAtMount = useRef<boolean | null>(null);

  // Wait for the first status check, otherwise a page could mount and fetch just as maintenance is on.
  if (!checked) return <Loader label="Loading" />;

  if (activeAtMount.current === null) activeAtMount.current = status === 'active';
  const block = softLock ? activeAtMount.current && status === 'active' : status === 'active';
  return block ? <MaintenanceScreen /> : <>{children}</>;
}
