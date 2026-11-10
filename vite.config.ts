import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base を相対パスにして、GitHub Pages の /リポジトリ名/ 配下でもそのまま動くようにする。
export default defineConfig({
  base: './',
  plugins: [react()],
})
