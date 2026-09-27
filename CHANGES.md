# Production-readiness changes

Applied on top of the original project to take it from a working demo to
something safe to actually deploy. Every item below was reproduced and
verified against a live Postgres instance before being fixed (see the
"before/after" notes).

## Security

1. **Real password hashing.** Passwords were stored as Base64 — reversible
   in one line (`atob()`), not a hash. Replaced with `bcryptjs` (`bcrypt.hash(password, 10)`).
   Existing accounts created under the old scheme will fail to log in (their
   stored value isn't a bcrypt hash) and need to re-register — there's no
   safe way to migrate a reversible encoding into a real hash without
   knowing the plaintext.
2. **Real auth tokens.** The "Bearer token" was just the user's raw database
   ID (`Authorization: Bearer <user.id>`) — no signature, no expiry, and if
   it ever leaked there was no way to invalidate it short of deleting the
   account. Replaced with signed JWTs (7-day expiry, `jsonwebtoken`).
   Frontend now stores the token (not just the user object) and sends it as
   the bearer credential; an expired/invalid token now gets a clean `401`
   and the user is redirected to `/login` instead of the app silently
   failing.
3. **CORS was `origin: '*'` with `credentials: true`** — a combination
   browsers actually reject, and unsafe if it ever did work. Replaced with
   an explicit allow-list read from `FRONTEND_URL` (comma-separated for
   multiple domains).
4. **Rate limiting added** on `/api/auth/*` (20 req/15min per IP) and as a
   general API-wide baseline (120 req/min per IP), via `express-rate-limit`.
5. **`helmet()`** added for standard security headers.
6. **Input validation added server-side** (previously only the frontend
   validated): email format, password length, hub slug format, link URL
   validity. The frontend can be bypassed with a raw `curl` request, so this
   closes that gap.

## Correctness bugs fixed

7. **Device-based smart rules never actually worked.** The public hub page
   never sent the visitor's device type to the API, so the backend always
   defaulted to `'desktop'` — a "mobile only" link rule silently never
   triggered for anyone. Fixed by detecting device type server-side from
   the `User-Agent` header (more robust than trusting a client-supplied
   value anyway). Verified: a `device: mobile` rule now correctly
   hides/shows depending on request UA.
8. **Editing a hub broke analytics history.** Saving any edit deleted and
   re-inserted every link, which meant every link got a new ID on every
   save — so `analytics.link_id` from before the edit pointed at nothing.
   Rewrote the update to upsert: existing links keep their ID (and their
   click history) across edits; only actually-removed links get deleted.
   Verified with a live DB: a click recorded before an edit still correctly
   attributes to the (renamed) link after the edit.
9. **Location-based rules existed in the UI but were never enforced** by
   the backend at all — silently a no-op. Implemented server-side using
   `geoip-lite` (offline IP→country lookup, no external API calls needed,
   so it works the same in a locked-down AWS network with no internet
   egress).
10. **CSV export broke on titles containing a `"` character** (unescaped
    quotes corrupt the row). Added proper CSV quote-escaping.

## Deployment readiness (for AWS)

11. Added `Dockerfile` (multi-stage: build the Vite frontend, run a slim
    production image, non-root user, container `HEALTHCHECK`).
12. Added `docker-compose.yml` for local dev parity with a real Postgres
    instead of relying on whatever's on your machine.
13. Added `/api/health` endpoint (checks DB connectivity) for ALB/ECS
    health checks.
14. `app.set('trust proxy', 1)` — required so rate limiting, `req.ip`
    (used by the new location rules), and HTTPS detection work correctly
    behind an AWS ALB or nginx.
15. Graceful shutdown (`SIGTERM`/`SIGINT` handlers that stop accepting new
    requests, let in-flight ones finish, then close the DB pool) — matters
    for zero-downtime deploys on ECS.
16. `.env.example` added; app now fails fast with a clear error at boot if
    `JWT_SECRET` or `DATABASE_URL` is missing in production, instead of
    limping along insecurely.
17. See `docs/DEPLOYMENT-AWS.md` for the actual AWS walkthrough (RDS +
    ECS Fargate, or a simpler single-EC2 fallback).

## What wasn't changed

- Data model / schema (users, hubs, links, rules, analytics) — unchanged,
  it was already reasonable (proper foreign keys, cascading deletes).
- No ORM was introduced — the project already used parameterized queries
  correctly throughout (no SQL injection risk found), so raw `pg` stays.
- No test suite was added — out of scope for this pass; worth doing next
  if you keep building on this.
