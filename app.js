/**
 * app.js — Burntboard shared data layer
 *
 * Loaded by every page. Exposes all data-loading, computation,
 * and formatting helpers as plain global functions (no framework needed).
 */

// ---------------------------------------------------------------------------
// Data loading — cached after first fetch
// ---------------------------------------------------------------------------

let _players = null;
let _games   = null;

async function loadData() {
  if (_players && _games) return { players: _players, games: _games };

  const [pRes, gRes] = await Promise.all([
    fetch('./players.json'),
    fetch('./games.json'),
  ]);

  _players = await pRes.json();
  _games   = await gRes.json();

  // Sort games by date descending once, reuse everywhere
  _games.sort((a, b) => b.date.localeCompare(a.date));

  return { players: _players, games: _games };
}

// ---------------------------------------------------------------------------
// Timezone helpers — America/Los_Angeles
// ---------------------------------------------------------------------------

/** Returns today's date as "YYYY-MM-DD" in the LA timezone. */
function getTodayLA() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
  }).format(new Date());
}

/**
 * Returns the Sunday–Saturday week range that contains today (LA time).
 * @returns {{ start: string, end: string, label: string }}
 */
function getWeekRange() {
  const todayStr = getTodayLA();
  const [y, m, d] = todayStr.split('-').map(Number);

  // Work in UTC noon to avoid DST edge cases
  const pivot = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dow   = pivot.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const toSun = -dow;              // days back to Sunday (0 if today is Sunday)

  const sunMs = pivot.getTime() + toSun * 86_400_000;
  const satMs = sunMs + 6 * 86_400_000;

  const sun = new Date(sunMs);
  const sat = new Date(satMs);

  const opts     = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const optsYear = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };

  return {
    start: sun.toISOString().slice(0, 10),
    end:   sat.toISOString().slice(0, 10),
    label: `${sun.toLocaleDateString('en-US', opts)} – ${sat.toLocaleDateString('en-US', optsYear)}`,
  };
}

/**
 * Returns the first-to-last day of the current calendar month (LA time).
 * @returns {{ start: string, end: string, label: string }}
 */
function getMonthRange() {
  const todayStr = getTodayLA();
  const [y, m]   = todayStr.split('-').map(Number);

  // Date.UTC(y, m, 0) = last day of month m
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm      = String(m).padStart(2, '0');
  const label   = new Date(Date.UTC(y, m - 1, 1))
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  return {
    start: `${y}-${mm}-01`,
    end:   `${y}-${mm}-${String(lastDay).padStart(2, '0')}`,
    label,
  };
}

// ---------------------------------------------------------------------------
// Game filtering
// ---------------------------------------------------------------------------

/**
 * Returns only the games that fall within the given scope.
 * @param {Array}  games
 * @param {'all-time'|'month'|'week'} scope
 */
function filterGamesByScope(games, scope) {
  if (scope === 'week') {
    const { start, end } = getWeekRange();
    return games.filter(g => g.date >= start && g.date <= end);
  }
  if (scope === 'month') {
    const { start, end } = getMonthRange();
    return games.filter(g => g.date >= start && g.date <= end);
  }
  return games; // 'all-time'
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

/**
 * Computes a player's stats from a (pre-filtered) games array.
 * @param {string} username
 * @param {Array}  games
 * @returns {{ wins, losses, totalPoints, gamesPlayed }}
 */
function getPlayerStats(username, games) {
  const mine = games.filter(g => g.player1 === username || g.player2 === username);

  let wins = 0;
  let totalPoints = 0;

  for (const g of mine) {
    if (gameWinner(g) === username) wins++;
    totalPoints += g.player1 === username ? g.score1 : g.score2;
  }

  return {
    wins,
    losses:      mine.length - wins,
    totalPoints,
    gamesPlayed: mine.length,
  };
}

/**
 * Builds a sorted leaderboard.
 *
 * Wins mode (default):
 *   1° wins desc → 2° totalPoints desc → 3° losses asc → 4° username asc
 *
 * Score mode:
 *   1° totalPoints desc → 2° wins desc → 3° losses asc → 4° username asc
 *
 * @param {Array}  players
 * @param {Array}  games
 * @param {'all-time'|'month'|'week'} scope
 * @param {'wins'|'score'} mode
 * @returns {Array}  players annotated with stats, sorted by rank
 */
function computeLeaderboard(players, games, scope, mode) {
  const filtered = filterGamesByScope(games, scope);

  const rows = players.map(p => ({
    ...p,
    ...getPlayerStats(p.username, filtered),
  }));

  // For non-all-time scopes only show players who have played
  const eligible = scope === 'all-time'
    ? rows
    : rows.filter(r => r.gamesPlayed > 0);

  if (mode === 'score') {
    eligible.sort((a, b) =>
      b.totalPoints - a.totalPoints ||
      b.wins        - a.wins        ||
      a.losses      - b.losses      ||
      a.username.localeCompare(b.username)
    );
  } else {
    eligible.sort((a, b) =>
      b.wins        - a.wins        ||
      b.totalPoints - a.totalPoints ||
      a.losses      - b.losses      ||
      a.username.localeCompare(b.username)
    );
  }

  return eligible;
}

/**
 * Returns 1-based rank for a player in the given scope/mode.
 * Returns null if the player hasn't played in that scope.
 */
function getPlayerRank(username, players, games, scope, mode) {
  const board = computeLeaderboard(players, games, scope, mode);
  const idx   = board.findIndex(p => p.username === username);
  return idx === -1 ? null : idx + 1;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

function timeAgo(dateStr) {
  const then = new Date(dateStr + 'T12:00:00Z');
  const now  = new Date();
  const days = Math.floor((now - then) / 86_400_000);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)  return `${days}d ago`;
  if (days < 31) return `${Math.floor(days / 7)}w ago`;
  return formatDateShort(dateStr);
}

function winRate(wins, gamesPlayed) {
  if (gamesPlayed === 0) return '—';
  return Math.round((wins / gamesPlayed) * 100) + '%';
}

/**
 * Generates a simple SVG avatar fallback with the player's initial.
 * Used as an <img> src when the primary image fails to load.
 */
function avatarFallback(name, color) {
  const initial = name ? name[0].toUpperCase() : '?';
  const bg      = color || '#E8470F';
  const svg     = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
    `<rect width="64" height="64" rx="32" fill="${bg}"/>` +
    `<text x="32" y="44" font-size="26" font-weight="bold" fill="white" ` +
    `text-anchor="middle" font-family="system-ui,sans-serif">${initial}</text></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/**
 * Sets an onerror fallback on an <img> element.
 * Call after creating the element: addAvatarFallback(img, player.name)
 */
function addAvatarFallback(imgEl, name, color) {
  imgEl.onerror = function () {
    this.onerror = null;
    this.src = avatarFallback(name, color);
  };
}

// ---------------------------------------------------------------------------
// Rank display helpers
// ---------------------------------------------------------------------------

function rankLabel(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

/** Returns the winning player's username derived from the scores. */
function gameWinner(g) {
  return g.score1 > g.score2 ? g.player1 : g.player2;
}

function rankColorClass(rank) {
  if (rank === 1) return 'rank-gold';
  if (rank === 2) return 'rank-silver';
  if (rank === 3) return 'rank-bronze';
  return '';
}
