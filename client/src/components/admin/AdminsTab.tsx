import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  demoteSuperAdmin,
  errorMessage,
  fetchAdmins,
  makeAdmin,
  makeSuperAdmin,
  removeAdmin,
} from '@/admin/api';
import { rowActions, type RowAction } from '@/admin/permissions';
import type { AdminMe, AdminRow } from '@/admin/types';
import { inputClasses, labelClasses } from '@/styles/form-classes';
import ConfirmDialog from './ConfirmDialog';

interface AdminsTabProps {
  me: AdminMe;
  onCount: (count: number) => void;
}

const ACTION_COPY: Record<RowAction, { label: string; confirm: string; danger: boolean; describe: (email: string) => { title: string; text: string } }> = {
  remove: {
    label: 'Remove',
    confirm: 'Remove admin',
    danger: true,
    describe: (email) => ({
      title: `Remove ${email} as admin?`,
      text: 'They will no longer be able to open the admin page or use the app during maintenance.',
    }),
  },
  makeSuper: {
    label: 'Make super admin',
    confirm: 'Make super admin',
    danger: false,
    describe: (email) => ({
      title: `Make ${email} a super admin?`,
      text: 'Super admins can manage other super admins. There can be at most two, and only the other super admin can demote them.',
    }),
  },
  demote: {
    label: 'Demote',
    confirm: 'Demote',
    danger: true,
    describe: (email) => ({
      title: `Demote ${email}?`,
      text: 'They become an ordinary admin.',
    }),
  },
};

export default function AdminsTab({ me, onCount }: AdminsTabProps) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<{ action: RowAction; row: AdminRow } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchAdmins();
      setRows(list);
      setLoadFailed(false);
      onCount(list.length);
    } catch {
      setLoadFailed(true);
    }
  }, [onCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    try {
      await makeAdmin(email);
      toast.success('Admin added');
      setEmail('');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === 'remove') await removeAdmin(pending.row.id);
      else if (pending.action === 'makeSuper') await makeSuperAdmin(pending.row.email);
      else await demoteSuperAdmin(pending.row.id);
      toast.success('Done');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(null);
      setBusy(false);
      await load();
    }
  };

  const copy = pending ? ACTION_COPY[pending.action].describe(pending.row.email) : null;

  return (
    <div className="app-card max-w-3xl p-5">
      {loadFailed && <p className="ad-error" role="alert">Couldn't load the admins. Reload the page to try again.</p>}
      {!rows && !loadFailed && <p className="l-muted m-0 text-sm">Loading...</p>}

      {rows && (
        <table className="app-table">
          <thead>
            <tr>
              <th scope="col">Person</th>
              <th scope="col">Role</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div>{row.email}</div>
                  {row.name && <div className="l-muted text-xs">{row.name}</div>}
                </td>
                <td>
                  <span className={`ad-badge ${row.role === 'super_admin' ? 'ad-badge--super' : ''}`}>
                    {row.role === 'super_admin' ? 'Super admin' : 'Admin'}{row.id === me.id ? ' · you' : ''}
                  </span>
                </td>
                <td>
                  <div className="ad-rowactions">
                    {rowActions(me, row, rows).map((action) => (
                      <button
                        key={action}
                        type="button"
                        className="l-btn l-btn--ghost"
                        onClick={() => setPending({ action, row })}
                      >
                        {ACTION_COPY[action].label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={submitAdd} className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="ad-email" className={labelClasses}>Make someone an admin</label>
          <input
            id="ad-email"
            type="email"
            className={`${inputClasses} !mt-0`}
            placeholder="Email of a user who has signed in"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <button type="submit" className="l-btn l-btn--ghost" disabled={adding || !email.trim()}>
          {adding ? 'Adding...' : 'Make admin'}
        </button>
      </form>

      <ConfirmDialog
        open={pending !== null}
        eyebrow="Admin access"
        title={copy?.title ?? ''}
        description={copy?.text ?? ''}
        confirmLabel={pending ? ACTION_COPY[pending.action].confirm : ''}
        danger={pending ? ACTION_COPY[pending.action].danger : false}
        busy={busy}
        onConfirm={() => void runPending()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
