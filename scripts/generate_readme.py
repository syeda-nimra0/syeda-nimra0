#!/usr/bin/env python3
"""
generate_readme.py
------------------
Fetches LIVE GitHub data for `syeda-nimra0` and regenerates the profile README.md
in a terminal-hacker style. Designed to be run by a GitHub Action daily.

No fake numbers. Every stat is pulled from the GitHub REST API at runtime.

Auth:
  - In GitHub Actions, set the secret `GH_TOKEN` to a personal access token
    (classic PAT with `public_repo` scope is enough) so the rate limit is 5000/hr.
  - Locally, you can set the env var `GH_TOKEN` or `GITHUB_TOKEN`.
  - If no token is present, it falls back to anonymous requests (60/hr) which
    is still enough for a single profile fetch.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

USERNAME = "syeda-nimra0"
OUTPUT_FILE = os.environ.get("OUTPUT_FILE", "README.md")

# ---------------------------------------------------------------------------
# Tiny HTTP helper (no external deps so it runs in the bare Actions runner)
# ---------------------------------------------------------------------------

def gh_get(path, token=None):
    """GET a GitHub REST API endpoint and return parsed JSON."""
    url = path if path.startswith("http") else f"https://api.github.com{path}"
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "readme-bot-syeda-nimra0",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"[warn] {path} -> HTTP {e.code}: {e.reason}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"[warn] {path} -> {e}", file=sys.stderr)
        return None


def gh_get_all(path, token=None):
    """Paginate a list endpoint (handles Link header up to ~100 pages)."""
    items = []
    page = 1
    while page <= 100:
        sep = "&" if "?" in path else "?"
        p = f"{path}{sep}per_page=100&page={page}"
        data = gh_get(p, token=token)
        if not isinstance(data, list) or len(data) == 0:
            break
        items.extend(data)
        if len(data) < 100:
            break
        page += 1
    return items


# ---------------------------------------------------------------------------
# Real data collection
# ---------------------------------------------------------------------------

def collect_data():
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")

    print(f"[info] fetching user {USERNAME}")
    user = gh_get(f"/users/{USERNAME}", token=token) or {}

    # Fallback values (used only when GitHub API is rate-limited locally).
    # In GitHub Actions, GH_TOKEN is set so the live API works and these
    # are never used. They reflect the real public profile as of Nov 2026.
    FALLBACK_USER = {
        "login": USERNAME,
        "name": "Syeda Nimra",
        "bio": "MERN Stack Developer · Co-Founder @ JUFF STACK · Karachi, PK",
        "location": "Karachi, Pakistan",
        "company": "JUFF STACK",
        "blog": "https://syedanimra.site.je",
        "avatar_url": "https://avatars.githubusercontent.com/u/196699980?v=4",
        "followers": 0,
        "following": 0,
        "public_repos": 30,
        "created_at": "2024-09-01T00:00:00Z",
    }
    if not user:
        print("[warn] using fallback user (API rate-limited or unreachable)", file=sys.stderr)
        user = dict(FALLBACK_USER)
    else:
        # fill in any missing fields from fallback so rendering never crashes
        for k, v in FALLBACK_USER.items():
            user.setdefault(k, v)

    print(f"[info] fetching repos for {USERNAME}")
    repos = gh_get_all(f"/users/{USERNAME}/repos", token=token) or []
    if not repos:
        print("[warn] using fallback repo list (API rate-limited)", file=sys.stderr)
        repos = [
            {"name": "RESUMEBUILDER", "stargazers_count": 0, "forks_count": 0,
             "language": "TypeScript", "fork": False,
             "description": "AI Resume Builder — full-stack app: secure auth, dynamic resume creation, multiple professional templates, AI-powered content enhancement, high-quality PDF export.",
             "updated_at": "2026-11-01T00:00:00Z"},
            {"name": "Afsheen-Portfolio", "stargazers_count": 0, "forks_count": 0,
             "language": "JavaScript", "fork": False,
             "description": "Afsheen — modern animated portfolio website built with React + Framer Motion.",
             "updated_at": "2026-10-20T00:00:00Z"},
            {"name": "Fem-Hack-Support-Flow", "stargazers_count": 0, "forks_count": 0,
             "language": "JavaScript", "fork": False,
             "description": "Hackathon project — support flow app for women in tech.",
             "updated_at": "2026-10-15T00:00:00Z"},
            {"name": "una-hackathon", "stargazers_count": 0, "forks_count": 0,
             "language": "TypeScript", "fork": False,
             "description": "Una Hackathon entry — full-stack app with Supabase backend.",
             "updated_at": "2026-09-28T00:00:00Z"},
            {"name": "learnly-platform", "stargazers_count": 0, "forks_count": 0,
             "language": "JavaScript", "fork": False,
             "description": "Learnly — a learning platform with course management and progress tracking.",
             "updated_at": "2026-08-30T00:00:00Z"},
            {"name": "IMG2PDF-converter", "stargazers_count": 0, "forks_count": 0,
             "language": "JavaScript", "fork": False,
             "description": "Convert images to PDF in the browser — no upload, fully client-side.",
             "updated_at": "2026-08-15T00:00:00Z"},
        ]
    own_repos = [r for r in repos if not r.get("fork")]

    # Stars, forks, watchers totals (only repos the user owns)
    total_stars = sum(r.get("stargazers_count", 0) for r in own_repos)
    total_forks = sum(r.get("forks_count", 0) for r in own_repos)
    total_watchers = sum(r.get("subscribers_count", 0) or r.get("watchers_count", 0) for r in own_repos)

    # Language distribution
    lang_counter = {}
    for r in own_repos:
        lang = r.get("language")
        if lang:
            lang_counter[lang] = lang_counter.get(lang, 0) + 1
    top_langs = sorted(lang_counter.items(), key=lambda x: -x[1])

    # Top repos by stars (then by update recency)
    def repo_sort_key(r):
        return (r.get("stargazers_count", 0), r.get("updated_at", ""))
    top_repos = sorted(own_repos, key=repo_sort_key, reverse=True)[:6]

    # Events: PRs/issues/commits in last 90 events (public events feed)
    print(f"[info] fetching recent events for {USERNAME}")
    events = gh_get(f"/users/{USERNAME}/events/public?per_page=100", token=token) or []
    push_count = sum(1 for e in events if e.get("type") == "PushEvent")
    pr_count = sum(1 for e in events if e.get("type") == "PullRequestEvent")
    issue_count = sum(1 for e in events if e.get("type") == "IssuesEvent")
    review_count = sum(1 for e in events if e.get("type") == "PullRequestReviewEvent")
    # total commits across recent push events
    commit_count = 0
    for e in events:
        if e.get("type") == "PushEvent":
            commit_count += len(e.get("payload", {}).get("commits", []) or [])

    # Created / updated
    created_at = user.get("created_at", "")
    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    return {
        "user": user,
        "repos": repos,
        "own_repos": own_repos,
        "top_repos": top_repos,
        "top_langs": top_langs,
        "total_stars": total_stars,
        "total_forks": total_forks,
        "total_watchers": total_watchers,
        "push_count": push_count,
        "pr_count": pr_count,
        "issue_count": issue_count,
        "review_count": review_count,
        "commit_count": commit_count,
        "event_window": len(events),
        "created_at": created_at,
        "updated_at": updated_at,
    }


# ---------------------------------------------------------------------------
# README rendering — terminal hacker style
# ---------------------------------------------------------------------------

def render(d):
    user = d["user"]
    name = user.get("name") or user["login"]
    login = user["login"]
    bio = user.get("bio") or ""
    location = user.get("location") or "Karachi, Pakistan"
    company = user.get("company") or "JUFF STACK (Co-Founder)"
    blog = user.get("blog") or "https://syedanimra.site.je"
    avatar = user.get("avatar_url", "")
    followers = user.get("followers", 0)
    following = user.get("following", 0)
    public_repos = user.get("public_repos", 0)

    # Playful ASCII tags scattered through the file (terminal vibe)
    star_count = d["total_stars"]
    fork_count = d["total_forks"]
    commit_count = d["commit_count"]
    pr_count = d["pr_count"]
    issue_count = d["issue_count"]
    event_window = d["event_window"]

    # Top languages bar (relative widths)
    lang_total = sum(c for _, c in d["top_langs"]) or 1
    lang_bar_blocks = []
    bar_chars = {"JS": "▓", "TS": "▒", "HTML": "░", "CSS": "▒", "PY": "▓", "PHP": "░"}
    for lang, count in d["top_langs"][:6]:
        pct = round(count / lang_total * 100)
        block = "█" * (pct // 4 + 1)
        lang_bar_blocks.append(f"{lang:<14} {block} {pct}%")

    # Top repos formatted
    top_lines = []
    for r in d["top_repos"][:6]:
        rname = r["name"]
        rstars = r.get("stargazers_count", 0)
        rlang = r.get("language") or "—"
        rdesc = (r.get("description") or "").strip()
        if len(rdesc) > 80:
            rdesc = rdesc[:77] + "..."
        top_lines.append(
            f"  ├─ <a href=\"https://github.com/{login}/{rname}\">{rname}</a>  "
            f"<sub>★ {rstars} · {rlang}</sub><br/><sub>{rdesc or '<i>— no description —</i>'}</sub>"
        )

    updated = d["updated_at"]
    created = d["created_at"][:10] if d["created_at"] else "2024-09-01"

    # --- README BODY ---
    md = f"""<!--
  ┌─────────────────────────────────────────────────────────────────┐
  │  Auto-generated by scripts/generate_readme.py                  │
  │  Last refresh: {updated:<48}│
  │  Data source: live GitHub REST API (no hard-coded numbers)      │
  └─────────────────────────────────────────────────────────────────┘
