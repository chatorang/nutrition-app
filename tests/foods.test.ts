import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NUTRIENT_KEYS } from '../src/lib/nutrition.ts';

const data = JSON.parse(readFileSync(new URL('../src/data/foods.json', import.meta.url), 'utf8'));
const byId = new Map<string, { name: string; n: (number | null)[] }>(data.foods.map((f: { id: string }) => [f.id, f]));
const value = (id: string, key: (typeof NUTRIENT_KEYS)[number]) => byId.get(id)!.n[NUTRIENT_KEYS.indexOf(key)];

test('キーの並びがアプリの定義と同じ', () => {
  assert.deepEqual(data.keys, [...NUTRIENT_KEYS]);
});

test('収載食品数は2,538で、食品番号に重複がない', () => {
  assert.equal(data.foods.length, 2538);
  assert.equal(byId.size, 2538);
});

test('代表的な食品の値がExcelと同じ', () => {
  assert.equal(byId.get('12004')!.name, '鶏卵 全卵 生');
  assert.equal(value('12004', 'energyKcal'), 142);
  assert.equal(value('12004', 'proteinG'), 12.2);
  assert.equal(value('01088', 'energyKcal'), 156); // 精白米のめし
  assert.equal(value('13003', 'calciumMg'), 110); // 普通牛乳
});

test('記号の扱い: Tr と (0) は 0。飽和脂肪酸は脂肪酸成分表から入る', () => {
  assert.equal(value('01001', 'vitaminAUg'), 0); // Tr
  assert.equal(value('01001', 'vitaminDUg'), 0); // (0)
  assert.equal(value('01001', 'saturatedFatG'), 1.18);
  assert.equal(value('01003', 'saturatedFatG'), 0.22); // (0.22) 推計値
  const i = NUTRIENT_KEYS.indexOf('saturatedFatG');
  const fat = NUTRIENT_KEYS.indexOf('fatG');
  // 飽和脂肪酸が脂質を上回る食品はない
  assert.ok(data.foods.every((f: { n: (number | null)[] }) => f.n[i] === null || f.n[i]! <= f.n[fat]! + 0.05));
});

test('エネルギーは全食品に値がある', () => {
  const i = NUTRIENT_KEYS.indexOf('energyKcal');
  assert.ok(data.foods.every((f: { n: (number | null)[] }) => typeof f.n[i] === 'number'));
});
