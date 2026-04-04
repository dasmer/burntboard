# Burntboard 🏓

The official Burnt office ping pong leaderboard — [burntboard.com](https://burntboard.com)

Real scores. Real pride. No mercy. Fully peer-reviewed (by the loser).

**New here?** See [SETUP.md](SETUP.md) to get set up first.

---

## The workflow

Once you're set up, adding a game takes about 30 seconds.

### 1. Open Claude Code in the repo

Open the Claude Code desktop app, then open the `burntboard` folder as your project.

### 2. Make an update

Every update requires creating a branch, editing the JSON, opening a PR, and requesting review — but don't worry, Claude Code handles all of that for you, including pulling your username, name, and bio from your GitHub profile automatically.

#### Add a game

Type this into Claude Code:

```
I beat alex 11-7
```

#### Add a player

Type this into Claude Code:

```
Add me as a player.
```

> **Want a custom bio?** Just include it: `Add me as a player. Bio: "Serves like a demon, loses like a gentleman."`

> **Want a real photo?** Drop it into `images/players/` named `yourusername.jpg` (e.g. `jamielee.jpg`) before running Claude. Any format works — Claude resizes and converts it automatically.

### 3. The loser approves

The loser gets a review request on GitHub. They confirm the score and approve. CI catches any invalid scores or bad JSON automatically.

### 4. Merge

Either party merges once CI passes.
