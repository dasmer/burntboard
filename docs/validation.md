# Validation and rollout boundary

This is the historical validation snapshot from the initial app implementation on October 8, 2026. Coverage counts, scoring UI, and pre-cutover deployment notes below describe that stage; use [README.md](../README.md) for current tests and release instructions.

All database fixtures and browser writes use **burntboard-test**. No production backend was seeded, no historical JSON was imported, and the PR is not merged or deployed.

## Automated coverage

- `npm test`: Node syntax checks, legacy JSON validation, and 37 isolated prototype checks.
- `npm run test:integration`: 95 checks against the real app API and InsForge test database. Includes single-use/expired/locked OTPs, exact-domain eligibility, private browser cookies, concurrent corrections, preserved notes/history, retry deduplication, outsider denial, subscriptions and mentions, mute/opt-out, one-reaction replacement/removal, agent attribution/revocation/expiry, CSRF, logout, private photos, same-timestamp pagination, full aggregate standings, concurrent email leases, delayed first delivery, delivery-window cutoff, blocked test recipients, production/test mismatch refusal, and bounded read recovery.
- InsForge catalog inspection: all 12 application tables have RLS enabled; anon/authenticated cannot read them. Application functions do not grant anon/authenticated execution. The browser receives no backend credential or other players' email addresses.
- Canonical skill passes the skill creator's validator.

## Real integrations and browser walkthrough

Real OTP, agent security, and comment notification emails were delivered through Resend and read in the authorized Bob test inbox. The comment had one logical recipient and remained at one delivery attempt after repeating the worker invocation. Broad fixture email delivery remains disabled.

The real browser journey signed in by emailed code, completed a player card, recorded a game, selected an @mention, posted the comment, corrected 11–7 to 11–9, displayed both scores in history, and persisted social-email opt-out. API tests separately verify upload decoding and private storage delivery, and human/agent permission parity. No external Codex/Claude Code/Muse installation is claimed; the setup prompt and valid skill are provided for those clients.

An extended pagination test initially exposed long request URLs and unsupported nested query filters. Database-side keyset pagination and one POST-based content function replace those queries. Later repeats exposed intermittent socket resets; InsForge backend logs confirmed an upstream Axios socket error. The final implementation removes per-page query fan-out and retries only side-effect-free reads, at most twice. Mutations are not blindly retried. A failed attempt is not counted as a passing run.

## Screenshot matrix

The [screen walkthrough](ui-preview.html) contains 19 screenshots:

| Viewport | States |
| --- | --- |
| Desktop 1440 × 1000 | Guest feed, signed-in feed, login, standings, players, profile, activity, agents, match, record form, correction form, profile edit |
| Mobile 390 × 844 | Feed, standings, agents, match |
| Real test backend | Recording confirmation, mention picker, preserved score history |

Shared picker/modal layouts are captured once instead of repeated on every route. Mobile feed, standings, and agents have no horizontal overflow. No prior PR screenshot comments existed to replace.

## Deployment requirements and follow-ups

The existing static host cannot run this API. Before cutover, provision a separate empty production InsForge backend, apply migrations, create the private photo bucket, mark the backend production, configure server-only secrets, deploy the Docker server, verify gateway client-IP behavior, and perform live smoke checks. See the README for the sequence. `/demo` is implemented and isolated locally; a public burntboard.com/demo URL becomes available only after that deployment.

Uncertain email deliveries older than the provider's deduplication window require operator reconciliation through infrastructure tools. Superseded private photo objects currently remain in storage; periodic orphan cleanup is a follow-up. Neither adds an administrator product surface. No remaining blocking review findings were identified after the recorded fixes and final checks.
