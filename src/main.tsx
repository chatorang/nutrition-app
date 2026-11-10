import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// オフライン起動用。開発中(npm run dev)は登録しない（古い画面が残って混乱するため）。
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
    // 読み込み済みのファイル一覧を Service Worker に渡して保存してもらう（初回からオフライン起動できるように）。
    navigator.serviceWorker.ready.then((reg) => {
      setTimeout(() => {
        const urls = [location.href, ...performance.getEntriesByType('resource').map((e) => e.name)]
        reg.active?.postMessage({ type: 'cache-urls', urls })
      }, 3000)
    })
  })
}
