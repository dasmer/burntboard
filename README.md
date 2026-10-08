# Burntboard 🏓

The Burnt × Allowance ping pong clubhouse: match feed, flat comments with @mentions, one reaction per person per post, player cards, standings, activity history, and personal agent connections. No administrator features.

## Local app and demo

Node 22 or later:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure server credentials before starting. Open http://localhost:4173 for the real app connected to the selected backend; http://localhost:4173/demo shows the approved prototype with sample players and matches. The demo has its own in-memory API at /demo/api/v1, fixed demo code 123456, and reset control. It sends no email and never writes to the real backend. Demo state resets on restart and is shared within one server process.

## Authentication and data

Only exact @useallowance.com and @getburnt.ai addresses can join. Resend sends first-party, single-use six-digit codes, valid for ten minutes with three verification attempts. Browser sessions use HttpOnly cookies; personal agent keys are shown once, expire after 90 days, and can be revoked. Credentials are stored as hashes. The private InsForge bucket player-photos stores validated, resized WebP photos, served only after app authentication.

Every mutation is authorized server-side. Only participants can correct scores; revisions prevent concurrent edits from overwriting each other. Match, comment, reaction, and subscription writes require Idempotency-Key. A database transaction saves the change, audit event, and email queue together. Public backend roles have no access to the clubhouse tables or mutation functions.

Email notifications cover matches recorded/corrected, new comments, and new agent connections. Comment recipients are the union of participants, prior commenters, and people mentioned on that match. Each recipient gets at most one email per event; the actor is excluded from social notifications. A mention subscribes immediately, subscriptions remain after comment removal, and a later mention never overrides a mute. Users can mute comments on one match or disable social emails globally; login and agent security emails remain enabled. No reaction emails or grouped messages.

The Agents page creates a named personal key and a setup instruction containing the downloadable skill. The same API powers human and agent actions. See skills/burntboard/SKILL.md for commands; /agent.md serves that file. Agents cannot impersonate another player or acquire administrator powers.

## Testing without touching production

The linked development project is burntboard-test (or a fresh burntboard-series-test for series validation), separate from any production backend. Integration tests refuse to run unless APP_ENV=test, the linked project name matches, and the backend URL matches the link. Startup also checks the database environment marker against APP_ENV.

Set EMAIL_TEST_RECIPIENTS to an exact authorized inbox. EMAIL_TEST_SINK optionally routes all eligible test identities to that inbox. bob@am.useallowance.com is the controlled test sink used during development; it is not an eligible signup domain. Set EMAIL_DELIVERY_ENABLED=false while running fixtures to leave notification emails queued; login emails still send to the permitted sink. Production refuses test routing settings.

```sh
npm test
# In another terminal, run the isolated real app:
PORT=4176 APP_ORIGIN=http://localhost:4176 npm run dev
npm run test:integration
```

The integration suite covers real InsForge transactions, authorization, OTP reuse, concurrent corrections, idempotency, subscriptions and mention recipient deduplication, muted recipients, one-reaction replacement, agent revocation, CSRF, pagination, aggregate standings, and private photo uploads. It creates synthetic users and matches only in burntboard-test. Real email receipt and browser walkthroughs are separate checks; passing fixtures does not establish production deployment.

## Production setup and cutover

The previous site is static. This app requires the Node server; GitHub Pages cannot run authentication or the API. Do not cut over burntboard.com until a separately provisioned empty production backend and server are ready. Legacy players.json, games.json, SETUP.md and CLAUDE.md are retained as archival source only; the app never reads or imports them.

1. Create and link a separate InsForge production project using the InsForge CLI. Confirm the project identity before applying anything. Apply migrations with npx -y @insforge/cli db migrations up --all.
2. Create a private player-photos storage bucket. Set the singleton bb_environment row to production through the infrastructure CLI. The default unconfigured marker deliberately prevents accidental startup.
3. Set server-only INSFORGE_URL, INSFORGE_API_KEY, RESEND_API_KEY, a random OTP_SECRET of at least 32 characters, APP_ENV=production, and the HTTPS APP_ORIGIN. Omit EMAIL_TEST_SINK and EMAIL_TEST_RECIPIENTS. Keep secrets out of the frontend and image build.
4. Build the included Dockerfile and deploy it to InsForge compute using the CLI compute workflow. HOST=0.0.0.0 and PORT=8080 are set in the image. The process hosts the client, API, /demo, private photo proxy, and email queue worker together. Verify that only the gateway can reach the server and appends the real client IP to X-Forwarded-For before enabling TRUST_PROXY=true; otherwise login rate limits use the socket address. Do not enable proxy trust on a directly exposed server.
5. Verify the empty roster, real allowed-domain login, score recording/correction, comments/mentions, email receipt, agent authentication/revocation, and /demo isolation on the new service before DNS cutover. Use real first-user actions rather than importing test fixtures.

The queue leases work to avoid simultaneous workers and uses Resend idempotency keys. Uncertain deliveries stop retrying before the provider's 24-hour deduplication window expires; inspect bb_outbox for unsent rows and last_error during operations. Interrupted delivery may require an operator to reconcile a row with Resend before retrying. There is no in-app admin panel.

Each game is a completed best-of-three series: two matches for a sweep, three when the first two are split. Matches are to 11, win by two. The API accepts an ordered matches array, and the database generates series win totals. Leaderboard wins/losses count games; points sum all match points. Prelaunch schema definitions are updated in place; no historical-data migration or score conversion is included. Existing prelaunch databases need their empty game schema rebuilt before this server is deployed.
