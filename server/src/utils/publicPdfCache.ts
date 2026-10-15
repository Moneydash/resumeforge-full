type Pdf = Buffer | Uint8Array;

// Keeps the latest PDF per share token, keyed by the resume's updated_at ("version"), and lets
// simultaneous requests for the same version share one render. The caller checks that sharing is on
// BEFORE asking the cache, so a cached PDF is never served for a link that was switched off.
export class PublicPdfCache {
  private entries = new Map<string, { version: number; pdf: Pdf }>();
  private inFlight = new Map<string, Promise<Pdf>>();

  constructor(private maxEntries = 50) {}

  async getOrCreate(key: string, version: number, make: () => Promise<Pdf>): Promise<Pdf> {
    const hit = this.entries.get(key);
    if (hit && hit.version === version) return hit.pdf;

    const flightKey = `${key}:${version}`;
    const running = this.inFlight.get(flightKey);
    if (running) return running;

    const job = make()
      .then((pdf) => {
        this.entries.delete(key);
        this.entries.set(key, { version, pdf });
        while (this.entries.size > this.maxEntries) {
          this.entries.delete(this.entries.keys().next().value as string);
        }
        return pdf;
      })
      .finally(() => this.inFlight.delete(flightKey));

    this.inFlight.set(flightKey, job);
    return job;
  }
}
