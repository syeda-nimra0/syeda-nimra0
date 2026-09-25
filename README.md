#!/usr/bin/env python3
"""
BUTTERFLY.SYS — live data generator
====================================
Runs hourly via GitHub Actions.
Fetches public GitHub data for @syeda-nimra0 and regenerates:
  - assets/live-status.svg
  - assets/recent-commits.svg
  - assets/contribution-wing.svg

Pure stdlib (urllib, json, datetime). No pip install needed.
Authenticates with the auto-provided GITHUB_TOKEN (Actions) for higher
rate limits (5000/hr instead of 60/hr).

If run locally without a token, falls back to anonymous (60/hr limit).
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from collections import Counter

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

USERNAME = "syeda-nimra0"
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(REPO_ROOT, "assets")

# Palette — must match the rest of the README exactly
COLOR_BG       = "#000000"
COLOR_DARK     = "#0D0612"
COLOR_PANEL    = "#1A0F22"
COLOR_MID      = "#2B1A35"
COLOR_PURPLE   = "#A456B9"
COLOR_LAVENDER = "#ECDBFA"
COLOR_TEXT     = "#F5F0FA"
COLOR_MUTED    = "#9B8AA8"

# Auto-provided in GitHub Actions. Empty when run locally.
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "") or os.environ.get("GH_TOKEN", "")


# ---------------------------------------------------------------------------
# GitHub API helpers
# ---------------------------------------------------------------------------

def api_get(path):
    url = f"https://api.github.com{path}"
    req = urllib.request.Request(url)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "butterfly-sys-live-data")
    if GITHUB_TOKEN:
        req.add_header("Authorization", f"Bearer {GITHUB_TOKEN}")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        if e.code == 403 and "rate limit" in (e.read() or b"").decode("utf-8", "ignore").lower():
            print("WARN: GitHub API rate-limited. SVGs will use last-good state.", file=sys.stderr)
            return None
        raise


def fetch_user():
    return api_get(f"/users/{USERNAME}")


def fetch_events():
    return api_get(f"/users/{USERNAME}/events?per_page=100") or []


def fetch_repos():
    return api_get(f"/users/{USERNAME}/repos?per_page=100&sort=updated") or []


def get_last_push_event(events):
    for ev in events:
        if ev.get("type") == "PushEvent":
            return ev
    return None


def time_ago(iso_ts):
    if not iso_ts:
        return "unknown"
    try:
        dt = datetime.fromisoformat(iso_ts.replace("Z", "+00:00"))
    except ValueError:
        return "unknown"
    now = datetime.now(timezone.utc)
    delta = now - dt
    minutes = int(delta.total_seconds() / 60)
    if minutes < 1:
        return "just now"
    if minutes < 60:
        return f"{minutes}m ago"
    hours = int(minutes / 60)
    if hours < 24:
        return f"{hours}h ago"
    days = int(hours / 24)
    if days < 30:
        return f"{days}d ago"
    months = int(days / 30)
    return f"{months}mo ago"


def is_live(last_push_iso, max_hours=24):
    if not last_push_iso:
        return False
    try:
        dt = datetime.fromisoformat(last_push_iso.replace("Z", "+00:00"))
    except ValueError:
        return False
    delta = datetime.now(timezone.utc) - dt
    return delta.total_seconds() < max_hours * 3600


# ---------------------------------------------------------------------------
# SVG helpers
# ---------------------------------------------------------------------------

def svg_header(width, height, title, desc):
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {width} {height}" width="100%" role="img" '
        f'aria-label="{title}">\n'
        f'  <title>{title}</title>\n'
        f'  <desc>{desc}</desc>\n'
    )


def svg_footer():
    return "</svg>\n"


def esc(s):
    """Escape XML special chars."""
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------

def generate_live_status_svg(user, last_push_iso, is_live_status):
    followers = user.get("followers", 0)
    public_repos = user.get("public_repos", 0)
    following = user.get("following", 0)
    starred_url = f"https://api.github.com/users/{USERNAME}/starred"
    last_commit_str = time_ago(last_push_iso) if last_push_iso else "unknown"

    dot_color = COLOR_PURPLE if is_live_status else COLOR_MUTED
    status_text = "LIVE" if is_live_status else "IDLE"

    svg = svg_header(800, 80, "Live Status", f"GitHub live signal for @{USERNAME}")
    svg += f'  <rect width="800" height="80" fill="{COLOR_PANEL}" rx="8"/>\n'
    svg += f'  <rect x="0" y="0" width="800" height="2" fill="{COLOR_PURPLE}" opacity="0.6"/>\n'
    svg += f'  <g transform="translate(30, 40)">\n'
    svg += f'    <circle cx="0" cy="0" r="6" fill="{dot_color}">\n'
    svg += f'      <animate attributeName="opacity" values="1;0.35;1" dur="2.4s" repeatCount="indefinite"/>\n'
    svg += f'    </circle>\n'
    svg += f'    <text x="20" y="6" font-family="\'JetBrains Mono\',\'Courier New\',monospace" font-size="14" fill="{COLOR_LAVENDER}" font-weight="600" letter-spacing="2">{status_text}</text>\n'
    svg += f'  </g>\n'
    svg += f'  <g transform="translate(140, 40)" font-family="\'JetBrains Mono\',\'Courier New\',monospace" font-size="13" fill="{COLOR_TEXT}">\n'
    svg += f'    <text x="0" y="6">repos</text>\n'
    svg += f'    <text x="40" y="6" fill="{COLOR_LAVENDER}" font-weight="600">{public_repos}</text>\n'
    svg += f'    <text x="100" y="6" fill="{COLOR_MUTED}">·</text>\n'
    svg += f'    <text x="120" y="6">followers</text>\n'
    svg += f'    <text x="190" y="6" fill="{COLOR_LAVENDER}" font-weight="600">{followers}</text>\n'
    svg += f'    <text x="240" y="6" fill="{COLOR_MUTED}">·</text>\n'
    svg += f'    <text x="260" y="6">following</text>\n'
    svg += f'    <text x="325" y="6" fill="{COLOR_LAVENDER}" font-weight="600">{following}</text>\n'
    svg += f'    <text x="370" y="6" fill="{COLOR_MUTED}">·</text>\n'
    svg += f'    <text x="390" y="6">last commit</text>\n'
    svg += f'    <text x="475" y="6" fill="{COLOR_LAVENDER}" font-weight="600">{esc(last_commit_str)}</text>\n'
    svg += f'  </g>\n'
    svg += f'  <text x="780" y="46" text-anchor="end" font-family="\'JetBrains Mono\',monospace" font-size="10" fill="{COLOR_MUTED}" letter-spacing="1">REFRESHED {datetime.now(timezone.utc).strftime("%H:%M UTC")}</text>\n'
    svg += svg_footer()
    return svg


def generate_recent_commits_svg(events):
    push_events = [e for e in events if e.get("type") == "PushEvent"][:5]

    svg = svg_header(800, 220, "Recent Transmissions", f"Recent commits by @{USERNAME}")
    svg += f'  <rect width="800" height="220" fill="{COLOR_PANEL}" rx="8"/>\n'
    svg += f'  <rect x="0" y="0" width="800" height="2" fill="{COLOR_PURPLE}" opacity="0.4"/>\n'
    svg += f'  <text x="30" y="34" font-family="\'Bebas Neue\',\'Arial Narrow\',sans-serif" font-size="18" fill="{COLOR_LAVENDER}" letter-spacing="3">RECENT TRANSMISSIONS</text>\n'
    svg += f'  <text x="770" y="34" text-anchor="end" font-family="\'JetBrains Mono\',monospace" font-size="10" fill="{COLOR_MUTED}">live</text>\n'

    if not push_events:
        svg += f'  <text x="30" y="80" font-family="\'Montserrat\',sans-serif" font-size="13" fill="{COLOR_MUTED}">no recent activity — the studio is quiet.</text>\n'
    else:
        y = 70
        for ev in push_events:
            repo_name = ev.get("repo", {}).get("name", "unknown")
            repo_short = repo_name.split("/")[-1] if "/" in repo_name else repo_name
            created = ev.get("created_at", "")
            time_str = time_ago(created)

            commits = ev.get("payload", {}).get("commits", [])
            if commits:
                msg = commits[0].get("message", "").split("\n")[0]
                if len(msg) > 70:
                    msg = msg[:67] + "..."
            else:
                msg = "(no message)"

            svg += f'  <g transform="translate(30, {y})">\n'
            svg += f'    <text x="0" y="0" font-family="\'JetBrains Mono\',monospace" font-size="11" fill="{COLOR_PURPLE}">▚</text>\n'
            svg += f'    <text x="20" y="0" font-family="\'JetBrains Mono\',monospace" font-size="13" fill="{COLOR_TEXT}" font-weight="600">{esc(repo_short)}</text>\n'
            svg += f'    <text x="20" y="18" font-family="\'Montserrat\',sans-serif" font-size="12" fill="{COLOR_MUTED}">{esc(msg)}</text>\n'
            svg += f'    <text x="745" y="0" text-anchor="end" font-family="\'JetBrains Mono\',monospace" font-size="11" fill="{COLOR_MUTED}">{esc(time_str)}</text>\n'
            svg += f'  </g>\n'
            y += 32

    svg += svg_footer()
    return svg


def generate_contribution_wing_svg(events):
    """
    Render recent ~30 days of push activity as a butterfly wing.
    Each day becomes a 'spot' on the wing. More commits = larger, brighter spot.
    Two mirrored wings around a central body.
    """
    daily_counts = Counter()
    for ev in events:
        if ev.get("type") == "PushEvent":
            day = ev.get("created_at", "")[:10]
            if day:
                daily_counts[day] += 1

    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)) for i in range(29, -1, -1)]
    counts = [daily_counts.get(d.isoformat(), 0) for d in days]
    max_count = max(counts) if counts else 1
    if max_count == 0:
        max_count = 1

    svg = svg_header(800, 240, "Recent Wingbeats", f"Recent 30 days of GitHub activity rendered as a butterfly wing for @{USERNAME}")
    svg += f'  <rect width="800" height="240" fill="{COLOR_PANEL}" rx="8"/>\n'
    svg += f'  <rect x="0" y="0" width="800" height="2" fill="{COLOR_PURPLE}" opacity="0.4"/>\n'
    svg += f'  <text x="400" y="36" text-anchor="middle" font-family="\'Bebas Neue\',\'Arial Narrow\',sans-serif" font-size="18" fill="{COLOR_LAVENDER}" letter-spacing="3">RECENT WINGBEATS</text>\n'
    svg += f'  <text x="400" y="56" text-anchor="middle" font-family="\'Montserrat\',sans-serif" font-size="11" fill="{COLOR_MUTED}">30 days · {sum(counts)} wing-flaps · generated from real GitHub events</text>\n'

    # Wing geometry
    cx, cy = 400, 145
    body_top_y = cy - 35
    body_bottom_y = cy + 35

    # Body
    svg += f'  <ellipse cx="{cx}" cy="{cy}" rx="4" ry="38" fill="{COLOR_DARK}"/>\n'
    # Head
    svg += f'  <circle cx="{cx}" cy="{body_top_y - 6}" r="5" fill="{COLOR_DARK}"/>\n'
    # Antennae
    svg += f'  <path d="M {cx} {body_top_y - 10} Q {cx - 8} {body_top_y - 18} {cx - 12} {body_top_y - 22}" stroke="{COLOR_DARK}" stroke-width="1.2" fill="none"/>\n'
    svg += f'  <path d="M {cx} {body_top_y - 10} Q {cx + 8} {body_top_y - 18} {cx + 12} {body_top_y - 22}" stroke="{COLOR_DARK}" stroke-width="1.2" fill="none"/>\n'
    svg += f'  <circle cx="{cx - 12}" cy="{body_top_y - 22}" r="1.5" fill="{COLOR_PURPLE}"/>\n'
    svg += f'  <circle cx="{cx + 12}" cy="{body_top_y - 22}" r="1.5" fill="{COLOR_PURPLE}"/>\n'

    # Left wing — 15 spots fanning out
    left_counts = counts[:15]
    for i, count in enumerate(left_counts):
        # Wing spot positions: curve outward from body
        angle = 90 + (i * 6)  # 90 to 180 degrees (left side)
        rad = angle * 3.14159 / 180
        radius = 35 + (i * 4.5)
        x = cx - radius * 0.9
        y = cy + (i - 7) * 5
        if count == 0:
            r = 2.5
            opacity = 0.08
            fill = COLOR_MID
        else:
            r = 3 + min(count, 6) * 1.2
            opacity = 0.35 + (count / max_count) * 0.65
            fill = COLOR_PURPLE
        svg += f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" opacity="{opacity:.2f}"/>\n'

    # Right wing — mirror
    right_counts = counts[15:30]
    for i, count in enumerate(right_counts):
        angle = 90 - (i * 6)
        radius = 35 + (i * 4.5)
        x = cx + radius * 0.9
        y = cy + (i - 7) * 5
        if count == 0:
            r = 2.5
            opacity = 0.08
            fill = COLOR_MID
        else:
            r = 3 + min(count, 6) * 1.2
            opacity = 0.35 + (count / max_count) * 0.65
            fill = COLOR_PURPLE
        svg += f'  <circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" opacity="{opacity:.2f}"/>\n'

    # Subtle wing-flap pulse on the whole wing group
    # (kept subtle — the data already provides visual rhythm)

    # Footer note
    svg += f'  <text x="400" y="220" text-anchor="middle" font-family="\'Montserrat\',sans-serif" font-size="10" fill="{COLOR_MUTED}" font-style="italic">each spot is a day. brightness = commits that day.</text>\n'
    svg += svg_footer()
    return svg


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    os.makedirs(ASSETS_DIR, exist_ok=True)

    print(f"BUTTERFLY.SYS — generating live data for @{USERNAME}")
    print(f"  assets dir: {ASSETS_DIR}")
    print(f"  token:      {'yes (authenticated, 5000/hr)' if GITHUB_TOKEN else 'no (anonymous, 60/hr)'}")

    user = fetch_user()
    if not user:
        print("ERROR: could not fetch user data — aborting (existing SVGs left intact).", file=sys.stderr)
        sys.exit(1)

    events = fetch_events()
    if not events:
        print("WARN: no events returned (possibly rate-limited or account dormant).")

    last_push = get_last_push_event(events)
    last_push_iso = last_push.get("created_at") if last_push else None
    live = is_live(last_push_iso)

    print(f"  followers:  {user.get('followers', '?')}")
    print(f"  repos:      {user.get('public_repos', '?')}")
    print(f"  last push:  {time_ago(last_push_iso)}")
    print(f"  status:     {'LIVE' if live else 'IDLE'}")

    svgs = {
        "live-status.svg": generate_live_status_svg(user, last_push_iso, live),
        "recent-commits.svg": generate_recent_commits_svg(events),
        "contribution-wing.svg": generate_contribution_wing_svg(events),
    }

    for name, content in svgs.items():
        path = os.path.join(ASSETS_DIR, name)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  ✓ wrote {name} ({len(content)} bytes)")

    print("done.")


if __name__ == "__main__":
    main()
