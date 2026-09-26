#!/usr/bin/env node
// Builds assets/hero.svg — the opening title sequence.
// Pure SVG + SMIL animation: no JS, no external fonts, no raster frames.
// Loops seamlessly every LOOP seconds. Re-run this file after editing the
// constants below (colors, timing, particle count) to regenerate the asset.

import { writeFile } from 'node:fs/promises';

const W = 900;
const H = 380;
const LOOP = 14; // total seconds per loop — every timed element shares this duration
const BG = '#050505';
const ACCENT = '#A456B9';
const ACCENT_SOFT = '#8a5c9c';
const TEXT = '#f2f0f3';
const TEXT_DIM = '#8a8790';
const FONT_DISPLAY = "'Iowan Old Style','Palatino Linotype',Georgia,'Times New Roman',serif";
const FONT_MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace";

// Simple deterministic PRNG so re-running this script gives identical output
// (reproducible builds, easy to diff in git).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function particles(n) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const cx = 60 + rand() * (W - 120);
    const cyStart = 120 + rand() * 220;
    const drift = 30 + rand() * 60;
    const r = 0.6 + rand() * 1.3;
    const dur = (8 + rand() * 8).toFixed(2);
    const begin = (-rand() * dur).toFixed(2);
    const maxOp = (0.15 + rand() * 0.35).toFixed(2);
    out += `
    <circle cx="${cx.toFixed(1)}" cy="${cyStart.toFixed(1)}" r="${r.toFixed(2)}" fill="${ACCENT}" opacity="${(maxOp * 0.6).toFixed(2)}">
      <animate attributeName="cy" from="${cyStart.toFixed(1)}" to="${(cyStart - drift).toFixed(1)}"
               dur="${dur}s" begin="${begin}s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0;${maxOp};${maxOp};0" keyTimes="0;0.2;0.8;1"
               dur="${dur}s" begin="${begin}s" repeatCount="indefinite" />
    </circle>`;
  }
  return out;
}

// A handful of "code lines" on the laptop screen, widths breathing at
// slightly different phases to read as a quiet typing/scrolling rhythm.
function codeLines() {
  const widths = [34, 22, 28, 18, 30];
  return widths
    .map((w, i) => {
      const y = 6 + i * 7;
      const dur = (3 + i * 0.6).toFixed(2);
      return `
      <rect x="4" y="${y}" width="${w}" height="2.4" rx="1.2"
            fill="${i % 2 === 0 ? ACCENT : TEXT_DIM}" opacity="${i % 2 === 0 ? 0.85 : 0.5}">
        <animate attributeName="width" values="${w};${Math.max(6, w - 10)};${w}"
                 dur="${dur}s" begin="${(i * 0.4).toFixed(2)}s" repeatCount="indefinite" />
      </rect>`;
    })
    .join('');
}

