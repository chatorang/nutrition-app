// 端末の状態を調べる小さな関数。画面から使う。

/** ホーム画面に追加したアプリとして起動しているか。Safari のタブで開いていると false。 */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

/** 保存データを消さないようブラウザに頼む。効くかは端末しだいなので、バックアップの代わりにはしない。 */
export async function requestPersistence(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return null
  }
}
