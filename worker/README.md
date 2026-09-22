# Barcode lookup Worker

A Cloudflare Worker that looks up a barcode and returns one normalised result.

## Why this exists

Almost every barcode database refuses cross-origin browser calls, so a static
page on GitHub Pages cannot reach them. Measured directly:

| Database | Browser may call it? | Evidence |
|---|---|---|
| Open Beauty Facts | yes | `access-control-allow-origin: *` |
| Rakuten Ichiba | yes | `access-control-allow-origin: *` |
| Barcode Lookup | **no** | `403` on preflight, no CORS headers |
| UPCitemdb | **no** | `access-control-allow-origin: https://www.upcitemdb.com` |
| Yahoo Shopping JP | **no** | no CORS headers |
| Naver Shopping KR | **no** | no CORS headers |

The Worker makes those calls server-side, where CORS doesn't apply, and keeps
the API keys off the public site.

## Deploy

```bash
cd worker
npm install
npx wrangler login
npx wrangler deploy
```

Note the URL it prints (`https://shelf-life-barcode.<you>.workers.dev`), then paste
it into the app under **⋯ → Cloudflare Worker URL → Save and test**.

## Keys

All optional — the Worker skips any source whose key is missing. Open Beauty Facts
needs none, so it works with zero keys configured.

```bash
npx wrangler secret put RAKUTEN_ID          # free: webservice.rakuten.co.jp
npx wrangler secret put NAVER_ID            # free: developers.naver.com
npx wrangler secret put NAVER_SECRET
npx wrangler secret put BARCODE_LOOKUP_KEY  # paid, optional
npx wrangler secret put UPCITEMDB_KEY       # optional; free trial used otherwise
```

For this collection the two that matter are **Rakuten** (Japanese products — Bioré,
Anessa, Canmake, Rohto, Hada Labo) and **Naver** (Korean — abib, Medicube, Aestura,
Dr Althea, Tony Moly). Both are free.

## Allowed origins

Edit `ALLOWED_ORIGINS` in `src/index.js` if you host the page anywhere other than
`https://jkw2lo.github.io`. A request from an unlisted origin is refused by the browser.

## Endpoints

- `GET /lookup?code=<barcode>` → `{ found, result, tried, code }`
- `GET /health` → `{ ok: true }`

`result` is `{ name, brand, volumeMl, paoMonths, ingredients, photo, source }`.

Sources run in order and later ones only fill gaps the earlier ones left, so
`source` may read `Rakuten + Naver`. The search stops early once name, size and
ingredients are all present. Results are cached for a day.
