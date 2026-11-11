import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { customFoodId, listCustomFoods } from '../db/customFoods.ts'
import { MEAL_LABEL, type Meal } from '../db/db.ts'
import { addFoodLog, amountText, recentFoods, type Amount } from '../db/foodLogs.ts'
import { NUTRIENT_KEYS, type Nutrients } from '../lib/nutrition.ts'
import { buildIndex, displayName, search } from '../lib/search.ts'
import { AmountPanel } from './AmountPanel.tsx'
import { CustomFoodForm } from './CustomFoodForm.tsx'
import { fmt, per100g, presetUnits, useFoods, type Food } from './foods.ts'

interface Picked {
  id: string
  name: string
  per100g: Nutrients
  /** 最初に入れておく量（前回の量など）。無ければ単位1つ分か100g */
  last?: Amount
}

type View = { kind: 'list' } | { kind: 'amount'; picked: Picked } | { kind: 'new' }

/** 一覧に出すカロリーの目安。単位が用意されている食品は「1杯 56kcal」、それ以外は「100gあたり」。 */
function perText(f: Food): string {
  const unit = presetUnits(f.id)[0]
  const kcal = f.n[0] ?? null
  if (unit && kcal !== null) return `${unit.label} ${fmt((kcal * unit.grams) / 100)}kcal`
  return `100gあたり ${fmt(kcal)}kcal`
}

/**
 * 食品を選んで記録する画面。上に検索、下に「最近の食品」。最近の食品からなら ＋ → 食品 → 記録 の3タップ。
 * 成分表にない食品は「自分で登録」から追加できる。
 */
export function AddFoodSheet({ date, meal, onClose }: { date: string; meal: Meal; onClose: () => void }) {
  const data = useFoods()
  const recents = useLiveQuery(() => recentFoods(meal), [meal]) ?? []
  const customs = useLiveQuery(() => listCustomFoods(), []) ?? []
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>({ kind: 'list' })
  const [added, setAdded] = useState<string[]>([])

  const last = useMemo(() => new Map(recents.map((r) => [r.foodId, r as Amount])), [recents])
  // 自分で登録した食品も、成分表の食品と同じ形にして検索できるようにする。
  const customIndex = useMemo(
    () => buildIndex<Food>(customs.map((c) => ({ id: customFoodId(c.id), name: c.name, group: 0, n: NUTRIENT_KEYS.map((k) => c.per100g[k]) }))),
    [customs],
  )
  const results = useMemo(() => {
    if (!query.trim()) return []
    const boost = new Set(last.keys())
    const mine = search(customIndex, query, { limit: 10, boost })
    const official = data ? search(data.index, query, { limit: 40, boost }) : []
    return [...mine, ...official].slice(0, 40)
  }, [data, customIndex, query, last])
  const searching = query.trim() !== ''
  const back = () => setView({ kind: 'list' })

  if (view.kind === 'amount') {
    const picked = view.picked
    return (
      <div className="sheet" role="dialog" aria-label="量を入力">
        <header className="sheet-head">
          <button type="button" className="link" onClick={back}>‹ 戻る</button>
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
              back()
            }}
          />
        </div>
      </div>
    )
  }

  if (view.kind === 'new') {
    return (
      <div className="sheet" role="dialog" aria-label="食品を登録">
        <header className="sheet-head">
          <button type="button" className="link" onClick={back}>‹ 戻る</button>
          <h1>食品を登録</h1>
          <span />
        </header>
        <div className="sheet-body">
          <CustomFoodForm initialName={query.trim()} onCreated={(food) => setView({ kind: 'amount', picked: { id: food.id, name: food.name, per100g: food.per100g, last: food.first } })} />
        </div>
      </div>
    )
  }

  const registerButton = (
    <button type="button" className="secondary wide" onClick={() => setView({ kind: 'new' })}>＋ 自分で食品を登録する</button>
  )

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
            {data && results.length === 0 && <p className="muted pad">見つかりませんでした。別の呼び方やひらがなで試すか、下のボタンから自分で登録してください。</p>}
            <ul className="rows">
              {results.map((f) => (
                <li key={f.id}>
                  <button type="button" className="row" onClick={() => setView({ kind: 'amount', picked: { id: f.id, name: f.name, per100g: per100g(f), last: last.get(f.id) } })}>
                    <span className="row-main">{displayName(f.name)}{f.id.startsWith('C') && <span className="badge">自分で登録</span>}</span>
                    <span className="row-sub">{perText(f)}{last.has(f.id) ? ` ・前回 ${amountText(last.get(f.id)!)}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
            {data && <div className="pad-top">{registerButton}</div>}
          </>
        ) : (
          <>
            {registerButton}
            <h2 className="list-title">最近の食品</h2>
            {recents.length === 0 && <p className="muted pad">まだ記録がありません。上の検索から食品を探してください。一度記録した食品は、次からここに出ます。</p>}
            <ul className="rows">
              {recents.map((r) => (
                <li key={r.foodId}>
                  <button type="button" className="row" onClick={() => setView({ kind: 'amount', picked: { id: r.foodId, name: r.name, per100g: r.per100g, last: r } })}>
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
