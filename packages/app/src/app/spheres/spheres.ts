import { sphereLevelState } from "@solo/domain";

export interface Sphere {
  readonly id: string;
  readonly name: string;
}

export const SPHERES: readonly Sphere[] = [
  { id: "health", name: "Здоровье" },
  { id: "mind", name: "Разум" },
  { id: "craft", name: "Ремесло" },
  { id: "bonds", name: "Связи" },
  { id: "base", name: "Опора" },
];

// PLACEHOLDER: демонстрационный вклад XP по сферам.
// Заменяется реальными значениями из журнала наград (sphereXpFromLedger), когда появится слой данных.
const PLACEHOLDER_SPHERE_XP: Readonly<Record<string, number>> = {
  health: 140,
  mind: 90,
  craft: 260,
  bonds: 40,
  base: 180,
};

export interface SphereProgress {
  readonly sphere: Sphere;
  readonly level: number;
  readonly totalXp: number;
  readonly ratio: number;
}

const RADAR_MAX_LEVEL = 12;

export function getSphereProgress(spheres: readonly Sphere[]): readonly SphereProgress[] {
  return spheres.map((sphere) => {
    const totalXp = PLACEHOLDER_SPHERE_XP[sphere.id] ?? 0;
    const state = sphereLevelState(totalXp);
    const fraction = state.xpForNext > 0 ? state.xpIntoLevel / state.xpForNext : 0;
    const levelPosition = state.level - 1 + fraction;
    return {
      sphere,
      level: state.level,
      totalXp,
      ratio: Math.min(1, levelPosition / RADAR_MAX_LEVEL),
    };
  });
}
