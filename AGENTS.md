# AGENTS.md: AI-Powered Reverse Proxy Assessment

## Mission

Help the user finish a take-home assessment (8-12 h): a small reverse proxy that asks an AI model whether each request is malicious, blocks bad traffic, and gives an admin a dashboard to review, block and unblock.

**Goal: every required item and deliverable is met, simply and correctly. Nothing more.**
A small, working, well-explained core beats a long, half-finished feature list.

## Rules for the agent

1. **Do not hallucinate.** Only build what is listed here. If a requirement is unclear, say so, propose one reasonable assumption, and record it in the README. Never invent APIs, library functions, or config options: check docs or the installed package first.
2. **Do not over-engineer.** No extra features, layers, abstractions, or dependencies beyond what a requirement needs. No optional/bonus items until ALL required items work, and only if the user asks.
3. **Keep it simple and readable.** Small modules, clear names, all config in one file (`config.ts` or equivalent), no secrets in the repo.
4. **Make small, focused changes.** When the user says "only change X", change only X.
5. **The user must understand every line.** A follow-up call will ask them to explain and change any line. After each step, briefly explain what the code does and why. Do not dump large unexplained code.
6. **Guide the user.** When guiding implementation, end with the current or next project step.
   For debugging, explanations, or code review, solve the immediate issue first
   and do not advance until the current step passes its check.
7. **Verify before moving on.** Each step has a check. Run it or tell the user how to run it. Do not claim something works without running it.
8. **Commit per step.** Suggest a git commit after each step (real history required; never one final commit).
9. **Safety.** Test traffic goes only to the user's own local setup.
10. **Cut scope honestly.** If something is dropped, record what and why in the README.
11. **Track time honestly.**
    Keep a running note of time spent based on times the user provides or explicitly
    starts/stops. Never estimate or invent hours worked.

## Requirements (use these IDs in the README)

**Proxy core**

- P1: Listen on `PROXY_PORT` (default 8080). Forward method, path, query, headers, body to `UPSTREAM_URL`.
- P2: Return the upstream response unchanged (status, headers, body).
- P3: Add `X-Forwarded-For` and `X-Request-ID` on the way in. Echo `X-Request-ID` on the response.
- P4: Blocked requests get `403` with `{ "blocked": true, "requestId": "...", "reason": "..." }`.
- P5: Upstream unreachable is `502` with a JSON error. Upstream timeout is `504`.
- P6: Include a tiny sample upstream app (JSON endpoints such as `/`, `/products`, `/login`).

**AI decision engine**

- A1: For each request reaching the AI, build a compact summary: method, path, query, client IP, User-Agent, a few other headers, first 2 KB of body, that IP's request count in the last minute.
- A2: AI returns structured JSON: `decision` (allow|block), `confidence` (0-1), `category` (e.g. sql_injection, xss, path_traversal, scanner_or_bot, rate_abuse, benign), `reason` (one sentence).
- A3: Validate the response. If malformed, timed out (`AI_TIMEOUT_MS`, default 2000) or errored, apply `FAIL_MODE` (open = allow, default; closed = block). Log every fallback.
- A4: Block only if confidence >= `BLOCK_CONFIDENCE` (default 0.7). Below it, allow and flag as suspicious in the log.
- A5: Auto-block an IP after `AUTO_BLOCK_THRESHOLD` AI blocks (default 5) within `AUTO_BLOCK_WINDOW_MIN` minutes (default 10), for `BLOCK_DURATION_MIN` minutes (default 30). Temporary blocks expire on their own.
- A6: AI review: given a blocked IP and its recent history, the AI recommends keep or lift with a reason. The admin confirms before anything changes.

**Rules**

- R1: Manual allowlist and blocklist by IP (CIDR optional).
- R2: Order: allowlist, then blocklist (manual + active auto-blocks), then AI. Manual rules always beat the AI. The AI is called only when no rule applies.
- R3: Record the source of every decision: `rule`, `ai`, or `fallback`.

**Admin API** (own port `ADMIN_PORT`, default 9090, never proxied, token from `ADMIN_TOKEN` env var)

- `GET /api/requests` (paginated; filter by decision, source, IP)
- `GET /api/requests/:id` (summary + AI reasoning)
- `GET /api/blocks` (active blocks: source, reason, expiry)
- `POST /api/blocks` (block an IP, optional duration)
- `DELETE /api/blocks/:ip`
- `POST /api/blocks/:ip/review` (A6)
- `GET /api/stats` (total requests, block rate, AI call count, average AI latency)

