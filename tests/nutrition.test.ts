import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NUTRIENT_KEYS, pfcPercent, pfcTargetsG, scale, sum, type Nutrients } from '../src/lib/nutrition.ts';

const make = (over: Partial<Nutrients>): Nutrients =>
  ({ ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])), ...over }) as Nutrients;

test('100gあたりを食べた量に換算。不明は不明のまま', () => {
  const s = scale(make({ energyKcal: 156, proteinG: 2.5, ironMg: null }), 150);
  assert.equal(s.energyKcal, 234);
  assert.equal(s.proteinG, 3.75);
  assert.equal(s.ironMg, null);
});

test('合計: 不明は0として足さず、件数を数える', () => {
  const t = sum([make({ energyKcal: 200, ironMg: 1.5 }), make({ energyKcal: 300, ironMg: null })]);
  assert.equal(t.total.energyKcal, 500);
  assert.equal(t.total.ironMg, 1.5);
  assert.equal(t.unknown.ironMg, 1);
  assert.equal(t.unknown.energyKcal, 0);
});

test('PFC比率と目標g', () => {
  const p = pfcPercent(sum([make({ energyKcal: 2000, proteinG: 75, fatG: 55.6 })]).total)!;
  assert.equal(Math.round(p.protein), 15);
  assert.equal(Math.round(p.fat), 25);
  assert.equal(Math.round(p.carb), 60);
  assert.equal(pfcPercent(make({}) as never), null);
  const g = pfcTargetsG(2000, 16);
  assert.deepEqual(g.protein, [65, 100]);
  assert.deepEqual(g.carb, [250, 325]);
});
