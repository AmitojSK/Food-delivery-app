// Cloudflare Worker — wakes the food-delivery Render free-tier services on demand.
//
// The frontend "Wake services" button (and the browse cold-start recovery) call this ONE always-on
// endpoint. The Worker then pings each Render origin SERVER-SIDE — no CORS, no browser request
// volume, and no "wake the gateway first" chicken-and-egg, because the Worker itself never sleeps.
//
// It does NOT wait out the full ~90s boot (Workers aren't meant to hold a request that long). A
// short request is enough: it reaches Render's edge, which starts booting the hibernating container,
// and that boot continues in the background after we return. The browser then just waits and uses
// the app (the browse page self-heals once the services are up).

const TARGETS = [
  'https://api-gateway-3nle.onrender.com/actuator/health',
  'https://user-service-lk57.onrender.com/actuator/health',
  'https://restaurant-service-c30t.onrender.com/actuator/health',
  'https://food-catalogue-service.onrender.com/actuator/health',
  'https://order-service-aq1v.onrender.com/actuator/health',
  'https://delivery-service-gxjo.onrender.com/actuator/health',
  'https://realtime-service-gklo.onrender.com/actuator/health',
];

// Only these origins may read the response (CORS). Add the partner/delivery apps if their UIs call it too.
const ALLOWED_ORIGINS = new Set([
  'https://food-delivery-ui-n8c3.onrender.com',
  'https://partner-app-65z2.onrender.com',
  'https://delivery-app-csdw.onrender.com',
]);

// Enough to trigger the boot and catch already-warm services; not the full ~90s (Worker duration limits).
const PER_PING_TIMEOUT_MS = 20_000;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request.headers.get('Origin') ?? '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // Optional shared-secret gate. NOTE: when the caller is a public web page the token ends up in
    // that page's JS and is not truly secret — Cloudflare rate-limiting is the real abuse control.
    if (env.WARM_TOKEN) {
      const k = new URL(request.url).searchParams.get('k');
      if (k !== env.WARM_TOKEN) {
        return json({ error: 'forbidden' }, 403, cors);
      }
    }

    const services = await Promise.all(TARGETS.map(ping));
    const ok = services.filter((s) => s.ok).length;
    return json({ ok, total: services.length, services }, 200, cors);
  },
};

async function ping(url) {
  const name = new URL(url).hostname.split('.')[0];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_PING_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { name, status: res.status, ok: res.ok };
  } catch {
    // Timed out / aborted — the request still reached Render's edge and triggered the boot, which
    // keeps going after we give up. Report "waking", not a hard failure.
    return { name, status: 0, ok: false, waking: true };
  } finally {
    clearTimeout(timer);
  }
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    Vary: 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
