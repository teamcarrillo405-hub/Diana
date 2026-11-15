export function createReadingHolds() {
  const completed = new Set();
  let active = null;
  return {
    get active() { return active; },
    cancel() {
      if (active) completed.add(active.id);
      active = null;
    },
    update(previous, next, time, stops) {
      if (active) {
        if (time - active.startedAt < active.duration) return active.point;
        completed.add(active.id);
        active = null;
      }
      if (next < previous - 2) {
        for (const stop of stops) if (next < stop.point - 80) completed.delete(stop.id);
        return next;
      }
      const stop = stops.find(item => !completed.has(item.id) && previous <= item.point && next >= item.point);
      if (stop) {
        active = {...stop, startedAt: time};
        return stop.point;
      }
      return next;
    },
  };
}

export function phrasePose(progress, last = false) {
  const smooth = (low, high) => {
    const t = Math.max(0, Math.min(1, (progress - low) / (high - low)));
    return t * t * (3 - 2 * t);
  };
  const enter = smooth(.05, .26);
  const exit = last ? 0 : smooth(.78, .98);
  return {opacity: enter * (1 - exit), y: 18 * (1 - enter) - 18 * exit};
}
