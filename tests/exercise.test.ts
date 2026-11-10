import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grossKcal, judge, netKcal, perfectLine } from '../src/lib/exercise.ts';

test('消費カロリー: 5.8METs・60kg・20分 ≒ 122kcal', () => {
  assert.equal(Math.round(grossKcal({ mets: 5.8, minutes: 20 }, 60)), 122);
});

test('正味は安静分を引く。1MET以下は0', () => {
  assert.equal(netKcal({ mets: 7, minutes: 60 }, 60), 6 * 60 * 1.05);
  assert.equal(netKcal({ mets: 0.9, minutes: 60 }, 60), 0);
});

test('完璧ライン: 運動なしなら目標と同じ', () => {
  assert.equal(perfectLine(2500, [], 60), 2500);
  assert.equal(perfectLine(2500, [{ mets: 7, minutes: 60 }, { mets: 4, minutes: 30 }], 60), 2500 + 378 + 94.5);
});

test('判定', () => {
  // 運動した日: 目標2500、完璧3000
  assert.equal(judge(2300, 2500, 3000), 'short');
  assert.equal(judge(2375, 2500, 3000), 'achieved'); // 目標の95%
  assert.equal(judge(2700, 2500, 3000), 'achieved');
  assert.equal(judge(2850, 2500, 3000), 'perfect'); // 完璧の95%
  assert.equal(judge(3150, 2500, 3000), 'perfect');
  assert.equal(judge(3151, 2500, 3000), 'over');
  // 運動なしの日
  assert.equal(judge(2500, 2500, 2500), 'achieved');
  assert.equal(judge(2700, 2500, 2500), 'over');
  // 運動が少なく2本が近い日は完璧が優先
  assert.equal(judge(2450, 2500, 2550), 'perfect');
});
