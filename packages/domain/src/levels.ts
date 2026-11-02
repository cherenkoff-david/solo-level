import { cumulativeXp, cumulativeSphereXp, xpNext, xpNextSphere } from './xp.ts';

export interface LevelState {
  level: number;
  totalXp: number;
  xpIntoLevel: number;
  xpForNext: number;
  xpToNext: number;
}

export function levelForXp(
  totalXp: number,
  k: number = 1.05,
): number {
  if (totalXp < 0) {
    return 1;
  }
  let level = 1;
  while (totalXp >= cumulativeXp(level + 1, k)) {
    level += 1;
  }
  return level;
}

export function levelState(
  totalXp: number,
  k: number = 1.05,
): LevelState {
  const level = levelForXp(totalXp, k);
  const floor = cumulativeXp(level, k);
  const forNext = xpNext(level, k);
  const into = totalXp - floor;
  return {
    level,
    totalXp,
    xpIntoLevel: into,
    xpForNext: forNext,
    xpToNext: forNext - into,
  };
}

export function sphereLevelForXp(
  sphereXp: number,
  k: number = 1.03,
): number {
  if (sphereXp < 0) {
    return 1;
  }
  let level = 1;
  while (sphereXp >= cumulativeSphereXp(level + 1, k)) {
    level += 1;
  }
  return level;
}

export function sphereLevelState(
  sphereXp: number,
  k: number = 1.03,
): LevelState {
  const level = sphereLevelForXp(sphereXp, k);
  const floor = cumulativeSphereXp(level, k);
  const forNext = xpNextSphere(level, k);
  const into = sphereXp - floor;
  return {
    level,
    totalXp: sphereXp,
    xpIntoLevel: into,
    xpForNext: forNext,
    xpToNext: forNext - into,
  };
}
