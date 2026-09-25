<div align="center">

<a href="https://syedanimra.site.je/">
  <img src="assets/hero.svg" alt="Syeda Nimra — creative developer. An animated opening scene: a tiny lit desk in the dark, then the name Syeda Nimra, then the line 'this is only the trailer.'" />
</a>

<br />

<i>Karachi-based creative developer directing interfaces the way a cinematographer directs a scene —<br />
lighting, pacing, and a reason for every pixel to be there.</i>

<br /><br />

<a href="https://syedanimra.site.je/">Portfolio</a> ·
<a href="https://www.linkedin.com/in/syeda-nimra-39a794349/">LinkedIn</a> ·
<a href="https://www.instagram.com/nimr._.exe/">Instagram</a> ·
<a href="https://github.com/syeda-nimra0">GitHub</a>

</div>

<br />

---

### 02 — Live System

<div align="center">
  <img src="assets/live-system.svg" alt="Live panel showing follower count, public repo count, total stars, top language, and yearly contributions, pulled from the GitHub API." />
</div>

<i>Pulled straight from the GitHub REST + GraphQL APIs by a scheduled Action — nothing on this panel is typed in by hand. Refreshed every 12 hours, so treat the numbers as close, not instant.</i>

---

### 03 — Signal / Build Log

<div align="center">
  <img src="assets/contribution-waveform.svg" alt="A custom waveform visualization of weekly GitHub contributions over the last six months, replacing the standard green contribution grid, with a short list of recent public activity." />
</div>

<i>The usual green grid, redrawn as a signal instead of a calendar. Bar height is real weekly contribution volume from the GitHub GraphQL API; the lines underneath are the most recent public activity.</i>

---

### 04 — Selected Work

Three client builds, picked because they cover three different registers — commercial/print, personal portfolio, and a full personal brand site.

<br />

**Printcivic** — Brand identity and commercial print studio site, built around a 200+ project, 50+ client track record across Nigeria. Dark, confident, print-led visual system.
`Brand identity · Commercial print · Netlify`
→ [printcivic.netlify.app](https://printcivic.netlify.app/)

---

**Afsheen** — Portfolio for a frontend developer and UI/UX designer, presenting responsive, elegant interface work across e-commerce, beauty, and restaurant brands.
`Frontend portfolio · UI/UX · Netlify`
→ [afsheen-portfolio.netlify.app](https://afsheen-portfolio.netlify.app/)

---

**Fareed Amir** — Personal brand site for a full-stack/AI developer: video-driven hero, a scroll-paced experience timeline, and a live project showcase.
`Personal brand site · Animated hero · Netlify`
→ [fareed-amir.netlify.app](https://fareed-amir.netlify.app/)

---

### 05 — Current State

<div align="center">
  <img src="assets/current-state.svg" alt="Panel showing what Syeda Nimra is currently building and her current availability for freelance work." />
</div>

<i>Self-reported, not scraped — sourced from <a href="status.json"><code>status.json</code></a> in this repo. Edit that file and push; the panel above repaints itself.</i>

---

### 06 — Final Cut

<div align="center">

<a href="https://syedanimra.site.je/">
  <img src="assets/cta.svg" alt="This is only the trailer. Visit syedanimra.site.je for the full experience." />
</a>

<br /><br />

**[→ watch the full film](https://syedanimra.site.je/)**

</div>

<br />

<div align="center"><sub>README = trailer. Portfolio = full experience.</sub></div>
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
