// 食品検索。成分表の食品名は「＜鳥肉類＞ にわとり ［若どり・主品目］ むね 皮なし 生」のように硬いので、
// 表記ゆれ（ひらがな・カタカナ・全角半角）と、ふだんの呼び名（たまご→鶏卵 など）を吸収する。

export interface SearchableFood {
  id: string
  name: string
  alias?: string[]
}

/** 比較用に正規化する: 全角半角をそろえ、カタカナをひらがなに、記号と空白を除く。 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\[\]<>()［］＜＞（）・,、:：]/g, '')
}

// ［…］のうち、外しても食品が区別できる分類。これ以外（和牛肉・ひき肉・水稲めし など）は名前の一部として残す。
const DROPPABLE = /^(その他|加工品|(若どり|親)・(主|副)品目|副品目|二次品目|(大型|中型)種肉|全粒・全粒製品|.*類|.*製品)$/

/**
 * 画面に出す短い名前: 分類を表す ＜…＞ と先頭の （…） 、一部の ［…］ を外し、同じ語の繰り返しをまとめる。
 * 後ろの方にある （…） は「（添付調味料等を含むもの）」のような説明なので残す。
 */
export function displayName(name: string): string {
  const words = name
    .replace(/＜[^＞]*＞/g, ' ')
    // 「（まぐろ類） 缶詰 …」は分類を外すと何の缶詰か分からなくなるので、分類名を残す
    .replace(/^\s*（([^）]*?)類?）\s*(?=缶詰)/, '$1 ')
    .replace(/^\s*（[^）]*）/, ' ')
    .replace(/［([^］]*)］/g, (_, inner: string) => (DROPPABLE.test(inner) ? ' ' : ` ${inner} `))
    .split(/\s+/)
    .filter(Boolean)
  return words.filter((w, i) => w !== words[i - 1]).join(' ') || name
}

// ふだんの呼び名 → 成分表での言い方。左が入力に含まれていたら右の語（空白区切りで複数可）に読み替える。
// 長い語を先に試すので、「牛乳」と「牛肉」のような重なりは問題にならない。
const SYNONYM_SOURCE: [string, string][] = [
  ['ゆでたまご', '鶏卵 ゆで'], ['ゆで卵', '鶏卵 ゆで'], ['目玉焼き', '鶏卵 目玉焼き'], ['めだまやき', '鶏卵 目玉焼き'],
  ['たまご', '鶏卵'], ['卵', '鶏卵'], ['玉子', '鶏卵'],
  ['玄米ごはん', '水稲めし 玄米'], ['ごはん', '水稲めし 精白米 うるち米'], ['ご飯', '水稲めし 精白米 うるち米'],
  ['白米', '水稲めし 精白米 うるち米'], ['はくまい', '水稲めし 精白米 うるち米'], ['ライス', '水稲めし 精白米 うるち米'],
  ['牛乳', '普通牛乳'], ['ぎゅうにゅう', '普通牛乳'], ['ミルク', '普通牛乳'],
  ['鶏むね', 'にわとり 若どり むね'], ['鶏もも', 'にわとり 若どり もも'], ['とりむね', 'にわとり 若どり むね'], ['とりもも', 'にわとり 若どり もも'], ['ささみ', 'にわとり ささみ'],
  ['鶏肉', 'にわとり'], ['とりにく', 'にわとり'], ['とり肉', 'にわとり'], ['チキン', 'にわとり'], ['鶏', 'にわとり'],
  ['豚肉', 'ぶた'], ['ぶたにく', 'ぶた'], ['ポーク', 'ぶた'], ['豚', 'ぶた'],
  ['牛肉', 'うし'], ['ぎゅうにく', 'うし'], ['ビーフ', 'うし'],
  ['ひき肉', 'ひき肉'], ['挽肉', 'ひき肉'], ['ひきにく', 'ひき肉'],
  ['しょくぱん', '角形食パン 食パン'], ['食パン', '角形食パン 食パン'], ['トースト', '角形食パン 焼き'],
  ['とうふ', '豆腐'], ['なっとう', '糸引き納豆'], ['納豆', '糸引き納豆'], ['味噌', 'みそ'], ['醤油', 'しょうゆ'], ['大豆', 'だいず'],
  ['人参', 'にんじん'], ['玉ねぎ', 'たまねぎ'], ['玉葱', 'たまねぎ'], ['大根', 'だいこん'], ['じゃが芋', 'じゃがいも'],
  ['さつま芋', 'さつまいも'], ['薩摩芋', 'さつまいも'], ['胡瓜', 'きゅうり'], ['茄子', 'なす'], ['南瓜', 'かぼちゃ'],
  ['ほうれん草', 'ほうれんそう'], ['長ねぎ', '根深ねぎ'], ['椎茸', 'しいたけ'], ['海苔', 'のり'], ['若布', 'わかめ'],
  ['鮭', 'さけ'], ['しゃけ', 'さけ'], ['サーモン', 'さけ'], ['鯖', 'さば'], ['鮪', 'まぐろ'], ['ツナ', 'まぐろ 缶詰'], ['海老', 'えび'],
  ['蕎麦', 'そば'], ['パスタ', 'スパゲッティ'], ['ラーメン', '中華めん'], ['焼きそば', '蒸し中華めん'], ['やきそば', '蒸し中華めん'],
  ['餃子', 'ぎょうざ'], ['唐揚げ', 'から揚げ'], ['からあげ', 'から揚げ'], ['ピーナッツ', 'らっかせい'],
  ['苺', 'いちご'], ['林檎', 'りんご'], ['蜜柑', 'みかん'], ['葡萄', 'ぶどう'], ['胡麻', 'ごま'], ['餅', 'もち'],
  ['さとう', '砂糖'], ['こむぎこ', '小麦粉'], ['お茶', 'せん茶 浸出液'], ['コーヒー', 'コーヒー 浸出液'], ['麦茶', '麦茶 浸出液'], ['ウインナー', 'ウインナーソーセージ'],
]
const SYNONYMS = SYNONYM_SOURCE.map(([from, to]) => [normalize(from), to.split(' ').map(normalize)] as const).sort(
  (a, b) => b[0].length - a[0].length,
)

