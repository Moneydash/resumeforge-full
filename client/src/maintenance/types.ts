export type MaintenanceStatus = 'off' | 'scheduled' | 'active';

/** What `GET /maintenance/status` returns. Times are epoch milliseconds on the server's clock. */
export interface MaintenanceSnapshot {
  status: MaintenanceStatus;
  startsAt: number | null;
  endsAt: number | null;
  message: string;
  serverTime: number;
}
