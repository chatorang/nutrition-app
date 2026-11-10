import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPace, plan } from '../src/lib/goal.ts';

const adult = { sex: 'male', age: 30, weightKg: 70, heightCm: 172, pal: 'mid' } as const;
const r1 = (x: number) => Math.round(x * 10) / 10; // 小数の誤差を除く
const teen = { sex: 'male', age: 16, weightKg: 60, heightCm: 170, pal: 'mid' } as const;

test('維持なら目標 = 推定エネルギー必要量', () => {
  const p = plan({ ...adult, monthlyChangeKg: 0 });
  assert.equal(p.target, p.eer);
  assert.deepEqual(p.notes, []);
});

test('月1kg減は1日240kcal減', () => {
  const p = plan({ ...adult, monthlyChangeKg: -1 });
  assert.equal(Math.round(p.eer - p.target), 240);
});

test('上限は月に体重の2%（70kgなら1.4kg）', () => {
  const p = plan({ ...adult, monthlyChangeKg: -5 });
  assert.equal(r1(p.appliedMonthlyKg), -1.4);
  assert.ok(p.notes.includes('rate-clamped'));
  const g = plan({ ...adult, monthlyChangeKg: 5 });
  assert.equal(r1(g.appliedMonthlyKg), 1.4);
});

test('17歳以下の減量は1%まで、増量は2%まで', () => {
  const p = plan({ ...teen, monthlyChangeKg: -3 });
  assert.equal(r1(p.appliedMonthlyKg), -0.6);
  assert.ok(p.notes.includes('minor-loss'));
  assert.equal(r1(plan({ ...teen, monthlyChangeKg: 3 }).appliedMonthlyKg), 1.2);
});

test('やせの範囲では減量できない（増量はできる）', () => {
  const thin = { ...adult, weightKg: 52 }; // BMI 17.6
  const p = plan({ ...thin, monthlyChangeKg: -1 });
  assert.equal(p.appliedMonthlyKg, 0);
  assert.equal(p.target, p.eer);
  assert.ok(p.notes.includes('loss-blocked-thin'));
  assert.equal(plan({ ...thin, monthlyChangeKg: 1 }).appliedMonthlyKg, 1);
});

test('目標は基礎代謝量（17歳以下は＋蓄積量）を下回らない', () => {
  // 身体活動レベルが低い高齢者は、必要量と基礎代謝量の差が小さい
  const p = plan({ sex: 'female', age: 78, weightKg: 60, heightCm: 150, pal: 'low', monthlyChangeKg: -1.2 });
  assert.ok(p.target >= p.bmr);
  for (const kg of [-0.6, -0.3, 0]) {
    const t = plan({ ...teen, pal: 'low', monthlyChangeKg: kg });
    assert.ok(t.target >= t.bmr + 10);
  }
});

test('adjust 0.5 で差が半分になる', () => {
  const full = plan({ ...adult, monthlyChangeKg: -1 });
  const half = plan({ ...adult, monthlyChangeKg: -1, adjust: 0.5 });
  assert.equal(Math.round(full.eer - half.target), 120);
});

test('体重の答え合わせ', () => {
  assert.equal(checkPace([{ date: '2026-11-01', kg: 70 }], 30), null);
  assert.equal(checkPace([{ date: '2026-11-01', kg: 70 }, { date: '2026-11-08', kg: 69 }], 30), null); // 14日未満
  const ok = checkPace([{ date: '2026-11-01', kg: 70 }, { date: '2026-11-15', kg: 69.5 }], 30)!;
  assert.equal(ok.tooFast, false);
  const fast = checkPace([{ date: '2026-11-01', kg: 70 }, { date: '2026-11-08', kg: 69.4 }, { date: '2026-11-15', kg: 69 }], 30)!;
  assert.equal(fast.tooFast, true); // 14日で-1kg = 月-2.1kg > 1.4kg
  const teenFast = checkPace([{ date: '2026-11-01', kg: 60 }, { date: '2026-11-15', kg: 59.5 }], 16)!;
  assert.equal(teenFast.tooFast, true); // 月-1.07kg > 0.6kg
});
