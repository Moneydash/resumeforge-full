// Runs at most `max` async tasks at once; the rest wait their turn. A failed task frees its slot.
export const createLimiter = (max: number) => {
  let active = 0;
  const waiting: Array<() => void> = [];

  const acquire = () => new Promise<void>((resolve) => {
    if (active < max) {
      active++;
      resolve();
    } else {
      waiting.push(() => { active++; resolve(); });
    }
  });

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    await acquire();
    try {
      return await task();
    } finally {
      release();
    }
  };
};
