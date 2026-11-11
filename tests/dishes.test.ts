import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DISHES } from '../src/data/dishes.ts';
import { dishToFood } from '../src/lib/dishes.ts';
import { NUTRIENT_KEYS } from '../src/lib/nutrition.ts';
import { buildIndex, search } from '../src/lib/search.ts';

const data = JSON.parse(readFileSync(new URL('../src/data/foods.json', import.meta.url), 'utf8'));
const byId = new Map<string, any>(data.foods.map((f: { id: string }) => [f.id, f]));

test('みそ汁: 1杯あたりの計算結果が、出典レシピの栄養価（55kcal・食塩1.3g）とほぼ合う', () => {
  const dish = DISHES.find((d) => d.id === 'D0001')!;
  const food = dishToFood(dish, byId);
  const grams = dish.ingredients.reduce((s, [, g]) => s + g, 0);
  const perServing = (key: (typeof NUTRIENT_KEYS)[number]) => (food.n[NUTRIENT_KEYS.indexOf(key)]! * grams) / 100;
  assert.ok(Math.abs(perServing('energyKcal') - 55) <= 3, `kcal ${perServing('energyKcal')}`);
  assert.ok(Math.abs(perServing('saltG') - 1.3) <= 0.1, `salt ${perServing('saltG')}`);
  assert.ok(Math.abs(perServing('proteinG') - 4.4) <= 0.5, `protein ${perServing('proteinG')}`);
});

test('料理は「みそ汁」「味噌汁」で検索の一番上に出る', () => {
  const foods = [...DISHES.map((d) => dishToFood(d, byId)), ...data.foods];
  const index = buildIndex<any>(foods);
  for (const q of ['みそ汁', '味噌汁', 'みそしる']) assert.equal(search(index, q, { limit: 1 })[0]?.id, 'D0001', q);
});

test('料理の材料はすべて食品データにある', () => {
  for (const d of DISHES) for (const [id] of d.ingredients) assert.ok(byId.has(id), `${d.name}: ${id}`);
});
