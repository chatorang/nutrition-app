// 成分表に載っていない料理を、材料の組み合わせで定義する。栄養素は材料の値（成分表）から計算する。
// 分量は家庭ごとに違うので、あくまで目安。出典のレシピの「1人分の栄養価」と計算結果が合うことをテストで確認している。

export interface Dish {
  id: string
  name: string
  alias: string[]
  /** 1人分の量を表す単位名 */
  portionLabel: string
  /** [食品番号, 1人分のグラム] */
  ingredients: [string, number][]
  source: string
}

export const DISHES: Dish[] = [
  {
    id: 'D0001',
    name: 'みそ汁 豆腐とたまねぎ',
    alias: ['味噌汁', 'みそしる', 'おみそしる', 'お味噌汁'],
    portionLabel: '1杯',
    // 4人分: 豆腐1/2丁・さやえんどう20g・たまねぎ1/2個・みそ大さじ2・だし汁2.5カップ を4で割ったもの。
    // 換算の仮定: 豆腐1丁=300g、たまねぎ1個=200g、みそ大さじ1=18g、1カップ=200mL(=200g)。
    ingredients: [
      ['04032', 37.5], // 木綿豆腐
      ['06020', 5], // さやえんどう 若ざや 生
      ['06153', 25], // たまねぎ りん茎 生
      ['17045', 9], // 米みそ 淡色辛みそ
      ['17021', 125], // かつお・昆布だし
    ],
    source: '名古屋市「具だくさんみそ汁」（1人分 55kcal・食塩相当量1.3g） https://www.kenko-shokuiku.city.nagoya.jp/pdf/misosoup.pdf',
  },
]
