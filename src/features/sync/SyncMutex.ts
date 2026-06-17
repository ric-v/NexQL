/**
 * Minimal async mutex — serializes sync runs without the fragile promise-tail
 * chaining the old controller used. acquire() resolves with a release fn; always
 * release in a finally.
 */
export class SyncMutex {
  private tail: Promise<void> = Promise.resolve();

  async acquire(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const previous = this.tail;
    this.tail = this.tail.then(() => next);
    await previous;
    return release;
  }

  /** True when no run is in flight (best-effort, for status checks). */
  get isLocked(): boolean {
    let settled = false;
    void this.tail.then(() => {
      settled = true;
    });
    return !settled;
  }
}
