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

Participants can share a game from the feed, game detail, or recording receipt. The preview offers native sharing, Copy link, and Save card. Shared URLs serve a public game receipt with server-rendered Open Graph metadata and a 1200×630 PNG containing names, series result, match scores, date, and branding. Notes, comments, emails, photos, profiles, and activity history are excluded.

Receipt links are unlisted signed capabilities: anyone holding one can view that receipt, but there is no public game listing. Corrections update the receipt and version its image URL; external platforms may retain their own preview caches. Rotating OTP_SECRET invalidates existing real receipt links. There is no individual link revocation. Demo receipts use separate process-local signatures and reset on restart. No database changes are required.

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
4. Deploy the included Dockerfile with `npx -y @insforge/cli compute deploy . --name burntboard --always-on --env-file .env.production`. HOST=0.0.0.0 and PORT=8080 are set in the image. Always-on keeps the email queue worker running between visits.
5. Set a random server-only ORIGIN_SECRET of at least 32 characters on both the compute service and InsForge frontend deployment, and set TRUST_PROXY=true on compute. Deploy `hosting/` with `npx -y @insforge/cli deployments deploy hosting`. Its routing sends the client, API, /demo, photos, and skill to the same Node process. Vercel replaces the secret header; the server rejects direct requests without it before trusting visitor-IP headers. www redirects to the canonical apex domain. See [Vercel's documented proxy configuration](https://vercel.com/docs/routing/rewrites#restricting-your-origin-to-vercel-traffic).
6. Attach burntboard.com and www.burntboard.com with the InsForge domains CLI. Use its returned A and CNAME targets in Namecheap, remove the old GitHub Pages A/AAAA records, and preserve the email records. Confirm DNS, HTTPS, the empty roster, login email receipt, and /demo isolation. Keep synthetic match checks in burntboard-test; production stays empty until real users play.

Production is linked as burntboard-production (e4bf0edf-79f4-47b0-ba08-a459cd6a7955). The compute service is b79824a0-7ffe-49a8-9806-9a79e7c8c11b. Credentials remain in ignored local configuration and encrypted hosting settings. Future releases update the existing compute service by name; deploy hosting/ only when routing changes. Neither deployment automatically follows GitHub merges.

The queue leases work to avoid simultaneous workers and uses Resend idempotency keys. Uncertain deliveries stop retrying before the provider's 24-hour deduplication window expires; inspect bb_outbox for unsent rows and last_error during operations. Interrupted delivery may require an operator to reconcile a row with Resend before retrying. There is no in-app admin panel.

Each game is a completed best-of-three series: two matches for a sweep, three when the first two are split. Matches are to 11, win by two. The API accepts an ordered matches array, and the database generates series win totals. Leaderboard wins/losses count games; points sum all match points. Prelaunch schema definitions are updated in place; no historical-data migration or score conversion is included. Existing prelaunch databases need their empty game schema rebuilt before this server is deployed.
