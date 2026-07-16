# Climb Indonesia — MVP

Static read-only frontend for Climb Indonesia tour listings. No build step for
the core site; a small Node generator pre-renders per-tour pages so social
crawlers get real `og:image` tags (they don't run JS).

## Structure
- `index.html`, `explorer.html` — landing + filterable tour explorer (vanilla JS)
- `tour.html?slug=...` — thin router; redirects valid slugs to the static page
  `tour/<slug>/` (the canonical, crawler-friendly URL)
- `tour/<slug>/index.html` — **generated** static per-tour pages with full
  Open Graph / Twitter / JSON-LD tags
- `404.html` — branded GitHub Pages 404
- `site-config.js` + `analytics.js` — analytics toggle (Plausible / GA4)
- `data.js` + `tours.json` — baked tour data (38 tours, from WP REST API)

## Regenerate tour pages
After editing `tours.json`, run:
```
node scripts/build-tour-pages.js     # tour/<slug>/index.html
node scripts/build-og-default.js     # assets/og-default.png (fallback OG)
```

## Analytics (off by default)
Edit `window.SITE_CONFIG.analytics` in `site-config.js`:
- `enabled: true`
- Plausible: set `plausible.enabled = true` + your `domain`
- GA4: set `ga4.enabled = true` + `measurementId`

## Lighthouse
GitHub Actions workflow at `.github/workflows/lighthouse.yml` audits the live
site on every push + weekly. NOTE: committing/pushing a workflow file requires
a GitHub token with the `workflow` OAuth scope — the deploy token used for
content pushes may lack it, in which case add the workflow via the GitHub web UI
(or a token with workflow scope). To run locally:
```
npx lighthouse <url> --only-categories=performance,accessibility,best-practices,seo
```

## Known gotcha: deploy token scope
Pushing `.github/workflows/*` is rejected by GitHub unless the auth token has
the `workflow` scope. Site content (HTML/JS/assets) pushes fine without it.
Deployed to GitHub Pages: https://fansurisa.github.io/climbindonesia-mvp/