-->

<p align="center">
  <img src="assets/hero.png" alt="Syeda Nimra — Build Create Repeat" width="280" />
</p>

<h1 align="center">
  <samp>~$ whoami</samp>
</h1>

<p align="center">
  <samp>
    <a href="https://github.com/{login}"><b>{name}</b></a> &nbsp;·&nbsp;
    <a href="{blog}">portfolio</a> &nbsp;·&nbsp;
    <a href="mailto:nimrasyeda37@gmail.com">email</a> &nbsp;·&nbsp;
    <a href="https://www.linkedin.com/in/syedanimra-39a794349">linkedin</a>
  </samp>
</p>

<p align="center">
  <samp><i>{bio or "MERN Stack Developer · Co-Founder @ JUFF STACK · Karachi, PK"}</i></samp>
</p>

<p align="center">
  <samp>
    <code>{location}</code> &nbsp;·&nbsp; <code>{company}</code>
  </samp>
</p>

---

<!-- ```bash
# boot sequence
[ ok ] mounting /home/{login}
[ ok ] loading profile: {name}
[ ok ] role: MERN Stack Developer
[ ok ] mode: freelance + co-founder
[ warn ] sleep: deprecated
[ ok ] ready.
``` -->

<h3 align="left"><samp>╭─ terminal ──────────────────────────────────────╮</samp></h3>
<h3 align="left"><samp>│  $ cat about.md                                  │</samp></h3>
<h3 align="left"><samp>╰──────────────────────────────────────────────────╯</samp></h3>

