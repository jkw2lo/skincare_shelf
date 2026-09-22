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

Chrome on Android decodes barcodes natively via `BarcodeDetector`. Other browsers
fall back to the ZXing library, loaded from a CDN on first use.

A scanned code is looked up against [Open Beauty Facts](https://world.openbeautyfacts.org)
— free, crowd-sourced, no API key. When it has a record you get name, brand, size,
period-after-opening, full ingredients and a product photo.

**Coverage is thin for Japanese and Korean products.** Measured against this
collection: Anessa 0 records, Canmake 0, Kao 2, Shiseido Japan 1. The Bioré records
are the European line. Expect most scans of JP/KR drugstore items to miss, and to
bind the barcode to an existing product by hand instead — that binding is permanent,
so the next scan of that bottle opens it instantly.

You can add missing products to Open Beauty Facts yourself; it's a public database.

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
