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
- For `image`, use a local file: `images/players/username.jpg`
  - Format: JPEG or WebP
  - Size: 400×400px, under 100KB
  - Place the file in `images/players/` before committing
- If you don't have a photo yet, a DiceBear initials avatar works as a placeholder:
  `https://api.dicebear.com/9.x/initials/svg?seed=Full%20Name&backgroundColor=e8470f`

## After any edit

Always run:

```bash
npm run validate
```

Fix any errors before committing.

## Workflow for recording a game or adding a player

When the user asks you to add a game or add a player, always do all of the following automatically without asking:

1. Make the edit to the relevant JSON file
2. Run `npm run validate` — fix any errors before continuing
3. Create a new git branch (e.g. `game/dasmer-beat-alex-apr-7` or `player/add-jamie`)
4. Commit the change with a clear message (e.g. `Add game: dasmer beat alex 11-7 (Apr 7)`)
5. Push the branch
6. Open a PR using `gh pr create` with a short title and a body that says who recorded it and asks the opponent to review
7. If it's a game, request review from the losing player using `gh pr edit --add-reviewer <username>`

Do all of this in one shot. Do not ask for confirmation at each step.
