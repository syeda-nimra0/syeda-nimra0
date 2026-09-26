#!/usr/bin/env node
// Generates assets/current-state.svg from status.json.
// Run by .github/workflows/status-update.yml whenever status.json changes.

import { readFile, writeFile } from 'node:fs/promises';
import {
  COLORS, FONT_DISPLAY, FONT_MONO,
  sharedDefs, frame, footer, svgOpen, svgClose, escapeXml,
} from './lib/theme.mjs';

function wrap(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > maxChars) {
      lines.push(cur.trim());
      cur = word;
    } else {
      cur = (cur + ' ' + word).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function build() {
  const raw = await readFile('status.json', 'utf-8');
  const status = JSON.parse(raw);

  const width = 860;
  const buildingLines = wrap(status.currentlyBuilding || '', 78);
  const buildingStartY = 94;
  const lineHeight = 22;
  const buildingEndY = buildingStartY + (buildingLines.length - 1) * lineHeight;
  const availY = buildingEndY + 46; // "AVAILABILITY" label baseline
  const availTextY = availY + 24; // availability sentence baseline
  const height = availTextY + 46; // bottom padding + footer row

  const buildingBlock = buildingLines
    .map(
      (line, i) =>
        `<text x="40" y="${buildingStartY + i * lineHeight}" font-family="${FONT_DISPLAY}" font-size="15.5"
               fill="${COLORS.text}">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `${svgOpen(width, height, 'Current state — self-reported status')}
  ${sharedDefs()}
  ${frame(width, height)}
  <text x="40" y="46" font-family="${FONT_MONO}" font-size="11" letter-spacing="2"
        fill="${COLORS.accent}">05 — CURRENT STATE</text>
  <rect x="220" y="38" width="${width - 260}" height="1" fill="url(#accentFade)" />

  <text x="40" y="70" font-family="${FONT_MONO}" font-size="9.5" letter-spacing="1.2"
        fill="${COLORS.textDim}">CURRENTLY BUILDING</text>
  ${buildingBlock}

  <text x="40" y="${availY}" font-family="${FONT_MONO}" font-size="9.5" letter-spacing="1.2"
        fill="${COLORS.textDim}">AVAILABILITY</text>
  <circle cx="46" cy="${availTextY - 4}" r="4" fill="${COLORS.accent}" filter="url(#glow)" />
  <text x="60" y="${availTextY}" font-family="${FONT_DISPLAY}" font-size="15.5"
        fill="${COLORS.text}">${escapeXml(status.availability || '')}</text>

  ${footer(width, height, `status.json · self-reported · last edited ${escapeXml(status.lastUpdated || '')}`)}
  ${svgClose}`;

  await writeFile('assets/current-state.svg', svg.trim() + '\n');
  console.log('assets/current-state.svg written');
}

build();
