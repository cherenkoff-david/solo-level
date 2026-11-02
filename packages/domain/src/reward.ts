import { BASE_XP, FIRST_STEP_XP, type Effort, type RewardBreakdown } from './types.ts';
import { rhythmBonusTierFromHistory, type RhythmTier } from './rhythm.ts';

export const MILESTONE_BONUS_RATE = 0.25;
export const MILESTONE_BONUS_MAX = 300;
export const MILESTONE_BONUS_MIN = 15;

export interface ActionRewardInput {
  effort: Effort;
  isFirstActionInSphere: boolean;
  previousPeriods: boolean[];
}

export function computeActionReward(input: ActionRewardInput): RewardBreakdown {
  const baseXp = BASE_XP[input.effort];
  const tier = rhythmBonusTierFromHistory(input.previousPeriods);
  const rhythmBonusXp = Math.round(baseXp * tier);
  const firstStepXp = input.isFirstActionInSphere ? FIRST_STEP_XP : 0;
  return {
    baseXp,
    rhythmBonusXp,
    firstStepXp,
    totalXp: baseXp + rhythmBonusXp + firstStepXp,
  };
}

export function computeMilestoneBonus(linkedXp: number): number {
  const raw = Math.round(linkedXp * MILESTONE_BONUS_RATE);
  if (raw <= 0) {
    return 0;
  }
  return Math.min(MILESTONE_BONUS_MAX, Math.max(MILESTONE_BONUS_MIN, raw));
}

export function computeMilestoneReward(
  linkedXp: number,
  effort: Effort,
): RewardBreakdown {
  if (linkedXp <= 0) {
    return {
      baseXp: BASE_XP[effort],
      rhythmBonusXp: 0,
      firstStepXp: 0,
      totalXp: BASE_XP[effort],
    };
  }
  const bonus = computeMilestoneBonus(linkedXp);
  return {
    baseXp: 0,
    rhythmBonusXp: bonus,
    firstStepXp: 0,
    totalXp: bonus,
  };
}

export function rhythmTierUsed(previousPeriods: boolean[]): RhythmTier {
  return rhythmBonusTierFromHistory(previousPeriods);
}
