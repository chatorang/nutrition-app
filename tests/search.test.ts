import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildIndex, displayName, normalize, search } from '../src/lib/search.ts';
import { addDays, formatDateKey, toDateKey } from '../src/lib/dates.ts';

const data = JSON.parse(readFileSync(new URL('../src/data/foods.json', import.meta.url), 'utf8'));
const index = buildIndex<{ id: string; name: string; alias?: string[] }>(data.foods);
const names = (q: string, n = 5) => search(index, q, { limit: n }).map((f) => f.name);
const top = (q: string) => names(q, 1)[0];

test('正規化: カタカナ・全角・記号のゆれを吸収', () => {
  assert.equal(normalize('ヨーグルト'), normalize('よーぐると'));
  assert.equal(normalize('（キャベツ類） キャベツ'), 'きゃべつ類きゃべつ');
  assert.equal(normalize('ＡＢＣ　１２'), 'abc12');
});

test('表示名: 分類の括弧を外し、繰り返しをまとめる', () => {
  assert.equal(displayName('＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 生'), 'にわとり むね 皮なし 生');
  assert.equal(displayName('＜畜肉類＞ ぶた ［ハム類］ ロースハム ロースハム'), 'ぶた ロースハム');
  assert.equal(displayName('（キャベツ類） キャベツ 結球葉 生'), 'キャベツ 結球葉 生');
  assert.equal(displayName('＜畜肉類＞ ぶた ［ひき肉］ 生'), 'ぶた ひき肉 生');
  assert.equal(displayName('＜魚類＞ （まぐろ類） 缶詰 水煮 フレーク ライト'), 'まぐろ 缶詰 水煮 フレーク ライト');
  assert.equal(displayName('＜牛乳及び乳製品＞ （発酵乳・乳酸菌飲料） ヨーグルト 全脂無糖'), 'ヨーグルト 全脂無糖');
  assert.equal(displayName('（たまねぎ類） たまねぎ りん茎 油いため （あめ色たまねぎ）'), 'たまねぎ りん茎 油いため （あめ色たまねぎ）');
  assert.equal(displayName('こめ ［水稲めし］ 精白米 うるち米'), 'こめ 水稲めし 精白米 うるち米');
  assert.equal(displayName('バナナ 生'), 'バナナ 生');
});

test('ふだんの呼び名で見つかる', () => {
  assert.equal(top('たまご'), '鶏卵 全卵 生');
  assert.equal(top('卵'), '鶏卵 全卵 生');
  assert.equal(top('ごはん'), 'こめ ［水稲めし］ 精白米 うるち米');
  assert.equal(top('牛乳'), '＜牛乳及び乳製品＞ （液状乳類） 普通牛乳');
  assert.equal(top('ぎゅうにゅう'), '＜牛乳及び乳製品＞ （液状乳類） 普通牛乳');
  assert.match(top('鶏むね肉')!, /にわとり ［若どり・主品目］ むね/);
  assert.match(top('豚肉 ロース')!, /ぶた .*ロース/);
  assert.match(top('とうふ')!, /豆腐/);
  assert.match(top('納豆')!, /糸引き納豆/);
  assert.match(top('バター')!, /有塩バター/);
  assert.match(top('ツナ')!, /まぐろ類.*缶詰/);
  assert.equal(top('もち'), 'こめ ［もち米製品］ もち');
  assert.match(top('りんご')!, /りんご 皮(なし|つき) 生/);
});

test('ひらがな・カタカナどちらでも同じ結果', () => {
  assert.deepEqual(names('ばなな'), names('バナナ'));
  assert.equal(top('バナナ'), 'バナナ 生');
  assert.equal(top('ブロッコリー'), 'ブロッコリー 花序 生');
  assert.deepEqual(names('きゃべつ'), names('キャベツ'));
});

test('複数語はすべて含むものだけ。別名でも見つかる', () => {
  assert.ok(names('ヨーグルト 無糖', 10).every((n) => n.includes('ヨーグルト') && n.includes('無糖')));
  assert.equal(top('天かす'), 'こむぎ ［小麦粉］ プレミックス粉 天ぷら用 バッター 揚げ');
  assert.deepEqual(names('存在しない食品ぜったい'), []);
  assert.deepEqual(names('   '), []);
});

test('以前に記録した食品は上に来る', () => {
  const r = search(index, 'たまご', { limit: 3, boost: new Set(['12005']) });
  assert.equal(r[0]!.id, '12005'); // 鶏卵 全卵 ゆで
});

test('日付', () => {
  assert.equal(toDateKey(new Date(2026, 10, 11, 23, 59)), '2026-11-11');
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(formatDateKey('2026-11-11'), '11月11日（水）');
});