// Opacity keyframe helper shared by the room group and the text layers —
// everything is timed against the same LOOP so the whole scene resets in sync.
function timedOpacity(id, values, keyTimes, extra = '') {
  return `<animate attributeName="opacity" values="${values}" keyTimes="${keyTimes}"
             dur="${LOOP}s" begin="0s" repeatCount="indefinite" ${extra}/>`;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="heroTitle heroDesc">
  <title id="heroTitle">Syeda Nimra — opening title sequence</title>
  <desc id="heroDesc">A dark, minimal animated scene of a tiny lit desk and laptop, followed by the name Syeda Nimra and the line "this is only the trailer," looping every ${LOOP} seconds.</desc>

  <defs>
    <radialGradient id="roomGlow" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.55" />
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ambient" cx="30%" cy="10%" r="75%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.10" />
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0" />
    </radialGradient>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
    <filter id="tightGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="1.4" />
    </filter>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="35%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- base -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="${BG}" />
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ambient)" />

  <!-- drifting atmosphere -->
  <g>${particles(16)}</g>

  <!-- miniature desk scene, framed like a small vitrine -->
  <g transform="translate(120,150)">
    <ellipse cx="110" cy="150" rx="150" ry="40" fill="url(#roomGlow)" filter="url(#softGlow)">
      ${timedOpacity('glow', '0.5;0.5;1;1;0.6;0.6;0.5', '0;0.14;0.32;0.68;0.82;0.94;1')}
    </ellipse>

    <g opacity="1">
      ${timedOpacity('room', '0;0;1;1;0.55;0.55;0', '0;0.10;0.30;0.72;0.85;0.95;1')}

      <!-- vitrine frame: thin glass-like border around the little world -->
      <rect x="-10" y="-8" width="240" height="176" rx="16" fill="none"
            stroke="${ACCENT}" stroke-opacity="0.28" stroke-width="1" />
      <rect x="-10" y="-8" width="240" height="176" rx="16" fill="url(#glassSheen)" />

      <!-- desk -->
      <polygon points="0,150 220,150 195,168 25,168" fill="#0c0c10" stroke="${ACCENT}" stroke-opacity="0.18" />
      <rect x="0" y="146" width="220" height="4" fill="#0a0a0d" />

      <!-- laptop base -->
      <polygon points="68,146 152,146 146,154 74,154" fill="#111016" stroke="${ACCENT}" stroke-opacity="0.25" />
      <!-- laptop screen -->
      <g transform="translate(72,80)">
        <rect x="0" y="0" width="80" height="66" rx="3" fill="#0b0b0f" stroke="${ACCENT}" stroke-opacity="0.4" />
        <rect x="4" y="4" width="72" height="58" rx="1.5" fill="#0e0710" />
        <g transform="translate(8,10)">${codeLines()}</g>
      </g>

      <!-- creator silhouette, seated at the desk -->
      <g transform="translate(30,96)">
        <path d="M0,50 C0,30 6,14 20,14 C34,14 40,30 40,50 Z" fill="#08080a" stroke="${ACCENT}" stroke-opacity="0.2" />
        <circle cx="20" cy="4" r="10" fill="#08080a" stroke="${ACCENT}" stroke-opacity="0.25" />
        <path d="M0,50 C0,30 6,14 20,14" fill="none" stroke="${ACCENT}" stroke-opacity="0.5" stroke-width="1" />
      </g>

      <!-- tiny floating light source above the desk -->
      <circle cx="110" cy="6" r="2.4" fill="${ACCENT}" filter="url(#tightGlow)">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="3.4s" repeatCount="indefinite" />
      </circle>
    </g>
  </g>

  <!-- title card -->
  <g transform="translate(440,150)">
    <text x="0" y="0" font-family="${FONT_DISPLAY}" font-size="46" fill="${TEXT}" opacity="1">
      SYEDA NIMRA
      ${timedOpacity('name', '0;0;1;1;0.5;0.5;0', '0;0.32;0.40;0.72;0.82;0.94;1')}
      <animate attributeName="transform" additive="sum" type="translate"
               values="0,10;0,10;0,0;0,0" keyTimes="0;0.32;0.42;1"
               dur="${LOOP}s" begin="0s" repeatCount="indefinite" />
    </text>

    <text x="2" y="30" font-family="${FONT_MONO}" font-size="12.5" letter-spacing="1.5" fill="${TEXT_DIM}" opacity="1">
      CREATIVE DEVELOPER · FULL-STACK BUILDER
      ${timedOpacity('role', '0;0;1;1;0.5;0.5;0', '0;0.42;0.52;0.72;0.82;0.94;1')}
    </text>

    <g opacity="1">
      ${timedOpacity('tagline', '0;0;0;1;1;0;0', '0;0.55;0.66;0.78;0.90;0.97;1')}
      <rect x="2" y="52" width="30" height="1" fill="${ACCENT}" />
      <text x="2" y="76" font-family="${FONT_MONO}" font-size="13" letter-spacing="2.5" fill="${ACCENT_SOFT}">THIS IS ONLY THE TRAILER</text>
    </g>
  </g>
</svg>
`;

await writeFile('assets/hero.svg', svg);
console.log('assets/hero.svg written');
