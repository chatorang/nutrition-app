import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENERGY_BANDS, type Pal, type Sex } from '../src/data/dri2025-energy.ts';
import { ageOn, bmi, bmr, eer } from '../src/lib/energy.ts';

// 公表されている推定エネルギー必要量（2025年版、kcal/日、50kcal単位）。
// 10〜17歳: 堺市の掲載表 / 18歳以上: 農林水産省の資料。[男 低・ふつう・高, 女 低・ふつう・高]
const OFFICIAL: Record<number, (number | null)[]> = {
  10: [1950, 2250, 2500, 1850, 2100, 2350],
  12: [2300, 2600, 2900, 2150, 2400, 2700],
  15: [2500, 2850, 3150, 2050, 2300, 2550],
  18: [2250, 2600, 3000, 1700, 1950, 2250],
  30: [2350, 2750, 3150, 1750, 2050, 2350],
  50: [2250, 2650, 3000, 1700, 1950, 2250],
  65: [2100, 2350, 2650, 1650, 1850, 2050],
  75: [1850, 2250, null, 1450, 1750, null],
};
const round50 = (x: number) => Math.round(x / 50) * 50;

test('参照体重で計算すると、公表されている推定エネルギー必要量の表と一致する', () => {
  for (const [minAge, row] of Object.entries(OFFICIAL)) {
    const band = ENERGY_BANDS.find((b) => b.minAge === Number(minAge))!;
    const cells: [Sex, Pal][] = [['male', 'low'], ['male', 'mid'], ['male', 'high'], ['female', 'low'], ['female', 'mid'], ['female', 'high']];
    cells.forEach(([sex, pal], i) => {
      const expected = row[i];
      if (expected === null) return;
      assert.equal(round50(eer(sex, band.minAge, band.refWeight[sex], pal)), expected, `${minAge}歳〜 ${sex} ${pal}`);
    });
  }
});

test('基礎代謝量 = 基準値 × 体重', () => {
  assert.equal(bmr('male', 35, 70), 22.5 * 70);
  assert.equal(bmr('female', 16, 50), 25.3 * 50);
});

test('17歳以下はエネルギー蓄積量が足される', () => {
  assert.equal(eer('male', 16, 60, 'mid'), 27.0 * 60 * 1.75 + 10);
  assert.equal(eer('male', 20, 60, 'mid'), 23.7 * 60 * 1.75);
});

test('年齢: 誕生月に入ったら1歳増える', () => {
  assert.equal(ageOn('2010-05', '2026-04-30'), 15);
  assert.equal(ageOn('2010-05', '2026-05-01'), 16);
});

test('対象外の年齢・値のない身体活動レベルはエラー', () => {
  assert.throws(() => eer('male', 5, 18, 'mid'));
  assert.throws(() => eer('male', 80, 60, 'high'));
});

test('BMI', () => {
  assert.equal(Math.round(bmi(60, 170) * 10) / 10, 20.8);
});
