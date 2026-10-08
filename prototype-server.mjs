import http from "node:http";
import {seriesScore} from "./series.mjs";
import { readFile } from "node:fs/promises";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { dirname, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url)),
  hash = (s) => createHash("sha256").update(s).digest("hex"),
  now = () => new Date().toISOString();
let state;
const sessions = new Map();
function seed() {
  sessions.clear();
  const players = [
    {
      id: "dasmer",
      name: "Dasmer Singh",
      username: "dasmer",
      email: "dasmer@useallowance.com",
      bio: "Claims he barely plays. The receipts say otherwise.",
      image: "/images/players/dasmer.jpg",
      color: "#ee582d",
    },
    {
      id: "ben",
      name: "Benjamin Fernandes",
      username: "benji",
      email: "ben@getburnt.ai",
      bio: "Tennis skills. Ping pong ambitions.",
      image: "/images/players/bob-benji.jpg",
      color: "#739783",
    },
    {
      id: "jj",
      name: "JJ",
      username: "indianmamba",
      email: "jj@getburnt.ai",
      bio: "Here to hand out L’s. Respectfully.",
      image: "/images/players/jjburnt.jpg",
      color: "#e6b657",
    },
    {
      id: "rhea",
      name: "Rhea",
      username: "rhea",
      email: "rhea@getburnt.ai",
      bio: "One more game. Always one more game.",
      avatar: "✿",
      color: "#b3a4ce",
    },
    {
      id: "chan",
      name: "Chan",
      username: "chan",
      email: "chan@getburnt.ai",
      bio: "The backhand is a work in progress.",
      avatar: "⚡",
      color: "#819ebc",
    },
    {
      id: "alex",
      name: "Alex",
      username: "alex",
      email: "alex@useallowance.com",
      bio: "Less talk. More topspin.",
      avatar: "◎",
      color: "#e1a184",
    },
  ];
  const pairs = [
    [
      "dasmer",
      "ben",
      11,
      7,
      "Finally figured out that serve. Rematch after lunch?",
    ],
    ["rhea", "jj", 12, 10, "That last rally deserves its own documentary."],
    ["jj", "chan", 11, 6, "The Mamba strikes again."],
    ["ben", "alex", 11, 9, "A little too close for comfort."],
    ["dasmer", "jj", 7, 11, "We don’t talk about this one."],
    ["chan", "rhea", 11, 8, "New paddle. New era."],
    ["jj", "ben", 11, 5, ""],
    ["dasmer", "alex", 11, 4, ""],
    ["ben", "dasmer", 11, 9, ""],
    ["rhea", "alex", 11, 7, ""],
  ];
  const games = pairs.map((p, i) => ({
    id: `match-${i + 1}`,
    player1: p[0],
    player2: p[1],
    ...seriesScore(i % 2 ? [{score1:p[2],score2:p[3]},{score1:p[3],score2:p[2]},{score1:p[2],score2:p[3]}] : [{score1:p[2],score2:p[3]},{score1:p[2],score2:p[3]}]),
    notes: p[4],
    date: `2026-10-${i < 4 ? "08" : i < 7 ? "07" : "02"}`,
    createdAt: new Date(Date.UTC(2026, 9, 8, 19 - i)).toISOString(),
    actor: p[0],
    revision: 1,
    reactions: i === 0 ? { "🔥": ["ben", "jj"] } : {},
    comments:
      i === 0
        ? [
            {
              id: "c1",
              actor: "ben",
              text: "Enjoy it while it lasts. 😤",
              createdAt: "2026-10-08T19:12:00Z",
            },
            {
              id: "c2",
              actor: "rhea",
              text: "I’m bringing popcorn to the rematch.",
              createdAt: "2026-10-08T19:15:00Z",
            },
          ]
        : [],
    history: [
      {
        id: randomUUID(),
        actor: p[0],
        action: "game.recorded",
        text: "Recorded this game",
        createdAt: new Date(Date.UTC(2026, 9, 8, 19 - i)).toISOString(),
      },
    ],
  }));
  for (const g of games) g.history[0].after={score1:g.score1,score2:g.score2,matches:g.matches,notes:g.notes};
  state = {
    players,
    games,
    keys: [],
    activity: games.map((g) => ({ ...g.history[0], gameId: g.id })),
    challenges: [],
  };
}
seed();
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
const requireUser = (u) => {
  if (!u) throw error("Sign in to join the action.", 401);
  return u;
};
function record(user, action, text, game, extra = {}) {
  const e = {
    id: randomUUID(),
    actor: user.id,
    action,
    text,
    createdAt: now(),
    gameId: game?.id,
    ...extra,
  };
  state.activity.unshift(e);
  if (game) game.history.unshift(e);
  return e;
}
const scores = b => seriesScore(b.matches);
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
export const demoHandler = async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (!url.pathname.startsWith("/api/")) {
        const path = resolve(
          root,
          "." +
            (url.pathname === "/"
              ? "/index.html"
              : decodeURIComponent(url.pathname)),
        );
        if (!path.startsWith(root + sep)) throw error("Not found", 404);
        const f = await readFile(path).catch(() => {
          throw error("Not found", 404);
        });
        res.writeHead(200, {
          "Content-Type": mime[extname(path)] || "application/octet-stream",
        });
        res.end(f);
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 3000000)
          throw error("Photo is too large. Choose one under 2 MB.", 413);
      }
      const b = raw ? JSON.parse(raw) : {};
      const token = (req.headers.authorization || "").replace(/^Bearer /, ""),
        session = sessions.get(hash(token)),
        user = state.players.find((p) => p.id === session?.userId),
        extra = session?.label ? { agent: session.label } : {};
      const path = url.pathname.replace("/api/v1", "");
      let result = {};
      const pub = (p) => {
        const { email, ...rest } = p;
        return rest;
      };
      if (req.method === "GET" && path === "/state")
        result = {
          players: state.players.map(pub),
          games: state.games,
          activity: state.activity,
          user: user || null,
          keys: user
            ? state.keys
                .filter((k) => k.userId === user.id)
                .map(({ tokenHash, ...k }) => k)
            : [],
        };
      else if (req.method === "POST" && path === "/auth/request") {
        const email = String(b.email || "")
          .trim()
          .toLowerCase();
        if (!/^[^\s@]+@(useallowance\.com|getburnt\.ai)$/.test(email))
          throw error("Use your @useallowance.com or @getburnt.ai email.");
        state.challenges.push({ email, expires: Date.now() + 600000 });
        result = { email, demoCode: "123456" };
      } else if (req.method === "POST" && path === "/auth/verify") {
        const email = String(b.email || "").toLowerCase();
        if (
          b.code !== "123456" ||
          !state.challenges.some(
            (c) => c.email === email && c.expires > Date.now(),
          )
        )
          throw error("That code doesn’t match. Try 123456 in this demo.");
        state.challenges = state.challenges.filter((c) => c.email !== email);
        let p = state.players.find((p) => p.email === email);
        const isNew = !p;
        if (!p) {
          p = {
            id: randomUUID(),
            email,
            name: email.split("@")[0],
            username: email.split("@")[0].replace(/[^a-z0-9_]/g, ""),
            bio: "",
            avatar: "🏓",
            color: "#ee582d",
          };
          let n = 2;
          while (state.players.some((x) => x.username === p.username))
            p.username += n++;
          state.players.push(p);
        }
        const token = randomBytes(24).toString("hex");
        sessions.set(hash(token), { userId: p.id });
        result = { token, isNew };
      } else if (req.method === "POST" && path === "/auth/logout") {
        sessions.delete(hash(token));
        result = { ok: true };
      } else if (req.method === "POST" && path === "/reset") {
        seed();
        result = { ok: true };
      } else if (req.method === "PATCH" && path === "/me") {
        requireUser(user);
        const username = String(b.username || "")
          .toLowerCase()
          .trim();
        if (!/^[a-z0-9_]{2,24}$/.test(username))
          throw error(
            "Choose a username with 2–24 letters, numbers, or underscores.",
          );
        if (
          state.players.some((p) => p.id !== user.id && p.username === username)
        )
          throw error("That username is taken. Try another.");
        if (!String(b.name || "").trim()) throw error("Add your display name.");
        const before = {
          name: user.name,
          username: user.username,
          bio: user.bio,
        };
        if (
          b.image &&
          b.image !== user.image &&
          !/^data:image\/(jpeg|png|webp);base64,/.test(b.image)
        )
          throw error("Choose a JPG, PNG, or WebP photo.");
        Object.assign(user, {
          name: String(b.name).slice(0, 60).trim(),
          username,
          bio: String(b.bio || "").slice(0, 200),
          avatar: b.avatar || user.avatar,
          color: b.color || user.color,
          image: b.image === null ? undefined : b.image || user.image,
        });
        record(user, "profile.updated", "Updated their player card", null, {
          ...extra,
          before,
          after: { name: user.name, username: user.username, bio: user.bio },
        });
        result = { ok: true };
      } else if (req.method === "POST" && path === "/games") {
        requireUser(user);
        const opponent = state.players.find((p) => p.id === b.opponent);
        if (!opponent || opponent.id === user.id)
          throw error("Choose another player.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date) || b.date > "2026-10-08")
          throw error("Choose today or an earlier date.");
        const g = {
          id: randomUUID(),
          player1: user.id,
          player2: opponent.id,
          ...scores(b),
          notes: String(b.notes || "").slice(0, 240),
          date: b.date,
          createdAt: now(),
          actor: user.id,
          revision: 1,
          reactions: {},
          comments: [],
          history: [],
        };
        state.games.unshift(g);
        record(user, "game.recorded", "Recorded this game", g, {...extra,after:{score1:g.score1,score2:g.score2,matches:g.matches,notes:g.notes}});
        result = { id: g.id };
      } else if (/^\/games\/[^/]+/.test(path)) {
        requireUser(user);
        const [, , id, action] = path.split("/"),
          g = state.games.find((g) => g.id === id);
        if (!g) throw error("Match not found", 404);
        if (req.method === "PATCH" && !action) {
          if (![g.player1, g.player2].includes(user.id))
            throw error("Only the players in this match can correct it.", 403);
          if (b.revision !== g.revision)
            throw error(
              "This score just changed. Reopen the match before correcting it.",
              409,
            );
          const before = { score1: g.score1, score2: g.score2, matches:g.matches, notes: g.notes },
            after = {
              ...scores(b),
              notes: b.notes === undefined ? g.notes : String(b.notes || "").slice(0, 240),
            };
          Object.assign(g, after, { revision: g.revision + 1 });
          record(
            user,
            "game.corrected",
            `Corrected the score from ${before.score1}–${before.score2} to ${after.score1}–${after.score2}`,
            g,
            { ...extra, before, after },
          );
        } else if (req.method === "POST" && action === "react") {
          if (!["🔥", "🏓", "😂", "👏", "😤"].includes(b.emoji))
            throw error("Choose a reaction.");
          const list = g.reactions[b.emoji] || [],
            had = list.includes(user.id);
          for (const emoji of Object.keys(g.reactions)) {
            g.reactions[emoji] = g.reactions[emoji].filter((id) => id !== user.id);
          }
          if (!had) {
            g.reactions[b.emoji] = [...(g.reactions[b.emoji] || []), user.id];
          }
          record(
            user,
            "reaction.updated",
            `${had ? "Removed" : "Added"} a ${b.emoji} reaction`,
            null,
            { ...extra, gameId: id },
          );
        } else if (req.method === "POST" && action === "comments") {
          const text = String(b.text || "").trim();
          if (!text || text.length > 500)
            throw error("Write a comment under 500 characters.");
          g.comments.push({
            id: randomUUID(),
            actor: user.id,
            text,
            createdAt: now(),
            ...extra,
          });
          record(user, "comment.added", "Commented on this match", null, {
            ...extra,
            gameId: id,
          });
        } else if (req.method === "DELETE" && action === "comments") {
          const c = g.comments.find((c) => c.id === b.id);
          if (!c || c.actor !== user.id)
            throw error("You can only remove your own comments.", 403);
          g.comments = g.comments.filter((c) => c.id !== b.id);
          record(user, "comment.removed", "Removed their comment", null, {
            ...extra,
            gameId: id,
          });
        } else throw error("Not found", 404);
        result = { ok: true };
      } else if (req.method === "POST" && path === "/agent-keys") {
        requireUser(user);
        const token = "bb_local_" + randomBytes(24).toString("hex"),
          label = String(b.label || "My agent").slice(0, 60),
          k = {
            id: randomUUID(),
            userId: user.id,
            label,
            tokenHash: hash(token),
            createdAt: now(),
          };
        state.keys.push(k);
        sessions.set(hash(token), { userId: user.id, label });
        record(user, "agent.connected", `Connected ${label}`, null);
        result = { token, id: k.id };
      } else if (req.method === "DELETE" && path.startsWith("/agent-keys/")) {
        requireUser(user);
        const k = state.keys.find(
          (k) => k.id === path.split("/")[2] && k.userId === user.id,
        );
        if (!k) throw error("Connection not found", 404);
        sessions.delete(k.tokenHash);
        state.keys = state.keys.filter((x) => x !== k);
        record(user, "agent.disconnected", `Disconnected ${k.label}`, null);
        result = { ok: true };
      } else throw error("Not found", 404);
      res.end(JSON.stringify(result));
    } catch (e) {
      res.statusCode = e.status || 500;
      res.end(
        JSON.stringify({
          error: e.status ? e.message : "Something went wrong. Try again.",
        }),
      );
    }
  };
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) http.createServer(demoHandler)
  .listen(Number(process.env.PORT || 4173), "127.0.0.1", () =>
    console.log(
      "Burntboard client demo: http://localhost:" + (process.env.PORT || 4173),
    ),
  );
