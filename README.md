# Shelf Life

A visual skincare inventory. Products stand on shelves and drain as you use them,
so you can see what you actually own and what's worth finishing.

Built for one specific collection — mostly Japanese and Korean drugstore skincare —
and seeded with 72 products / 101 units.

## Why this isn't a Claude artifact

Artifacts run inside a sandboxed iframe that is not granted camera access
(`policy check: camera NOT allowed`) and cannot make network requests. Both are
fatal for a barcode scanner. Hosted as a plain page, both work.

## Publish it

Create an empty repo on GitHub, then from this folder:

```bash
git remote add origin https://github.com/<you>/shelf-life.git
git branch -M main
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `main` / `root`**.

It goes live at `https://<you>.github.io/shelf-life/` in a minute or two.
HTTPS is automatic, which the camera requires.

On your phone, open that URL in Chrome and use **⋮ → Add to Home screen**. It then
launches full-screen and works offline.

## The scanner

Chrome on Android decodes barcodes natively via `BarcodeDetector`; other browsers
fall back to the ZXing library loaded from a CDN.

A scanned code is looked up, and if nothing is found you bind it to a product you
already own. That binding is permanent, so the next scan of that bottle opens it.

**Lookup goes through the Worker in `worker/` when configured** — it reaches the
databases a browser is not allowed to call. Without it the app still queries Open
Beauty Facts directly, and Rakuten too if you paste an application ID. See
[worker/README.md](worker/README.md) for why and how.

Coverage is honest: Open Beauty Facts holds almost nothing Japanese or Korean
(Anessa 0 records, Canmake 0, Kao 2). Rakuten covers the Japanese half and Naver
the Korean half, both free.

## Using it

**Shelf** — categories collapsed, one open at a time. Drag a bottle down into the
**AM** or **PM** tray; it lands in the right step on its own, and dragging a second
toner in replaces the first. Bottles are coloured only by whether they're in use.

**Counter** — the full routine, step by step, plus what to open next and what to finish.

**Inventory** — everything at once, filterable. Tap for a quick card, then
*More details* for the full record.

## How depletion works

You never enter millilitres. Each product has a dose picked from pictures — a rice
grain, a pea, three dots, ¼ teaspoon, a palmful — and a frequency. Put a product on
the counter and it drains from that day forward at dose × frequency. No daily logging.

The millilitres behind each dose are calibrated so a bottle lasts about as long as it
really does: a 30 ml serum at three drops twice daily runs about 100 days. Sunscreen
defaults to ¼ tsp, the dose SPF is actually tested at.

If an estimate drifts, drag the level slider and it re-bases from there.

## Your data

Everything lives in `localStorage` in that one browser. There is no server and no account.

**Back it up** with the `⋯` button → Export JSON, especially before clearing site data
or changing phones. Import restores it.

## Files

| file | |
|---|---|
| `index.html` | the whole app, seed data included |
| `sw.js` | offline cache for the app shell |
| `manifest.webmanifest` | home-screen install |
| `icon*.png`, `icon.svg` | icons |
