# Burntboard 🏓

The official Burnt office ping pong leaderboard — [burntboard.com](https://burntboard.com)

Real scores. Real pride. No mercy. Fully peer-reviewed (by the loser).

**New here?** See [SETUP.md](SETUP.md) to get set up first.

---

## The workflow

Once you're set up, recording a game takes about 30 seconds.

### 1. Open Claude Code in the repo

Open the Claude Code desktop app, then open the `burntboard` folder as your project.

### 2. Describe what happened

#### Recording a game

```
Add a game: I (dasmer) beat alex 11-7 today.
```

#### Adding yourself as a player

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
