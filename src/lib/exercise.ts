// 運動の消費カロリーと「完璧ライン」（SPEC「運動の消費カロリー」「完璧ライン」）。

export interface ExerciseEntry {
  mets: number;
  minutes: number;
}

/** 消費カロリー kcal = METs × 時間(h) × 体重(kg) × 1.05 （運動記録画面の表示用） */
export function grossKcal(e: ExerciseEntry, weightKg: number): number {
  return e.mets * (e.minutes / 60) * weightKg * 1.05;
}

/** 安静時の分（1 MET）を引いた正味の消費。目標に既に含まれている分を二重に数えないため。 */
export function netKcal(e: ExerciseEntry, weightKg: number): number {
  return Math.max(e.mets - 1, 0) * (e.minutes / 60) * weightKg * 1.05;
}

/** 完璧ライン = 目標 + その日の運動の正味消費の合計。運動なしの日は目標と同じ値。 */
export function perfectLine(target: number, entries: ExerciseEntry[], weightKg: number): number {
  return target + entries.reduce((sum, e) => sum + netKcal(e, weightKg), 0);
}

export type Verdict = 'short' | 'achieved' | 'perfect' | 'over';
export const TOLERANCE = 0.05;

/**
 * その日の判定。
 *  - 完璧ラインの105%超: over
 *  - 完璧ラインの±5%以内: 運動した日は perfect、運動なしの日は achieved
 *  - 目標の95%以上: achieved
 *  - それ未満: short
 * 完璧の判定を先に行うので、運動が少なくて2本の線が近い日は perfect が優先される。
 */
export function judge(intake: number, target: number, perfect: number): Verdict {
  if (intake > perfect * (1 + TOLERANCE)) return 'over';
  if (intake >= perfect * (1 - TOLERANCE)) return perfect > target ? 'perfect' : 'achieved';
  if (intake >= target * (1 - TOLERANCE)) return 'achieved';
  return 'short';
}
