// 食品データ（約2,500件）の読み込み。大きいので最初の表示とは別に、必要になったとき一度だけ読む。
import { useEffect, useState } from 'react'
import { DISHES } from '../data/dishes.ts'
import { PRESET_UNITS, type Unit } from '../data/portions.ts'
import { NUTRIENT_KEYS, type Nutrients } from '../lib/nutrition.ts'
import { dishToFood } from '../lib/dishes.ts'
import { buildIndex, type SearchIndex } from '../lib/search.ts'

export interface Food {
  id: string
  name: string
  group: number
  /** 100gあたりの栄養素。並びは NUTRIENT_KEYS と同じ（tests/foods.test.ts で確認） */
  n: (number | null)[]
  alias?: string[]
}

export interface FoodData {
  foods: Food[]
  index: SearchIndex<Food>
  source: string
}

let cache: Promise<FoodData> | null = null

export function loadFoods(): Promise<FoodData> {
  cache ??= import('../data/foods.json').then((m) => {
    const data = m.default as unknown as { foods: Food[]; source: string }
    const byId = new Map(data.foods.map((f) => [f.id, f]))
    // 料理（材料から計算したもの）を先頭に足す。「みそ汁」などが検索で見つかるようになる。
    const foods = [...DISHES.map((d) => dishToFood(d, byId)), ...data.foods]
    return { foods, index: buildIndex(foods), source: data.source }
  })
  return cache
}

export function useFoods(): FoodData | null {
  const [data, setData] = useState<FoodData | null>(null)
  useEffect(() => {
    let alive = true
    loadFoods().then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [])
  return data
}

export function per100g(food: Food): Nutrients {
  return Object.fromEntries(NUTRIENT_KEYS.map((k, i) => [k, food.n[i] ?? null])) as Nutrients
}

/** 表示用の数字。小さい値は小数1桁、大きい値は整数。不明は「—」。 */
export function fmt(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('ja-JP', { maximumFractionDigits: digits, minimumFractionDigits: 0 })
}

const DISH_UNITS: Record<string, Unit[]> = Object.fromEntries(
  DISHES.map((d) => [d.id, [{ label: d.portionLabel, grams: d.ingredients.reduce((sum, [, g]) => sum + g, 0) }]]),
)

/** その食品にあらかじめ用意されている単位（料理の「1杯」、ごはんの「茶碗1杯」など）。 */
export function presetUnits(foodId: string): Unit[] {
  return [...(DISH_UNITS[foodId] ?? []), ...(PRESET_UNITS[foodId] ?? [])]
}

/** 単位つきの表示。不明は単位を付けずに「—」。 */
export function withUnit(value: number | null | undefined, unit: string, digits = 1): string {
  const text = fmt(value, digits)
  return text === '—' ? text : `${text}${unit}`
}
