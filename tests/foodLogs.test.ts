import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppDb } from '../src/db/db.ts';
import { addFoodLog, deleteFoodLog, logsByDate, recentFoods, updateFoodLogGrams } from '../src/db/foodLogs.ts';
import { NUTRIENT_KEYS, type Nutrients } from '../src/lib/nutrition.ts';

const make = (over: Partial<Nutrients>): Nutrients =>
  ({ ...Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])), ...over }) as Nutrients;
const rice = { id: '01088', name: 'ごはん', per100g: make({ energyKcal: 156, proteinG: 2.5, ironMg: null }) };
const egg = { id: '12004', name: 'たまご', per100g: make({ energyKcal: 142, proteinG: 12.2 }) };
let n = 0;
const fresh = () => new AppDb(`test-${n++}`);
const tick = () => new Promise((r) => setTimeout(r, 3));

test('記録すると、その日の食事区分に栄養素つきで入る', async () => {
  const db = fresh();
  await addFoodLog({ date: '2026-11-11', meal: 'breakfast', food: rice, grams: 150 }, db);
  await addFoodLog({ date: '2026-11-11', meal: 'dinner', food: egg, grams: 50 }, db);
  await addFoodLog({ date: '2026-11-12', meal: 'breakfast', food: egg, grams: 50 }, db);
  const day = await logsByDate('2026-11-11', db);
  assert.equal(day.breakfast.length, 1);
  assert.equal(day.breakfast[0]!.nutrients.energyKcal, 234);
  assert.equal(day.breakfast[0]!.nutrients.ironMg, null); // 不明は不明のまま
  assert.equal(day.dinner[0]!.nutrients.energyKcal, 71);
  assert.deepEqual(day.lunch, []);
});

test('量を変えると栄養素も比例で変わる。削除できる', async () => {
  const db = fresh();
  const id = await addFoodLog({ date: '2026-11-11', meal: 'lunch', food: rice, grams: 150 }, db);
  await updateFoodLogGrams(id, 200, db);
  let log = (await logsByDate('2026-11-11', db)).lunch[0]!;
  assert.equal(log.grams, 200);
  assert.equal(Math.round(log.nutrients.energyKcal! * 10) / 10, 312);
  assert.equal(log.nutrients.ironMg, null);
  await deleteFoodLog(id, db);
  assert.deepEqual((await logsByDate('2026-11-11', db)).lunch, []);
});

test('おかしな量は保存しない', async () => {
  const db = fresh();
  for (const grams of [0, -5, NaN, 99999]) {
    await assert.rejects(addFoodLog({ date: '2026-11-11', meal: 'lunch', food: rice, grams }, db));
  }
});

test('最近の食品: 重複なし、同じ食事区分が先、前回の量を覚えている', async () => {
  const db = fresh();
  await addFoodLog({ date: '2026-11-10', meal: 'breakfast', food: rice, grams: 150 }, db); await tick();
  await addFoodLog({ date: '2026-11-10', meal: 'dinner', food: egg, grams: 60 }, db); await tick();
  await addFoodLog({ date: '2026-11-11', meal: 'breakfast', food: rice, grams: 180 }, db);
  const forBreakfast = await recentFoods('breakfast', 30, db);
  assert.deepEqual(forBreakfast.map((r) => [r.foodId, r.grams]), [['01088', 180], ['12004', 60]]);
  assert.equal(Math.round(forBreakfast[0]!.per100g.energyKcal!), 156);
  const forDinner = await recentFoods('dinner', 30, db);
  assert.deepEqual(forDinner.map((r) => r.foodId), ['12004', '01088']);
});
