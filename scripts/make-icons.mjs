// アイコン(PNG)を作る。使い方: node scripts/make-icons.mjs （sharp が必要。普段は実行不要）
import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2f6b4f"/>
  <circle cx="256" cy="256" r="132" fill="none" stroke="#ffffff" stroke-opacity="0.28" stroke-width="40"/>
  <path d="M256 124 A132 132 0 1 1 141.7 322" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="34" fill="#f2c94c"/>
</svg>`;

for (const [name, size] of [['apple-touch-icon', 180], ['icon-192', 192], ['icon-512', 512]]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${name}.png`);
}