**Dashboard**

- D1: Login with the admin token.
- D2: Request log table: time, IP, method, path, decision, source, confidence, category, latency. Filter by decision and IP. Refresh at least every 5 s (polling is fine).
- D3: Request detail view: summary sent to the AI and the AI's reason.
- D4: Blocked-IPs view: source, reason, time left, Unblock button, form to block an IP.
- D5: "Ask AI to review" button on each block: show the recommendation, admin accepts or dismisses.
- D6: Stats panel: total requests, % blocked, AI calls, average AI latency.

**Technical**

- Mainstream stack. The proxy forwarding may use a library, but **the decision pipeline must be the user's own code**.
- Storage: SQLite, Postgres, or MongoDB. Redis optional.
- AI provider behind one small interface, chosen by `AI_PROVIDER`.
- **`AI_PROVIDER=mock` is required**: works with no API key, uses simple heuristics that behave like the real classifier.
- `.env.example` shipped. Never commit API keys.
- `docker compose up` starts proxy, admin API, dashboard, and sample upstream, in mock mode, on a fresh machine. **If it does not start, the score is capped at 40.**
- Tests: unit tests for the pipeline with the AI mocked (rule precedence, fail mode, confidence threshold, auto-block threshold) plus at least one integration test through the running proxy. One command runs them.
- Traffic script: normal traffic plus SQL injection strings, script tags, `../../etc/passwd` paths, scanner user agents, and a burst from one IP.

**Config env vars (defaults):** `UPSTREAM_URL` (http://upstream:3000), `PROXY_PORT` (8080), `ADMIN_PORT` (9090), `ADMIN_TOKEN` (none), `AI_PROVIDER` (mock), `AI_TIMEOUT_MS` (2000), `FAIL_MODE` (open), `BLOCK_CONFIDENCE` (0.7), `AUTO_BLOCK_THRESHOLD` (5), `AUTO_BLOCK_WINDOW_MIN` (10), `BLOCK_DURATION_MIN` (30).

**Out of scope (do NOT build; only mention in README how you would approach them):** TLS termination, load balancing, WebSockets through the proxy, multi-node deployment, production hardening.

**Bonus (optional, only after everything required works, max +10 points):** prompt-injection defence with a test, feedback loop, live updates (SSE/WebSocket), pre-filter, verdict cache, streaming, metrics. Do not start these unless the user asks.

## Steps (guide the user through these in order)

**Step 0:** Stack and repo setup. Confirm the stack if it isn't already known (don't ask again if it is). Then create the repo and folder layout (proxy, admin API, dashboard, upstream, tests). Add .env to .gitignore. Commit.

**Step 1: Sample upstream (P6).** Tiny app with JSON endpoints. _Check: `curl` each endpoint._ _Commit._

**Step 2: Proxy core (P1-P5).**

Implement the reverse proxy only; no AI or rules yet.

- Listen on `PROXY_PORT` and forward method, path, query, headers, and full body to `UPSTREAM_URL`.
- Return the upstream status, headers, and body unchanged.
- Add `X-Request-ID` and `X-Forwarded-For`; echo `X-Request-ID` in the response.
- Use the socket IP for security decisions; do not trust client-supplied `X-Forwarded-For`.
- Add the reusable P4 `403` blocked-response helper, but no blocking logic yet.
- Return `502` if the upstream is unreachable and `504` on timeout.
- Preserve the full request body exactly. Don't let framework body parsing (e.g. express.json()) consume or re-serialize it. Step 6 copies only the first 2 KB into the AI summary while the full body continues upstream.

**Check:** test GET/POST/PUT/PATCH/DELETE, query strings, bodies, headers, request ID, `X-Forwarded-For`, `502`, and `504`.

**Commit:** `feat: implement reverse proxy core`

**Step 3: Config and storage.**
Create the config module and the database schema for:

- request logs, with columns: id, timestamp, IP, method, path, query, decision, source (rule|ai|fallback), confidence, category, reason, suspicious flag, AI latency, total latency, and the summary sent to the AI (JSON)
- blocks (manual and automatic)
- manual allow rules

Define the request-log columns now so the schema doesn't change later. They can stay empty until Steps 4-6 fill them in. Stats (AI call count, average AI latency) are computed from this table. Don't add full decision logging until Steps 4-6.
_Check: the app starts and the tables are created._ _Commit._

