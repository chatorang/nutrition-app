// 日付は端末の現地時間で 'YYYY-MM-DD' の文字列として扱う（日本時間の0時で日が変わる）。

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayKey(): string {
  return toDateKey(new Date())
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return toDateKey(new Date(y, m - 1, d + days))
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** 例: 「11月11日（水）」 */
export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number]
  return `${m}月${d}日（${WEEKDAYS[new Date(y, m - 1, d).getDay()]}）`
}
