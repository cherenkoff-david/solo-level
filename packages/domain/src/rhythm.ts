export const RHYTHM_DISPLAY_WINDOW_DAYS = 28;
export const RHYTHM_BONUS_MAX_PERIODS = 4;
export const RHYTHM_BONUS_MAX_DAYS = 28;
export const RHYTHM_SETUP_MIN_PERIODS = 3;

export type RhythmTier = 0 | 0.05 | 0.1 | 0.2;

export function rhythmBonusTier(percent: number): RhythmTier {
  if (percent >= 100) {
    return 0.2;
  }
  if (percent >= 75) {
    return 0.1;
  }
  if (percent >= 50) {
    return 0.05;
  }
  return 0;
}

export function rhythmBonusTierFromHistory(previousPeriods: boolean[]): RhythmTier {
  if (previousPeriods.length < RHYTHM_SETUP_MIN_PERIODS) {
    return 0;
  }
  const window = previousPeriods.slice(-RHYTHM_BONUS_MAX_PERIODS);
  const successful = window.filter(Boolean).length;
  const percent = (successful / window.length) * 100;
  return rhythmBonusTier(percent);
}

export function displayRhythmPercent(
  successfulPeriods: number,
  expectedPeriods: number,
): number {
  if (expectedPeriods <= 0) {
    return 0;
  }
  return (successfulPeriods / expectedPeriods) * 100;
}

export function rhythmLabel(percent: number): string {
  if (percent >= 90) {
    return 'устойчиво';
  }
  if (percent >= 70) {
    return 'набирает форму';
  }
  if (percent >= 40) {
    return 'возвращаем ритм';
  }
  return 'начинаем заново';
}
