import { useState } from 'react'
import { addCustomFood, customFoodId } from '../db/customFoods.ts'
import type { Amount } from '../db/foodLogs.ts'
import type { NutrientKey, Nutrients } from '../lib/nutrition.ts'

export interface CreatedFood {
  id: string
  name: string
  per100g: Nutrients
  /** 登録直後に量の画面へ進むときの初期値（1食分で登録したら1食分） */
  first?: Amount
}

const MAIN: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'energyKcal', label: 'エネルギー', unit: 'kcal' },
  { key: 'proteinG', label: 'たんぱく質', unit: 'g' },
  { key: 'fatG', label: '脂質', unit: 'g' },
  { key: 'carbG', label: '炭水化物', unit: 'g' },
  { key: 'saltG', label: '食塩相当量', unit: 'g' },
]
const EXTRA: { key: NutrientKey; label: string; unit: string }[] = [
  { key: 'fiberG', label: '食物繊維', unit: 'g' },
  { key: 'saturatedFatG', label: '飽和脂肪酸', unit: 'g' },
  { key: 'calciumMg', label: 'カルシウム', unit: 'mg' },
  { key: 'ironMg', label: '鉄', unit: 'mg' },
]
const numeric = (v: string) => v.replace(/[^\d.]/g, '')

/** パッケージの栄養成分表示を見ながら食品を登録する画面。空欄にした項目は「不明」として扱う。 */
export function CustomFoodForm({ initialName, onCreated }: { initialName: string; onCreated: (food: CreatedFood) => void }) {
  const [name, setName] = useState(initialName)
  const [basis, setBasis] = useState<'serving' | '100g'>('serving')
  const [servingLabel, setServingLabel] = useState('1食分')
  const [servingGrams, setServingGrams] = useState('')
  const [values, setValues] = useState<Partial<Record<NutrientKey, string>>>({})
  const [showExtra, setShowExtra] = useState(false)
  const [error, setError] = useState('')

  const basisGrams = basis === '100g' ? 100 : Number(servingGrams)
  const ready = name.trim() !== '' && (values.energyKcal ?? '') !== '' && Number.isFinite(basisGrams) && basisGrams > 0 && (basis === '100g' || servingLabel.trim() !== '')

  const field = ({ key, label, unit }: { key: NutrientKey; label: string; unit: string }) => (
    <label key={key} className="nf-row">
      <span>{label}{key === 'energyKcal' && <em>必須</em>}</span>
      <span className="nf-input">
        <input type="text" inputMode="decimal" value={values[key] ?? ''} onChange={(e) => setValues({ ...values, [key]: numeric(e.target.value) })} placeholder={key === 'energyKcal' ? '' : '不明なら空欄'} />
        <small>{unit}</small>
      </span>
    </label>
  )

  const save = async () => {
    try {
      const parsed = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '' && v !== undefined).map(([k, v]) => [k, Number(v)])) as Partial<Record<NutrientKey, number>>
      const label = basis === 'serving' ? servingLabel.trim() : undefined
      const id = await addCustomFood({ name, basisGrams, servingLabel: label, values: parsed })
      const per100g = Object.fromEntries(
        [...MAIN, ...EXTRA].map(({ key }) => [key, parsed[key] === undefined ? null : (parsed[key]! * 100) / basisGrams]),
      ) as Partial<Nutrients>
      onCreated({
        id: customFoodId(id),
        name: name.trim(),
        per100g: { ...EMPTY, ...per100g },
        first: label ? { grams: basisGrams, unitLabel: label, unitCount: 1 } : undefined,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存できませんでした')
    }
  }

  return (
    <div className="amount">
      <p className="muted small">パッケージの「栄養成分表示」を見ながら入力してください。書かれていない項目は空欄のままで大丈夫です（0ではなく「不明」として扱います）。</p>

      <label className="nf-name">食品の名前
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：プロテインバー チョコ味" maxLength={40} />
      </label>

      <div>
        <p className="list-title">表示されている量</p>
        <div className="chips" role="group" aria-label="表示されている量">
          <button type="button" className="chip" aria-pressed={basis === 'serving'} onClick={() => setBasis('serving')}>1食分・1個あたり</button>
          <button type="button" className="chip" aria-pressed={basis === '100g'} onClick={() => setBasis('100g')}>100gあたり</button>
        </div>
      </div>

      {basis === 'serving' && (
        <div className="unit-form">
          <div className="unit-fields">
            <label>数え方<input type="text" value={servingLabel} onChange={(e) => setServingLabel(e.target.value)} placeholder="例：1本、1袋、1個" maxLength={12} /></label>
            <label>その重さ(g)<input type="text" inputMode="decimal" value={servingGrams} onChange={(e) => setServingGrams(numeric(e.target.value))} placeholder="例：40" /></label>
          </div>
          <p className="muted small">重さは「1本(40g)あたり」のように表示に書かれています。飲み物でmL表示のときは、mLの数字をそのまま入れてください（厳密な重さとは少しずれます）。</p>
        </div>
      )}

      <div className="nutri-box nf">
        {MAIN.map(field)}
        {showExtra ? EXTRA.map(field) : <button type="button" className="link left" onClick={() => setShowExtra(true)}>＋ その他の栄養素も入力する</button>}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" className="primary" disabled={!ready} onClick={save}>登録して量を決める</button>
    </div>
  )
}

const EMPTY: Nutrients = {
  energyKcal: null, proteinG: null, fatG: null, carbG: null, fiberG: null, saltG: null, calciumMg: null, ironMg: null, magnesiumMg: null,
  potassiumMg: null, zincMg: null, vitaminAUg: null, vitaminDUg: null, vitaminB1Mg: null, vitaminB2Mg: null, vitaminCMg: null, saturatedFatG: null,
}
