/**
 * Shelf Life barcode proxy.
 *
 * Most barcode databases refuse cross-origin browser calls, so a static page
 * cannot reach them. This Worker makes the call server-side and returns one
 * normalised shape. API keys live in Worker secrets, never in the public repo.
 *
 *   GET /lookup?code=4901301280367  ->  { found, result, tried }
 */

const ALLOWED_ORIGINS = [
  "https://jkw2lo.github.io",
  "http://localhost:8742",
  "http://127.0.0.1:8742",
];

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=86400",
      ...cors(origin),
    },
  });

function cors(origin) {
  const ok = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "access-control-allow-origin": ok ? origin : ALLOWED_ORIGINS[0],
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/** Sizes hide in the product title on Asian marketplaces: "... 70g" */
function parseSize(title) {
  const m = String(title || "").match(/(\d+(?:[.,]\d+)?)\s*(ml|mL|ML|ｍｌ|g|ｇ|グラム|ミリ)/);
  if (!m) return null;
  const v = parseFloat(m[1].replace(",", "."));
  return v > 0 && v <= 2000 ? v : null;
}

const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : null);

async function getJSON(url, init) {
  const r = await fetch(url, { ...init, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

/* ---- sources, tried in order of how much they actually tell us ---- */

async function openBeautyFacts(code) {
  const d = await getJSON(
    `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json` +
      `?fields=product_name,product_name_en,brands,quantity,periods_after_opening,ingredients_text,image_front_small_url`,
    { headers: { "user-agent": "ShelfLife/1.0 (personal inventory)" } }
  );
  if (!d || d.status !== 1 || !d.product) return null;
  const p = d.product;
  const q = String(p.quantity || "");
  const ml = q.match(/([\d.,]+)\s*m?l\b/i);
  const pao = String(p.periods_after_opening || "").match(/(\d+)/);
  return {
    name: clean(p.product_name_en) || clean(p.product_name),
    brand: clean((p.brands || "").split(",")[0]),
    volumeMl: ml ? parseFloat(ml[1].replace(",", ".")) : parseSize(q),
    paoMonths: pao ? +pao[1] : null,
    ingredients: clean(p.ingredients_text),
    photo: clean(p.image_front_small_url),
    source: "Open Beauty Facts",
  };
}

async function rakuten(code, env) {
  if (!env.RAKUTEN_ID) return null;
  const d = await getJSON(
    `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601` +
      `?format=json&hits=3&applicationId=${encodeURIComponent(env.RAKUTEN_ID)}` +
      `&keyword=${encodeURIComponent(code)}`
  );
  const items = ((d && d.Items) || []).map((x) => x && x.Item).filter(Boolean);
  if (!items.length) return null;
  // shortest title is usually the plain listing rather than a multipack
  const it = items.slice().sort((a, b) => (a.itemName || "").length - (b.itemName || "").length)[0];
  const img = it.mediumImageUrls && it.mediumImageUrls[0];
  return {
    name: clean(it.itemName),
    brand: null,
    volumeMl: parseSize(it.itemName),
    paoMonths: null,
    ingredients: null,
    photo: img ? String(img.imageUrl || img).replace(/\?.*$/, "") : null,
    source: "Rakuten",
  };
}

async function naver(code, env) {
  if (!env.NAVER_ID || !env.NAVER_SECRET) return null;
  const d = await getJSON(
    `https://openapi.naver.com/v1/search/shop.json?display=3&query=${encodeURIComponent(code)}`,
    {
      headers: {
        "X-Naver-Client-Id": env.NAVER_ID,
        "X-Naver-Client-Secret": env.NAVER_SECRET,
      },
    }
  );
  const items = (d && d.items) || [];
  if (!items.length) return null;
  const it = items.slice().sort((a, b) => (a.title || "").length - (b.title || "").length)[0];
  const title = String(it.title || "").replace(/<[^>]*>/g, ""); // Naver bolds the match
  return {
    name: clean(title),
    brand: clean(it.brand) || clean(it.maker),
    volumeMl: parseSize(title),
    paoMonths: null,
    ingredients: null,
    photo: clean(it.image),
    source: "Naver",
  };
}

async function barcodeLookup(code, env) {
  if (!env.BARCODE_LOOKUP_KEY) return null;
  const d = await getJSON(
    `https://api.barcodelookup.com/v3/products?barcode=${encodeURIComponent(code)}` +
      `&formatted=y&key=${encodeURIComponent(env.BARCODE_LOOKUP_KEY)}`
  );
  const p = d && d.products && d.products[0];
  if (!p) return null;
  return {
    name: clean(p.title) || clean(p.product_name),
    brand: clean(p.brand) || clean(p.manufacturer),
    volumeMl: parseSize(p.size) || parseSize(p.title),
    paoMonths: null,
    ingredients: clean(p.ingredients),
    photo: (p.images && clean(p.images[0])) || null,
    source: "Barcode Lookup",
  };
}

async function upcItemDb(code, env) {
  const key = env.UPCITEMDB_KEY;
  const url = key
    ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${encodeURIComponent(code)}`
    : `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;
  const d = await getJSON(url, key ? { headers: { user_key: key, key_type: "3scale" } } : undefined);
  const it = d && d.items && d.items[0];
  if (!it) return null;
  return {
    name: clean(it.title),
    brand: clean(it.brand),
    volumeMl: parseSize(it.size) || parseSize(it.title),
    paoMonths: null,
    ingredients: null,
    photo: (it.images && clean(it.images[0])) || null,
    source: "UPCitemdb",
  };
}

/** Later sources only fill gaps the earlier ones left. */
function merge(into, extra) {
  if (!extra) return into;
  if (!into) return extra;
  for (const k of ["name", "brand", "volumeMl", "paoMonths", "ingredients", "photo"]) {
    if (into[k] == null && extra[k] != null) into[k] = extra[k];
  }
  if (!into.source.includes(extra.source)) into.source += " + " + extra.source;
  return into;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405, origin);

    const url = new URL(request.url);
    const configured = {
      openBeautyFacts: true,
      rakuten: !!env.RAKUTEN_ID,
      naver: !!(env.NAVER_ID && env.NAVER_SECRET),
      barcodeLookup: !!env.BARCODE_LOOKUP_KEY,
      upcitemdb: env.UPCITEMDB_KEY ? "key" : "trial",
    };
    if (url.pathname === "/health") {
      const live = Object.entries(configured).filter(([, v]) => v && v !== "trial").length;
      return json({
        ok: true, configured, liveSources: live,
        hint: live <= 1
          ? "Only Open Beauty Facts is active — it holds almost nothing Japanese or Korean. Set RAKUTEN_ID and NAVER_ID/NAVER_SECRET with `wrangler secret put`."
          : "Multiple sources active.",
        allowedOrigins: ALLOWED_ORIGINS,
      }, 200, origin);
    }
    if (url.pathname !== "/lookup") return json({ error: "not found" }, 404, origin);

    const code = (url.searchParams.get("code") || "").replace(/\D/g, "");
    if (code.length < 6 || code.length > 14) return json({ error: "bad barcode" }, 400, origin);

    const sources = [
      ["Open Beauty Facts", () => openBeautyFacts(code)],
      ["Rakuten", () => rakuten(code, env)],
      ["Naver", () => naver(code, env)],
      ["Barcode Lookup", () => barcodeLookup(code, env)],
      ["UPCitemdb", () => upcItemDb(code, env)],
    ];

    let result = null;
    const tried = [];
    for (const [name, run] of sources) {
      let hit = null;
      try {
        hit = await run();
      } catch (e) {
        tried.push(name + ":error");
        continue;
      }
      tried.push(name + (hit ? ":hit" : ":miss"));
      result = merge(result, hit);
      // stop once we have the fields that matter
      if (result && result.name && result.volumeMl && result.ingredients) break;
    }

    return json({ found: !!result, result, tried, code, configured }, 200, origin);
  },
};
