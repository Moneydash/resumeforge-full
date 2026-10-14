import type { ReactNode } from 'react';
import { MESSAGE_MAX, type FormErrors, type MaintenanceForm } from '@/admin/form';
import { inputClasses, labelClasses } from '@/styles/form-classes';

interface MaintenanceTabProps {
  form: MaintenanceForm;
  errors: FormErrors;
  /** maintenance is already on or scheduled: end it before changing the details */
  locked: boolean;
  onChange: (patch: Partial<MaintenanceForm>) => void;
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="ad-field">
      <label htmlFor={id} className={labelClasses}>{label}</label>
      {children}
      {error ? <p className="ad-error" role="alert">{error}</p> : hint ? <p className="ad-hint">{hint}</p> : null}
    </div>
  );
}

export default function MaintenanceTab({ form, errors, locked, onChange }: MaintenanceTabProps) {
  return (
    <div className="app-card max-w-2xl p-5">
      {locked && (
        <p className="ad-hint mb-4">Maintenance is already on or scheduled. End it to change the details.</p>
      )}

      <div className="app-seg mb-5" role="group" aria-label="When to start">
        <button type="button" className="px-4 text-sm" aria-pressed={form.mode === 'now'} disabled={locked} onClick={() => onChange({ mode: 'now' })}>
          Start now
        </button>
        <button type="button" className="px-4 text-sm" aria-pressed={form.mode === 'schedule'} disabled={locked} onClick={() => onChange({ mode: 'schedule' })}>
          Schedule
        </button>
      </div>

      {form.mode === 'schedule' && (
        <Field id="ad-starts" label="Starts at" error={errors.startsAt} hint="In your local time.">
          <input
            id="ad-starts"
            type="datetime-local"
            className={inputClasses}
            value={form.startsAt}
            disabled={locked}
            onChange={(event) => onChange({ startsAt: event.target.value })}
          />
        </Field>
      )}

      <Field
        id="ad-message"
        label="Message shown to users"
        error={errors.message}
        hint={`${form.message.trim().length}/${MESSAGE_MAX}. Leave empty for the default message.`}
      >
        <textarea
          id="ad-message"
          className={inputClasses}
          rows={3}
          value={form.message}
          disabled={locked}
          onChange={(event) => onChange({ message: event.target.value })}
        />
      </Field>

      <Field id="ad-ends" label="Estimated end (optional)" error={errors.endsAt} hint="Shown to users as an estimate. Maintenance only ends when you end it.">
        <input
          id="ad-ends"
          type="datetime-local"
          className={inputClasses}
          value={form.endsAt}
          disabled={locked}
          onChange={(event) => onChange({ endsAt: event.target.value })}
        />
      </Field>
    </div>
  );
}
