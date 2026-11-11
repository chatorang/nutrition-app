// 上に重ねた画面（追加・量の入力など）を「戻る」操作で閉じられるようにする仕組み。
// 画面を開くたびにブラウザの履歴を1つ積み、戻る（画面端からのスワイプや戻るボタン）で一番上の画面を閉じる。
// 閉じるボタンも同じ道を通す（closeLayer → 履歴を1つ戻す → 閉じる処理）ので、履歴と画面がずれない。

const stack: Array<() => void> = []
let installed = false

function install(): void {
  if (installed) return
  installed = true
  window.addEventListener('popstate', () => {
    stack.pop()?.()
  })
}

/** 画面を開いた直後に呼ぶ。onClose は「その画面を閉じる」処理。 */
export function openLayer(onClose: () => void): void {
  install()
  stack.push(onClose)
  history.pushState({ layer: stack.length }, '')
}

/** 一番上の画面を閉じる。 */
export function closeLayer(): void {
  if (stack.length > 0) history.back()
}
