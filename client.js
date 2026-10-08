const isDemo = location.pathname === "/demo" || location.pathname.startsWith("/demo/");
const apiBase = isDemo ? "/demo/api/v1" : "/api/v1";
const tokenStore = "bb_demo_token";
const today = isDemo ? "2026-10-08" : new Intl.DateTimeFormat("en-CA", {timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const $ = (s) => document.querySelector(s),
  esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const paths = {
  feed: "M4 4h16v16H4z M4 10h16 M10 10v10",
  board: "M5 20V12h4v8 M11 20V4h4v16 M17 20V8h4v12",
  players:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  agent: "M5 7h14v13H5z M12 3v4 M9 12h.01 M15 12h.01 M9 16h6 M2 11v5 M22 11v5",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  plus: "M12 5v14 M5 12h14",
  comment:
    "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z",
  smile:
    "M9 9h.01 M15 9h.01 M8 14s1.5 2 4 2 4-2 4-2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12 M18 6L6 18",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  edit: "M16 3l5 5-12 12-6 1 1-6z M14 5l5 5",
  copy: "M9 9h12v12H9z M5 15H3V3h12v2",
  logout: "M9 21H3V3h6 M14 7l5 5-5 5 M7 12h12",
  ball: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M5 7c6 0 12 6 12 12",
};
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n] || paths.ball}"/></svg>`;
let data = { players: [], games: [], activity: [], keys: [], user: null },
  feedFilter = "all",
  scope = "week",
  ranking = "wins",
  activityFilter = "all",
  agentClient = "Codex",
  commentsOpen = new Set(),
  reactionOpen = null,
  toastTimer,
  modalReturn = null;
const player = (id) =>
  data.players.find((p) => p.id === id) || {
    id,
    name: "Player",
    username: "player",
    avatar: "🏓",
  };
const first = (p) => p.name.split(" ")[0];
function avatar(p, size = "") {
  return `<span class="avatar ${size}" style="--avatar-bg:${esc(p.color || "#d6dccb")}">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : esc(p.avatar || p.name[0])}</span>`;
}
const dateLabel = (d) =>
  new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const timeLabel = (d) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
