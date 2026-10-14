/** True only when the provider explicitly says the email is not verified. Missing or unknown means "not flagged". */
export const isExplicitlyUnverified = (entry: { verified?: unknown } | undefined): boolean =>
  entry?.verified === false || entry?.verified === 'false';
