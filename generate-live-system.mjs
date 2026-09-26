#!/usr/bin/env node
// Generates assets/live-system.svg from live GitHub data.
// Run by .github/workflows/update-stats.yml on a schedule + manual dispatch.
// Zero npm dependencies — uses Node's built-in fetch (Node 18+).

import { writeFile } from 'node:fs/promises';
import {
  COLORS, FONT_DISPLAY, FONT_MONO,
  sharedDefs, frame, footer, svgOpen, svgClose, escapeXml,
} from './lib/theme.mjs';

const USERNAME = process.env.GH_USERNAME || 'syeda-nimra0';
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': `${USERNAME}-profile-readme`,
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function fetchAllRepos() {
  let page = 1;
  const all = [];
  // Hard-capped at 5 pages (500 repos) so a huge account can't loop forever.
  while (page <= 5) {
    const batch = await fetchJson(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&type=owner`
    );
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

async function fetchTotalContributions() {
  if (!TOKEN) return null; // GraphQL requires an authenticated token
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar { totalContributions }
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
  return json?.data?.user?.contributionsCollection?.contributionCalendar
    ?.totalContributions ?? null;
}

function topLanguage(repos) {
  const counts = {};
  for (const r of repos) {
    if (!r.language || r.fork) continue;
    counts[r.language] = (counts[r.language] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : '—';
}

function row(x, y, label, value, opts = {}) {
  const { big = false } = opts;
  return `
  <text x="${x}" y="${y}" font-family="${FONT_MONO}" font-size="9.5"
        letter-spacing="1.2" fill="${COLORS.textDim}">${escapeXml(label.toUpperCase())}</text>
  <text x="${x}" y="${y + (big ? 34 : 26)}" font-family="${FONT_DISPLAY}"
        font-size="${big ? 30 : 22}" fill="${COLORS.text}">${escapeXml(value)}</text>`;
}

async function build() {
  const width = 860;
  const height = 220;
  let user, repos, totalContributions, dataOk = true;

  try {
    user = await fetchJson(`https://api.github.com/users/${USERNAME}`);
    repos = await fetchAllRepos();
    totalContributions = await fetchTotalContributions();
  } catch (err) {
    console.error('live-system: falling back to placeholder —', err.message);
    dataOk = false;
  }

  const followers = dataOk ? user.followers : '—';
  const publicRepos = dataOk ? user.public_repos : '—';
  const totalStars = dataOk
    ? repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0)
    : '—';
  const lang = dataOk ? topLanguage(repos) : '—';
  const contributions =
    dataOk && totalContributions !== null ? totalContributions : 'n/a';

  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const statusLabel = dataOk
    ? `Source: GitHub REST + GraphQL API · Updated automatically · ${stamp}`
    : `Live fetch failed on last run · showing last known state · ${stamp}`;

  const colW = width / 5;
  const cols = [
    ['Followers', String(followers)],
    ['Public Repos', String(publicRepos)],
    ['Total Stars', String(totalStars)],
    ['Top Language', lang],
    ['Contributions · 1y', String(contributions)],
  ];

  const rows = cols
    .map((c, i) => row(40 + i * colW, 96, c[0], c[1]))
    .join('');

  const dividers = cols
    .slice(1)
    .map(
      (_, i) =>
        `<line x1="${(i + 1) * colW + 8}" y1="60" x2="${(i + 1) * colW + 8}" y2="150"
               stroke="${COLORS.line}" stroke-width="1" />`
    )
    .join('');

  const svg = `${svgOpen(width, height, 'Live system — real-time GitHub signal')}
  ${sharedDefs()}
  ${frame(width, height)}
  <text x="40" y="46" font-family="${FONT_MONO}" font-size="11" letter-spacing="2"
        fill="${COLORS.accent}">02 — LIVE SYSTEM</text>
  <rect x="120" y="38" width="${width - 160}" height="1" fill="url(#accentFade)" />
  ${dividers}
  ${rows}
  ${footer(width, height, statusLabel)}
  ${svgClose}`;

  await writeFile('assets/live-system.svg', svg.trim() + '\n');
  console.log('assets/live-system.svg written', dataOk ? '(live data)' : '(placeholder)');
}

build();
