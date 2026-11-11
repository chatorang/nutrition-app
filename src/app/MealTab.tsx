import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MEALS, MEAL_LABEL, type FoodLog, type Meal } from '../db/db.ts'
import { amountText, deleteFoodLog, logsByDate, updateFoodLogAmount } from '../db/foodLogs.ts'
import { addDays, formatDateKey, todayKey } from '../lib/dates.ts'
import { scale, sum } from '../lib/nutrition.ts'
import { displayName } from '../lib/search.ts'
import { AddFoodSheet } from './AddFoodSheet.tsx'
import { AmountPanel } from './AmountPanel.tsx'
import { fmt } from './foods.ts'

type Sheet = { kind: 'add'; meal: Meal } | { kind: 'edit'; log: FoodLog } | null

/**
 * 追加・編集の画面は、下のタブバーを隠さない位置（#stage）に重ねて出す。
 * ほかのタブに移っても入力途中の状態は残り、食事タブに戻ると続きから再開できる。
 */
function Overlay({ active, children }: { active: boolean; children: ReactNode }) {
  const stage = document.getElementById('stage')
  return stage ? createPortal(<div hidden={!active}>{children}</div>, stage) : null
}

export function MealTab({ active }: { active: boolean }) {
  const [date, setDate] = useState(todayKey)
  const [sheet, setSheet] = useState<Sheet>(null)
  const open = setSheet
  const close = () => setSheet(null)
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
              <button type="button" className="add" onClick={() => open({ kind: 'add', meal })} aria-label={`${MEAL_LABEL[meal]}に追加`}>＋ 追加</button>
            </header>
            {logs.length === 0 ? (
              <p className="muted small">まだ記録がありません</p>
            ) : (
              <ul className="rows inset">
                {logs.map((log) => (
                  <li key={log.id}>
                    <button type="button" className="row split" onClick={() => open({ kind: 'edit', log })}>
                      <span>
                        <span className="row-main">{displayName(log.name)}</span>
                        <span className="row-sub">{amountText(log)}</span>
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

      <Overlay active={active}>
        {sheet?.kind === 'add' && <AddFoodSheet date={date} meal={sheet.meal} onClose={close} />}
        {sheet?.kind === 'edit' && (
          <div className="sheet" role="dialog" aria-label="記録を編集">
            <header className="sheet-head">
              <button type="button" className="link" onClick={close}>‹ 戻る</button>
              <h1>記録を編集</h1>
              <span />
            </header>
            <div className="sheet-body">
              <AmountPanel
                title={displayName(sheet.log.name)}
                officialName={sheet.log.name}
                foodId={sheet.log.foodId}
                per100g={scale(sheet.log.nutrients, 10000 / sheet.log.grams)}
                initial={sheet.log}
                submitLabel="量を更新"
                onSubmit={async (amount) => {
                  await updateFoodLogAmount(sheet.log.id, amount)
                  close()
                }}
                onDelete={async () => {
                  await deleteFoodLog(sheet.log.id)
                  close()
                }}
              />
            </div>
          </div>
        )}
      </Overlay>
    </>
  )
}
