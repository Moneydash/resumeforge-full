import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage, loadAdminMe, sendMaintenance, type AdminMeResult } from '@/admin/api';
import { buildPayload, emptyForm, type FormErrors, type MaintenanceForm, type MaintenancePayload } from '@/admin/form';
import type { AdminMe } from '@/admin/types';
import AppShell from '@/components/app-shell/AppShell';
import AdminsTab from '@/components/admin/AdminsTab';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import MaintenanceTab from '@/components/admin/MaintenanceTab';
import StatusHeader from '@/components/admin/StatusHeader';
import MaintenanceScreen from '@/components/maintenance/MaintenanceScreen';
import Loader from '@/components/SuspenseLoader';
import { useMaintenance } from '@/maintenance/hooks';
import { useMaintenanceStore } from '@/maintenance/store';
import NotFound from '@/pages/NotFound';
import '@/styles/admin.css';

type Tab = 'maintenance' | 'admins';

function AdminConsole({ me }: { me: AdminMe }) {
  const { rawStatus, startsAt, endsAt } = useMaintenance();
  const [tab, setTab] = useState<Tab>('maintenance');
  const [form, setForm] = useState<MaintenanceForm>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirm, setConfirm] = useState<'start' | 'end' | null>(null);
  const [busy, setBusy] = useState(false);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const onCount = useCallback((count: number) => setAdminCount(count), []);

  const patchForm = (patch: Partial<MaintenanceForm>) => {
    setForm((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const onPrimary = () => {
    if (rawStatus !== 'off') {
      setConfirm('end');
      return;
    }
    const result = buildPayload(form, Date.now());
    if (!result.ok) {
      setErrors(result.errors);
      setTab('maintenance');
      return;
    }
    setErrors({});
    setConfirm('start');
  };

  const apply = async () => {
    let body: MaintenancePayload;
    if (confirm === 'end') {
      body = { action: 'off' };
    } else {
      const result = buildPayload(form, Date.now());
      if (!result.ok) {
        setErrors(result.errors);
        setConfirm(null);
        return;
      }
      body = result.body;
    }
    setBusy(true);
    try {
      const snapshot = await sendMaintenance(body);
      if (snapshot) useMaintenanceStore.getState().setSnapshot(snapshot, Date.now());
      toast.success(
        body.action === 'off' ? 'Maintenance ended' : body.action === 'schedule' ? 'Maintenance scheduled' : 'Maintenance started',
      );
      if (body.action !== 'off') setForm(emptyForm);
      setConfirm(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const confirmCopy =
    confirm === 'end'
      ? rawStatus === 'scheduled'
        ? { title: 'Cancel the scheduled maintenance?', text: 'Nothing will be blocked.', label: 'Cancel maintenance' }
        : { title: 'End maintenance?', text: 'Everyone can use the app again.', label: 'End maintenance' }
      : form.mode === 'schedule'
        ? { title: 'Schedule maintenance?', text: 'Users see a notice until it starts. Then this blocks every non-admin user.', label: 'Schedule' }
        : { title: 'Start maintenance now?', text: 'This blocks every non-admin user now.', label: 'Start maintenance' };

  return (
    <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
      <header className="mb-6">
        <h1 className="app-title m-0">Admin</h1>
        <p className="l-muted m-0 mt-1 text-sm">
          Signed in as {me.role === 'super_admin' ? 'a super admin' : 'an admin'}.
        </p>
      </header>

      <div className="flex max-w-3xl flex-col gap-5">
        <StatusHeader
          status={rawStatus}
          startsAt={startsAt}
          endsAt={endsAt}
          mode={form.mode}
          busy={busy}
          onPrimary={onPrimary}
        />

        <div className="ad-tabs" role="tablist" aria-label="Admin sections">
          <button
            type="button"
            role="tab"
            id="ad-tab-maintenance"
            aria-selected={tab === 'maintenance'}
            aria-controls="ad-panel-maintenance"
            className="ad-tab"
            onClick={() => setTab('maintenance')}
          >
            Maintenance
          </button>
          <button
            type="button"
            role="tab"
            id="ad-tab-admins"
            aria-selected={tab === 'admins'}
            aria-controls="ad-panel-admins"
            className="ad-tab"
            onClick={() => setTab('admins')}
          >
            Admins{adminCount !== null && <span className="ad-count">{adminCount}</span>}
          </button>
        </div>

        <section id="ad-panel-maintenance" role="tabpanel" aria-labelledby="ad-tab-maintenance" hidden={tab !== 'maintenance'}>
          <MaintenanceTab form={form} errors={errors} locked={rawStatus !== 'off'} onChange={patchForm} />
        </section>
        <section id="ad-panel-admins" role="tabpanel" aria-labelledby="ad-tab-admins" hidden={tab !== 'admins'}>
          <AdminsTab me={me} onCount={onCount} />
        </section>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        eyebrow="Maintenance"
        title={confirmCopy.title}
        description={confirmCopy.text}
        confirmLabel={confirmCopy.label}
        danger={confirm !== 'end'}
        busy={busy}
        onConfirm={() => void apply()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function Admin() {
  const [access, setAccess] = useState<AdminMeResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAdminMe().then((result) => {
      if (!cancelled) setAccess(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!access) return <Loader label="Loading" />;
  if (access.kind === 'not-admin') return <NotFound />;
  if (access.kind === 'maintenance') return <MaintenanceScreen />;
  if (access.kind === 'error') {
    return (
      <AppShell>
        <div className="w-full px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
          <h1 className="app-title m-0">Admin</h1>
          <p className="l-muted mt-2 text-sm">
            Couldn't load the admin page. If the database is down nobody can sign in; use the emergency maintenance
            token from the server instead.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AdminConsole me={access.me} />
    </AppShell>
  );
}
