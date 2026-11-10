// 日本人の食事摂取基準（2025年版）エネルギーの基準値。
// 出典: 厚生労働省「日本人の食事摂取基準(2025年版)」策定検討会報告書
//   基礎代謝基準値・参照体重: 表3 (p.66) / 身体活動レベル: 表4 (p.67) / エネルギー蓄積量: 表6 (p.71)
// 転記元: https://bestcalendar.jp/tools/kiso-taisha (2026-11-10 取得、二次情報)
// 照合: 参照体重で計算した値が、公表されている推定エネルギー必要量の表
//   (堺市・農林水産省の掲載表) と一致することを tests/energy.test.ts で確認している。
// 5年ごとの改定時はこのファイルだけを差し替える。

export type Sex = 'male' | 'female';
export type Pal = 'low' | 'mid' | 'high';

export interface EnergyBand {
  minAge: number;
  maxAge: number; // 両端を含む
  /** 基礎代謝基準値 kcal/kg体重/日 */
  bmrPerKg: Record<Sex, number>;
  /** 参照体重 kg（テストでの照合用） */
  refWeight: Record<Sex, number>;
  /** 身体活動レベルの係数（資料に値がない区分は null） */
  pal: Record<Pal, number | null>;
  /** 成長に伴うエネルギー蓄積量 kcal/日（18歳以上は 0） */
  accumulation: Record<Sex, number>;
}

export const ENERGY_BANDS: EnergyBand[] = [
  { minAge: 6, maxAge: 7, bmrPerKg: { male: 44.3, female: 41.9 }, refWeight: { male: 22.2, female: 21.9 }, pal: { low: 1.35, mid: 1.55, high: 1.75 }, accumulation: { male: 15, female: 20 } },
  { minAge: 8, maxAge: 9, bmrPerKg: { male: 40.8, female: 38.3 }, refWeight: { male: 28.0, female: 27.4 }, pal: { low: 1.40, mid: 1.60, high: 1.80 }, accumulation: { male: 25, female: 30 } },
  { minAge: 10, maxAge: 11, bmrPerKg: { male: 37.4, female: 34.8 }, refWeight: { male: 35.6, female: 36.3 }, pal: { low: 1.45, mid: 1.65, high: 1.85 }, accumulation: { male: 40, female: 30 } },
  { minAge: 12, maxAge: 14, bmrPerKg: { male: 31.0, female: 29.6 }, refWeight: { male: 49.0, female: 47.5 }, pal: { low: 1.50, mid: 1.70, high: 1.90 }, accumulation: { male: 20, female: 25 } },
  { minAge: 15, maxAge: 17, bmrPerKg: { male: 27.0, female: 25.3 }, refWeight: { male: 59.7, female: 51.9 }, pal: { low: 1.55, mid: 1.75, high: 1.95 }, accumulation: { male: 10, female: 10 } },
  { minAge: 18, maxAge: 29, bmrPerKg: { male: 23.7, female: 22.1 }, refWeight: { male: 63.0, female: 51.0 }, pal: { low: 1.50, mid: 1.75, high: 2.00 }, accumulation: { male: 0, female: 0 } },
  { minAge: 30, maxAge: 49, bmrPerKg: { male: 22.5, female: 21.9 }, refWeight: { male: 70.0, female: 53.3 }, pal: { low: 1.50, mid: 1.75, high: 2.00 }, accumulation: { male: 0, female: 0 } },
  { minAge: 50, maxAge: 64, bmrPerKg: { male: 21.8, female: 20.7 }, refWeight: { male: 69.1, female: 54.0 }, pal: { low: 1.50, mid: 1.75, high: 2.00 }, accumulation: { male: 0, female: 0 } },
  { minAge: 65, maxAge: 74, bmrPerKg: { male: 21.6, female: 20.7 }, refWeight: { male: 64.4, female: 52.6 }, pal: { low: 1.50, mid: 1.70, high: 1.90 }, accumulation: { male: 0, female: 0 } },
  { minAge: 75, maxAge: 200, bmrPerKg: { male: 21.5, female: 20.7 }, refWeight: { male: 61.0, female: 49.3 }, pal: { low: 1.40, mid: 1.70, high: null }, accumulation: { male: 0, female: 0 } },
];

// エネルギー産生栄養素バランスの目標量（%エネルギー）。
// TODO(要照合): 2025年版報告書の該当表と未照合。2020年版と同じ値を仮置きしている。
export const PFC_RANGE = {
  protein: (age: number): [number, number] => (age >= 65 ? [15, 20] : age >= 50 ? [14, 20] : [13, 20]),
  fat: [20, 30] as [number, number],
  carb: [50, 65] as [number, number],
};

// 目標とするBMIの下限（18歳以上）。出典: 食事摂取基準(2025年版)、農林水産省資料に掲載の表。
export const BMI_LOWER = (age: number): number => (age >= 65 ? 21.5 : age >= 50 ? 20.0 : 18.5);
