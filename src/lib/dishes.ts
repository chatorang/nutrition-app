// 料理（材料の組み合わせ）を、ふつうの食品と同じ形（100gあたりの栄養素）に直す。
import type { Dish } from '../data/dishes.ts'
import { NUTRIENT_KEYS } from './nutrition.ts'

interface FoodLike {
  id: string
  name: string
  group: number
  n: (number | null)[]
  alias?: string[]
}

export function dishToFood(dish: Dish, byId: Map<string, FoodLike>): FoodLike {
  const totalGrams = dish.ingredients.reduce((sum, [, g]) => sum + g, 0)
  const n = NUTRIENT_KEYS.map((_, i) => {
    let total = 0
    for (const [foodId, grams] of dish.ingredients) {
      const food = byId.get(foodId)
      if (!food) throw new Error(`料理「${dish.name}」の材料 ${foodId} が食品データにありません`)
      const v = food.n[i]
      if (v === null || v === undefined) return null // 材料に不明があれば、料理としても不明
      total += (v * grams) / 100
    }
    return Math.round((total / totalGrams) * 100 * 1000) / 1000
  })
  return { id: dish.id, name: dish.name, group: 18, n, alias: dish.alias }
}
