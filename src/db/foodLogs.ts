import type { Nutrients } from '../lib/nutrition.ts'
import { scale } from '../lib/nutrition.ts'
import { db as defaultDb, MEALS, type AppDb, type CustomUnit, type FoodLog, type Meal } from './db.ts'

export interface FoodForLog {
  id: string
  name: string
  per100g: Nutrients
}

/** 量の指定。単位で入力した場合は単位名と個数も一緒に残す（表示と、次回の初期値に使う）。 */
export interface Amount {
  grams: number
  unitLabel?: string
  unitCount?: number
}

const unitFields = (a: Amount) => (a.unitLabel && a.unitCount ? { unitLabel: a.unitLabel, unitCount: a.unitCount } : {})

export async function addFoodLog(input: { date: string; meal: Meal; food: FoodForLog } & Amount, db: AppDb = defaultDb): Promise<number> {
  assertGrams(input.grams)
  return db.foodLogs.add({
    date: input.date,
    meal: input.meal,
    foodId: input.food.id,
    name: input.food.name,
    grams: input.grams,
    ...unitFields(input),
    nutrients: scale(input.food.per100g, input.grams),
    createdAt: Date.now(),
  })
}

/** 量を変える。栄養素は記録時のスナップショットから比例で計算し直す。 */
export async function updateFoodLogAmount(id: number, amount: Amount, db: AppDb = defaultDb): Promise<void> {
  assertGrams(amount.grams)
  const log = await db.foodLogs.get(id)
  if (!log) return
  const per100g = scale(log.nutrients, 10000 / log.grams)
  await db.foodLogs.put({
    ...log,
    grams: amount.grams,
    unitLabel: amount.unitLabel && amount.unitCount ? amount.unitLabel : undefined,
    unitCount: amount.unitLabel && amount.unitCount ? amount.unitCount : undefined,
    nutrients: scale(per100g, amount.grams),
  })
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
  unitLabel?: string
  unitCount?: number
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
    const item = { foodId: log.foodId, name: log.name, grams: log.grams, ...unitFields(log), per100g: scale(log.nutrients, 10000 / log.grams) }
    ;(log.meal === meal ? same : other).push(item)
  }
  return [...same, ...other].slice(0, limit)
}

/** その食品に自分で登録した単位。 */
export async function customUnits(foodId: string, db: AppDb = defaultDb): Promise<CustomUnit[]> {
  return db.units.where('foodId').equals(foodId).toArray()
}

/** 単位を登録する。同じ食品に同じ名前があれば上書きする（器を変えたときなど）。 */
export async function saveCustomUnit(foodId: string, label: string, grams: number, db: AppDb = defaultDb): Promise<void> {
  const name = label.trim()
  if (!name) throw new Error('単位の名前を入力してください')
  assertGrams(grams)
  const existing = (await customUnits(foodId, db)).find((u) => u.label === name)
  if (existing) await db.units.update(existing.id, { grams })
  else await db.units.add({ foodId, label: name, grams })
}

/** 量の表示。例:「茶碗1杯（150g）」「茶碗1杯 ×2（300g）」「120g」 */
export function amountText(a: Amount): string {
  const g = `${Math.round(a.grams * 10) / 10}g`
  if (!a.unitLabel || !a.unitCount) return g
  return a.unitCount === 1 ? `${a.unitLabel}（${g}）` : `${a.unitLabel} ×${a.unitCount}（${g}）`
}

function assertGrams(grams: number): void {
  if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) throw new Error('量は 0 より大きく 5000g 以下で入力してください')
}
