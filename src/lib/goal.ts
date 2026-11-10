// 減量・増量の安全ライン（SPEC「減量・増量の安全ライン」）。
// ここの上限値は公的な基準ではなく設計判断。変更するときは SPEC も直すこと。
import { BMI_LOWER, type Pal, type Sex } from '../data/dri2025-energy.ts';
import { bandFor, bmi, bmr, eer } from './energy.ts';

export const KCAL_PER_KG = 7200; // 体脂肪1kgの概算
export const MAX_MONTHLY_RATE = 0.02; // 月に体重の2%まで
export const MAX_MONTHLY_RATE_MINOR_LOSS = 0.01; // 17歳以下の減量は1%まで

export interface PlanInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  pal: Pal;
  /** 月の目標変化 kg。減量はマイナス、増量はプラス、維持は 0 */
  monthlyChangeKg: number;
  /** 体重の答え合わせで速すぎたときに掛ける係数（通常 1、警告後 0.5 など） */
  adjust?: number;
}

export type PlanNote = 'loss-blocked-thin' | 'rate-clamped' | 'raised-to-floor' | 'minor-loss';

export interface Plan {
  bmr: number;
  eer: number;
  /** 実際に採用した月の変化 kg（上限で丸めた後） */
  appliedMonthlyKg: number;
  /** 1日の目標摂取エネルギー kcal */
  target: number;
  notes: PlanNote[];
}

/** やせの範囲では減量を選べない。17歳以下は目標BMIの定義がないため、18.5 を使う（設計判断）。 */
export function canLose(age: number, weightKg: number, heightCm: number): boolean {
  return bmi(weightKg, heightCm) >= BMI_LOWER(age);
}

export function maxMonthlyKg(age: number, weightKg: number, direction: 'lose' | 'gain'): number {
  const rate = direction === 'lose' && age <= 17 ? MAX_MONTHLY_RATE_MINOR_LOSS : MAX_MONTHLY_RATE;
  return weightKg * rate;
}

export function plan(input: PlanInput): Plan {
  const { sex, age, weightKg, heightCm, pal, adjust = 1 } = input;
  const notes: PlanNote[] = [];
  const base = eer(sex, age, weightKg, pal);
  const basal = bmr(sex, age, weightKg);
  let applied = input.monthlyChangeKg;

  if (applied < 0 && !canLose(age, weightKg, heightCm)) {
    applied = 0;
    notes.push('loss-blocked-thin');
  }
  if (applied !== 0) {
    const limit = maxMonthlyKg(age, weightKg, applied < 0 ? 'lose' : 'gain');
    if (Math.abs(applied) > limit) {
      applied = Math.sign(applied) * limit;
      notes.push('rate-clamped');
    }
    if (applied < 0 && age <= 17) notes.push('minor-loss');
  }

  let target = base + ((applied * KCAL_PER_KG) / 30) * adjust;
  // 下限: 基礎代謝量。17歳以下は成長に使う分（エネルギー蓄積量）も削らない。
  const floor = basal + bandFor(age).accumulation[sex];
  if (target < floor) {
    target = floor;
    notes.push('raised-to-floor');
  }
  return { bmr: basal, eer: base, appliedMonthlyKg: applied, target, notes };
}

export interface WeightLog {
  date: string; // YYYY-MM-DD
  kg: number;
}

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);

/**
 * 体重で答え合わせ。最新の記録と、その14日以上前で一番新しい記録を比べ、
 * 30日あたりの変化が上限を超えていたら tooFast を返す（呼び出し側が adjust を半分にする）。
 * 比べられる記録がなければ null。
 */
export function checkPace(logs: WeightLog[], age: number): { monthlyKg: number; tooFast: boolean } | null {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted.at(-1);
  if (!latest) return null;
  const earlier = sorted.filter((l) => daysBetween(l.date, latest.date) >= 14).at(-1);
  if (!earlier) return null;
  const monthlyKg = ((latest.kg - earlier.kg) / daysBetween(earlier.date, latest.date)) * 30;
  const limit = maxMonthlyKg(age, earlier.kg, monthlyKg < 0 ? 'lose' : 'gain');
  return { monthlyKg, tooFast: Math.abs(monthlyKg) > limit };
}
