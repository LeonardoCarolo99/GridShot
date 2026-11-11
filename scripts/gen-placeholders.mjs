// Generates branded SVG placeholder images so the site looks intentional
// before real photos are uploaded. Run: node scripts/gen-placeholders.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'uploads');
mkdirSync(outDir, { recursive: true });

const ACCENT = '#e10600';
const TEXT = '#f4f4f6';
const MUTED = '#8a8a92';

// [filename, kicker, title, w, h]
const files = [
  ['hero.svg', 'MOTORSPORT PHOTOGRAPHY', 'SHOWCASE', 1920, 1080],
  ['wrc-portugal-cover.svg', 'WORLD RALLY CHAMPIONSHIP', 'WRC PORTUGAL 2026', 1600, 1000],
  ['wrc-1.svg', 'WRC PORTUGAL', 'GALLERY 01', 1600, 1067],
  ['wrc-2.svg', 'WRC PORTUGAL', 'GALLERY 02', 1600, 1067],
  ['wrc-3.svg', 'WRC PORTUGAL', 'GALLERY 03', 1600, 1067],
  ['gtwc-eu-cover.svg', 'GT WORLD CHALLENGE', 'GTWC EUROPE 2026', 1600, 1000],
  ['gtwc-1.svg', 'GTWC EUROPE', 'GALLERY 01', 1600, 1067],
  ['gtwc-2.svg', 'GTWC EUROPE', 'GALLERY 02', 1600, 1067],
  ['gtwc-3.svg', 'GTWC EUROPE', 'GALLERY 03', 1600, 1067],
  ['f1-monza-cover.svg', 'FORMULA 1', 'MONZA 2026', 1600, 1000],
  ['f1-1.svg', 'MONZA', 'GALLERY 01', 1600, 1067],
  ['f1-2.svg', 'MONZA', 'GALLERY 02', 1600, 1067],
  ['f1-3.svg', 'MONZA', 'GALLERY 03', 1600, 1067],
];

function svg({ kicker, title, w, h }) {
  const cx = w / 2;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d0d10"/>
      <stop offset="1" stop-color="#1c1c23"/>
    </linearGradient>
    <pattern id="checker" width="48" height="48" patternUnits="userSpaceOnUse">
      <rect width="48" height="48" fill="#0d0d10"/>
      <rect width="24" height="24" fill="#ffffff"/>
      <rect x="24" y="24" width="24" height="24" fill="#ffffff"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#checker)" opacity="0.03"/>
  <path d="M0 ${h} L${w * 0.55} ${h * 0.02} L${w * 0.45} ${h * 0.02} L0 ${h * 0.82} Z" fill="${ACCENT}" opacity="0.9"/>
  <rect x="${w * 0.05}" y="${h * 0.06}" width="14" height="14" fill="${ACCENT}"/>
  <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="${MUTED}" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="${Math.round(w * 0.026)}" letter-spacing="${Math.round(w * 0.008)}">${kicker}</text>
  <text x="${cx}" y="${cy + Math.round(h * 0.07)}" text-anchor="middle" fill="${TEXT}" font-family="Arial Narrow, Arial, sans-serif" font-weight="700" font-size="${Math.round(w * 0.055)}" letter-spacing="${Math.round(w * 0.004)}">${title}</text>
</svg>`;
}

for (const [name, kicker, title, w, h] of files) {
  writeFileSync(join(outDir, name), svg({ kicker, title, w, h }));
  console.log('wrote', name);
}