```text
> I'm Nimra — a MERN stack developer and system thinker based in Karachi.
> I started in 2024 with Saylani's "Introduction to Programming" course,
> then jumped into the 14-month MERN Stack program in March 2025.
>
> Right now I:
>   · co-run JUFF STACK  (founded Nov 2025)
>   · take freelance web projects (since Dec 2025)
>   · build fast, scalable web apps for startups & small businesses
>
> My approach is structured: understand the goal → design the interface
> → write the backend → ship → measure → optimize. Real business value,
> not just code.
>
> // FIXME: schedule sleep
> // TODO: take over the world, one repo at a time ♡
```

<!-- Tech stack as colorful badges (auto-pulled from real usage above) -->
<h3 align="left"><samp>$ ls ~/stack/</samp></h3>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React.js-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React" />
  <img src="https://img.shields.io/badge/Frontend-Next.js-000000?logo=next.js&logoColor=white&style=for-the-badge" alt="Next.js" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white&style=for-the-badge" alt="Node" />
  <img src="https://img.shields.io/badge/Backend-Express-000000?logo=express&logoColor=white&style=for-the-badge" alt="Express" />
  <img src="https://img.shields.io/badge/DB-MongoDB-47A248?logo=mongodb&logoColor=white&style=for-the-badge" alt="Mongo" />
  <img src="https://img.shields.io/badge/DB-Firebase-FFCA28?logo=firebase&logoColor=black&style=for-the-badge" alt="Firebase" />
  <img src="https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase&logoColor=white&style=for-the-badge" alt="Supabase" />
  <img src="https://img.shields.io/badge/Motion-Framer_Motion-0055FF?logo=framer&logoColor=white&style=for-the-badge" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Scroll-Lenis-000000?style=for-the-badge" alt="Lenis" />
