import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { MEAL_LABEL, type Meal } from '../db/db.ts'
import { addFoodLog, amountText, recentFoods, type Amount } from '../db/foodLogs.ts'
import type { Nutrients } from '../lib/nutrition.ts'
import { displayName, search } from '../lib/search.ts'
import { AmountPanel } from './AmountPanel.tsx'
import { closeLayer, openLayer } from './backstack.ts'
import { fmt, per100g, presetUnits, useFoods, type Food } from './foods.ts'

interface Picked {
  id: string
  name: string
  per100g: Nutrients
  /** 前回の量（初めての食品は無し） */
  last?: Amount
}

/** 一覧に出すカロリーの目安。単位が用意されている食品は「1杯 56kcal」、それ以外は「100gあたり」。 */
function perText(f: Food): string {
  const unit = presetUnits(f.id)[0]
  const kcal = f.n[0] ?? null
  if (unit && kcal !== null) return `${unit.label} ${fmt((kcal * unit.grams) / 100)}kcal`
  return `100gあたり ${fmt(kcal)}kcal`
}

/** 食品を選んで記録する画面。上に検索、下に「最近の食品」。最近の食品からなら ＋ → 食品 → 記録 の3タップ。 */
export function AddFoodSheet({ date, meal }: { date: string; meal: Meal }) {
  const data = useFoods()
  const recents = useLiveQuery(() => recentFoods(meal), [meal]) ?? []
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Picked | null>(null)
  const pick = (p: Picked) => {
    setPicked(p)
    openLayer(() => setPicked(null))
  }
  const [added, setAdded] = useState<string[]>([])

  const last = useMemo(() => new Map(recents.map((r) => [r.foodId, r as Amount])), [recents])
  const results = useMemo(
    () => (data && query.trim() ? search(data.index, query, { limit: 40, boost: new Set(last.keys()) }) : []),
    [data, query, last],
  )
  const searching = query.trim() !== ''

  if (picked) {
    return (
      <div className="sheet" role="dialog" aria-label="量を入力">
        <header className="sheet-head">
          <button type="button" className="link" onClick={closeLayer}>‹ 戻る</button>
          <h1>{MEAL_LABEL[meal]}に追加</h1>
          <span />
        </header>
        <div className="sheet-body">
          <AmountPanel
            title={displayName(picked.name)}
            officialName={picked.name}
            foodId={picked.id}
            per100g={picked.per100g}
            initial={picked.last}
            submitLabel="記録する"
            onSubmit={async (amount) => {
              await addFoodLog({ date, meal, food: picked, ...amount })
              setAdded((a) => [...a, displayName(picked.name)])
              setQuery('')
              closeLayer()
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
        <button type="button" className="link strong" onClick={closeLayer}>完了</button>
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
                  <button type="button" className="row" onClick={() => pick({ id: f.id, name: f.name, per100g: per100g(f), last: last.get(f.id) })}>
                    <span className="row-main">{displayName(f.name)}</span>
                    <span className="row-sub">{perText(f)}{last.has(f.id) ? ` ・前回 ${amountText(last.get(f.id)!)}` : ''}</span>
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
                  <button type="button" className="row" onClick={() => pick({ id: r.foodId, name: r.name, per100g: r.per100g, last: r })}>
                    <span className="row-main">{displayName(r.name)}</span>
                    <span className="row-sub">前回 {amountText(r)} ・{fmt((r.per100g.energyKcal ?? 0) * r.grams / 100)}kcal</span>
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
