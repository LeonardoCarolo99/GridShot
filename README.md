# Motorsport Photography Portfolio

A sleek black-and-red portfolio site built with [Astro](https://astro.build), plus a dedicated local admin for managing events and photos. Free to host on Netlify — you only pay for the domain.

## Pages

- **Portfolio** (`/`) — hero + selected-work grid
- **Events** (`/events`) — list of events, each with its own gallery
- **About** (`/about`) — bio + stats
- **Contact** (`/contact`) — Netlify form → your inbox

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
- **Portfolio tab:** set the landing-page **hero image** and hand-pick exactly which photos appear in the grid (drag to order, save). Until you pick, the hero uses your latest event cover and the grid uses recent event shots.
- **Save** writes `src/content/events/<slug>.md`, the portfolio list to `src/data/portfolio.json`, and uploads to `public/uploads/`.

Because it runs locally, your workflow is: `npm run admin` → edit → commit and push → Netlify rebuilds. (If you later want to edit from the live domain, that needs a small authenticated backend.)

## Make it yours

Edit **`src/site.ts`** to set your name, tagline, location, email and Instagram. The whole site reads from this file.

## Adding an event by hand

You can also drop a markdown file in `src/content/events/` and put photos in `public/uploads/`:

```md
---
title: "WRC Portugal 2026"
date: 2026-05-24
location: "Fafe, Portugal"
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

## Deploy to Netlify (free)

1. Push this repo to GitHub.
2. Netlify: **Add new site → Import from Git** → pick the repo. Build settings are already in `netlify.toml`.
3. **Contact form:** Netlify → *Site settings → Forms* → the `contact` form appears after its first submission. Set your notification email under *Forms → Settings and usage*.
4. **Domain:** Netlify → *Domain settings* → add your custom domain and point its DNS at Netlify. This is the only thing you pay for.

## Free-tier limits (Netlify)

- Forms: 100 submissions/month, 100MB storage — fine for a portfolio.
- Build minutes: 300/month — plenty for occasional event posts.
