import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { MEAL_LABEL, type Meal } from '../db/db.ts'
import { addFoodLog, recentFoods } from '../db/foodLogs.ts'
import type { Nutrients } from '../lib/nutrition.ts'
import { displayName, search } from '../lib/search.ts'
import { AmountPanel } from './AmountPanel.tsx'
import { fmt, per100g, useFoods } from './foods.ts'

interface Picked {
  id: string
  name: string
  per100g: Nutrients
  grams: number
}

/** 食品を選んで記録する画面。上に検索、下に「最近の食品」。最近の食品からなら ＋ → 食品 → 記録 の3タップ。 */
export function AddFoodSheet({ date, meal, onClose }: { date: string; meal: Meal; onClose: () => void }) {
  const data = useFoods()
  const recents = useLiveQuery(() => recentFoods(meal), [meal]) ?? []
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Picked | null>(null)
  const [added, setAdded] = useState<string[]>([])

  const lastGrams = useMemo(() => new Map(recents.map((r) => [r.foodId, r.grams])), [recents])
  const results = useMemo(
    () => (data && query.trim() ? search(data.index, query, { limit: 40, boost: new Set(lastGrams.keys()) }) : []),
    [data, query, lastGrams],
  )
  const searching = query.trim() !== ''

  if (picked) {
    return (
      <div className="sheet" role="dialog" aria-label="量を入力">
        <header className="sheet-head">
          <button type="button" className="link" onClick={() => setPicked(null)}>‹ 戻る</button>
          <h1>{MEAL_LABEL[meal]}に追加</h1>
          <span />
        </header>
        <div className="sheet-body">
          <AmountPanel
            title={displayName(picked.name)}
            officialName={picked.name}
            per100g={picked.per100g}
            initialGrams={picked.grams}
            submitLabel="記録する"
            onSubmit={async (grams) => {
              await addFoodLog({ date, meal, food: picked, grams })
              setAdded((a) => [...a, displayName(picked.name)])
              setPicked(null)
              setQuery('')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="sheet" role="dialog" aria-label="食品を追加">
      <header className="sheet-head">
        <span />
        <h1>{MEAL_LABEL[meal]}に追加</h1>
        <button type="button" className="link strong" onClick={onClose}>完了</button>
      </header>
      <div className="search-row">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="食品名で検索（例：たまご、ごはん）" aria-label="食品名で検索" enterKeyHint="search" />
      </div>
      <div className="sheet-body">
        {added.length > 0 && <p className="toast" role="status">✓ {added.at(-1)} を記録しました（この画面で{added.length}件）</p>}

        {searching ? (
          <>
            <h2 className="list-title">{data ? `検索結果 ${results.length}件${results.length === 40 ? '以上' : ''}` : '食品データを読み込み中…'}</h2>
            {data && results.length === 0 && (
              <p className="muted pad">見つかりませんでした。別の呼び方や、ひらがなで試してください。市販品の手入力は今後追加します。</p>
            )}
            <ul className="rows">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" className="row" onClick={() => setPicked({ id: f.id, name: f.name, per100g: per100g(f), grams: lastGrams.get(f.id) ?? 100 })}>
                    <span className="row-main">{displayName(f.name)}</span>
                    <span className="row-sub">100gあたり {fmt(f.n[0])}kcal{lastGrams.has(f.id) ? ` ・前回 ${fmt(lastGrams.get(f.id), 1)}g` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="list-title">最近の食品</h2>
            {recents.length === 0 && <p className="muted pad">まだ記録がありません。上の検索から食品を探してください。一度記録した食品は、次からここに出ます。</p>}
            <ul className="rows">
              {recents.map((r) => (
                <li key={r.foodId}>
                  <button type="button" className="row" onClick={() => setPicked({ id: r.foodId, name: r.name, per100g: r.per100g, grams: r.grams })}>
                    <span className="row-main">{displayName(r.name)}</span>
                    <span className="row-sub">前回 {fmt(r.grams, 1)}g ・{fmt((r.per100g.energyKcal ?? 0) * r.grams / 100)}kcal</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
