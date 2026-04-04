# Burntboard — Claude Code Context

This repo is a static office ping pong leaderboard for Burnt.
The site is pure HTML/CSS/JS — no build step, no framework.

## Current user

Whenever you need to know who the current user is, run:

```bash
gh api user
```

This returns their GitHub profile. Use the fields as follows:
- `login` → `username`
- `name` → `name`
- `bio` → `bio` (use as-is, or leave blank if empty — never make one up)
- `avatar_url` → `image` (use as the photo unless a local file exists in `images/players/`). GitHub always provides an avatar, even if the user hasn't uploaded a custom one — the default generated avatars are acceptable. The follow-up message will give them a chance to swap in a real photo.

When the user says "I beat…" or "I lost to…", use `login` as their username.

When the user says "add me as a player", pre-fill `username`, `name`, and `bio` from their GitHub profile automatically and complete the full workflow (branch, commit, PR). Do not ask for confirmation upfront. After the PR is opened, follow up with something like:

> "Added you as a player using your GitHub profile (name: **Your Name**, bio: "Your bio", photo: GitHub avatar). Want to swap in a custom bio or a real photo? Just say the word and I'll update the PR."

If their GitHub bio is empty, mention that no bio was set and offer to add one.

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
- `username`: must match their **GitHub username** exactly (lowercase, no spaces, no `@`)
- All fields required: `username`, `name`, `image`, `bio`
- Optional: `xUrl`, `linkedinUrl`
- For `image`, use a local file: `images/players/username.jpg`
  - Format: JPEG or WebP
  - Size: 400×400px, under 100KB
  - Place the file in `images/players/` before committing
- If you don't have a photo yet, a DiceBear initials avatar works as a placeholder:
  `https://api.dicebear.com/9.x/initials/svg?seed=Full%20Name&backgroundColor=e8470f`

## Handling player photos

When adding a player, check if a photo exists in `images/players/` with the player's username (any extension — .jpg, .jpeg, .png, .heic, .webp). If found:
1. Resize and convert it in place using sips: `sips -z 400 400 SOURCE --out images/players/USERNAME.jpg`
2. This works for JPEG, PNG, HEIC, and WebP — sips handles conversion automatically
3. Set `image` in `players.json` to `images/players/USERNAME.jpg`
4. Include the image file in the commit

If no photo is found, use their GitHub avatar as the fallback: fetch `avatar_url` from `gh api user` and use that as the `image` value.

## After any edit

Always run:

```bash
npm run validate
```

Fix any errors before committing.

## Workflow for recording a game or adding a player

When the user asks you to add a game or add a player, always do all of the following automatically without asking:

1. Switch to main and pull the latest: `git checkout main && git pull`
2. Make the edit to the relevant JSON file
3. Run `npm run validate` — fix any errors before continuing
4. Create a new git branch (e.g. `game/dasmer-beat-alex-apr-7` or `player/add-jamie`)
5. Commit the change with a clear message (e.g. `Add game: dasmer beat alex 11-7 (Apr 7)`)
6. Push the branch
7. Open a PR using `gh pr create` with a short title and a body that says who recorded it and asks the opponent to review
8. If it's a game, request review from the losing player using `gh pr edit --add-reviewer <username>`

Do all of this in one shot. Do not ask for confirmation at each step.
