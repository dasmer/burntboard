# Burntboard 🏓

The official Burnt office ping pong leaderboard.

Real scores. Real pride. No mercy. Fully peer-reviewed (by the loser).

**New here?** See [SETUP.md](SETUP.md) to get set up.

---

## What is this?

Burntboard tracks office table tennis results. Every game gets recorded in a JSON file, the leaderboard updates automatically, and the loser approves the PR.

Three leaderboard views:
- **All-time** — everyone's career record
- **This month** — current calendar month
- **This week** — Sunday through Saturday

Two ranking modes:
- **By wins** — most wins first (default)
- **By score** — most total points scored first

---

## How to record a game

Open `games.json` and add an entry at the end of the array:

```json
{
  "id": "g031",
  "date": "2026-04-07",
  "player1": "dasmer",
  "player2": "alex",
  "score1": 11,
  "score2": 7
}
```

- `id` — increment from the last one
- `date` — `YYYY-MM-DD`
- No `winner` field — derived from the scores automatically
- `notes` — optional, only if something worth noting happened

---

## How to add yourself as a player

Open `players.json` and add an entry:

```json
{
  "username": "yourname",
  "name": "Your Name",
  "image": "images/players/yourname.jpg",
  "bio": "One sentence about your playing style or lack thereof.",
  "xUrl": "https://x.com/yourhandle",
  "linkedinUrl": "https://linkedin.com/in/yourprofile"
}
```

- `username` — lowercase, no spaces, no `@`
- `image` — 400×400px JPEG or WebP, under 100KB, in `images/players/`
- No photo yet? Use a DiceBear placeholder:
  `https://api.dicebear.com/9.x/initials/svg?seed=Your%20Name&backgroundColor=e8470f`
- `xUrl` and `linkedinUrl` are optional

---

## How scoring works

Games go to 11. If it reaches 10-10, play continues until someone leads by 2 — but always record deuce games as **12-10**. No exceptions.

| Loser scored | Winner scored |
|---|---|
| 0 through 9 | 11 |
| 10 (deuce) | 12 |

`11-10`, `12-9`, anything else — invalid. CI will catch it.
