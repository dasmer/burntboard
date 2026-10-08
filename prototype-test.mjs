import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
const child = spawn(process.execPath, ["prototype-server.mjs"], {
  env: { ...process.env, PORT: "4174" },
  stdio: ["ignore", "pipe", "inherit"],
});
await once(child.stdout, "data");
let checks = 0;
async function call(path, method = "GET", body, token) {
  const r = await fetch("http://localhost:4174/api/v1" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (token || ""),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
function check(value, expected) {
  assert.deepEqual(value, expected);
  checks++;
}
async function login(email) {
  check((await call("/auth/request", "POST", { email })).status, 200);
  const r = await call("/auth/verify", "POST", { email, code: "123456" });
  check(r.status, 200);
  return r.body.token;
}
try {
  check(
    (await call("/auth/request", "POST", { email: "outsider@example.com" }))
      .status,
    400,
  );
  check(
    (
      await call("/auth/verify", "POST", {
        email: "dasmer@useallowance.com",
        code: "111111",
      })
    ).status,
    400,
  );
  const dasmer = await login("dasmer@useallowance.com"),
    rhea = await login("rhea@getburnt.ai");
  const publicState = (await call("/state")).body;
  check(publicState.user, null);
  check(
    publicState.players.some((p) => "email" in p),
    false,
  );
  check(
    (
      await call("/games", "POST", {
        opponent: "ben",
        matches: [{score1:11,score2:7},{score1:11,score2:9}],
        date: "2026-10-08",
      })
    ).status,
    401,
  );
  check(
    (
      await call(
        "/games",
        "POST",
        { opponent: "ben", matches:[{score1:11,score2:10},{score1:11,score2:9}], date: "2026-10-08" },
        dasmer,
      )
    ).status,
    400,
  );
  const created = await call(
    "/games",
    "POST",
    {
      opponent: "ben",
      matches:[{score1:14,score2:12},{score1:9,score2:11},{score1:11,score2:7}],
      date: "2026-10-08",
      notes: "A deuce finish",
    },
    dasmer,
  );
  check(created.status, 200);
  const id = created.body.id;
  check(
    (
      await call(
        "/games/" + id,
        "PATCH",
        { matches:[{score1:11,score2:9},{score1:11,score2:8}], revision: 1 },
        rhea,
      )
    ).status,
    403,
  );
  check(
    (
      await call(
        "/games/" + id,
        "PATCH",
        { matches:[{score1:11,score2:9},{score1:11,score2:8}], revision: 1 },
        dasmer,
      )
    ).status,
    200,
  );
  check(
    (
      await call(
        "/games/" + id,
        "PATCH",
        { matches:[{score1:11,score2:8},{score1:11,score2:7}], revision: 1 },
        dasmer,
      )
    ).status,
    409,
  );
  let s = (await call("/state", "GET", undefined, dasmer)).body,
    g = s.games.find((g) => g.id === id);
  check(g.history.length, 2);
  check(g.history[0].before.matches[0].score1, 14);
  check(g.score2, 0);
  check(g.matches.length,2);
  check(
    (
      await call(
        "/me",
        "PATCH",
        { ...s.user, bio: "Updated bio with existing photo" },
        dasmer,
      )
    ).status,
    200,
  );
  check(
    (await call("/me", "PATCH", { ...s.user, username: "rhea" }, dasmer))
      .status,
    400,
  );
  check(
    (
      await call(
        "/games/" + id + "/comments",
        "POST",
        { text: "Great game" },
        dasmer,
      )
    ).status,
    200,
  );
  s = (await call("/state", "GET", undefined, dasmer)).body;
  const comment = s.games.find((g) => g.id === id).comments[0];
  check(
    (
      await call(
        "/games/" + id + "/comments",
        "DELETE",
        { id: comment.id },
        rhea,
      )
    ).status,
    403,
  );
  check(
    (
      await call(
        "/games/" + id + "/comments",
        "DELETE",
        { id: comment.id },
        dasmer,
      )
    ).status,
    200,
  );
  check(
    (await call("/games/" + id + "/react", "POST", { emoji: "🔥" }, dasmer))
      .status,
    200,
  );
  await call("/games/" + id + "/react", "POST", { emoji: "👏" }, rhea);
  await call("/games/" + id + "/react", "POST", { emoji: "😂" }, dasmer);
  let reactions = (await call("/state")).body.games.find((g) => g.id === id).reactions;
  check(reactions["🔥"].includes("dasmer"), false);
  check(reactions["😂"], ["dasmer"]);
  check(reactions["👏"], ["rhea"]);
  await call("/games/" + id + "/react", "POST", { emoji: "😂" }, dasmer);
  reactions = (await call("/state")).body.games.find((g) => g.id === id).reactions;
  check(Object.values(reactions).flat().includes("dasmer"), false);
  check(reactions["👏"], ["rhea"]);
  const connection = await call(
    "/agent-keys",
    "POST",
    { label: "Test Codex" },
    dasmer,
  );
  check(connection.status, 200);
  check(
    (
      await call(
        "/games/" + id + "/comments",
        "POST",
        { text: "Posted through the shared agent API" },
        connection.body.token,
      )
    ).status,
    200,
  );
  s = (await call("/state", "GET", undefined, dasmer)).body;
  check(s.games.find((g) => g.id === id).comments[0].agent, "Test Codex");
  check("tokenHash" in s.keys[0], false);
  check(
    (await call("/agent-keys/" + connection.body.id, "DELETE", {}, dasmer))
      .status,
    200,
  );
  check(
    (
      await call(
        "/games/" + id + "/comments",
        "POST",
        { text: "Should fail" },
        connection.body.token,
      )
    ).status,
    401,
  );
  const newcomer = await login("newplayer@getburnt.ai");
  check(
    (await call("/state", "GET", undefined, newcomer)).body.user.email,
    "newplayer@getburnt.ai",
  );
  console.log(
    `Passed ${checks} prototype checks: login, privacy, valid/deuce scores, permissions, revisions, profile photos, comments, reactions, agent parity and revocation.`,
  );
} finally {
  child.kill();
}
