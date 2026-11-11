import type { Nutrients } from '../lib/nutrition.ts'
import { scale } from '../lib/nutrition.ts'
import { db as defaultDb, MEALS, type AppDb, type FoodLog, type Meal } from './db.ts'

export interface FoodForLog {
  id: string
  name: string
  per100g: Nutrients
}

export async function addFoodLog(input: { date: string; meal: Meal; food: FoodForLog; grams: number }, db: AppDb = defaultDb): Promise<number> {
  assertGrams(input.grams)
  return db.foodLogs.add({
    date: input.date,
    meal: input.meal,
    foodId: input.food.id,
    name: input.food.name,
    grams: input.grams,
    nutrients: scale(input.food.per100g, input.grams),
    createdAt: Date.now(),
  })
}

/** 量を変える。栄養素は記録時のスナップショットから比例で計算し直す。 */
export async function updateFoodLogGrams(id: number, grams: number, db: AppDb = defaultDb): Promise<void> {
  assertGrams(grams)
  const log = await db.foodLogs.get(id)
  if (!log) return
  const per100g = scale(log.nutrients, 100 / log.grams * 100)
  await db.foodLogs.update(id, { grams, nutrients: scale(per100g, grams) })
}

export async function deleteFoodLog(id: number, db: AppDb = defaultDb): Promise<void> {
  await db.foodLogs.delete(id)
}

/** その日の記録を、食事区分ごと・記録した順に返す。 */
export async function logsByDate(date: string, db: AppDb = defaultDb): Promise<Record<Meal, FoodLog[]>> {
  const logs = await db.foodLogs.where('date').equals(date).sortBy('createdAt')
  const out = Object.fromEntries(MEALS.map((m) => [m, [] as FoodLog[]])) as Record<Meal, FoodLog[]>
  for (const log of logs) out[log.meal].push(log)
  return out
}

export interface RecentFood {
  foodId: string
  name: string
  /** 前回記録した量。次も同じ量を初期値にする */
  grams: number
  /** 100gあたりの栄養素（前回の記録から逆算）。食品データにない食品でも再記録できるようにする */
  per100g: Nutrients
}

/**
 * 最近記録した食品（重複なし）。同じ食事区分で記録したものを先に並べる。
 * 「朝食の＋を押したら、いつもの朝食が上に出る」ようにするため。
 */
export async function recentFoods(meal: Meal, limit = 30, db: AppDb = defaultDb): Promise<RecentFood[]> {
  const logs = await db.foodLogs.orderBy('createdAt').reverse().limit(500).toArray()
  const seen = new Set<string>()
  const same: RecentFood[] = []
  const other: RecentFood[] = []
  for (const log of logs) {
    if (seen.has(log.foodId)) continue
    seen.add(log.foodId)
    const item = { foodId: log.foodId, name: log.name, grams: log.grams, per100g: scale(log.nutrients, 100 / log.grams * 100) }
    ;(log.meal === meal ? same : other).push(item)
  }
  return [...same, ...other].slice(0, limit)
}

function assertGrams(grams: number): void {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) throw new Error('量は 0 より大きく 5000g 以下で入力してください')
}
