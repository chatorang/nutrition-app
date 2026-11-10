import { ENERGY_BANDS, type EnergyBand, type Pal, type Sex } from '../data/dri2025-energy.ts';

/** 生年月 (YYYY-MM) と日付 (YYYY-MM-DD) から満年齢を求める。誕生月に入った時点で1歳加える。 */
export function ageOn(birthYm: string, date: string): number {
  const [by, bm] = birthYm.split('-').map(Number) as [number, number];
  const [y, m] = date.split('-').map(Number) as [number, number];
  return y - by - (m < bm ? 1 : 0);
}

export function bandFor(age: number): EnergyBand {
  const band = ENERGY_BANDS.find((b) => age >= b.minAge && age <= b.maxAge);
  if (!band) throw new Error(`対応していない年齢です: ${age}歳（6歳以上が対象）`);
  return band;
}

/** 基礎代謝量 kcal/日 = 基礎代謝基準値 × 体重 */
export function bmr(sex: Sex, age: number, weightKg: number): number {
  return bandFor(age).bmrPerKg[sex] * weightKg;
}

/** 推定エネルギー必要量 kcal/日 = 基礎代謝量 × 身体活動レベル + エネルギー蓄積量 */
export function eer(sex: Sex, age: number, weightKg: number, pal: Pal): number {
  const band = bandFor(age);
  const factor = band.pal[pal];
  if (factor === null) throw new Error(`この年齢区分には身体活動レベル「${pal}」の値がありません`);
  return band.bmrPerKg[sex] * weightKg * factor + band.accumulation[sex];
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
