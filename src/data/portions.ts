// 「1杯」「1個」などの目安単位 → グラム。食品番号ごとに持つ。
// 器の大きさや食品の個体差で実際の重さは変わるので、ここは出発点。自分の量は画面の「＋自分の単位」で登録できる。

export interface Unit {
  label: string
  grams: number
}

export const PRESET_UNITS: Record<string, Unit[]> = {
  // ごはん（精白米・うるち米のめし）。茶碗1杯=150g は一般に使われる目安（食事バランスガイドの「中盛り」に相当）。
  // TODO(要照合): 公的資料でグラム数を直接確認できていない。
  '01088': [{ label: '茶碗1杯', grams: 150 }],
}
