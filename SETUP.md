# Burntboard — Setup & Workflow

Everything you need to go from zero to recording your first game.

---

## Step 1 — Get added as a collaborator

Ask Dasmer to add you as a collaborator on the repo at:
**github.com/dasmer/burntboard → Settings → Collaborators**

You'll get an email invite. Accept it.

---

## Step 2 — Install the tools

You only need to do this once.

### GitHub account

Make sure you have a GitHub account. If not, sign up at [github.com](https://github.com).

### Git

Check if you already have it:

```bash
git --version
```

If not, install it:

```bash
brew install git
```

(If you don't have Homebrew: [brew.sh](https://brew.sh))

### GitHub SSH key

This lets you push to GitHub without typing a password.

```bash
ssh-keygen -t ed25519 -C "you@example.com"
```

Hit enter through all the prompts. Then copy your public key:

```bash
cat ~/.ssh/id_ed25519.pub | pbcopy
```

Go to **github.com → Settings → SSH and GPG keys → New SSH key**, paste it in, and save.

Test it:

```bash
ssh -T git@github.com
```

You should see: `Hi yourname! You've successfully authenticated.`

### GitHub CLI

```bash
brew install gh
gh auth login
```

Follow the prompts — choose GitHub.com, SSH, and authenticate via browser.

### Claude Code

Download and install the desktop app from [claude.ai/download](https://claude.ai/download).

Sign in with your Anthropic account. Once installed, open a terminal, `cd` into the repo, and run:

```bash
claude
```

---

## Step 3 — Clone the repo

```bash
git clone git@github.com:dasmer/burntboard.git
cd burntboard
```

---

## The workflow

Once you're set up, recording a game takes about 30 seconds.

### 1. Open Claude Code in the repo

```bash
claude
```

### 2. Describe what happened

```
Add a game: I (dasmer) beat alex 11-7 today.
```

```
Add a game: sarah beat marcus 12-10 today. Deuce.
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

---

## Running validation locally

```bash
npm run validate
```

Checks both JSON files against every rule. Prints clear errors if anything is wrong.

---

## Troubleshooting

**`npm run validate` fails with "invalid score"**
Deuce games must be `12-10`, not `11-10` or anything else.

**`npm run validate` says a player doesn't exist**
The username in `games.json` must exactly match `players.json` — lowercase, no `@`.

**CI fails on my PR**
Run `npm run validate` locally first. It will show the exact error.

**Avatar image isn't loading**
Either the URL is broken or the file path is wrong. The DiceBear URL is the most reliable fallback.

**I merged the wrong score**
Add a corrected game entry — don't edit old ones. If it's a real mistake (wrong player, completely wrong score), open a PR that edits the specific game and explain in the PR body.

**SSH auth fails when pushing**
Re-run `gh auth login` and make sure you selected SSH. Check your key is added at github.com → Settings → SSH keys.

---

## File structure

```
burntboard/
├── index.html          Homepage with hero + recent matches
├── leaderboard.html    All-time / monthly / weekly leaderboard
├── profile.html        Individual player profile (?username=dasmer)
├── game.html           Game detail page (?id=g001)
├── players.html        Full player roster
├── styles.css          All styles
├── app.js              Shared data + ranking logic
├── players.json        Player roster
├── games.json          All game records
├── validate.js         Local validation script
├── package.json
├── images/
│   ├── burnttable.jpg        Hero photo
│   └── players/              Player profile photos
└── .github/
    └── workflows/
        └── validate.yml      CI on every PR and push
```
