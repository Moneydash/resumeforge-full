export type LiveStatus = 'idle' | 'updating' | 'saved' | 'error' | 'paused';
export type StatusTone = 'none' | 'working' | 'ok' | 'error';

// The exact texts the editor shows today, in one place.
export const liveStatusLabel = (status: LiveStatus): string => {
  if (status === 'updating') return 'Saving & updating preview...';
  if (status === 'saved') return 'All changes saved';
  if (status === 'error') return 'Update failed, will retry on next edit';
  if (status === 'paused') return 'Paused for maintenance';
  return '';
};

/** The live status only shows once live edit is on, except "paused": a first-time creation must see it too. */
export const editorStatus = (liveEdit: boolean, status: LiveStatus): LiveStatus =>
  liveEdit || status === 'paused' ? status : 'idle';

export const statusTone = (status: LiveStatus): StatusTone => {
  if (status === 'updating') return 'working';
  if (status === 'saved') return 'ok';
  if (status === 'error') return 'error';
  return 'none';
};
