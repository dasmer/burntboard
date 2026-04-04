# Burntboard — Claude Code Context

This repo is a static office ping pong leaderboard for Burnt.
The site is pure HTML/CSS/JS — no build step, no framework.

## Key files

| File | Purpose |
|---|---|
| `players.json` | Player roster |
| `games.json` | All game records |
| `validate.js` | Run with `npm run validate` to check data |
| `index.html` | Homepage |
| `leaderboard.html` | Leaderboard (all-time / month / week) |
| `profile.html` | Player profile (`?username=dasmer`) |
| `game.html` | Game detail page (`?id=g001`) |
| `players.html` | Full player roster grid |

## Adding a game

- Append to the **end** of the array in `games.json`
- Game IDs are sequential: `g001`, `g002`, `g003`… always use the next number after the last entry
- Date format: `YYYY-MM-DD`
- No `winner` field — it is derived from the scores (`score1 > score2` means `player1` won)
- `notes` is optional — only include it if something worth noting happened (an upset, a deuce game, a funny moment). Leave it out for ordinary games.

### Valid scores

- Normal win: `11-0` through `11-9` (winner always has 11)
- Deuce game: always recorded as `12-10`, no exceptions — never `11-10`, `12-9`, etc.

### Example (plain game)

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

### Example (with notes)

```json
{
  "id": "g032",
  "date": "2026-04-08",
  "player1": "sarah",
  "player2": "marcus",
  "score1": 12,
  "score2": 10,
  "notes": "Deuce. Marcus's signature serve failed him at match point."
}
```

## Adding a player

- Append to `players.json`
- `username`: lowercase, no spaces, no `@`
- All fields required: `username`, `name`, `image`, `bio`
- Optional: `xUrl`, `linkedinUrl`
- For `image`, a DiceBear URL works well:
  `https://api.dicebear.com/9.x/initials/svg?seed=Full%20Name&backgroundColor=e8470f`

## After any edit

Always run:

```bash
npm run validate
```

Fix any errors before committing.
