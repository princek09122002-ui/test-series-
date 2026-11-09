export const DEFAULT_INTERVALS = [0, 3, 7, 14];
export function nextReview(
  step: number,
  remembered: boolean,
  now = new Date(),
  intervals = DEFAULT_INTERVALS,
) {
  const nextStep = remembered ? Math.min(step + 1, intervals.length) : 0;
  const days = intervals[Math.min(nextStep, intervals.length - 1)];
  return {
    step: nextStep,
    dueAt: new Date(now.getTime() + days * 86400000),
    complete: nextStep === intervals.length,
  };
}
