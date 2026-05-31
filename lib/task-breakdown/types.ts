export interface BreakdownStep {
  step: number;
  action: string;
  minutes: number;
  done: boolean;
}

export const MAX_STEPS = 12;
export const MAX_MINUTES_PER_STEP = 15;
