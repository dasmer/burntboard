# Burntboard 🏓

The official Burnt office ping pong leaderboard.

Real scores. Real pride. No mercy. Fully peer-reviewed (by the loser).

**New here?** See [SETUP.md](SETUP.md) to get set up first.

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

## The workflow

Once you're set up, recording a game takes about 30 seconds.

### 1. Open Claude Code in the repo

```
claude
```

### 2. Describe what happened

```
Add a game: I (dasmer) beat alex 11-7 today.
```

```
Add me as a player. Name: Jamie Lee,
bio: "Undefeated. Technically only played once.", username: jamie
```

> **Adding a photo?** Drop your image into the `images/players/` folder and name it `yourname.jpg` (e.g. `jamie.jpg`) before running Claude. Any format is fine — Claude will resize and convert it automatically. No photo is fine too — a placeholder avatar gets generated.

Claude Code handles everything — edits the JSON, validates, creates a branch, commits, pushes, opens a PR, and requests review from the other player.

### 3. The loser approves

The loser gets a review request on GitHub. They confirm the score and approve. CI catches any invalid scores or bad JSON automatically.

### 4. Merge

Either party merges once CI passes.
