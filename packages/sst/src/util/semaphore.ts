export class Semaphore {
  private queue: Array<(unlock: () => void) => void> = [];
  private locked: number = 0;
  private maxLocks: number;

  constructor(maxLocks: number = 1) {
    this.maxLocks = maxLocks;
  }

  lock(): Promise<() => void> {
    return new Promise((resolve) => {
      const unlock = () => {
        this.locked--;
        const next = this.queue.shift();
        if (next) {
          this.locked++;
          next(unlock);
        }
      };

      if (this.locked < this.maxLocks) {
        this.locked++;
        resolve(unlock);
      } else {
        this.queue.push(unlock);
      }
    });
  }
}
