import { useEffect, useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { deleteCustomFood, listCustomFoods } from '../db/customFoods.ts'
import { MEALS } from '../db/db.ts'
import { logsByDate } from '../db/foodLogs.ts'
import { formatDateKey, todayKey } from '../lib/dates.ts'
import { pfcPercent, sum } from '../lib/nutrition.ts'
import { isStandalone, requestPersistence } from './device.ts'
import { fmt } from './foods.ts'
import { MealTab } from './MealTab.tsx'

type TabId = 'home' | 'meal' | 'exercise' | 'review' | 'settings'

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'ホーム', icon: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /> },
  { id: 'meal', label: '食事', icon: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-2 7 0 9v9" /> },
  { id: 'exercise', label: '運動', icon: <path d="M13 5a1.5 1.5 0 1 0 0-.01M6 21l3-6 3 2v4M9 15l1-6 4 3 3 1M10 9l-3 2" /> },
  { id: 'review', label: '振り返り', icon: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /> },
  { id: 'settings', label: '設定', icon: <path d="M4 7h10M18 7h2M4 17h2M10 17h10M16 5v4M8 15v4" /> },
]

export function App() {
  const [tab, setTab] = useState<TabId>('home')
  const current = TABS.find((t) => t.id === tab)!

  return (
    <div className="shell">
      {/* stage: タブバー以外の領域。追加・編集の画面はここに重ねるので、タブバーはいつでも押せる。 */}
      <div className="stage" id="stage">
        <header className="topbar">
          <h1>{current.label}</h1>
        </header>
        {/* 食事タブは表示を隠すだけで動かしたままにする（入力途中でほかのタブを見ても、戻れば続きから）。 */}
        <main className="content" hidden={tab !== 'meal'}>
          <MealTab active={tab === 'meal'} />
        </main>
        {tab !== 'meal' && (
          <main className="content">
            {tab === 'home' && <HomeTab onGoMeal={() => setTab('meal')} />}
            {tab === 'settings' && (
              <>
                <CustomFoodList />
                <SetupCheck />
              </>
            )}
            {(tab === 'exercise' || tab === 'review') && <ComingSoon name={current.label} />}
          </main>
        )}
      </div>
      <nav className="tabbar" aria-label="メインメニュー">
        {TABS.map((t) => (
          <button key={t.id} type="button" className="tab" aria-current={t.id === tab ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function ComingSoon({ name }: { name: string }) {
  return (
    <section className="card">
      <h2>{name}は準備中です</h2>
      <p className="muted">次のステップで作ります。</p>
    </section>
  )
}

/** 今日の合計だけを出す仮のホーム。目標との比較や栄養素バーは、プロフィール設定を作ってから足す。 */
function HomeTab({ onGoMeal }: { onGoMeal: () => void }) {
  const date = todayKey()
  const day = useLiveQuery(() => logsByDate(date), [date])
  const items = day ? MEALS.flatMap((m) => day[m]) : []
  const { total, unknown } = sum(items.map((l) => l.nutrients))
  const pfc = pfcPercent(total)
  const rows = [
    { label: 'たんぱく質', grams: total.proteinG, pct: pfc?.protein },
    { label: '脂質', grams: total.fatG, pct: pfc?.fat },
    { label: '炭水化物', grams: total.carbG, pct: pfc?.carb },
  ]
  return (
    <>
      <section className="card">
        <p className="muted small">{formatDateKey(date)}・今日食べた合計</p>
        <p className="hero"><strong>{fmt(total.energyKcal)}</strong> kcal</p>
        <dl className="pfc wide">
          {rows.map((r) => (
            <div key={r.label}><dt>{r.label}</dt><dd>{fmt(r.grams, 1)}g{r.pct !== undefined && <small>　{fmt(r.pct)}%</small>}</dd></div>
          ))}
        </dl>
        {unknown.energyKcal + unknown.proteinG + unknown.fatG + unknown.carbG > 0 && (
          <p className="muted small">値が不明な食品を含むため、実際より少なく出ている項目があります。</p>
        )}
        <button type="button" className="primary" onClick={onGoMeal}>{items.length === 0 ? '食事を記録する' : '食事を追加・編集する'}</button>
      </section>
      <section className="card">
        <h2>目標との比較はこれからです</h2>
        <p className="muted">プロフィール（年齢・体重など）の設定画面ができると、目標カロリーと栄養素ごとの過不足がここに出ます。</p>
      </section>
    </>
  )
}

/** 自分で登録した食品の一覧。削除は押し間違い防止のため2回押し。 */
function CustomFoodList() {
  const foods = useLiveQuery(() => listCustomFoods(), []) ?? []
  const [confirming, setConfirming] = useState<number | null>(null)
  return (
    <section className="card">
      <h2>自分で登録した食品</h2>
      {foods.length === 0 ? (
        <p className="muted">まだありません。食事の「＋追加」→「自分で食品を登録する」から追加できます。</p>
      ) : (
        <ul className="rows inset">
          {foods.map((f) => (
            <li key={f.id} className="row split static">
              <span>
                <span className="row-main">{f.name}</span>
                <span className="row-sub">100gあたり {fmt(f.per100g.energyKcal)}kcal</span>
              </span>
              {confirming === f.id ? (
                <button type="button" className="danger" onClick={() => deleteCustomFood(f.id).then(() => setConfirming(null))}>本当に削除</button>
              ) : (
                <button type="button" className="link" onClick={() => setConfirming(f.id)}>削除</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">削除しても、過去の食事記録は変わりません。</p>
    </section>
  )
}

type Check = { state: 'ok' | 'ng' | 'wait'; detail: string }
const WAIT: Check = { state: 'wait', detail: '確認中…' }

/** アプリの土台の動作確認。設定タブに表示する。 */
function SetupCheck() {
  const [foods, setFoods] = useState<Check>(WAIT)
  const [persist, setPersist] = useState<Check>(WAIT)
  const [offline, setOffline] = useState<Check>(WAIT)
  const standalone = isStandalone()

  useEffect(() => {
    // 食品データは大きいので、最初の表示を待たせないよう後から読み込む。
    import('../data/foods.json')
      .then((m) => setFoods({ state: 'ok', detail: `${m.default.foods.length.toLocaleString()}食品を読み込みました` }))
      .catch(() => setFoods({ state: 'ng', detail: '読み込めませんでした' }))

    requestPersistence().then((granted) =>
      setPersist(
        granted
          ? { state: 'ok', detail: '端末が保存データを保護しています' }
          : { state: 'ng', detail: '保護されていません。月1回のバックアップで補います' },
      ),
    )

    if (!('serviceWorker' in navigator)) setOffline({ state: 'ng', detail: 'この環境では使えません' })
    else
      navigator.serviceWorker.getRegistration().then((reg) =>
        setOffline(reg ? { state: 'ok', detail: '電波がなくても起動できます' } : { state: 'ng', detail: 'まだ準備できていません。開き直すと有効になります' }),
      )
  }, [])

  const home: Check = standalone
    ? { state: 'ok', detail: 'ホーム画面から起動しています' }
    : { state: 'ng', detail: '共有ボタン →「ホーム画面に追加」から開いてください' }

  return (
    <>
      <section className="card">
        <h2>アプリの状態</h2>
        <p className="muted">上の3つが緑なら問題ありません。</p>
        <ul className="checks">
          <CheckRow title="ホーム画面から起動" check={home} />
          <CheckRow title="食品データ" check={foods} />
          <CheckRow title="オフライン起動" check={offline} />
          <CheckRow title="データの保護" check={persist} />
        </ul>
      </section>
      {!standalone && (
        <section className="card warn">
          <h2>Safariのまま使わないでください</h2>
          <p>Safariで開いたままだと、7日間使わないと記録が消えることがあります。ホーム画面に追加したアイコンから使ってください。</p>
        </section>
      )}
    </>
  )
}

function CheckRow({ title, check }: { title: string; check: Check }) {
  return (
    <li className={`check ${check.state}`}>
      <span className="mark" aria-hidden="true">{check.state === 'ok' ? '✓' : check.state === 'ng' ? '!' : '…'}</span>
      <div>
        <strong>{title}</strong>
        <span className="muted">{check.detail}</span>
      </div>
    </li>
  )
}
