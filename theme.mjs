// Shared visual language for every generated SVG in this profile.
// Kept dependency-free on purpose — no npm install step needed in CI.

export const COLORS = {
  bg: '#050505',
  bgSoft: '#0a0a0c',
  line: '#1c1c20',
  accent: '#A456B9',
  accentDim: '#5c3468',
  text: '#f2f0f3',
  textDim: '#8a8790',
  textFaint: '#514f56',
};

export const FONT_DISPLAY =
  "'Iowan Old Style', 'Palatino Linotype', Georgia, 'Times New Roman', serif";
export const FONT_MONO =
  "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace";

export function escapeXml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Standard <defs> block: soft accent glow filter + hairline noise texture.
// Every generated SVG uses the same defs so the whole profile reads as one system.
export function sharedDefs() {
  return `
  <defs>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="accentFade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${COLORS.accent}" stop-opacity="0" />
      <stop offset="50%" stop-color="${COLORS.accent}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="ambient" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${COLORS.accent}" stop-opacity="0.16" />
      <stop offset="100%" stop-color="${COLORS.accent}" stop-opacity="0" />
    </radialGradient>
  </defs>`;
}

// Background + frame every panel shares: near-black fill, ambient top glow, hairline border.
// The outer fill rect is intentionally NOT rounded and covers the full canvas edge-to-edge —
// GitHub's markdown stylesheet puts a background-color behind <img> elements, so any
// transparent corner pixels outside a rounded rect would show through as a visible
// light/white triangle in each corner. Sharp full-bleed fill avoids that entirely; the
// rounded look still comes through via the inset border stroke drawn on top of it.
export function frame(width, height, radius = 14) {
  return `
  <rect x="0" y="0" width="${width}" height="${height}" fill="${COLORS.bg}" />
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#ambient)" />
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}"
        fill="none" stroke="${COLORS.accent}" stroke-opacity="0.25" stroke-width="1" />
  <rect x="16" y="16" width="26" height="1" fill="${COLORS.accent}" fill-opacity="0.7" />`;
}

export function footer(width, height, label) {
  return `
  <text x="16" y="${height - 16}" font-family="${FONT_MONO}" font-size="9.5"
        letter-spacing="0.5" fill="${COLORS.textFaint}">${escapeXml(label)}</text>`;
}

export function svgOpen(width, height, title) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="svgTitle">` +
    `<title id="svgTitle">${escapeXml(title)}</title>`;
}

export const svgClose = '</svg>';
