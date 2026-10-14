export const MESSAGE_MAX = 200;

export interface MaintenanceForm {
  mode: 'now' | 'schedule';
  message: string;
  /** datetime-local text ("2026-10-20T15:00"), in the admin's own timezone */
  startsAt: string;
  endsAt: string;
}

export const emptyForm: MaintenanceForm = { mode: 'now', message: '', startsAt: '', endsAt: '' };

export interface MaintenancePayload {
  action: 'on' | 'off' | 'schedule';
  startsAt?: string;
  endsAt?: string;
  message?: string;
}

export interface FormErrors {
  message?: string;
  startsAt?: string;
  endsAt?: string;
}

const parseLocal = (value: string): number | null => {
  if (!value) return null;
  const time = new Date(value).getTime(); // "YYYY-MM-DDTHH:mm" is read as local time
  return Number.isNaN(time) ? null : time;
};

/** Validates the maintenance form and builds the body for `PUT /maintenance` (dates sent as ISO strings). */
export const buildPayload = (
  form: MaintenanceForm,
  now: number,
): { ok: true; body: MaintenancePayload } | { ok: false; errors: FormErrors } => {
  const errors: FormErrors = {};
  const message = form.message.trim();
  if (message.length > MESSAGE_MAX) errors.message = `Keep the message under ${MESSAGE_MAX} characters`;

  let start: number | null = now;
  if (form.mode === 'schedule') {
    start = parseLocal(form.startsAt);
    if (start === null) errors.startsAt = 'Choose when maintenance starts';
    else if (start <= now) errors.startsAt = 'The start must be in the future';
  }

  let end: number | null = null;
  if (form.endsAt) {
    end = parseLocal(form.endsAt);
    if (end === null) errors.endsAt = 'Enter a valid date and time';
    else if (start !== null && end <= start) errors.endsAt = 'The end must be after the start';
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const body: MaintenancePayload = { action: form.mode === 'schedule' ? 'schedule' : 'on' };
  if (form.mode === 'schedule' && start !== null) body.startsAt = new Date(start).toISOString();
  if (end !== null) body.endsAt = new Date(end).toISOString();
  if (message) body.message = message;
  return { ok: true, body };
};