**Step 4: Rules (R1-R3).**
Implement manual allowlist, manual blocklist, and active auto-block checks in
the required order.

Use the block storage/model for manual and automatic blocks.
The admin endpoints for managing them are added in Step 8.

Order:

1. manual allowlist
2. manual blocklist + active auto-blocks
3. AI only when no rule matched

Record rule decisions with `source = rule`.

Commit.

**Step 5: AI provider interface + mock provider (A2).** Interface with `classify` and `review`. Mock uses simple heuristics (SQL injection, `<script`, `../`, scanner user agents, high request rate). _Commit._

**Step 6: Decision pipeline (A1, A3, A4, A5).** Summary builder, timeout, validation, fail mode, confidence threshold, suspicious flag, auto-block. Make the AI and rules injectable so they can be tested. _Commit._

**Step 7: Unit tests + one integration test.** Cover rule precedence, fail mode, confidence threshold, auto-block threshold, and one request through the running proxy. _Check: one command runs them and they pass._ _Commit._

**Step 8: Admin API.** All endpoints above, token auth, AI review (A6). _Check: curl each endpoint with and without a token._ _Commit._

**Step 9: Dashboard (D1-D6).** Plain and clear, no visual polish needed. Polling every 5 s or less. _Commit._

**Step 10: Real AI provider.** Add one real provider (e.g. Anthropic, OpenAI, Gemini, or Ollama) behind the same interface, chosen by `AI_PROVIDER`. Structured JSON output, validated the same way. No key in the repo. _Commit._

**Step 11: Traffic script.** Mixed normal and malicious traffic plus a burst from one IP. _Check: the dashboard fills up, auto-block triggers._ _Commit._

**Step 12: Docker final verification.**

Add each service to `docker-compose.yml` as it is built rather than waiting
until this step.

Verify that `docker compose up` from a fresh clone starts:

- proxy
- admin API
- dashboard
- sample upstream
- database, if using an external database such as Postgres

It must start in `AI_PROVIDER=mock` mode without an AI API key. Ship `.env.example` with all required variables and defaults, and document any required copy/rename step in the README.

**Check:** `docker compose up` starts cleanly and the proxy, upstream,
admin API, and dashboard communicate correctly.

**Commit:** `chore: finalize docker setup`

**Step 13: README.** Include:

- Setup in 5 steps or fewer
- Architecture overview
- How the pipeline works, referencing requirement IDs
- The AI prompt used and why
- Trade-offs, known limitations, what you would do with more time, and any scope cut
- How to run tests and the traffic script
- Assumptions made
- Design answers (below)
- Time and AI-tool note (deliverable 8)

**Design answers (short, 1-2 paragraphs each):**

1. How is added latency kept low when the AI takes a second or more?
2. What happens when the AI is down, slow, or confidently wrong? How does an admin notice?
3. How is malicious request content stopped from manipulating the AI (prompt injection)?
4. What would change to handle 1,000 req/s across several proxy instances?

**Step 14: Final check.** From a fresh clone: `docker compose up`, run the traffic script, run the tests, walk the README. Confirm the checklist below. _Commit._

**Step 15: Demo video (3-5 min).** Start the stack, run the traffic script, show blocked requests, unblock an IP, run an AI review on a block. The user records it and shares a link viewable by anyone.

**Step 16: Submit.** Reply to the email with the repo link (public, or private and shared with the named reviewer), the demo video link, and the hours spent and AI-tool note.

## Deliverables checklist (1-6 are required; missing any means no full review)

1. Git repo with real commit history (proxy, admin API, dashboard, upstream, tests)
2. `docker compose up` + `.env.example`, starts cleanly in mock mode
3. README (setup, architecture, pipeline with IDs, AI prompt, trade-offs)
4. Tests + the single command that runs them
5. Traffic script + how to run it in the README
6. Demo video (3-5 min)
7. Design answers in the README
8. Time and AI-tool note

## How it is graded

AI integration and decision design 25 · Proxy correctness 20 · Code quality and structure 15 · Dashboard and API 15 · README, design answers, demo 15 · Testing 10.

## Ground rules from the assessment

- AI coding tools are allowed but must be disclosed (which ones, for what).
- The submission must be the user's own work; the user must be able to explain and change any line.
- Ambiguity: make a reasonable assumption and write it in the README.
- Questions can be emailed to the company (answer within one working day).
