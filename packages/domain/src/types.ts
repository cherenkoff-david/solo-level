export type Effort = 1 | 2 | 3 | 4 | 5;

export const BASE_XP: Record<Effort, number> = {
  1: 10,
  2: 20,
  3: 35,
  4: 55,
  5: 80,
};

export const FIRST_STEP_XP = 5;

export type SourceType = 'task' | 'habit' | 'milestone';

export type EventType =
  | 'base_xp'
  | 'rhythm_bonus'
  | 'first_step'
  | 'milestone_bonus'
  | 'reversal';

export interface RewardBreakdown {
  baseXp: number;
  rhythmBonusXp: number;
  firstStepXp: number;
  totalXp: number;
}
