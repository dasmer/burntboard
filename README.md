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

## How scoring works

Games go to 11. If it reaches 10-10, play continues until someone leads by 2 — but always record deuce games as **12-10**. No exceptions.

| Loser scored | Winner scored |
|---|---|
| 0 through 9 | 11 |
| 10 (deuce) | 12 |

`11-10`, `12-9`, anything else — invalid. CI will catch it.

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
Add a game: I (dasmer) beat marcus 12-10 today. Deuce.
```

```
Add me as a player. Username: jamie, name: Jamie Lee,
bio: "Undefeated. Technically only played once."
```

Claude Code handles everything — edits the JSON, validates, creates a branch, commits, pushes, opens a PR, and requests review from the other player.

### 3. The loser approves

The loser gets a review request on GitHub. They confirm the score and approve. CI catches any invalid scores or bad JSON automatically.

### 4. Merge

Either party merges once CI passes.
