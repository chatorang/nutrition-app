import { useEffect, useState, type ReactNode } from 'react'
import { isStandalone, requestPersistence } from './device.ts'

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
      <header className="topbar">
        <h1>{current.label}</h1>
      </header>
      <main className="content">{tab === 'home' ? <SetupCheck /> : <ComingSoon name={current.label} />}</main>
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

type Check = { state: 'ok' | 'ng' | 'wait'; detail: string }
const WAIT: Check = { state: 'wait', detail: '確認中…' }

/** ステップ1の動作確認用。食事記録の画面ができたら、この表示は設定タブに移す。 */
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
        <h2>アプリの土台ができました</h2>
        <p className="muted">下の4つがすべて緑なら、記録を始める準備は完了です。</p>
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
