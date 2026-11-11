# Motorsport Photography Portfolio

A sleek black-and-red portfolio site built with [Astro](https://astro.build), a free Git-based backoffice ([Decap CMS](https://decapcms.org)) and free hosting/forms on Netlify. You only pay for the domain.

## Pages

- **Portfolio** (`/`) — hero + selected-work grid
- **Events** (`/events`) — list of events, each with its own gallery
- **About** (`/about`) — bio + stats
- **Contact** (`/contact`) — Netlify form → your inbox
- **Admin** (`/admin`) — Decap CMS backoffice to add/edit events and upload photos

## Local development

```sh
npm install
npm run dev
```

Open the printed local URL. Build with `npm run build`, preview with `npm run preview`.

## Make it yours

Edit **`src/site.ts`** to set your name, tagline, location, email and Instagram. The whole site reads from this file.

## Adding an event

**Option A — via the backoffice (recommended):** log in at `/admin`, click *Events → New Event*, fill the form and upload photos. Save publishes it.

**Option B — by hand:** drop a markdown file in `src/content/events/` and put photos in `public/uploads/`:

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

## Placeholder images

`scripts/gen-placeholders.mjs` generates the branded SVG placeholders in `public/uploads/` (they're in the repo now). Replace them with real photos — via `/admin` or by dropping files into `public/uploads/` — and delete the ones you don't use. Real `.jpg` uploads through the CMS land in the same folder.

## Deploy to Netlify (free)

1. Push this repo to GitHub.
2. In Netlify: **Add new site → Import from Git** → pick the repo. Build settings are already in `netlify.toml`.
3. **Enable the backoffice:** Netlify → *Site settings → Identity* → Enable Identity → *Registration* set to *Invite only* → *Services → Git Gateway* → Enable.
4. **Invite yourself:** Identity → *Invite users* → your email → open the link → now `/admin` works.
5. **Contact form:** Netlify → *Site settings → Forms* → the `contact` form appears automatically once it receives a submission. Set your notification email under *Forms → Settings and usage*.
6. **Domain:** Netlify → *Domain settings* → add your custom domain and point its DNS at Netlify. This is the only thing you pay for.

## Free-tier limits (Netlify)

- Forms: 100 submissions/month, 100MB storage — fine for a portfolio.
- Build minutes: 300/month — plenty for occasional event posts.
