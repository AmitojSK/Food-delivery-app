# warm-worker — always-on service warmer (Cloudflare Worker)

Render free services spin down after ~15 min idle and take ~90 s to cold start. This Worker is an
**always-on** HTTPS endpoint the frontend "Wake services" button calls **once**; it then pings every
Render origin **server-side** to trigger their boots — including the API gateway, so there's no
"wake the gateway first" chicken-and-egg, no CORS, and no per-IP request volume from the browser.

It only **triggers** the wakes (a short request is enough to start a hibernating container booting);
the ~90 s boot itself is unavoidable. The browser waits it out and the app self-heals.

## Deploy

1. Install Wrangler (Cloudflare's CLI) — or use `npx`:
   ```bash
   npm install -g wrangler
   ```
2. From this directory, log in and deploy:
   ```bash
   cd warm-worker
   wrangler login
   wrangler deploy
   ```
3. Copy the deployed URL it prints, e.g. `https://food-delivery-warm.<your-subdomain>.workers.dev`.
4. Paste that URL into **`WARM_WORKER_URL`** at the top of
   `frontend/food-delivery-ui/src/app/core/warm-up.service.ts`, then rebuild/redeploy the frontend.
   (While `WARM_WORKER_URL` is empty, the button falls back to the in-app gateway probes.)

## Options

- **Abuse control (recommended, since the URL is public):** add a Cloudflare **rate-limiting rule**
  on this Worker's route. Alternatively set a shared token — `wrangler secret put WARM_TOKEN` — and
  call the Worker as `...workers.dev/?k=<token>` (note: a token in the public frontend is visible to
  anyone, so rate-limiting is the stronger control).
- **Keep it in sync:** the Render service URLs are hardcoded in `src/index.js` (`TARGETS`) and the
  allowed caller origins in `ALLOWED_ORIGINS` — update both if any URL changes. They mirror
  `scripts/warm-up.sh`.

## Test

```bash
curl -s "https://food-delivery-warm.<your-subdomain>.workers.dev" | jq
# { "ok": 2, "total": 7, "services": [ { "name": "api-gateway", "status": 200, "ok": true }, ... ] }
```
A low `ok` on a cold stack is expected — the slow services return `waking` and keep booting after the
response; re-checking a minute later shows them up.
