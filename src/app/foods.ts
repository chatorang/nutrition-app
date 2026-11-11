// 食品データ（約2,500件）の読み込み。大きいので最初の表示とは別に、必要になったとき一度だけ読む。
import { useEffect, useState } from 'react'
import { NUTRIENT_KEYS, type Nutrients } from '../lib/nutrition.ts'
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
    return { foods: data.foods, index: buildIndex(data.foods), source: data.source }
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
