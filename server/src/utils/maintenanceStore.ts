import Redis from 'ioredis';
import {
  OFF_STATE,
  isStoredMaintenance,
  snapshotOf,
  type MaintenanceSnapshot,
  type StoredMaintenance,
} from './maintenance';

export interface KeyValueClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

const KEY = 'maintenance:state';
const REFRESH_MS = 5000;

/**
 * Holds the maintenance state in memory. With a key-value client (Redis) the state is also written
 * there and re-read every few seconds, so several server instances stay in step and a restart keeps it.
 * A client failure is logged and ignored: requests are never blocked because Redis is down.
 */
export class MaintenanceStore {
  private state: StoredMaintenance = { ...OFF_STATE };
  private version = 0; // bumped by every local set, so a slow refresh cannot undo a newer change
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly kv?: KeyValueClient) {}

  snapshot(now: number = Date.now()): MaintenanceSnapshot {
    return snapshotOf(this.state, now);
  }

  async set(next: StoredMaintenance): Promise<void> {
    this.state = next;
    this.version += 1;
    if (!this.kv) return;
    try {
      await this.kv.set(KEY, JSON.stringify(next));
    } catch (err) {
      console.error('Redis error (maintenance):', (err as Error).message);
    }
  }

  async refresh(): Promise<void> {
    if (!this.kv) return;
    const versionBefore = this.version;
    try {
      const raw = await this.kv.get(KEY);
      if (raw === null || this.version !== versionBefore) return;
      const parsed: unknown = JSON.parse(raw);
      if (isStoredMaintenance(parsed)) this.state = parsed;
    } catch (err) {
      console.error('Redis error (maintenance):', (err as Error).message);
    }
  }

  start(): void {
    if (!this.kv) return;
    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), REFRESH_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }
}

/** Call after `configDotenv()` so `REDIS_URL` from `.env` is visible. */
export const createMaintenanceStore = (): MaintenanceStore => {
  if (!process.env.REDIS_URL) return new MaintenanceStore();
  const redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis error (maintenance):', err.message));
  return new MaintenanceStore({
    get: (key) => redis.get(key),
    set: (key, value) => redis.set(key, value),
  });
};
