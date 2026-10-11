/** Only one navigation may be pending at a time; clicks while one is pending are ignored. */
export function beginPending(current: string | null, key: string): { started: boolean; next: string | null } {
  return current === null ? { started: true, next: key } : { started: false, next: current };
}
