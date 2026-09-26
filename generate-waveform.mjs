#!/usr/bin/env node
// Generates assets/contribution-waveform.svg from real contribution data.
// Falls back to a flat "no signal" line if the GraphQL token isn't available
// or the request fails — it never invents numbers.

import { writeFile } from 'node:fs/promises';
import {
  COLORS, FONT_MONO, sharedDefs, frame, footer, svgOpen, svgClose, escapeXml,
} from './lib/theme.mjs';

const USERNAME = process.env.GH_USERNAME || 'syeda-nimra0';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': `${USERNAME}-profile-readme`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchWeeklyContributions() {
  if (!TOKEN) return null;
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USERNAME } }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  const weeks =
    json?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) return null;
  return weeks.map((w) =>
    w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0)
  );
}

async function fetchRecentActivity() {
  try {
    const res = await fetch(
      `https://api.github.com/users/${USERNAME}/events/public?per_page=6`,
      { headers }
    );
    if (!res.ok) return [];
    const events = await res.json();
    return events
      .map((e) => describeEvent(e))
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [];
  }
}

function describeEvent(e) {
  const repo = e.repo?.name?.split('/')?.[1] || e.repo?.name || 'a repo';
  switch (e.type) {
    case 'PushEvent':
      return `pushed to ${repo}`;
    case 'PullRequestEvent':
      return `${e.payload?.action || 'updated'} a pull request in ${repo}`;
    case 'IssuesEvent':
      return `${e.payload?.action || 'updated'} an issue in ${repo}`;
    case 'CreateEvent':
      return `created ${e.payload?.ref_type || 'a ref'} in ${repo}`;
    case 'WatchEvent':
      return `starred ${repo}`;
    case 'ForkEvent':
      return `forked ${repo}`;
    case 'ReleaseEvent':
      return `published a release in ${repo}`;
    default:
      return null;
  }
}

function buildWaveform(weekTotals, width, midY, spanH) {
  const w = 860;
  const usable = w - 80;
  const n = weekTotals.length;
  const gap = usable / n;
  const max = Math.max(1, ...weekTotals);
  let bars = '';
  weekTotals.forEach((count, i) => {
    const x = 40 + i * gap + gap * 0.25;
    const h = Math.max(1.5, (count / max) * spanH);
    const intensity = 0.25 + 0.75 * (count / max);
    bars += `<rect x="${x.toFixed(1)}" y="${(midY - h / 2).toFixed(1)}" ` +
      `width="${(gap * 0.5).toFixed(1)}" height="${h.toFixed(1)}" rx="1" ` +
      `fill="${COLORS.accent}" fill-opacity="${intensity.toFixed(2)}" />`;
  });
  return bars;
}

async function build() {
  const width = 860;
  const height = 250; // extra room so 3 activity lines never collide with the footer
  const midY = 118;
  const spanH = 72;

  const weekTotals = await fetchWeeklyContributions();
  const activity = await fetchRecentActivity();
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

  let signal;
  let statusLabel;
  if (weekTotals && weekTotals.length) {
    signal = buildWaveform(weekTotals, width, midY, spanH);
    const total = weekTotals.reduce((a, b) => a + b, 0);
    statusLabel =
      `${total} contributions across last ${weekTotals.length} weeks · ` +
      `GitHub GraphQL API · periodically refreshed · ${stamp}`;
  } else {
    // No token available (e.g. local/manual run) — flat line, clearly labeled.
    signal = `<line x1="40" y1="${midY}" x2="${width - 40}" y2="${midY}"
      stroke="${COLORS.accent}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="2 4" />`;
    statusLabel = `No signal — GraphQL token unavailable on this run · ${stamp}`;
  }

  const activityLines = activity.length
    ? activity
        .map(
          (line, i) =>
            `<text x="40" y="${182 + i * 15}" font-family="${FONT_MONO}" font-size="10.5"
                   fill="${COLORS.textDim}">› ${escapeXml(line)}</text>`
        )
        .join('')
    : `<text x="40" y="182" font-family="${FONT_MONO}" font-size="10.5"
             fill="${COLORS.textFaint}">› recent public activity will appear here</text>`;

  const svg = `${svgOpen(width, height, 'Signal — build log waveform')}
  ${sharedDefs()}
  ${frame(width, height)}
  <text x="40" y="46" font-family="${FONT_MONO}" font-size="11" letter-spacing="2"
        fill="${COLORS.accent}">03 — SIGNAL / BUILD LOG</text>
  <rect x="220" y="38" width="${width - 260}" height="1" fill="url(#accentFade)" />
  <line x1="40" y1="${midY}" x2="${width - 40}" y2="${midY}" stroke="${COLORS.line}" stroke-width="1" />
  ${signal}
  ${activityLines}
  ${footer(width, height, statusLabel)}
  ${svgClose}`;

  await writeFile('assets/contribution-waveform.svg', svg.trim() + '\n');
  console.log('assets/contribution-waveform.svg written');
}

build();
