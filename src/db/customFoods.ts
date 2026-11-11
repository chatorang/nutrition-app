// 自分で登録した食品（成分表にない市販品など）。パッケージの栄養成分表示から入力する。
import { NUTRIENT_KEYS, type NutrientKey, type Nutrients } from '../lib/nutrition.ts'
import { db as defaultDb, type AppDb, type CustomFood } from './db.ts'
import { saveCustomUnit } from './foodLogs.ts'

/** 食事記録や検索で使う食品ID。成分表の食品番号（数字5桁）や料理（D…）と重ならないよう C を付ける。 */
export const customFoodId = (id: number) => `C${id}`

export interface CustomFoodInput {
  name: string
  /** 入力した値が何グラム分か。「100gあたり」なら 100、「1食分(35g)あたり」なら 35 */
  basisGrams: number
  /** 1食分あたりで入力したときの単位名（例: 1本、1袋）。「100gあたり」のときは無し */
  servingLabel?: string
  /** 入力した値。空欄にした栄養素は入れない（＝不明として扱う。0 とは区別する） */
  values: Partial<Record<NutrientKey, number>>
}

export async function addCustomFood(input: CustomFoodInput, db: AppDb = defaultDb): Promise<number> {
  const name = input.name.trim()
  if (!name) throw new Error('食品の名前を入力してください')
  if (!Number.isFinite(input.basisGrams) || input.basisGrams <= 0 || input.basisGrams > 5000) throw new Error('重さは 0 より大きく 5000g 以下で入力してください')
  if (input.values.energyKcal === undefined) throw new Error('エネルギー(kcal)は必ず入力してください')

  const per100g = {} as Nutrients
  for (const key of NUTRIENT_KEYS) {
    const v = input.values[key]
    if (v !== undefined && (!Number.isFinite(v) || v < 0)) throw new Error('栄養素の値は 0 以上の数字で入力してください')
    per100g[key] = v === undefined ? null : Math.round(((v * 100) / input.basisGrams) * 1000) / 1000
  }
  const id = await db.customFoods.add({ name, per100g, createdAt: Date.now() })
  const label = input.servingLabel?.trim()
  if (label) await saveCustomUnit(customFoodId(id), label, input.basisGrams, db)
  return id
}

export async function listCustomFoods(db: AppDb = defaultDb): Promise<CustomFood[]> {
  return db.customFoods.orderBy('createdAt').reverse().toArray()
}

/** 登録した食品を消す。過去の食事記録は、記録時点の値を持っているので変わらない。 */
export async function deleteCustomFood(id: number, db: AppDb = defaultDb): Promise<void> {
  await db.customFoods.delete(id)
  await db.units.where('foodId').equals(customFoodId(id)).delete()
}
