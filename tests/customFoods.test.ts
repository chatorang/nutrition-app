import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppDb } from '../src/db/db.ts';
import { addCustomFood, customFoodId, deleteCustomFood, listCustomFoods } from '../src/db/customFoods.ts';
import { addFoodLog, customUnits, logsByDate } from '../src/db/foodLogs.ts';

let n = 0;
const fresh = () => new AppDb(`custom-${n++}`);

test('1食分あたりで登録すると、100gあたりに換算され、その単位も登録される', async () => {
  const db = fresh();
  // 例: プロテインバー 1本(40g)あたり 200kcal・たんぱく質15g・食塩0.3g。脂質と炭水化物は入力なし
  const id = await addCustomFood({ name: ' プロテインバー ', basisGrams: 40, servingLabel: '1本', values: { energyKcal: 200, proteinG: 15, saltG: 0.3 } }, db);
  const [food] = await listCustomFoods(db);
  assert.equal(food!.name, 'プロテインバー');
  assert.equal(food!.per100g.energyKcal, 500);
  assert.equal(food!.per100g.proteinG, 37.5);
  assert.equal(food!.per100g.fatG, null); // 入力しなかった項目は不明
  assert.equal(food!.per100g.ironMg, null);
  assert.deepEqual((await customUnits(customFoodId(id), db)).map((u) => [u.label, u.grams]), [['1本', 40]]);
  // 1本で記録すると、入力した値に戻る
  await addFoodLog({ date: '2026-11-11', meal: 'snack', food: { id: customFoodId(id), name: food!.name, per100g: food!.per100g }, grams: 40, unitLabel: '1本', unitCount: 1 }, db);
  const log = (await logsByDate('2026-11-11', db)).snack[0]!;
  assert.equal(log.nutrients.energyKcal, 200);
  assert.equal(log.nutrients.proteinG, 15);
  assert.equal(log.nutrients.fatG, null);
});

test('100gあたりで登録。0 は 0 として残る（不明とは別）', async () => {
  const db = fresh();
  const id = await addCustomFood({ name: 'お茶', basisGrams: 100, values: { energyKcal: 0, proteinG: 0, fatG: 0, carbG: 0, saltG: 0 } }, db);
  const [food] = await listCustomFoods(db);
  assert.equal(food!.per100g.energyKcal, 0);
  assert.equal(food!.per100g.fiberG, null);
  assert.deepEqual(await customUnits(customFoodId(id), db), []);
});

test('入力の誤りは保存しない', async () => {
  const db = fresh();
  await assert.rejects(addCustomFood({ name: '  ', basisGrams: 100, values: { energyKcal: 100 } }, db));
  await assert.rejects(addCustomFood({ name: 'A', basisGrams: 0, values: { energyKcal: 100 } }, db));
  await assert.rejects(addCustomFood({ name: 'A', basisGrams: 100, values: { proteinG: 10 } }, db));
  await assert.rejects(addCustomFood({ name: 'A', basisGrams: 100, values: { energyKcal: -5 } }, db));
  assert.deepEqual(await listCustomFoods(db), []);
});

test('削除すると食品と単位は消えるが、過去の記録は残る', async () => {
  const db = fresh();
  const id = await addCustomFood({ name: 'バー', basisGrams: 40, servingLabel: '1本', values: { energyKcal: 200 } }, db);
  const [food] = await listCustomFoods(db);
  await addFoodLog({ date: '2026-11-11', meal: 'snack', food: { id: customFoodId(id), name: food!.name, per100g: food!.per100g }, grams: 40 }, db);
  await deleteCustomFood(id, db);
  assert.deepEqual(await listCustomFoods(db), []);
  assert.deepEqual(await customUnits(customFoodId(id), db), []);
  assert.equal((await logsByDate('2026-11-11', db)).snack[0]!.nutrients.energyKcal, 200);
});
