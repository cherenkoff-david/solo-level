export const DEFAULT_LEVEL_CURVE = 1.05;
export const DEFAULT_SPHERE_CURVE = 1.03;

export function xpNext(level: number, k: number = DEFAULT_LEVEL_CURVE): number {
  return Math.round(100 * Math.pow(k, level - 1));
}

export function xpNextSphere(
  level: number,
  k: number = DEFAULT_SPHERE_CURVE,
): number {
  return Math.round(100 * Math.pow(k, level - 1));
}

export function cumulativeXp(
  toLevel: number,
  k: number = DEFAULT_LEVEL_CURVE,
): number {
  let sum = 0;
  for (let level = 1; level < toLevel; level += 1) {
    sum += xpNext(level, k);
  }
  return sum;
}

export function cumulativeSphereXp(
  toLevel: number,
  k: number = DEFAULT_SPHERE_CURVE,
): number {
  let sum = 0;
  for (let level = 1; level < toLevel; level += 1) {
    sum += xpNextSphere(level, k);
  }
  return sum;
}
