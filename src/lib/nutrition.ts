// 栄養素の集計。null は「不明」（未測定・表示なし）で、0 とは区別する。
import { PFC_RANGE } from '../data/dri2025-energy.ts';

export const NUTRIENT_KEYS = [
  'energyKcal', 'proteinG', 'fatG', 'carbG',
  'fiberG', 'saltG', 'calciumMg', 'ironMg', 'magnesiumMg', 'potassiumMg', 'zincMg',
  'vitaminAUg', 'vitaminDUg', 'vitaminB1Mg', 'vitaminB2Mg', 'vitaminCMg', 'saturatedFatG',
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type Nutrients = Record<NutrientKey, number | null>;

/** 100gあたりの値を、食べた量に換算する（記録時のスナップショット用）。 */
export function scale(per100g: Nutrients, grams: number): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) {
    const v = per100g[k];
    out[k] = v === null ? null : (v * grams) / 100;
  }
  return out;
}

export interface Totals {
  total: Record<NutrientKey, number>;
  /** その栄養素が「不明」だった記録の件数。1以上なら合計は実際より少ない可能性がある。 */
  unknown: Record<NutrientKey, number>;
}

export function sum(items: Nutrients[]): Totals {
  const total = {} as Record<NutrientKey, number>;
  const unknown = {} as Record<NutrientKey, number>;
  for (const k of NUTRIENT_KEYS) {
    total[k] = 0;
    unknown[k] = 0;
    for (const item of items) {
      const v = item[k];
      if (v === null) unknown[k] += 1;
      else total[k] += v;
    }
  }
  return { total, unknown };
}

/** エネルギー比率(%)。たんぱく質×4、脂質×9、炭水化物は残り（食事摂取基準の考え方）。 */
export function pfcPercent(t: Record<NutrientKey, number>): { protein: number; fat: number; carb: number } | null {
  if (t.energyKcal <= 0) return null;
  const protein = ((t.proteinG * 4) / t.energyKcal) * 100;
  const fat = ((t.fatG * 9) / t.energyKcal) * 100;
  return { protein, fat, carb: 100 - protein - fat };
}

/** 目標エネルギーから P・F・C の目標範囲 (g) を求める。 */
export function pfcTargetsG(energyKcal: number, age: number) {
  const g = ([lo, hi]: [number, number], kcalPerG: number): [number, number] => [
    (energyKcal * lo) / 100 / kcalPerG,
    (energyKcal * hi) / 100 / kcalPerG,
  ];
  return { protein: g(PFC_RANGE.protein(age), 4), fat: g(PFC_RANGE.fat, 9), carb: g(PFC_RANGE.carb, 4) };
}