async function api(path, method = "GET", body, requestKey = crypto.randomUUID()) {
  const res = await fetch(apiBase + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(isDemo ? {Authorization: "Bearer " + (localStorage.getItem(tokenStore) || "")} : {}),
      ...(method !== "GET" ? {"Idempotency-Key": requestKey} : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error);
  return result;
}
async function refresh() {
  const matchId = location.hash.startsWith("#match/") ? location.hash.slice(7) : null;
  const playerId = location.hash.startsWith("#profile/") ? location.hash.slice(9) : null;
  data = await api("/state" + (!isDemo && (matchId || playerId) ? "?" + (matchId ? "game=" + encodeURIComponent(matchId) : "player=" + encodeURIComponent(playerId)) : ""));
  render();
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("toast-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(
    () => $("#toast").classList.remove("toast-show"),
    3000,
  );
}
function stats(id, games = data.games) {
  if (!isDemo && games === data.games && data.standings) return data.standings.all.find(p => p.id === id) || {played:0,wins:0,losses:0,points:0,rate:0};
  const mine = games.filter((g) => [g.player1, g.player2].includes(id)),
    wins = mine.filter(
      (g) => (g.score1 > g.score2 ? g.player1 : g.player2) === id,
    ).length,
    points = mine.reduce(
      (n, g) => n + (g.player1 === id ? g.score1 : g.score2),
      0,
    );
  return {
    played: mine.length,
    wins,
    losses: mine.length - wins,
    points,
    rate: mine.length ? Math.round((wins / mine.length) * 100) : 0,
  };
}
function scoped() {
  return data.games.filter(
    (g) =>
      scope === "all" ||
      (scope === "month" ? g.date >= (data.monthStart || "2026-10-01") : g.date >= (data.weekStart || "2026-10-04")),
  );
}
function board(games = null, mode = ranking, period = scope) {
  return data.players
    .map((p) => ({ ...p, ...(!isDemo && !games && data.standings ? data.standings[period].find(row=>row.id===p.id) || {played:0,wins:0,losses:0,points:0,rate:0} : stats(p.id, games || scoped())) }))
    .filter((p) => p.played)
    .sort(
      (a, b) =>
        (mode === "points" ? b.points - a.points || b.wins - a.wins : b.wins - a.wins) ||
        b.points - a.points ||
        a.losses - b.losses ||
        a.username.localeCompare(b.username),
    );
}
function form(id) {
  return data.games
    .filter((g) => [g.player1, g.player2].includes(id))
    .slice(0, 5)
    .reverse()
    .map(
      (g) =>
        `<span class="form-win ${(g.score1 > g.score2 ? g.player1 : g.player2) !== id ? "loss" : ""}">${(g.score1 > g.score2 ? g.player1 : g.player2) === id ? "W" : "L"}</span>`,
    )
    .join("");
}
function heading(
  title,
  subtitle,
  eyebrow = "THE OFFICE CLUBHOUSE",
  action = "",
) {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${action || `<span class="date muted">${new Date(today + "T12:00:00Z").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",timeZone:"UTC"})}</span>`}</div>`;
}
function rail() {
  const rows = board(null, "wins", "week").slice(0, 4),
    me = data.user,
    s = me ? stats(me.id) : null;
  return `<aside class="rail"><section class="panel"><div class="section-title"><h3>This week’s heat</h3><a href="#leaderboard">View all ${icon("arrow")}</a></div>${rows.map((p, i) => `<a class="mini-row" href="#profile/${p.id}"><span class="position">${i + 1}</span>${avatar(p)}<div><strong>${esc(first(p))}</strong><small>@${esc(p.username)}</small></div><div class="points">${p.wins}<small>WINS</small></div></a>`).join("")}<p class="tooltip-note">New week. Same bragging rights.</p></section><section class="panel quote-panel"><div class="eyebrow">HOUSE RULE NO. 01</div><h3>Talk is cheap.<br>Bring your paddle.</h3><p>Good games. Questionable serves.<br>Very real office rivalries.</p><div class="signature">EST. 2026 · BURNT × ALLOWANCE</div><span class="line-art">🏓</span></section>${me ? `<section class="panel"><div class="section-title"><h3>Your corner</h3><a href="#profile/${me.id}">Player card</a></div><div class="week-strip">${form(me.id)}</div><div class="your-stat"><div><span class="display">${s.wins}<span class="muted">–${s.losses}</span></span><small>ALL-TIME RECORD</small></div><span class="rating">${s.rate}% win rate</span></div></section>` : ""}<small style="text-align:center;font-size:10px">A little competition. A lot of character.</small></aside>`;
}
function scoreCard(g) {
  const p1 = player(g.player1),
    p2 = player(g.player2),
    w1 = g.score1 > g.score2;
  return `<a class="score-card" href="#match/${g.id}" aria-label="${esc(p1.name)} versus ${esc(p2.name)}, ${g.score1} to ${g.score2}"><div class="score-player">${avatar(p1)}<div><strong>${esc(first(p1))}</strong><small class="${w1 ? "winner" : ""}">${w1 ? "WINNER" : "GOOD GAME"}</small></div></div><div class="score-numbers"><span class="${w1 ? "" : "loser"}">${g.score1}</span><i>:</i><span class="${w1 ? "loser" : ""}">${g.score2}</span></div><div class="score-player right"><div><strong>${esc(first(p2))}</strong><small class="${w1 ? "" : "winner"}">${w1 ? "GOOD GAME" : "WINNER"}</small></div>${avatar(p2)}</div></a>`;
}
function commentList(g) {
  return `<div class="comments">${g.comments.map((c) => `<div class="comment">${avatar(player(c.actor), "tiny")}<div class="bubble"><strong>${esc(first(player(c.actor)))}</strong><small>${timeLabel(c.createdAt)}${c.agent ? " · via " + esc(c.agent) : ""}</small>${c.actor === data.user?.id ? `<button class="comment-delete" data-action="delete-comment" data-game="${g.id}" data-id="${c.id}">Remove</button>` : ""}<p>${esc(c.text)}</p></div></div>`).join("")}${data.user ? `<form class="comment-form" data-form="comment" data-game="${g.id}">${avatar(data.user, "tiny")}<input aria-label="Comment on match" name="text" placeholder="A little friendly trash talk…" maxlength="500" required><button class="btn small" type="submit">Post</button><div class="mention-picker" aria-label="Mention a player" hidden></div></form>` : `<button class="quiet-link" data-action="signin">Sign in to join the conversation</button>`}</div>`;
}
function post(g, { detail = false } = {}) {
  const author = player(g.actor),
    winner = player(g.score1 > g.score2 ? g.player1 : g.player2),
    loser = player(g.score1 > g.score2 ? g.player2 : g.player1);
  return `<article class="post" id="post-${g.id}"><div class="post-head"><a href="#profile/${author.id}">${avatar(author)}</a><div class="meta"><a href="#profile/${author.id}"><strong>${esc(author.name)}</strong></a><p>@${esc(author.username)} · ${dateLabel(g.date)}${g.revision > 1 ? " · Edited" : ""}${g.history.find((e) => e.agent) ? " · via agent" : ""}</p></div><span class="tag ${Math.max(g.score1, g.score2) > 11 ? "hot" : ""}">${Math.max(g.score1, g.score2) > 11 ? "DEUCE DRAMA" : "MATCH RECORDED"}</span></div><p class="post-copy"><strong>${esc(first(winner))}</strong> took the W against <strong>${esc(first(loser))}</strong>.${g.notes ? "<br>" + esc(g.notes) : ""}</p>${scoreCard(g)}<div class="post-actions"><button data-action="reaction-picker" data-game="${g.id}" aria-label="Add reaction">${icon("smile")} React</button><div class="reaction-chips">${Object.entries(
    g.reactions,
  )
    .filter(([, v]) => v.length)
    .map(
      ([emoji, ids]) =>
        `<button class="reaction-chip ${ids.includes(data.user?.id) ? "active" : ""}" data-action="react" data-game="${g.id}" data-emoji="${emoji}" aria-label="React ${emoji}" aria-pressed="${ids.includes(data.user?.id)}">${emoji} ${ids.length}</button>`,
    )
    .join(
      "",
    )}</div><button data-action="comments" data-game="${g.id}" aria-label="Show comments">${icon("comment")} ${g.comments.length || "Comment"}</button>${!detail ? `<a class="details muted" href="#match/${g.id}">Match details ${icon("arrow")}</a>` : ""}${!isDemo && data.user ? `<button class="muted" data-action="subscription" data-game="${g.id}" data-muted="${g.muted}">${g.muted ? "Unmute emails" : "Mute emails"}</button>` : ""}</div>${reactionOpen === g.id ? `<div class="reaction-picker">${["🔥", "🏓", "😂", "👏", "😤"].map((emoji) => `<button data-action="react" data-game="${g.id}" data-emoji="${emoji}" aria-label="React ${emoji}">${emoji}</button>`).join("")}</div>` : ""}${detail || commentsOpen.has(g.id) ? commentList(g) : ""}</article>`;
}
function feed() {
  let games = data.games.filter(
    (g) =>
      feedFilter === "all" || [g.player1, g.player2].includes(data.user?.id),
  );
  return `${heading("The table talk.", "The scores, the stories, and the slightly bruised egos.")}${!data.user ? `<section class="login-hero"><div class="hero-copy"><div class="eyebrow">BURNT × ALLOWANCE · EST. 2026</div><h2>SETTLE IT<br><span style="color:#fa815c">AT THE TABLE.</span></h2><p>Your office. Your rivalries. Your next great game. Join the clubhouse and put it on the board.</p><button class="btn primary" data-action="signin">Join the clubhouse ${icon("arrow")}</button></div><div class="hero-photo" role="img" aria-label="The office ping pong table"></div></section>` : ""}<div class="columns"><div>${data.user ? `<div class="banner"><div><div class="eyebrow muted" style="font-size:9px;margin-bottom:7px">HEY, ${esc(first(data.user)).toUpperCase()}</div><h2>Got a score to settle?</h2><p>Put your latest game on the board.</p></div><span class="paddle">🏓</span><button class="btn primary" data-action="record">${icon("plus")} Record game</button></div>` : ""}<div class="feed-tabs"><button class="${feedFilter === "all" ? "active" : ""}" data-action="feed-filter" data-value="all">Around the table</button><button class="${feedFilter === "mine" ? "active" : ""}" data-action="feed-filter" data-value="mine">My matches</button><span class="feed-total">${games.length} matches</span></div>${games.length ? games.map((g) => post(g)).join("") : empty("Your story starts here.", "Your first match will show up right here.", "Record game", "record")}${data.pagination?.games ? `<button class="btn soft full" data-action="load-more" data-kind="games">Earlier matches</button>` : ""}</div>${rail()}</div>`;
}
function empty(title, copy, button, action) {
  return `<div class="panel empty"><div class="empty-icon">🏓</div><h2>${title}</h2><p>${copy}</p>${button ? `<button class="btn primary" data-action="${action}">${button}</button>` : ""}</div>`;
}
function leaderboard() {
  const rows = board();
  return `${heading("Bragging rights.", "Every point counts. Some people remind you more than others.", "THE LEADERBOARD")}<div class="filters"><div class="pill-tabs">${[
    ["week", "This week"],
    ["month", "This month"],
    ["all", "All-time"],
  ]
    .map(
      ([v, t]) =>
        `<button class="${scope === v ? "active" : ""}" data-action="scope" data-value="${v}">${t}</button>`,
    )
    .join("")}</div><div class="pill-tabs">${[
    ["wins", "By wins"],
    ["points", "By points"],
  ]
    .map(
      ([v, t]) =>
        `<button class="${ranking === v ? "active" : ""}" data-action="ranking" data-value="${v}">${t}</button>`,
    )
    .join("")}</div></div>${
    rows.length
      ? `<div class="podium">${rows
          .slice(0, 3)
          .map(
            (p, i) =>
              `<a class="podium-card ${i === 0 ? "first" : ""}" href="#profile/${p.id}"><span class="place">0${i + 1}</span><span class="crown">${["👑", "🥈", "🥉"][i]}</span>${avatar(p, "large")}<h3>${esc(first(p))}</h3><small>@${esc(p.username)}</small><div class="wins">${ranking === "wins" ? p.wins : p.points}<small>${ranking === "wins" ? "wins this " + (scope === "all" ? "season" : scope) : "total points"}</small></div></a>`,
          )
          .join(
            "",
          )}</div><section class="panel table-panel"><table class="leader-table"><thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>Win %</th><th class="hide-mobile">Points</th><th class="hide-mobile">Recent form</th></tr></thead><tbody>${rows.map((p, i) => `<tr class="${p.id === data.user?.id ? "self" : ""}"><td class="num muted">${i + 1}</td><td><a class="player-cell" href="#profile/${p.id}">${avatar(p)}<div><strong>${esc(p.name)}${p.id === data.user?.id ? ' <span class="orange">· you</span>' : ""}</strong><small>@${esc(p.username)}</small></div></a></td><td class="num">${p.wins}</td><td class="num muted">${p.losses}</td><td>${p.rate}%</td><td class="num hide-mobile">${p.points}</td><td class="hide-mobile"><div class="week-strip">${form(p.id)}</div></td></tr>`).join("")}</tbody></table></section><p class="tooltip-note">${scope === "week" ? "Week of " + dateLabel(data.weekStart || "2026-10-04") : scope === "month" ? dateLabel(data.monthStart || "2026-10-01") : "Since the first serve"} · ${ranking === "wins" ? "Ranked by wins, then points, then fewest losses." : "Ranked by total points, then wins, then fewest losses."}</p>`
      : empty(
          "The crown is unclaimed.",
          "Be the first to put a game on the board.",
          "Record game",
          "record",
        )
  }`;
}
function players() {
  return `${heading("Meet your match.", "Good company. Friendly competition. A few dangerous backhands.", "THE PLAYERS", `<div class="search"><input id="player-search" aria-label="Search players" placeholder="Search the roster…"></div>`)}<div class="player-grid">${data.players
    .map((p) => {
      const s = stats(p.id);
      return `<a class="panel player-card" href="#profile/${p.id}" data-player-search="${esc((p.name + " " + p.username).toLowerCase())}">${avatar(p, "large")}<h3>${esc(first(p))}</h3><small>@${esc(p.username)}</small><p>${esc(p.bio || "New to the table. Ready to play.")}</p><div class="mini-stats"><div><strong>${s.wins}</strong><small>WINS</small></div><div><strong>${s.played}</strong><small>GAMES</small></div><div><strong>${s.rate}%</strong><small>WIN RATE</small></div></div></a>`;
    })
    .join(
      "",
    )}</div><div id="search-empty" hidden>${empty("No players found.", "Try a different name or username.")}</div>`;
}
function profile(id) {
  const p = player(id);
  if (!data.players.some((x) => x.id === id))
    return empty("Player not found.", "This player card isn’t on the roster.");
  const s = stats(id),
    games = data.games.filter((g) => [g.player1, g.player2].includes(id)),
    opponents = data.players
      .filter((o) => o.id !== id)
      .map((o) => ({
        ...o,
        count: !isDemo && data.rivalries ? data.rivalries.find(r=>r.id===id && r.opponent===o.id)?.played || 0 : games.filter((g) => [g.player1, g.player2].includes(o.id)).length,
      }))
      .sort((a, b) => b.count - a.count),
    rival = opponents[0],
    h2h = games.filter((g) => [g.player1, g.player2].includes(rival?.id)),
    rs = !isDemo && data.rivalries ? data.rivalries.find(r=>r.id===id && r.opponent===rival?.id) || {played:0,wins:0,losses:0} : stats(id, h2h);
  return `${heading("Player card.", "A little personality behind the paddle.", "THE ROSTER")}<div class="columns"><div><section class="panel profile-panel"><div class="profile-cover"><span>PLAY YOUR GAME.</span></div><div class="profile-intro">${avatar(p, "large")}${data.user?.id === id ? `<button class="btn ghost small profile-edit" data-action="edit-profile">${icon("edit")} Edit profile</button>` : `<button class="btn ghost small profile-edit" data-action="record" data-opponent="${id}">Record a match</button>`}<h1>${esc(p.name)}</h1><small>@${esc(p.username)} · Burntboard player</small><p class="bio">${esc(p.bio || "New to the table. Ready to play.")}</p><div class="badges">${s.wins ? '<span class="badge">🏓 First W</span>' : ""}${s.played >= 5 ? '<span class="badge">🔥 Table regular</span>' : ""}${s.rate >= 70 && s.played ? '<span class="badge">⚡ On a roll</span>' : ""}<span class="badge">✦ Founding roster</span></div></div></section><div class="stats-grid">${[
    ["Wins", s.wins],
    ["Losses", s.losses],
    ["Win rate", s.rate + "%"],
    ["Points scored", s.points],
  ]
    .map(
      ([label, v]) =>
        `<div class="panel stat-box"><strong>${v}</strong><small>${label}</small></div>`,
    )
    .join(
      "",
    )}</div><div class="section-title"><h2>From the table</h2><small>${s.played} games played</small></div>${games.length ? games.map((g) => post(g)).join("") : empty("The first serve awaits.", "Record a game to start your match history.", "Record game", "record")}${data.pagination?.games ? `<button class="btn soft full" data-action="load-more" data-kind="games">Earlier matches</button>` : ""}</div><aside class="rail"><section class="panel"><div class="section-title"><h3>The rivalry</h3><span>⚔</span></div>${rival?.count ? `<a href="#profile/${rival.id}" class="rivalry">${avatar(rival, "medium")}<div><strong>${esc(rival.name)}</strong><small style="display:block">${rs.played} games together</small></div></a><div class="rivalry"><span class="display">${rs.wins} <span class="muted">—</span> ${rs.losses}</span><small>${rs.wins === rs.losses ? "Dead even. Rematch?" : rs.wins > rs.losses ? "You have the edge." : "A comeback is calling."}</small></div><div class="progress"><span style="width:${(rs.wins / rs.played) * 100}%"></span></div><div class="rival-labels"><span>${esc(first(p))}</span><span>${esc(first(rival))}</span></div>` : '<p class="muted">Your rivalries begin with your first game.</p>'}</section><section class="panel"><h3>Recent form</h3><div class="week-strip" style="margin-top:18px">${form(id) || "<small>No games yet</small>"}</div><p class="tooltip-note">Last five games · oldest to newest</p></section><section class="panel quote-panel"><div class="eyebrow">THE PLAYER’S CREED</div><h3>Win with grace.<br>Lose with a rematch.</h3><p>There’s always another game.</p></section></aside></div>`;
}
function match(id) {
  const g = data.games.find((g) => g.id === id);
  if (!g) return empty("Match not found.", "This match isn’t on the board.");
  const p1 = player(g.player1),
    p2 = player(g.player2),
    mine = [g.player1, g.player2].includes(data.user?.id),
    h2h = data.games.filter(
      (x) =>
        [x.player1, x.player2].includes(p1.id) &&
        [x.player1, x.player2].includes(p2.id),
    ),
    s = !isDemo && data.rivalries ? data.rivalries.find(r=>r.id===p1.id && r.opponent===p2.id) || {played:0,wins:0,losses:0} : stats(p1.id, h2h);
  return `${heading("The match receipt.", "The result. The rivalry. The full story.", "MATCH DETAILS", mine ? `<button class="btn ghost" data-action="correct" data-game="${id}">${icon("edit")} Correct score</button>` : "")}<div class="columns"><div><section class="panel match-hero"><div class="eyebrow muted">${dateLabel(g.date)} · OFFICE TABLE · FINAL</div><div class="match-versus"><a class="competitor" href="#profile/${p1.id}">${avatar(p1, "large")}<h3>${esc(first(p1))}</h3><small>@${esc(p1.username)}</small></a><div class="display">${g.score1}<span class="muted"> : </span>${g.score2}</div><a class="competitor" href="#profile/${p2.id}">${avatar(p2, "large")}<h3>${esc(first(p2))}</h3><small>@${esc(p2.username)}</small></a></div><div class="badge" style="display:inline-block;margin-bottom:22px">${Math.max(g.score1, g.score2) > 11 ? "🔥 Won in deuce" : "🏓 " + esc(first(g.score1 > g.score2 ? p1 : p2)) + " took the W"}</div>${g.notes ? `<p class="notes">“${esc(g.notes)}”</p>` : ""}</section><div style="margin-top:24px">${post(g, { detail: true })}</div></div><aside class="rail"><section class="panel"><h3>Head to head</h3><div class="rivalry"><span class="display">${s.wins} <span class="muted">—</span> ${s.losses}</span><small>${s.played} games played</small></div><div class="progress"><span style="width:${(s.wins / s.played) * 100}%"></span></div><div class="rival-labels"><span>${esc(first(p1))}</span><span>${esc(first(p2))}</span></div></section><section class="panel"><h3>The paper trail</h3><p class="tooltip-note" style="margin-bottom:15px">Every change. Every player. All here.</p>${g.history.map((e) => `<div class="history-item"><strong>${esc(first(player(e.actor)))}</strong> · ${esc(e.text)}${e.after?.score1 != null ? `<div class="tooltip-note">${e.before ? `${e.before.score1}–${e.before.score2} → ` : ""}${e.after.score1}–${e.after.score2}</div>` : ""}${e.agent ? `<small>via ${esc(e.agent)}</small>` : ""}<small>${dateLabel(e.createdAt.slice(0, 10))} · ${timeLabel(e.createdAt)}</small></div>`).join("")}</section></aside></div><section class="panel mobile-only" style="margin-top:20px"><h3>The paper trail</h3>${g.history.map((e) => `<div class="history-item"><strong>${esc(first(player(e.actor)))}</strong> · ${esc(e.text)}${e.after?.score1 != null ? `<div class="tooltip-note">${e.before ? `${e.before.score1}–${e.before.score2} → ` : ""}${e.after.score1}–${e.after.score2}</div>` : ""}<small>${timeLabel(e.createdAt)}${e.agent ? " · via " + esc(e.agent) : ""}</small></div>`).join("")}</section>`;
}
function activity() {
  const events = data.activity.filter(
    (e) =>
      activityFilter === "all" ||
      (activityFilter === "games"
        ? e.action.startsWith("game.")
        : activityFilter === "social"
          ? /^(reaction|comment)\./.test(e.action)
          : e.action.startsWith("profile.") || e.action.startsWith("agent.")),
  );
  return `${heading("Nothing under the table.", "An open record of who did what. No mysteries, just receipts.", "ACTIVITY HISTORY")}<div class="tabs">${[
    ["all", "Everything"],
    ["games", "Scores & corrections"],
    ["social", "Social"],
    ["profiles", "Players & agents"],
  ]
    .map(
      ([v, t]) =>
        `<button class="${activityFilter === v ? "active" : ""}" data-action="activity-filter" data-value="${v}">${t}</button>`,
    )
    .join(
      "",
    )}</div><div class="columns"><section class="panel">${events.length ? events.map((e) => `<div class="activity-item">${avatar(player(e.actor))}<div class="event-text"><strong>${esc(player(e.actor).name)}</strong>${e.agent ? ` <span class="badge">via ${esc(e.agent)}</span>` : ""}<p>${esc(e.text)}${e.gameId ? ` · <a class="orange" href="#match/${e.gameId}">View match</a>` : ""}</p>${e.action === "profile.updated" ? `<small>${esc(e.before.username)} → ${esc(e.after.username)}</small>` : ""}</div><small>${dateLabel(e.createdAt.slice(0, 10))}<br>${timeLabel(e.createdAt)}</small><div class="event-icon">${icon(e.action.startsWith("game.") ? "ball" : e.action.startsWith("agent.") ? "agent" : "activity")}</div></div>`).join("") : empty("Quiet on this side.", "Actions will appear here as the clubhouse gets going.")}${data.pagination?.activity ? `<button class="btn soft full" data-action="load-more" data-kind="activity">Earlier activity</button>` : ""}</section><aside class="rail"><section class="panel"><h3>Good games.<br>Honest records.</h3><p class="tooltip-note">Score corrections keep the original result in the match history. Actions taken by agents are attributed to their player.</p><a class="btn soft full" href="#feed" style="margin-top:20px">Back to the conversation</a></section></aside></div>`;
}
let setupToken = null;
function setupInstruction(token) {
  return `Connect ${agentClient} to my Burntboard at ${location.origin}${isDemo ? "/demo" : ""}. Read ${location.origin}${isDemo ? "/demo-agent.md" : "/agent.md"}. Install it as the burntboard skill in your supported skills directory (Codex: ~/.codex/skills/burntboard/SKILL.md; Claude Code: ~/.claude/skills/burntboard/SKILL.md), or retain it as your playbook if your app has no skill installer. Save my personal key in a private credential store: ${token}. Use ${location.origin}${apiBase} with bearer authentication, fetch /state, confirm my identity, and tell me you’re ready. Never print or commit the key.${isDemo ? " This is a demo connection, isolated from real accounts." : ""}`;
}
function agents() {
  return `${heading("Your agent. Your game.", "Let your agent handle the paperwork. You handle the paddle.", "THE AGENT CORNER")}<section class="agent-hero"><div><div class="eyebrow">HUMAN OR AGENT. SAME PLAYBOOK.</div><h2>“I beat Ben 11–7.”<br>Consider it recorded.</h2><p>Scores, player cards, comments, and standings. Everything you can do, your agent can do too.</p></div><div class="terminal"><div class="terminal-bar"><i></i><i></i><i></i><span style="margin-left:auto;color:#9dad8e;font-size:9px">BURNTBOARD SKILL</span></div><p><span class="prompt">you ›</span> I beat Ben 11–7. Add “rematch?”</p><p style="margin:10px 0;color:#a6ba91">✓ Match recorded as @dasmer<br>✓ Standings updated<br>✓ Posted to the feed</p><p style="color:#829573">Ready for the next one. 🏓</p></div></section><div class="agent-layout"><section class="panel"><h3>Put your agent on the roster.</h3><p class="tooltip-note">One connection. All your clubhouse moves.</p><div class="step-label">01 · Choose your agent</div><div class="client-picker">${[
    ["Codex", "⌘"],
    ["Claude Code", "✳"],
    ["Muse", "◈"],
    ["Other", "⌁"],
  ]
    .map(
      ([name, symbol]) =>
        `<button class="${agentClient === name ? "active" : ""}" data-action="agent-client" data-value="${name}"><span>${symbol}</span>${name}</button>`,
    )
    .join(
      "",
    )}</div><div class="step-label">02 · Give it the playbook</div>${setupToken ? `<div class="code-block">${esc(setupInstruction(setupToken))}</div><button class="btn primary full" data-action="copy-setup" style="margin-top:15px">${icon("copy")} Copy setup instruction</button><p class="tooltip-note">Connection created. Your agent still needs to run the instruction. Shown once here; disconnect it below anytime.</p>` : `<div class="code-block">Connect ${esc(agentClient)} to your player account.<br>Read the skill. Save your personal key.<br>Ready for the first serve.</div><button class="btn primary full" data-action="connect-agent" style="margin-top:15px">${icon("agent")} ${data.user ? "Create " + esc(agentClient) + " connection" : "Sign in to connect"}</button><p class="tooltip-note">Creates a personal API key that expires in 90 days. No agent app is installed automatically.</p>`}<div style="display:flex;justify-content:space-between;margin-top:22px"><a class="quiet-link" href="${isDemo ? "/demo-agent.md" : "/agent.md"}" download="SKILL.md">Download skill</a><button class="quiet-link" data-action="manual-key">Use an API key instead</button></div></section><section class="panel"><h3>A pretty capable teammate.</h3>${[
    ["ball", "Record & correct games", "Only matches you’re involved in."],
    [
      "players",
      "Make your player card yours",
      "Photo, avatar, username, and bio.",
    ],
    ["comment", "Join the table talk", "Comments and emoji reactions."],
    ["board", "Know where you stand", "Rankings, matches, and rivalries."],
    [
      "activity",
      "Leave clear receipts",
      "Your name, plus your agent’s connection.",
    ],
  ]
    .map(
      ([i, title, sub]) =>
        `<div class="capability">${icon(i)}<div><strong>${title}</strong><small>${sub}</small></div></div>`,
    )
    .join(
      "",
    )}</section></div><section class="panel" style="margin-top:23px"><div class="section-title"><h3>Your connections</h3><small>Personal. Revocable. Yours.</small></div>${data.keys.length ? data.keys.map((k) => `<div class="connection"><span class="avatar" style="background:#e8eddf">${icon("agent")}</span><div><strong>${esc(k.label)}</strong><small>API access · created ${dateLabel(k.createdAt.slice(0, 10))}</small></div><button data-action="revoke-key" data-id="${k.id}">Disconnect</button></div>`).join("") : '<p class="muted" style="font-size:12px">No agents connected yet. Your future teammate is waiting above.</p>'}</section>`;
}
function render() {
  const [route = "feed", id] = location.hash.slice(1).split("/");
  const page = [
    "feed",
    "leaderboard",
    "players",
    "profile",
    "match",
    "activity",
    "agents",
  ].includes(route)
    ? route
    : "feed";
  document.title =
    {
      feed: "Table talk",
      leaderboard: "Bragging rights",
      players: "Players",
      profile: "Player card",
      match: "Match receipt",
      activity: "Activity",
      agents: "Agents",
    }[page] + " · Burntboard";
  const nav = [
    ["feed", "feed", "The feed"],
    ["leaderboard", "board", "Leaderboard"],
    ["players", "players", "Players"],
    ["activity", "activity", "Activity"],
    ["agents", "agent", "Agents"],
  ];
  $("#app").innerHTML =
    `<div class="layout"><aside class="sidebar"><a href="#feed" class="logo"><span class="logo-mark">🏓</span><span>BURNT<em>BOARD</em></span></a><div class="eyebrow">The office ping pong club</div><nav class="nav" aria-label="Main navigation">${nav.map(([r, i, t]) => `<a href="#${r}" class="${page === r ? "active" : ""}">${icon(i)} ${t}${r === "agents" ? '<span class="count">NEW</span>' : ""}</a>`).join("")}</nav><button class="btn primary sidebar-record" data-action="record">${icon("plus")} Record game</button><div class="sidebar-bottom"><div class="table-status"><span class="dot"></span>The table is calling.<br><span style="font-size:10px;margin-left:13px">Burnt × Allowance · San Francisco</span></div><button class="account" data-action="account" style="width:100%;text-align:left">${avatar(data.user || { name: "Guest", avatar: "🏓", color: "#9fae8e" })}<div><strong>${data.user ? esc(data.user.name) : "Grab a paddle"}</strong><small>${data.user ? "@" + esc(data.user.username) : "Join the clubhouse"}</small></div>${icon("more")}</button></div></aside><main class="main"><header class="topbar"><span class="crumb">The clubhouse <span style="margin:0 10px;color:#b2b4a6">/</span> <b>${nav.find((n) => n[0] === page)?.[2] || "The game"}</b></span><a class="logo mobile-brand" href="#feed">BURNT<em>BOARD</em></a><div class="topbar-right"><span class="eyebrow muted" style="font-size:9px">REAL SCORES. REAL PRIDE.</span>${isDemo ? `<button class="demo-tag" data-action="demo-menu">Demo</button>` : `<a class="demo-tag" href="/demo">Try the demo</a>`}${data.user ? `<button data-action="account" aria-label="Your account">${avatar(data.user, "tiny")}</button>` : `<button class="btn small" data-action="signin">Sign in</button>`}</div></header><div class="content">${{ feed, leaderboard, players, profile: () => profile(id), match: () => match(id), activity, agents }[page]()}</div></main><nav class="mobile-nav" aria-label="Mobile navigation">${[
      ["feed", "feed", "Feed"],
      ["leaderboard", "board", "Standings"],
    ]
      .map(
        ([r, i, t]) =>
          `<a href="#${r}" class="${page === r ? "active" : ""}">${icon(i)}${t}</a>`,
      )
      .join(
        "",
      )}<button class="record-nav" data-action="record" aria-label="Record game">${icon("plus")}</button><a href="#players" class="${page === "players" ? "active" : ""}">${icon("players")}Players</a><a href="#agents" class="${page === "agents" ? "active" : ""}">${icon("agent")}Agents</a></nav></div>`;
}
function closeModal() {
  const root = $("#modal-root");
  root.innerHTML = "";
  $("#app").inert = false;
  document.body.style.overflow = "";
  modalReturn?.focus();
}
function modal(html) {
  modalReturn = document.activeElement;
  $("#app").inert = true;
  document.body.style.overflow = "hidden";
  $("#modal-root").innerHTML =
    `<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(html.match(/<h2>(.*?)<\/h2>/)?.[1] || "Burntboard dialog")}"><button class="close-modal" data-action="close" aria-label="Close dialog">${icon("close")}</button>${html}</section></div>`;
  requestAnimationFrame(() =>
    $(
      "#modal-root input:not([type=file]), #modal-root button:not(.close-modal)",
    )?.focus(),
  );
}
function signIn() {
  modal(
    `<div class="eyebrow orange">WELCOME TO THE CLUB</div><h2>Your next rival<br>is already here.</h2><p class="muted">Sign in with your Burnt or Allowance email.</p><form data-form="email"><label for="email">Work email</label><input id="email" type="email" name="email" placeholder="you@getburnt.ai" autocomplete="email" required><div class="form-error" role="alert"></div><button class="btn primary full" style="margin-top:20px">Send sign-in code ${icon("arrow")}</button></form>${isDemo ? `<div class="otp-demo">Demo · no email is sent. The sign-in code is 123456.</div><button class="btn soft full" data-action="demo-login">Try it as Dasmer</button>` : ""}<p class="tooltip-note" style="text-align:center">For @getburnt.ai and @useallowance.com players.</p>`,
  );
}
function otp(email) {
  modal(
    `<div class="eyebrow orange">YOU’RE ONE SERVE AWAY</div><h2>Check your inbox.</h2><p class="muted">Enter the code for <strong>${esc(email)}</strong>.</p><form data-form="otp" data-email="${esc(email)}"><label for="code">Six-digit code</label><input id="code" class="otp-input" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="000000" required>${isDemo ? `<div class="otp-demo">Use <strong>123456</strong>. No email was sent.</div>` : ""}<div class="form-error" role="alert"></div><button class="btn primary full" style="margin-top:20px">Let me in ${icon("arrow")}</button></form><button class="quiet-link" style="display:block;margin:20px auto 0" data-action="signin">Use another email</button>`,
  );
}
function requireLogin() {
  if (!data.user) {
    signIn();
    return false;
  }
  return true;
}
function recordGame(opponent = "", game = null) {
  if (!requireLogin()) return;
  const me = game ? player(game.player1) : data.user,
    p2 = game?.player2 || opponent;
  modal(
    `<div class="eyebrow orange">${game ? "KEEP THE RECEIPTS HONEST" : "PUT IT ON THE BOARD"}</div><h2>${game ? "Correct the score." : "How’d it go?"}</h2><p class="muted">${game ? "The original score stays in the match history." : "Good game? Great game? Let the clubhouse know."}</p><form data-form="game" ${game ? `data-game="${game.id}" data-revision="${game.revision}"` : ""}>${
      game
        ? `<label>Your matchup</label><div class="code-block">${esc(me.name)} vs ${esc(player(p2).name)}</div>`
        : `<label for="opponent">Your opponent</label><select name="opponent" id="opponent" required><option value="">Choose a player…</option>${data.players
            .filter((p) => p.id !== data.user.id)
            .map(
              (p) =>
                `<option value="${p.id}" ${p.id === p2 ? "selected" : ""}>${esc(p.name)} · @${esc(p.username)}</option>`,
            )
            .join("")}</select>`
    }<div class="score-inputs"><div><label for="score1">${game ? esc(first(me)) : "Your score"}</label><input id="score1" name="score1" type="number" min="0" max="99" value="${game?.score1 ?? 11}" required></div><span>:</span><div><label for="score2">${game ? esc(first(player(p2))) : "Their score"}</label><input id="score2" name="score2" type="number" min="0" max="99" value="${game?.score2 ?? 7}" required></div></div><small class="field-hint">Play to 11. Win by two. Deuce scores are welcome.</small>${!game ? `<label for="date">When did you play?</label><input id="date" name="date" type="date" value="${today}" max="${today}" required>` : ""}<label for="notes">The story <span class="muted">· optional</span></label><textarea id="notes" name="notes" maxlength="240" placeholder="A rematch request. A humble brag. An unbelievable rally.">${esc(game?.notes || "")}</textarea><div class="form-error" role="alert"></div><div class="form-footer"><button class="btn ghost" type="button" data-action="close">Cancel</button><button class="btn primary" type="submit">${game ? "Save correction" : "Record game"} ${icon("check")}</button></div></form>`,
  );
}
let profileDraft;
function editProfile(onboard = false) {
  if (!requireLogin()) return;
  profileDraft = { ...data.user };
  modal(
    `<div class="eyebrow orange">${onboard ? "MAKE YOUR ENTRANCE" : "YOUR PLAYER CARD"}</div><h2>${onboard ? "Meet the clubhouse." : "Make it yours."}</h2><p class="muted">A name. A face. A little personality.</p><form data-form="profile"><div class="photo-edit"><div id="photo-preview">${avatar(profileDraft, "large")}</div><div><label class="btn soft small" for="photo-upload">Upload your photo</label><input id="photo-upload" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG, or WebP · up to 2 MB</small><button class="quiet-link" type="button" data-action="remove-photo" style="margin-top:8px">Use an avatar instead</button></div></div><label>Or pick your table personality</label><div class="avatar-options">${["🏓", "✿", "⚡", "◎", "☻", "✦"].map((a) => `<button type="button" data-action="avatar" data-value="${a}" class="${profileDraft.avatar === a ? "selected" : ""}" aria-label="Choose ${a} avatar">${a}</button>`).join("")}</div><div class="color-options">${["#ee582d", "#739783", "#e6b657", "#b3a4ce", "#819ebc", "#e1a184"].map((c) => `<button type="button" data-action="color" data-value="${c}" style="background:${c}" aria-label="Avatar color ${c}" class="${profileDraft.color === c ? "selected" : ""}"></button>`).join("")}</div><label for="name">Display name</label><input id="name" name="name" value="${esc(data.user.name)}" maxlength="60" required><label for="username">Username</label><input id="username" name="username" value="${esc(data.user.username)}" pattern="[a-zA-Z0-9_]{2,24}" maxlength="24" required><small class="field-hint">2–24 letters, numbers, or underscores. GitHub not required.</small><label for="bio">Your bio <span class="muted">· optional</span></label><textarea id="bio" name="bio" maxlength="200" placeholder="What should your next opponent know?">${esc(data.user.bio)}</textarea><div class="form-error" role="alert"></div><div class="form-footer"><button class="btn ghost" type="button" data-action="close">${onboard ? "Later" : "Cancel"}</button><button class="btn primary">${onboard ? "Join the roster" : "Save player card"} ${icon("check")}</button></div></form>`,
  );
}
function account() {
  if (!data.user) return signIn();
  modal(
    `<div class="eyebrow orange">YOUR CORNER</div><h2>Hey, ${esc(first(data.user))}.</h2><p class="muted">${esc(data.user.email)}</p><a class="btn soft full" href="#profile/${data.user.id}" data-action="close">${icon("players")} My player card</a><button class="btn soft full" data-action="edit-profile" style="margin-top:10px">${icon("edit")} Edit profile</button><a class="btn soft full" href="#activity" data-action="close" style="margin-top:10px">${icon("activity")} Activity history</a>${!isDemo ? `<label style="display:flex;gap:10px;align-items:center;margin-top:24px"><input style="width:auto" type="checkbox" data-preference="notifications" ${data.user.notifications ? "checked" : ""}> Match and comment emails</label><small class="field-hint">Sign-in and agent security emails stay on.</small>` : ""}<button class="btn ghost full" data-action="logout" style="margin-top:23px">${icon("logout")} Sign out</button>`,
  );
}
async function action(el) {
  const type = el.dataset.action,
    id = el.dataset.game;
  switch (type) {
    case "close":
      closeModal();
      break;
    case "signin":
      signIn();
      break;
    case "account":
      account();
      break;
    case "demo-login":
      await api("/auth/request", "POST", { email: "dasmer@useallowance.com" });
      const auth = await api("/auth/verify", "POST", {
        email: "dasmer@useallowance.com",
        code: "123456",
      });
      if (isDemo) localStorage.setItem(tokenStore, auth.token);
      closeModal();
      await refresh();
      toast("Welcome to the clubhouse, Dasmer.");
      break;
    case "logout":
      await api("/auth/logout", "POST", {});
      localStorage.removeItem(tokenStore);
      setupToken = null;
      closeModal();
      await refresh();
      break;
    case "record":
      recordGame(el.dataset.opponent);
      break;
    case "correct":
      recordGame(
        "",
        data.games.find((g) => g.id === id),
      );
      break;
    case "edit-profile":
      editProfile();
      break;
    case "feed-filter":
      if (el.dataset.value === "mine" && !requireLogin()) return;
      feedFilter = el.dataset.value;
      render();
      break;
    case "scope":
      scope = el.dataset.value;
      render();
      break;
    case "ranking":
      ranking = el.dataset.value;
      render();
      break;
    case "activity-filter":
      activityFilter = el.dataset.value;
      render();
      break;
    case "load-more": {
      const kind = el.dataset.kind;
      const next = await api("/state?" + kind + "Before=" + encodeURIComponent(data.pagination[kind]) + (!isDemo && location.hash.startsWith("#profile/") ? "&player=" + encodeURIComponent(location.hash.slice(9)) : ""));
      const merged = new Map(data[kind].map(row=>[row.id,row]));
      next[kind].forEach(row=>merged.set(row.id,row));
      data[kind]=[...merged.values()];
      data.pagination[kind]=next.pagination[kind];
      render();
      break;
    }
    case "mention": {
      const form = el.closest("form"), input = form.elements.text;
      const match = /(?:^|\s)@([a-z0-9_]*)$/i.exec(input.value.slice(0,input.selectionStart));
      if (!match) return;
      const start = input.selectionStart - match[1].length - 1;
      input.setRangeText("@" + player(el.dataset.player).username + " ", start, input.selectionStart, "end");
      form.querySelector(".mention-picker").hidden = true;
      input.focus();
      break;
    }
    case "subscription":
      await api("/games/" + id + "/subscription", "PATCH", {muted:el.dataset.muted !== "true"});
      await refresh();
      break;
    case "comments":
      commentsOpen.has(id) ? commentsOpen.delete(id) : commentsOpen.add(id);
      render();
      break;
    case "reaction-picker":
      reactionOpen = reactionOpen === id ? null : id;
      render();
      break;
    case "react":
      if (!requireLogin()) return;
      await api("/games/" + id + "/react", "POST", { emoji: el.dataset.emoji });
      reactionOpen = null;
      await refresh();
      break;
    case "delete-comment":
      await api("/games/" + id + "/comments", "DELETE", { id: el.dataset.id });
      await refresh();
      toast("Comment removed.");
      break;
    case "avatar":
      profileDraft.avatar = el.dataset.value;
      profileDraft.image = null;
      $("#photo-preview").innerHTML = avatar(profileDraft, "large");
      document
        .querySelectorAll(".avatar-options button")
        .forEach((b) => b.classList.toggle("selected", b === el));
      break;
    case "color":
      profileDraft.color = el.dataset.value;
      $("#photo-preview").innerHTML = avatar(profileDraft, "large");
      document
        .querySelectorAll(".color-options button")
        .forEach((b) => b.classList.toggle("selected", b === el));
      break;
    case "remove-photo":
      profileDraft.image = null;
      profileDraft.avatar = profileDraft.avatar || "🏓";
      $("#photo-preview").innerHTML = avatar(profileDraft, "large");
      break;
    case "agent-client":
      agentClient = el.dataset.value;
      setupToken = null;
      render();
      break;
    case "connect-agent":
      if (!requireLogin()) return;
      const key = await api("/agent-keys", "POST", { label: agentClient });
      setupToken = key.token;
      await refresh();
      toast("Personal local key created. Copy the setup instruction.");
      break;
    case "copy-setup":
      await navigator.clipboard.writeText(setupInstruction(setupToken));
      toast("Setup instruction copied. Keep your key private.");
      break;
    case "manual-key":
      if (!requireLogin()) return;
      modal(
        `<div class="eyebrow orange">FOR THE HANDS-ON PLAYER</div><h2>Your personal API key.</h2><p class="muted">Give your agent a name. It gets your permissions, and its actions carry your identity.</p><form data-form="key"><label for="key-label">Connection name</label><input id="key-label" name="label" value="My agent" required maxlength="60"><div class="form-error" role="alert"></div><button class="btn primary full" style="margin-top:22px">Create local key</button></form>`,
      );
      break;
    case "copy-key":
      await navigator.clipboard.writeText(setupToken);
      toast("Key copied.");
      break;
    case "revoke-key":
      await api("/agent-keys/" + el.dataset.id, "DELETE", {});
      setupToken = null;
      await refresh();
      toast("Agent disconnected. Its key no longer works.");
      break;
    case "demo-menu":
      modal(
        `<div class="eyebrow orange">DEMO CLUBHOUSE</div><h2>The whole clubhouse.<br>Just for trying out.</h2><p class="muted">All emails, players, and scores here are demo data. Demo changes are temporary and never affect the real clubhouse.</p><button class="btn soft full" data-action="signin">Try another player</button><a class="btn soft full" href="#activity" data-action="close" style="margin-top:10px">See all activity</a><button class="btn ghost full" data-action="reset" style="margin-top:23px">Reset demo data</button>`,
      );
      break;
    case "reset":
      await api("/reset", "POST", {});
      localStorage.removeItem(tokenStore);
      setupToken = null;
      feedFilter = "all";
      commentsOpen.clear();
      closeModal();
      await refresh();
      toast("Fresh scores. Fresh start.");
      break;
    case "rematch":
      closeModal();
      recordGame(el.dataset.opponent);
      break;
  }
}
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  try {
    await action(el);
  } catch (err) {
    toast(err.message);
  }
});
document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (!f.dataset.form) return;
  e.preventDefault();
  const b = Object.fromEntries(new FormData(f)),
    btn =
      f.querySelector('button[type="submit"]') ||
      f.querySelector('button:not([type="button"])');
  if (btn) btn.disabled = true;
  try {
    switch (f.dataset.form) {
      case "email":
        const out = await api("/auth/request", "POST", b);
        otp(out.email);
        break;
      case "otp":
        const auth = await api("/auth/verify", "POST", {
          email: f.dataset.email,
          code: b.code,
        });
        if (isDemo) localStorage.setItem(tokenStore, auth.token);
        closeModal();
        await refresh();
        if (auth.isNew) editProfile(true);
        else toast("You’re in. Welcome back.");
        break;
      case "game":
        b.score1 = Number(b.score1);
        b.score2 = Number(b.score2);
        if (f.dataset.game) b.revision = Number(f.dataset.revision);
        const fingerprint = JSON.stringify(b);
        if (f.dataset.fingerprint !== fingerprint) {
          f.dataset.requestKey = crypto.randomUUID();
          f.dataset.fingerprint = fingerprint;
        }
        const result = await api(
          f.dataset.game ? "/games/" + f.dataset.game : "/games",
          f.dataset.game ? "PATCH" : "POST",
          b,
          f.dataset.requestKey,
        );
        await refresh();
        if (f.dataset.game) {
          closeModal();
          toast("Score corrected. History preserved.");
        } else {
          const g = {id:result.id,player2:b.opponent,score1:b.score1,score2:b.score2},
            opp = player(g.player2);
          modal(
            `<div class="success"><div class="success-ball">🏓</div><div class="eyebrow orange">IT’S ON THE BOARD</div><h2>Good game. Great receipt.</h2><p>${esc(first(data.user))} vs ${esc(first(opp))}</p><div class="result">${g.score1} : ${g.score2}</div><p>Your standings and the feed are up to date.</p><button class="btn primary full" data-action="rematch" data-opponent="${opp.id}">Record rematch</button><a href="#match/${g.id}" class="btn soft full" data-action="close">View match</a></div>`,
          );
        }
        break;
      case "profile":
        await api("/me", "PATCH", { ...profileDraft, ...b });
        closeModal();
        await refresh();
        location.hash = "profile/" + data.user.id;
        toast("Your player card, your way.");
        break;
      case "comment":
        b.mentions = [...new Set([...b.text.matchAll(/(?:^|\s)@([a-z0-9_]+)/gi)].map(m => data.players.find(p => p.username === m[1].toLowerCase())?.id).filter(Boolean))];
        if (f.dataset.fingerprint !== JSON.stringify(b)) {
          f.dataset.requestKey = crypto.randomUUID();
          f.dataset.fingerprint = JSON.stringify(b);
        }
        await api("/games/" + f.dataset.game + "/comments", "POST", b, f.dataset.requestKey);
        commentsOpen.add(f.dataset.game);
        await refresh();
        toast("Added to the table talk.");
        break;
      case "key":
        const k = await api("/agent-keys", "POST", b);
        setupToken = k.token;
        await refresh();
        modal(
          `<div class="eyebrow orange">KEEP THIS ONE PRIVATE</div><h2>Your key is ready.</h2><p class="muted">Shown once. Keep it private and disconnect it anytime.</p><div class="code-block">${esc(setupToken)}</div><button class="btn primary full" data-action="copy-key" style="margin-top:20px">Copy key</button><p class="tooltip-note">Send requests to ${esc(location.origin)}${apiBase} with Authorization: Bearer &lt;key&gt;. Download the skill for the supported commands.</p>`,
        );
        break;
    }
  } catch (err) {
    const target = f.querySelector(".form-error");
    if (target) target.textContent = err.message;
    else toast(err.message);
  } finally {
    if (btn?.isConnected) btn.disabled = false;
  }
});
document.addEventListener("change", async (e) => {
  if(e.target.dataset.preference === "notifications") {
    try {await api("/me","PATCH",{notifications:e.target.checked});await refresh();toast("Email preferences saved.");}
    catch(err) {e.target.checked=!e.target.checked;toast(err.message);}
    return;
  }
  if (e.target.id !== "photo-upload") return;
  const f = e.target.files[0];
  if (!f) return;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
    f.size > 2000000
  ) {
    toast("Choose a JPG, PNG, or WebP photo under 2 MB.");
    return;
  }
  const image = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(f);
  });
  profileDraft.image = image;
  $("#photo-preview").innerHTML = avatar(profileDraft, "large");
});
document.addEventListener("input", (e) => {
  if(e.target.name === "text" && e.target.closest('[data-form="comment"]')) {
    const input=e.target, picker=input.closest("form").querySelector(".mention-picker");
    const match=/(?:^|\s)@([a-z0-9_]*)$/i.exec(input.value.slice(0,input.selectionStart));
    const matches=match ? data.players.filter(p => (p.username+" "+p.name).toLowerCase().includes(match[1].toLowerCase())).slice(0,6) : [];
    picker.hidden=!matches.length;
    picker.innerHTML=matches.map(p=>`<button type="button" data-action="mention" data-player="${p.id}">${avatar(p,"tiny")}<span>${esc(p.name)} <small>@${esc(p.username)}</small></span></button>`).join("");
  }
  if (e.target.id === "player-search") {
    let found = 0;
    document.querySelectorAll("[data-player-search]").forEach((card) => {
      card.hidden = !card.dataset.playerSearch.includes(
        e.target.value.toLowerCase(),
      );
      if (!card.hidden) found++;
    });
    $("#search-empty").hidden = found > 0;
  }
});
document.addEventListener("keydown", (e) => {
  if (!$("#modal-root").firstChild) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab") {
    const focusable = [
      ...$("#modal-root").querySelectorAll(
        "a[href],button,input,textarea,select",
      ),
    ].filter((el) => !el.disabled && el.offsetParent !== null);
    const first = focusable[0],
      last = focusable.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  if (!isDemo) refresh().catch(e=>toast(e.message));
  else render();
  window.scrollTo(0, 0);
});
$("#app").innerHTML =
  '<div class="loading"><div class="spinner"></div>Getting the clubhouse ready…</div>';
refresh().catch((e) => {
  $("#app").innerHTML = empty("The table needs a moment.", esc(e.message));
});
