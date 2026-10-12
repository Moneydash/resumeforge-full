export type LiveStatus = 'idle' | 'updating' | 'saved' | 'error';
export type StatusTone = 'none' | 'working' | 'ok' | 'error';

// The exact texts the editor shows today, in one place.
export const liveStatusLabel = (status: LiveStatus): string => {
  if (status === 'updating') return 'Saving & updating preview...';
  if (status === 'saved') return 'All changes saved';
  if (status === 'error') return 'Update failed, will retry on next edit';
  return '';
};

export const statusTone = (status: LiveStatus): StatusTone => {
  if (status === 'updating') return 'working';
  if (status === 'saved') return 'ok';
  if (status === 'error') return 'error';
  return 'none';
};
