import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { Unit } from '../data/portions.ts'
import { customUnits, saveCustomUnit, type Amount } from '../db/foodLogs.ts'
import { scale, type Nutrients } from '../lib/nutrition.ts'
import { fmt, presetUnits } from './foods.ts'

const QUICK_GRAMS = [50, 100, 150, 200, 300]
const QUICK_COUNTS = [0.5, 1, 1.5, 2, 3]
const round1 = (x: number) => Math.round(x * 10) / 10

interface Props {
  title: string
  /** 成分表での正式な食品名（短い名前と違うときだけ小さく表示） */
  officialName?: string
  foodId: string
  per100g: Nutrients
  /** 最初に入れておく量。前回の記録があればそれ、なければ undefined（単位があれば1単位、なければ100g） */
  initial?: Amount
  submitLabel: string
  onSubmit: (amount: Amount) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

/** 量を決めて記録・更新する画面。グラムでも「茶碗1杯」などの単位でも入れられ、カロリーなどがその場で変わる。 */
export function AmountPanel({ title, officialName, foodId, per100g, initial, submitLabel, onSubmit, onDelete }: Props) {
  const custom = useLiveQuery(() => customUnits(foodId), [foodId]) ?? []
  const presets = presetUnits(foodId)
  // 自分で登録した単位を先に。同じ名前があれば自分の方を使う。前回使った単位が今は無い場合も選べるようにしておく。
  const units: Unit[] = [...custom, ...presets.filter((p) => !custom.some((c) => c.label === p.label))]
  if (initial?.unitLabel && initial.unitCount && !units.some((u) => u.label === initial.unitLabel)) {
    units.push({ label: initial.unitLabel, grams: initial.grams / initial.unitCount })
  }

  const startWithUnit = initial ? initial.unitLabel : presets[0]?.label
  const [unitLabel, setUnitLabel] = useState<string | null>(startWithUnit ?? null)
  const [text, setText] = useState(String(initial ? (initial.unitLabel ? initial.unitCount : initial.grams) : startWithUnit ? 1 : 100))
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newGrams, setNewGrams] = useState('')

  const unit = units.find((u) => u.label === unitLabel) ?? null
  const value = Number(text)
  const grams = unit ? value * unit.grams : value
  const valid = text.trim() !== '' && Number.isFinite(grams) && grams > 0 && grams <= 5000
  const n = scale(per100g, valid ? grams : 0)
  const stepSize = unit ? 0.5 : 10
  const step = (dir: 1 | -1) => setText(String(Math.max(0, round1((Number.isFinite(value) ? value : 0) + dir * stepSize))))

  const choose = (label: string | null) => {
    if (label === unitLabel) return
    setText(label ? '1' : String(valid ? round1(grams) : 100))
    setUnitLabel(label)
  }
  const newGramsValue = Number(newGrams)
  const canSaveUnit = newLabel.trim() !== '' && Number.isFinite(newGramsValue) && newGramsValue > 0 && newGramsValue <= 5000
  const saveUnit = async () => {
    await saveCustomUnit(foodId, newLabel, newGramsValue)
    setUnitLabel(newLabel.trim())
    setText('1')
    setAdding(false)
    setNewLabel('')
    setNewGrams('')
  }

  return (
    <div className="amount">
      <div>
        <h2>{title}</h2>
        {officialName && officialName !== title && <p className="muted small">{officialName}</p>}
      </div>

      <div className="chips" role="group" aria-label="単位">
        <button type="button" className="chip" aria-pressed={unit === null} onClick={() => choose(null)}>グラム</button>
        {units.map((u) => (
          <button key={u.label} type="button" className="chip" aria-pressed={unit?.label === u.label} onClick={() => choose(u.label)}>
            {u.label}<small>（{fmt(u.grams, 1)}g）</small>
          </button>
        ))}
        <button type="button" className="chip dashed" aria-expanded={adding} onClick={() => setAdding(!adding)}>＋ 自分の単位</button>
      </div>

      {adding && (
        <div className="unit-form">
          <p className="muted small">自分の器や1個分の重さを一度はかって登録すると、次から1タップで入れられます。</p>
          <div className="unit-fields">
            <label>名前<input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="例：1杯、1個、1枚" maxLength={12} /></label>
            <label>重さ(g)<input type="text" inputMode="decimal" value={newGrams} onChange={(e) => setNewGrams(e.target.value.replace(/[^\d.]/g, ''))} placeholder="例：180" /></label>
          </div>
          <button type="button" className="secondary" disabled={!canSaveUnit} onClick={saveUnit}>この単位を登録</button>
        </div>
      )}

      <div className="gram-row">
        <button type="button" className="step" onClick={() => step(-1)} aria-label="減らす">−</button>
        <label className="gram-input">
          <input type="text" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))} onFocus={(e) => e.target.select()} aria-label={unit ? `量（${unit.label}の数）` : '量（グラム）'} />
          <span>{unit ? `× ${unit.label}` : 'g'}</span>
        </label>
        <button type="button" className="step" onClick={() => step(1)} aria-label="増やす">＋</button>
      </div>
      <div className="chips">
        {(unit ? QUICK_COUNTS : QUICK_GRAMS).map((q) => (
          <button key={q} type="button" className="chip" aria-pressed={valid && value === q} onClick={() => setText(String(q))}>{unit ? `×${q}` : `${q}g`}</button>
        ))}
      </div>

      <div className="nutri-box">
        <div className="kcal"><strong>{fmt(n.energyKcal)}</strong><span>kcal</span>{unit && valid && <span className="small">（{fmt(grams, 1)}g）</span>}</div>
        <dl className="pfc">
          <div><dt>たんぱく質</dt><dd>{fmt(n.proteinG, 1)}g</dd></div>
          <div><dt>脂質</dt><dd>{fmt(n.fatG, 1)}g</dd></div>
          <div><dt>炭水化物</dt><dd>{fmt(n.carbG, 1)}g</dd></div>
          <div><dt>食物繊維</dt><dd>{fmt(n.fiberG, 1)}g</dd></div>
          <div><dt>食塩相当量</dt><dd>{fmt(n.saltG, 1)}g</dd></div>
        </dl>
      </div>

      {!valid && <p className="error" role="alert">量は0より大きく、合計5000g以下で入力してください。</p>}
      <button type="button" className="primary" disabled={!valid} onClick={() => onSubmit(unit ? { grams: round1(grams), unitLabel: unit.label, unitCount: value } : { grams })}>{submitLabel}</button>
      {onDelete && <button type="button" className="danger" onClick={() => onDelete()}>この記録を削除</button>}
    </div>
  )
}
