# Burntboard 🏓

The official Burnt office ping pong leaderboard.

Real scores. Real pride. No mercy. Fully peer-reviewed (by the loser).

---

## What is this?

Burntboard is a static website that tracks office table tennis results. Every game gets recorded in a JSON file, the leaderboard updates automatically, and the loser has to approve the PR. It lives at the repo root and deploys to GitHub Pages.

There are three leaderboard views:
- **All-time** — everyone's career record
- **This month** — current calendar month
- **This week** — Sunday through Saturday

And two ranking modes:
- **By wins** — most wins first (default)
- **By score** — most total points scored first

---

## How scoring works

Table tennis games go to 11.

The final score you record is the **actual score** — e.g. if you win 11-7, you record `11` and `7`.

**Deuce rule:** If a game reaches 10-10 in real life, it keeps going until someone leads by 2. On Burntboard, all deuce games are recorded as **12-10** — no exceptions. This prevents anyone from farming extra points by dragging out a deuce game.

### Valid final scores

| Loser scored | Winner scored |
|---|---|
| 0 through 9 | 11 |
| 10 (deuce)  | 12 |

That's it. `11-10`, `12-9`, `15-13` — all invalid. CI will catch them.

---

## How to add yourself as a player

Open `players.json` and add an entry like this:

```json
{
  "username": "yourname",
  "name": "Your Name",
  "image": "https://api.dicebear.com/9.x/initials/svg?seed=Your%20Name&backgroundColor=e8470f",
  "bio": "One sentence about your playing style or complete lack thereof.",
  "xUrl": "https://x.com/yourhandle",
  "linkedinUrl": "https://linkedin.com/in/yourprofile"
}
```

- `username` — lowercase, no spaces, no `@`
- `image` — path to your photo: `images/players/yourname.jpg`
  - **Format:** JPEG or WebP
  - **Dimensions:** 400×400px (square)
  - **File size:** under 100KB
  - Drop the file in the `images/players/` folder before committing
  - No photo yet? Use a DiceBear placeholder and swap it later:
    `https://api.dicebear.com/9.x/initials/svg?seed=Your%20Name&backgroundColor=e8470f`
- `xUrl` and `linkedinUrl` are optional — leave them out entirely if you don't want them.

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

Rules:
- `id` must be unique (just increment from the last one)
- `date` must be `YYYY-MM-DD`
- No `winner` field — the winner is derived from the scores automatically
- Score must be valid (see above) — CI will reject anything else
- `notes` is optional — only add it if something worth noting happened

---

## Running validation locally

```bash
npm run validate
```

This checks both JSON files for every rule. Output is human-readable. If anything is wrong, it tells you exactly what to fix.

---

## The full workflow

The ritual: **winner records the game, loser approves the PR.**

Here's how to do it with Claude Code and `gh`:

### 1. Create a branch

```bash
git checkout -b game/dasmer-beat-alex-apr-7
```

Name it something like `game/winner-beat-loser-date` or `player/add-yourname`.

### 2. Use Claude Code to make the edit

Open Claude Code in the repo:

```bash
claude
```

Then tell it what happened:

```
Add a new game to games.json: I (dasmer) beat alex 11-7 today, April 7 2026.
No deuce. Use the next available game ID.
```

Or to add yourself:

```
Add me as a new player in players.json. My username is "yourname",
my name is "Your Name", and my bio is "...".
Use a DiceBear initials avatar with a blue background (2563eb).
```

Claude Code will make the edit and you can review the diff.

### 3. Validate

```bash
npm run validate
```

Fix anything it flags before committing.

### 4. Commit

```bash
git add games.json
git commit -m "Add game: dasmer beat alex 11-7 (Apr 7)"
```

For adding a player:

```bash
git add players.json
git commit -m "Add player: yourname"
```

### 5. Push

```bash
git push -u origin game/dasmer-beat-alex-apr-7
```

### 6. Open a PR with GitHub CLI

```bash
gh pr create \
  --title "Game: dasmer beat alex 11-7 (Apr 7)" \
  --body "Recorded by the winner. Loser please review and approve."
```

### 7. Request review from the loser

```bash
gh pr edit --add-reviewer alex
```

### 8. The loser approves

The loser opens the PR, confirms the score is correct, and approves. (Dispute the score before approving, not after.)

### 9. Merge

Either party merges once approved.

```bash
gh pr merge --squash
```

---

## Example Claude Code prompts

```
Add a new game: I (priya) beat marcus 12-10 today (deuce game). Date is 2026-04-08.
Use the next available ID after the last game in games.json.
```

```
Add me as a player. Username: sarah, name: Sarah Okafor,
bio: "Joined two months ago. Already top 3."
Use a purple DiceBear avatar (7c3aed).
```

```
Show me the last 5 games in games.json as a quick summary.
```

---

## Example branch names

```
game/sarah-beat-tom-apr-8
game/marcus-beat-alex-deuce-apr-9
player/add-jamie
```

---

## Deploying on GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Set source to **Deploy from a branch**
3. Choose **main** branch, **/ (root)** folder
4. Save — GitHub will deploy automatically on every push to `main`

The site is fully static. No build step required.

---

## Troubleshooting

**`npm run validate` fails with "invalid score"**
Double-check the score. Deuce games must be `12-10`, not `11-10` or anything else.

**`npm run validate` says a player doesn't exist**
The username in `games.json` must exactly match the `username` field in `players.json` — lowercase, no `@`.

**CI fails on my PR**
Run `npm run validate` locally first. It will show you the exact error with the game/player name.

**Avatar image isn't loading**
Either the URL is broken or the relative path is wrong. The DiceBear URL approach is the most reliable. You can test the URL directly in your browser.

**I merged the wrong score**
Add a new game entry as a correction — don't edit old games. If it was a real mistake (wrong player, completely wrong score), open a PR that edits the specific game and explain in the PR body.

---

## File structure

```
burntboard/
├── index.html          Homepage with hero + recent matches
├── leaderboard.html    All-time / monthly / weekly leaderboard
├── profile.html        Individual player profile (?username=dasmer)
├── styles.css          All styles
├── app.js              Shared data + ranking logic
├── players.json        Player roster
├── games.json          All game records
├── validate.js         Local validation script
├── package.json
├── images/
│   └── burnttable.jpg  Hero photo
└── .github/
    └── workflows/
        └── validate.yml  CI validation on every PR and push
```
