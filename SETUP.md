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

## Manual data format (reference)

If you ever need to edit the JSON directly rather than through Claude Code.

### Recording a game (`games.json`)

Add an entry at the end of the array:

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
- No `winner` field — derived from scores automatically
- `notes` — optional, only if something worth noting happened
- Valid scores: `11-0` through `11-9`, or `12-10` for deuce

### Adding a player (`players.json`)

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

- `username` — must match their **GitHub username** exactly (lowercase, no spaces, no `@`)
- `image` — 400×400px JPEG or WebP, under 100KB, placed in `images/players/`
- No photo yet? Claude will use your GitHub avatar automatically.
- `xUrl` and `linkedinUrl` are optional

---

## How scoring works

Games go to 11. If it reaches 10-10, play continues until someone leads by 2 — but always record deuce games as **12-10**. No exceptions.

| Loser scored | Winner scored |
|---|---|
| 0 through 9 | 11 |
| 10 (deuce) | 12 |

`11-10`, `12-9`, anything else — invalid. CI will catch it.

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
Either the URL is broken or the file path is wrong. Check the `image` field in `players.json` — it should be a valid local path or a working URL.

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
