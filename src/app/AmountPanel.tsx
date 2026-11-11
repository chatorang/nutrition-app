import { useState } from 'react'
import { scale, type Nutrients } from '../lib/nutrition.ts'
import { fmt } from './foods.ts'

const QUICK = [50, 100, 150, 200, 300]

interface Props {
  title: string
  /** 成分表での正式な食品名（短い名前と違うときだけ小さく表示） */
  officialName?: string
  per100g: Nutrients
  initialGrams: number
  submitLabel: string
  onSubmit: (grams: number) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

/** 量(g)を決めて記録・更新する画面。量を変えるとカロリーなどがその場で変わる。 */
export function AmountPanel({ title, officialName, per100g, initialGrams, submitLabel, onSubmit, onDelete }: Props) {
  const [text, setText] = useState(String(initialGrams))
  const grams = Number(text)
  const valid = text.trim() !== '' && Number.isFinite(grams) && grams > 0 && grams <= 5000
  const n = scale(per100g, valid ? grams : 0)
  const step = (delta: number) => setText(String(Math.max(0, Math.round(((valid ? grams : 0) + delta) * 10) / 10)))

  return (
    <div className="amount">
      <div>
        <h2>{title}</h2>
        {officialName && officialName !== title && <p className="muted small">{officialName}</p>}
      </div>

      <div className="gram-row">
        <button type="button" className="step" onClick={() => step(-10)} aria-label="10グラム減らす">−</button>
        <label className="gram-input">
          <input type="text" inputMode="decimal" value={text} onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))} onFocus={(e) => e.target.select()} aria-label="量（グラム）" />
          <span>g</span>
        </label>
        <button type="button" className="step" onClick={() => step(10)} aria-label="10グラム増やす">＋</button>
      </div>
      <div className="chips">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip" aria-pressed={valid && grams === q} onClick={() => setText(String(q))}>{q}g</button>
        ))}
      </div>

      <div className="nutri-box">
        <div className="kcal"><strong>{fmt(n.energyKcal)}</strong><span>kcal</span></div>
        <dl className="pfc">
          <div><dt>たんぱく質</dt><dd>{fmt(n.proteinG, 1)}g</dd></div>
          <div><dt>脂質</dt><dd>{fmt(n.fatG, 1)}g</dd></div>
          <div><dt>炭水化物</dt><dd>{fmt(n.carbG, 1)}g</dd></div>
          <div><dt>食物繊維</dt><dd>{fmt(n.fiberG, 1)}g</dd></div>
          <div><dt>食塩相当量</dt><dd>{fmt(n.saltG, 1)}g</dd></div>
        </dl>
      </div>

      {!valid && <p className="error" role="alert">量は0より大きく5000g以下で入力してください。</p>}
      <button type="button" className="primary" disabled={!valid} onClick={() => onSubmit(grams)}>{submitLabel}</button>
      {onDelete && <button type="button" className="danger" onClick={() => onDelete()}>この記録を削除</button>}
    </div>
  )
}
