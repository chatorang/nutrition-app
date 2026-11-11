import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { MEALS, MEAL_LABEL, type FoodLog, type Meal } from '../db/db.ts'
import { deleteFoodLog, logsByDate, updateFoodLogGrams } from '../db/foodLogs.ts'
import { addDays, formatDateKey, todayKey } from '../lib/dates.ts'
import { scale, sum } from '../lib/nutrition.ts'
import { displayName } from '../lib/search.ts'
import { AddFoodSheet } from './AddFoodSheet.tsx'
import { AmountPanel } from './AmountPanel.tsx'
import { fmt } from './foods.ts'

type Sheet = { kind: 'add'; meal: Meal } | { kind: 'edit'; log: FoodLog } | null

export function MealTab() {
  const [date, setDate] = useState(todayKey)
  const [sheet, setSheet] = useState<Sheet>(null)
  // 日付を切り替えた直後は、前の日の結果が一瞬残る。日付が合うものだけを表示に使う。
  const loaded = useLiveQuery(async () => ({ date, logs: await logsByDate(date) }), [date])
  const day = loaded?.date === date ? loaded.logs : undefined
  const today = todayKey()
  const dayTotal = sum(day ? MEALS.flatMap((m) => day[m].map((l) => l.nutrients)) : []).total

  return (
    <>
      <div className="datebar">
        <button type="button" className="step" onClick={() => setDate(addDays(date, -1))} aria-label="前の日">‹</button>
        <button type="button" className="date-label" onClick={() => setDate(today)} disabled={date === today}>
          <strong>{date === today ? '今日' : formatDateKey(date)}</strong>
          <span className="muted small">{date === today ? formatDateKey(date) : 'タップで今日に戻る'}</span>
        </button>
        <button type="button" className="step" onClick={() => setDate(addDays(date, 1))} disabled={date >= today} aria-label="次の日">›</button>
      </div>

      <p className="day-total"><strong>{fmt(dayTotal.energyKcal)}</strong> kcal<span className="muted small">　この日の合計</span></p>

      {MEALS.map((meal) => {
        const logs = day?.[meal] ?? []
        const kcal = sum(logs.map((l) => l.nutrients)).total.energyKcal
        return (
          <section className="card meal" key={meal}>
            <header className="meal-head">
              <h2>{MEAL_LABEL[meal]}</h2>
              <span className="muted">{logs.length > 0 ? `${fmt(kcal)} kcal` : ''}</span>
              <button type="button" className="add" onClick={() => setSheet({ kind: 'add', meal })} aria-label={`${MEAL_LABEL[meal]}に追加`}>＋ 追加</button>
            </header>
            {logs.length === 0 ? (
              <p className="muted small">まだ記録がありません</p>
            ) : (
              <ul className="rows inset">
                {logs.map((log) => (
                  <li key={log.id}>
                    <button type="button" className="row split" onClick={() => setSheet({ kind: 'edit', log })}>
                      <span>
                        <span className="row-main">{displayName(log.name)}</span>
                        <span className="row-sub">{fmt(log.grams, 1)}g</span>
                      </span>
                      <span className="row-kcal">{fmt(log.nutrients.energyKcal)}<small>kcal</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}

      {sheet?.kind === 'add' && <AddFoodSheet date={date} meal={sheet.meal} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'edit' && (
        <div className="sheet" role="dialog" aria-label="記録を編集">
          <header className="sheet-head">
            <button type="button" className="link" onClick={() => setSheet(null)}>‹ 戻る</button>
            <h1>記録を編集</h1>
            <span />
          </header>
          <div className="sheet-body">
            <AmountPanel
              title={displayName(sheet.log.name)}
              officialName={sheet.log.name}
              per100g={scale(sheet.log.nutrients, 10000 / sheet.log.grams)}
              initialGrams={sheet.log.grams}
              submitLabel="量を更新"
              onSubmit={async (grams) => {
                await updateFoodLogGrams(sheet.log.id, grams)
                setSheet(null)
              }}
              onDelete={async () => {
                await deleteFoodLog(sheet.log.id)
                setSheet(null)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