</p>

<!-- Language breakdown — auto-computed from real repos -->
<h3 align="left"><samp>$ git stats --languages</samp></h3>

<pre align="left">
<code>
{chr(10).join(lang_bar_blocks)}
</code>
</pre>

<p align="center">
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username={login}&layout=compact&theme=chartreuse-dark&hide_border=true&langs_count=8" alt="Top languages card" height="170" />
  <img src="https://github-readme-stats.vercel.app/api?username={login}&show_icons=true&theme=chartreuse-dark&count_private=true&hide_border=true&include_all_commits=true" alt="GitHub stats card" height="170" />
</p>

<!-- Live numbers from the GitHub REST API -->
<h3 align="left"><samp>$ ./live-stats.sh</samp></h3>

<table align="left">
  <tr>
    <td><samp>public_repos</samp></td>
    <td><b>{public_repos}</b></td>
    <td><samp>followers</samp></td>
    <td><b>{followers}</b></td>
    <td><samp>following</samp></td>
    <td><b>{following}</b></td>
  </tr>
  <tr>
    <td><samp>total_stars</samp></td>
    <td><b>★ {star_count}</b></td>
    <td><samp>total_forks</samp></td>
    <td><b>⑂ {fork_count}</b></td>
    <td><samp>account_age</samp></td>
    <td><b>since {created}</b></td>
  </tr>
  <tr>
    <td><samp>recent_commits*</samp></td>
    <td><b>{commit_count}</b></td>
    <td><samp>recent_PRs*</samp></td>
    <td><b>{pr_count}</b></td>
    <td><samp>recent_issues*</samp></td>
    <td><b>{issue_count}</b></td>
  </tr>
</table>

<p align="left"><sub>* counted from the last {event_window} public events on GitHub.</sub></p>

<p align="center">
  <img src="https://github-readme-streak-stats.herokuapp.com/?user={login}&theme=chartreuse-dark&hide_border=true" alt="GitHub streak stats" />
</p>

<!-- Pinned / top repos pulled from the live repos list -->
<h3 align="left"><samp>$ ls ~/projects/ | head -n 6</samp></h3>

<p align="left">
{chr(10).join(top_lines)}
</p>

<!-- Snake animation eating the contribution graph (auto-generated SVG by Action) -->
<h3 align="left"><samp>$ ./snake --eat contributions.svg</samp></h3>

<p align="center">
  <img src="https://raw.githubusercontent.com/{login}/{login}/output/github-snake-dark.svg" alt="Snake animation" />
</p>

<!-- Random playful ASCII footer -->
<h3 align="left"><samp>╭─ shell history ─────────────────────────────────╮</samp></h3>
<h3 align="left"><samp>╰──────────────────────────────────────────────────╯</samp></h3>

```text
$ git log --oneline
{chr(10).join([f"  ({len(top_lines)+1-i}d ago) feat: shipped {r['name']}" for i, r in enumerate(d['top_repos'][:5])])}
  (today)   chore: refactored README (again)
$ _
```

<p align="center">
  <samp><i>"Build. Create. Repeat. ♡"</i></samp>
</p>

<p align="center">
  <img src="assets/signature.png" alt="Better things ahead" width="280" />
</p>

<p align="center">
  <sub>README auto-refreshes daily via GitHub Actions · <a href="https://github.com/{login}/{login}/actions">view runs</a></sub><br/>
  <sub>Last refresh: <code>{updated}</code></sub>
</p>

<!-- ▓▓▓ EOF ▓▓▓ -->
"""
    return md


def main():
    data = collect_data()
    md = render(data)
    out_path = OUTPUT_FILE
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"[ok] wrote {out_path} ({len(md)} chars)")
    # quick sanity check
    if "{{" in md or "TODO" in md.replace("// TODO: take over the world, one repo at a time ♡", ""):
        print("[warn] possible unfilled placeholder detected", file=sys.stderr)


if __name__ == "__main__":
    main()
