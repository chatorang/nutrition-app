# 栄養・運動管理アプリ

自分専用の食事・運動記録アプリ（PWA）。仕様は SPEC.md（Claude上の仕様書を書き出したもの）を参照。

## 動かし方

```
npm install
npm run dev      # PCのブラウザで確認
npm test         # 計算ロジックと食品データのテスト
npm run build    # 公開用のファイルを dist/ に作る
```

main に入ると `.github/workflows/deploy.yml` がテスト→ビルド→GitHub Pages への公開まで自動で行う
（事前に Settings → Pages → Source を「GitHub Actions」にする）。

## いまあるもの

- `src/app/` 画面の骨組み（下部タブ5つ、土台の動作確認）
- `public/` ホーム画面用のアイコン・マニフェスト、オフライン起動用の `sw.js`
- `src/data/foods.json` 食品データ 2,538食品（`scripts/convert_foods.py` で成分表Excelから変換）

- `src/data/dri2025-energy.ts` 食事摂取基準(2025年版)のエネルギー関連の基準値
- `src/lib/energy.ts` 基礎代謝量・推定エネルギー必要量
- `src/lib/goal.ts` 減量・増量の安全ライン、体重での答え合わせ
- `src/lib/exercise.ts` 運動の消費カロリー、完璧ライン、1日の判定
- `src/lib/nutrition.ts` 栄養素の換算・合計・PFC

## テスト

```
npm install
npm test
```

## 未照合の値（TODO）

- PFCの目標範囲（%エネルギー）: 2025年版報告書の表と未照合
- エネルギーの基準値: 二次情報からの転記。公表されている推定エネルギー必要量の表とは一致を確認済み
