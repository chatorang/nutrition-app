// 端末内の保存場所（IndexedDB）。Dexie は IndexedDB を扱いやすくするライブラリ。
// テーブルを増やす・索引を変えるときは version の番号を上げて追記する（既存の記録を壊さないため）。
import Dexie, { type EntityTable } from 'dexie'
import type { Nutrients } from '../lib/nutrition.ts'

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type Meal = (typeof MEALS)[number]
export const MEAL_LABEL: Record<Meal, string> = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' }

export interface FoodLog {
  id: number
  /** 現地時間の日付 'YYYY-MM-DD' */
  date: string
  meal: Meal
  foodId: string
  /** 記録時点の食品名（後で食品データが更新されても、過去の記録は変わらない） */
  name: string
  grams: number
  /** 「茶碗1杯」などの単位で入力したときの単位名と個数（グラムで入力したときは無し） */
  unitLabel?: string
  unitCount?: number
  /** 食べた量に換算した栄養素（記録時点のスナップショット） */
  nutrients: Nutrients
  createdAt: number
}

/** 自分で登録した単位（例: 自分の茶碗1杯 = 180g） */
export interface CustomUnit {
  id: number
  foodId: string
  label: string
  grams: number
}

export class AppDb extends Dexie {
  foodLogs!: EntityTable<FoodLog, 'id'>
  units!: EntityTable<CustomUnit, 'id'>

  constructor(name = 'eiyo-note') {
    super(name)
    this.version(1).stores({
      foodLogs: '++id, date, foodId, createdAt',
    })
    this.version(2).stores({
      units: '++id, foodId',
    })
  }
}

export const db = new AppDb()