/** 入力を検索語の組（すべて含む食品を探す）に分ける。呼び名の読み替えをした版も返す。 */
export function queryTokens(query: string): { plain: string[]; rewritten: string[] | null } {
  const plain = query.split(/[\s　]+/).map(normalize).filter(Boolean)
  let changed = false
  const rewritten = plain.flatMap((token) => {
    for (const [from, to] of SYNONYMS) {
      const at = token.indexOf(from)
      if (at < 0) continue
      changed = true
      // 読み替えた語と、その前後に残った部分（「肉」1文字だけの残りは捨てる）を検索語にする。
      const rest = [token.slice(0, at), token.slice(at + from.length)].filter((r) => r && r !== '肉')
      return [...to, ...rest]
    }
    return [token]
  })
  return { plain, rewritten: changed ? rewritten : null }
}

interface IndexItem<T> {
  food: T
  /** 食品名を空白と括弧で区切った語 */
  words: string[]
  /** 括弧の中の分類名（「類」を除く）。例: パン、納豆、まぐろ */
  categories: Set<string>
  /** 語をつないだ全文と別名 */
  text: string
  alias: string
  shortLength: number
  raw: boolean
}

export interface SearchIndex<T extends SearchableFood> {
  items: IndexItem<T>[]
}

export function buildIndex<T extends SearchableFood>(foods: T[]): SearchIndex<T> {
  return {
    items: foods.map((food) => {
      const words = food.name.split(/[\s＜＞［］（）・]+/).filter(Boolean).map(normalize)
      const categories = [...food.name.matchAll(/[＜［（]([^＞］）]*)[＞］）]/g)].flatMap((m) => m[1]!.split('・')).map((c) => normalize(c.replace(/類$/, '')))
      const short = displayName(food.name)
      return {
        food,
        words,
        categories: new Set(categories),
        text: words.join(''),
        alias: normalize(food.alias?.join(' ') ?? ''),
        shortLength: short.length,
        raw: short.endsWith(' 生'),
      }
    }),
  }
}

/** 検索語1つが食品にどれだけよく合うか（小さいほど良い）。合わなければ null。 */
function tokenScore<T>(item: IndexItem<T>, token: string): number | null {
  if (item.words.includes(token)) return 0
  if (item.categories.has(token)) return 0.5
  if (item.words.some((w) => w.startsWith(token))) return 1
  if (item.words.some((w) => w.includes(token)) || item.alias.includes(token)) return 4
  if (item.text.includes(token)) return 6
  return null
}

function tokensScore<T>(item: IndexItem<T>, tokens: string[]): number | null {
  let total = 0
  for (const t of tokens) {
    const s = tokenScore(item, t)
    if (s === null) return null
    total += s * 10
  }
  return total
}

/**
 * 検索する。すべての検索語を含む食品を、合い方の良い順に返す。
 * 語そのものの一致 ＞ 分類名の一致 ＞ 語の先頭一致 ＞ 語の途中や別名での一致。
 * 同点なら「生」で終わるもの、名前が短いもの（一般的な食品であることが多い）を先にする。
 * 呼び名の読み替えで合った食品は本命として少し優先し、以前に記録した食品は一番上に出す。
 */
export function search<T extends SearchableFood>(index: SearchIndex<T>, query: string, opts: { limit?: number; boost?: Set<string> } = {}): T[] {
  const { plain, rewritten } = queryTokens(query)
  if (plain.length === 0) return []
  const scored: { food: T; score: number }[] = []
  for (const item of index.items) {
    const direct = tokensScore(item, plain)
    const viaSynonym = rewritten === null ? null : tokensScore(item, rewritten)
    if (direct === null && viaSynonym === null) continue
    let score = Math.min(direct ?? Infinity, viaSynonym === null ? Infinity : viaSynonym - 5)
    score += item.shortLength * 0.1 - (item.raw ? 2 : 0)
    if (opts.boost?.has(item.food.id)) score -= 1000
    scored.push({ food: item.food, score })
  }
  scored.sort((a, b) => a.score - b.score || a.food.id.localeCompare(b.food.id))
  return scored.slice(0, opts.limit ?? 50).map((s) => s.food)
}
