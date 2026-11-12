# Motorsport Photography Portfolio

A sleek black-and-red portfolio site built with [Astro](https://astro.build), plus a dedicated local admin for managing events and photos. Deploys as a static site on [Cloudflare Workers](https://workers.cloudflare.com/) — you only pay for the domain.

## Pages

- **Portfolio** (`/`) — hero + selected-work grid
- **Events** (`/events`) — list of events, each with its own gallery
- **About** (`/about`) — bio + stats
- **Contact** (`/contact`) — direct email and Instagram links

## Local development

```sh
npm install
npm run dev     # site      → http://localhost:4321
npm run admin   # admin     → http://localhost:4000
```

Run both together to edit and preview side by side (the admin has an "Open site preview" link). Build with `npm run build`, preview the build with `npm run preview`.

## The admin

A purpose-built local editor that writes straight into your repo — no server, database, auth or monthly cost.

- Event list with cover thumbnails; create / edit / delete.
- **Cover image:** drag-and-drop upload, or pick from the media library.
- **Gallery:** drag-and-drop multiple photos at once, drag thumbnails to reorder, `×` to remove.
- **Portfolio tab:** set the landing-page **hero image** and hand-pick exactly which photos appear in the grid (drag to order, save). The grid stays hidden until you pick photos; the hero falls back to your latest event cover.
- **Save** writes `src/content/events/<slug>.md`, the portfolio list to `src/data/portfolio.json`, and uploads to `public/uploads/`.

Because it runs locally, your workflow is: `npm run admin` → edit → commit and push → `npm run deploy`. (If you later want to edit from the live domain, that needs a small authenticated backend.)

## Make it yours

Edit **`src/site.ts`** to set your name, tagline, location, email and Instagram. The whole site reads from this file.

## Adding an event by hand

You can also drop a markdown file in `src/content/events/` and put photos in `public/uploads/`:

```md
---
title: "WRC Portugal 2026"
date: 2026-05-24
location: "Fafe, Portugal"
type: "Track Day"
series: "World Rally Championship"
cover: "/uploads/my-cover.jpg"
description: "A sentence about the event."
photos:
  - "/uploads/wrc-1.jpg"
  - "/uploads/wrc-2.jpg"
---
```

## Photos

Drop real photos into `public/uploads/` or upload them through the admin. The admin's media library lists everything in that folder. `scripts/gen-placeholders.mjs` can regenerate the branded SVG placeholders if you ever need them.

## Deploy to Cloudflare Workers (free)

The build is fully static, so the Worker is just Cloudflare's asset hosting — no server runtime or adapter needed. `wrangler.jsonc` already points Wrangler at `dist/`.

1. Push this repo to GitHub.
2. Log in once: `npx wrangler login`.
3. Deploy: `npm run deploy` (builds with Astro, then uploads `dist/` with Wrangler).
4. **Domain:** add it to Cloudflare, then Workers → your worker → *Settings → Domains & Routes → Add custom domain*. This is the only thing you pay for.

Refer to the [Astro Cloudflare deployment guide](https://docs.astro.build/en/guides/deploy/cloudflare/) if you later add on-demand routes; that is when you'd install the `@astrojs/cloudflare` adapter.

## Free-tier limits (Cloudflare Workers)

- Static assets: unlimited requests on the free plan — ideal for a portfolio.
- Builds run on your machine with `npm run deploy`, so there is no build-minutes cap.
