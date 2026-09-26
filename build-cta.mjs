#!/usr/bin/env node
// Builds assets/cta.svg — the closing scene. Static (no animation needed here;
// the movement already happened in the hero) but shares the same visual system.

import { writeFile } from 'node:fs/promises';
import { COLORS, sharedDefs, frame, svgOpen, svgClose, FONT_DISPLAY, FONT_MONO } from './lib/theme.mjs';

const width = 860;
const height = 150;

const svg = `${svgOpen(width, height, 'This is only the trailer — visit the full portfolio')}
${sharedDefs()}
${frame(width, height, 16)}
<g transform="translate(${width / 2},0)" text-anchor="middle">
  <text x="0" y="66" font-family="${FONT_DISPLAY}" font-size="30" fill="${COLORS.text}">THIS IS ONLY THE TRAILER</text>
  <rect x="-24" y="84" width="48" height="1" fill="${COLORS.accent}" />
  <text x="0" y="112" font-family="${FONT_MONO}" font-size="12.5" letter-spacing="1.5" fill="${COLORS.accent}">syedanimra.site.je →</text>
</g>
${svgClose}`;

await writeFile('assets/cta.svg', svg.trim() + '\n');
console.log('assets/cta.svg written');
