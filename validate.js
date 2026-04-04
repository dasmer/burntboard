#!/usr/bin/env node
/**
 * Burntboard Data Validator
 * Run: npm run validate
 *
 * Checks players.json and games.json for correctness.
 * Prints human-readable errors — safe for non-technical coworkers.
 */

const fs = require('fs');
const path = require('path');

// Terminal color helpers
const RED    = '\x1b[31m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

let errorCount = 0;

function fail(msg) {
  console.error(`  ${RED}✗${RESET} ${msg}`);
  errorCount++;
}

function ok(msg) {
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function header(msg) {
  console.log(`\n${BOLD}${CYAN}${msg}${RESET}`);
}

// ---------------------------------------------------------------------------
// File loading
// ---------------------------------------------------------------------------

function loadJSON(filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    fail(`File not found: ${filename}`);
    return null;
  }

  let raw;
  try {
    raw = fs.readFileSync(filepath, 'utf-8');
  } catch (e) {
    fail(`Could not read ${filename}: ${e.message}`);
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    fail(`${filename} contains invalid JSON: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Score validation
// ---------------------------------------------------------------------------
// Valid final scores are:
//   • 11-0 through 11-9  (winner scored 11, loser scored 0–9)
//   • 12-10              (deuce game, always normalised to 12-10)
// Everything else is invalid.

function isValidScorePair(score1, score2) {
  if (!Number.isInteger(score1) || !Number.isInteger(score2)) return false;
  if (score1 < 0 || score2 < 0) return false;
  if (score1 === score2) return false;

  const high = Math.max(score1, score2);
  const low  = Math.min(score1, score2);

  if (high === 11 && low >= 0 && low <= 9) return true;
  if (high === 12 && low === 10)            return true;

  return false;
}

// ---------------------------------------------------------------------------
// Date validation
// ---------------------------------------------------------------------------

function isValidISODate(str) {
  if (typeof str !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;

  // Re-serialise to catch impossible dates like 2026-02-30
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

// ---------------------------------------------------------------------------
// Main validation
// ---------------------------------------------------------------------------

console.log(`\n${BOLD}🏓  Burntboard — Data Validation${RESET}`);
console.log(`${DIM}------------------------------------${RESET}`);

const players = loadJSON('players.json');
const games   = loadJSON('games.json');

if (!players || !games) {
  console.log(`\n${RED}${BOLD}Fix the JSON syntax errors above, then run again.${RESET}\n`);
  process.exit(1);
}

// ── players.json ────────────────────────────────────────────────────────────

header('Checking players.json…');

if (!Array.isArray(players)) {
  fail('players.json must be a JSON array (starts with "[" and ends with "]")');
} else {
  const seenUsernames = new Set();

  for (const [i, p] of players.entries()) {
    const label = `Player ${i + 1}${p.username ? ` ("${p.username}")` : ''}`;

    if (!p.username || typeof p.username !== 'string' || p.username.trim() === '') {
      fail(`${label}: "username" is missing or empty`);
    } else {
      if (p.username.startsWith('@')) {
        fail(`${label}: username "${p.username}" must NOT include "@" — store it without the @ symbol`);
      }
      if (seenUsernames.has(p.username.toLowerCase())) {
        fail(`${label}: duplicate username "${p.username}" — all usernames must be unique`);
      } else {
        seenUsernames.add(p.username.toLowerCase());
      }
    }

    if (!p.name || typeof p.name !== 'string' || p.name.trim() === '') {
      fail(`${label}: "name" is missing or empty`);
    }

    if (!p.image || typeof p.image !== 'string' || p.image.trim() === '') {
      fail(`${label}: "image" is missing or empty (use a URL or a relative path like "images/players/yourname.jpg")`);
    }

    if (!p.bio || typeof p.bio !== 'string' || p.bio.trim() === '') {
      fail(`${label}: "bio" is missing or empty`);
    }

    // Optional fields — just check type if present
    if (p.xUrl !== undefined && typeof p.xUrl !== 'string') {
      fail(`${label}: "xUrl" must be a string if provided`);
    }
    if (p.linkedinUrl !== undefined && typeof p.linkedinUrl !== 'string') {
      fail(`${label}: "linkedinUrl" must be a string if provided`);
    }
  }

  if (errorCount === 0) ok(`${players.length} player${players.length !== 1 ? 's' : ''} — all good`);
}

const errorsBefore = errorCount;

// ── games.json ──────────────────────────────────────────────────────────────

header('Checking games.json…');

if (!Array.isArray(games)) {
  fail('games.json must be a JSON array (starts with "[" and ends with "]")');
} else {
  const playerUsernames = new Set((players || []).map(p => p.username));
  const seenIds         = new Set();

  for (const [i, g] of games.entries()) {
    const label = `Game ${i + 1}${g.id ? ` (id: "${g.id}")` : ''}`;

    // id
    if (!g.id || typeof g.id !== 'string' || g.id.trim() === '') {
      fail(`${label}: "id" is missing or empty`);
    } else if (seenIds.has(g.id)) {
      fail(`${label}: duplicate game id "${g.id}" — every game needs a unique id`);
    } else {
      seenIds.add(g.id);
    }

    // date
    if (!g.date) {
      fail(`${label}: "date" is missing`);
    } else if (!isValidISODate(g.date)) {
      fail(`${label}: date "${g.date}" is invalid — use ISO format like "2026-04-03"`);
    }

    // players
    const p1ok = typeof g.player1 === 'string' && g.player1.trim() !== '';
    const p2ok = typeof g.player2 === 'string' && g.player2.trim() !== '';

    if (!p1ok) {
      fail(`${label}: "player1" is missing or empty`);
    } else if (!playerUsernames.has(g.player1)) {
      fail(`${label}: player1 "${g.player1}" is not in players.json — add them first`);
    }

    if (!p2ok) {
      fail(`${label}: "player2" is missing or empty`);
    } else if (!playerUsernames.has(g.player2)) {
      fail(`${label}: player2 "${g.player2}" is not in players.json — add them first`);
    }

    if (p1ok && p2ok && g.player1 === g.player2) {
      fail(`${label}: player1 and player2 are the same person ("${g.player1}") — a player can't play themselves`);
    }

    // scores
    const s1valid = typeof g.score1 === 'number' && Number.isInteger(g.score1);
    const s2valid = typeof g.score2 === 'number' && Number.isInteger(g.score2);

    if (!s1valid) fail(`${label}: "score1" must be a whole number (e.g. 11)`);
    if (!s2valid) fail(`${label}: "score2" must be a whole number (e.g. 7)`);

    if (s1valid && s2valid) {
      if (!isValidScorePair(g.score1, g.score2)) {
        fail(
          `${label}: score ${g.score1}-${g.score2} is not valid. ` +
          `Table tennis games end at 11 (scores: 11-0 through 11-9). ` +
          `Deuce games must be recorded as 12-10, not ${g.score1}-${g.score2}.`
        );
      } else {
        // winner
        const expectedWinner = g.score1 > g.score2 ? g.player1 : g.player2;

        if (!g.winner || typeof g.winner !== 'string') {
          fail(`${label}: "winner" is missing`);
        } else if (g.winner !== g.player1 && g.winner !== g.player2) {
          fail(`${label}: winner "${g.winner}" must be either player1 ("${g.player1}") or player2 ("${g.player2}")`);
        } else if (g.winner !== expectedWinner) {
          fail(
            `${label}: winner is "${g.winner}" but the score ${g.score1}-${g.score2} means ` +
            `"${expectedWinner}" won — fix the winner field or swap the scores`
          );
        }
      }
    }

    // notes — optional, just check type
    if (g.notes !== undefined && typeof g.notes !== 'string') {
      fail(`${label}: "notes" must be a string if provided`);
    }
  }

  if (errorCount === errorsBefore) ok(`${games.length} game${games.length !== 1 ? 's' : ''} — all good`);
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('');

if (errorCount > 0) {
  console.log(`${RED}${BOLD}✗  Validation failed — ${errorCount} error${errorCount !== 1 ? 's' : ''} found.${RESET}`);
  console.log(`${DIM}Fix the issues above and run "npm run validate" again.${RESET}\n`);
  process.exit(1);
} else {
  console.log(`${GREEN}${BOLD}✓  Everything looks great! Data is valid.${RESET}\n`);
  process.exit(0);
}
