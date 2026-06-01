# PeptiLab — Research Peptides Storefront

A simple, modern static e-commerce front end for a peptides shop. Built with
plain **HTML**, **Tailwind CSS** (via CDN), and **vanilla JavaScript** — no build
step required.

## Features

- Responsive hero section
- Product grid (4 items)
- Slide-out shopping cart with quantity controls
- Cart persistence via `localStorage`
- Demo checkout button (confirmation only — no real payment)

## Files

| File | Purpose |
|------|---------|
| `index.html` | Markup |
| `styles.css` | Custom styles layered on Tailwind |
| `app.js` | Catalog, cart logic, persistence |

## Run locally

Just open `index.html` in a browser. No server or build needed.

For a local web server (optional):

```bash
# Python 3
python -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

This is a static site, so it can be hosted free on any static host:

- **Cloudflare Pages** — Workers & Pages → Create → Pages → Upload assets (or connect this repo). Build command: *(none)*, output dir: `/`.
- **Netlify** — drag the folder onto https://app.netlify.com/drop
- **GitHub Pages** — repo Settings → Pages → deploy from branch.

## Disclaimer

For research use only. Demo project — the checkout does not process payments or
collect data.
