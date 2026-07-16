#!/usr/bin/env node
/*
 * Climb Indonesia MVP — static per-tour page generator
 *
 * Why: social crawlers (WhatsApp / FB / Telegram / Slack) do NOT execute JS,
 * so the SPA tour.html (which injects og:image client-side) has no og:image
 * for them. We pre-render one static HTML file per tour with full OG /
 * Twitter / JSON-LD tags + the fully rendered content (no-JS friendly).
 *
 * Source of truth = data.js (window.CI_TOURS), because it carries the richer
 * fields (price_range, itinerary) that tours.json does not. The template here
 * mirrors tour.html so the static page is a true canonical clone.
 *
 * Output: tour/<slug>/index.html  (canonical, crawler-friendly)
 *         tour/<slug>/og-image.txt (the resolved og:image URL, for debugging)
 *
 * Run:  node scripts/build-tour-pages.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_BASE = '/climbindonesia-mvp';
const SITE_URL = 'https://fansurisa.github.io' + SITE_BASE;
const WA = '6281219592895';

// Load window.CI_TOURS from data.js (no external deps).
const dataSrc = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const m = dataSrc.match(/window\.CI_TOURS\s*=\s*(\[[\s\S]*?\]);/);
if (!m) { console.error('Could not parse window.CI_TOURS from data.js'); process.exit(1); }
const T = JSON.parse(m[1]);

// Minimal HTML-entity decode (mirrors tour.html decode()).
function decode(s) {
  return (s || '')
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&[a-z]+;/g, '');
}
const esc = s =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function imgOf(t) {
  const image = Array.isArray(t.img) ? t.img : [t.img, 1400, 900, false];
  return image[0] || '';
}
function miniCard(x) {
  const title = decode(x.title);
  const dest = (x.destinations || [])[0] || 'Indonesia';
  const image = Array.isArray(x.img) ? x.img : [x.img, 800, 500, false];
  const url = image[0] || '';
  const thumb = url;
  return `<a class="card" href="../tour/${encodeURIComponent(x.slug)}/">` +
    `<div class="card-img"><span class="card-badge">${esc(x.difficulty || 'All levels')}</span>` +
    `<span class="price-badge">${esc(x.price_range || 'Price on enquiry')}</span>` +
    (url ? `<img src="${esc(thumb)}" alt="${esc(title)}" width="${image[1] || 800}" height="${image[2] || 500}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.closest('.card-img').classList.add('img-fallback');this.remove()">` : '') +
    `</div><div class="card-body"><div class="card-title">${esc(title)}</div>` +
    `<div class="card-meta"><span>📍 ${esc(dest)}</span><span>⏱ ${esc(x.duration ? x.duration + 'D' : 'Varies')}</span></div>` +
    `<span class="card-cta">View tour →</span></div></a>`;
}

function buildPage(t) {
  const slug = t.slug;
  const title = decode(t.title);
  const dest = (t.destinations || []).join(', ') || 'Indonesia';
  const dur = t.duration ? t.duration + ' days' : 'Custom duration';
  const diff = t.difficulty || 'All levels';
  const act = (t.activities || []).join(', ');
  const price = t.price_range || 'Price on enquiry';
  const img = imgOf(t);
  const waMsg = `Hi! I'm interested in the "${title}" tour (${dest}). Can you share availability and pricing?`;
  const waUrl = `https://wa.me/${WA}?text=${encodeURIComponent(waMsg)}`;
  const pageUrl = `${SITE_URL}/tour/${encodeURIComponent(slug)}/`;
  const ogImg = img || `${SITE_URL}/assets/og-default.png`;
  const desc = `${title} - ${diff} adventure in ${dest}. ${price}. Book via WhatsApp with Climb Indonesia.`;

  const heroImg = img
    ? `<img class="detail-hero-img" src="${esc(img)}" alt="${esc(title)}" onerror="this.closest('.detail-hero').classList.add('img-fallback');this.remove()">`
    : '';
  const tags = (t.activities || []).map(a => `<span class="tag">${esc(decode(a))}</span>`).join('');
  const itinerary = (t.itinerary || []).map(d =>
    `<article class="day-card"><div class="day-dot">${esc(d.day)}</div><div>` +
    `<h4>Day ${esc(d.day)}: ${esc(decode(d.title))}</h4><p>${esc(decode(d.description))}</p>` +
    `<div class="day-facts"><span>Route: ${esc((d.activities || []).join(' / '))}</span>` +
    `<span>Meals: ${esc(d.meals || 'TBC')}</span><span>Stay: ${esc(d.accommodation || 'TBC')}</span></div></div></article>`
  ).join('');
  const related = T.filter(x => x.slug !== slug)
    .map(x => {
      let score = 0;
      if ((x.destinations || []).some(d => (t.destinations || []).includes(d))) score += 4;
      if ((x.activities || []).some(a => (t.activities || []).includes(a))) score += 2;
      if (x.difficulty === t.difficulty) score++;
      return { x, score };
    })
    .sort((a, b) => b.score - a.score || decode(a.x.title).localeCompare(decode(b.x.title)))
    .slice(0, 4)
    .map(({ x }) => miniCard(x))
    .join('');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    description: `${title} - ${diff.toLowerCase()} adventure in ${dest}. ${price}.`,
    touristType: diff,
    provider: { '@type': 'Organization', name: 'Climb Indonesia', url: 'https://climbindonesia.com' },
    subjectOf: { '@type': 'Place', name: dest },
    offers: { '@type': 'Offer', priceCurrency: price.includes('USD') ? 'USD' : 'IDR', description: price }
  };
  if (img) jsonLd.image = img;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} - Climb Indonesia</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)} - Climb Indonesia">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImg)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)} - Climb Indonesia">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(ogImg)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../styles.css">
<script src="../site-config.js"></script>
<script src="../analytics.js"></script>
</head>
<body>

<header class="site-header">
  <div class="wrap nav">
    <a class="brand" href="../index.html"><span class="logo">▲</span> Climb Indonesia</a>
    <nav class="nav-links">
      <a href="../index.html">Home</a>
      <a href="../explorer.html">Explorer</a>
      <a href="../index.html#testimonials">Reviews</a>
      <a href="../index.html#video">Films</a>
      <a class="btn btn-primary nav-cta" href="https://wa.me/${WA}">WhatsApp</a>
    </nav>
  </div>
</header>

<main id="app">
  <div class="wrap breadcrumb"><a href="../explorer.html">← All tours</a></div>
  <div id="detail">
    <section class="detail-hero">${heroImg}<div class="wrap detail-hero-inner"><span class="eyebrow" style="color:#7fb6ff">${esc(dest)}</span><h1>${esc(title)}</h1><div class="hero-price">${esc(price)}</div><div class="detail-meta"><span class="meta-pill">📍 ${esc(dest)}</span><span class="meta-pill">⏱ ${esc(dur)}</span><span class="meta-pill">🔥 ${esc(diff)}</span></div></div></section>
    <div class="wrap detail-body"><div class="detail-layout"><div class="detail-main"><div class="breadcrumb" style="padding:0 0 8px"><a href="../explorer.html">All tours</a> / ${esc(title)}</div><h3>Overview</h3><p style="color:var(--muted);max-width:60ch">${esc(title)} is a ${esc(diff.toLowerCase())} Climb Indonesia adventure in ${esc(dest)}, shaped around certified local guiding, flexible pacing, and direct WhatsApp planning.</p><h3>Day-by-day itinerary</h3><div class="itinerary">${itinerary}</div><h3>What's included</h3><ul style="color:var(--muted);padding-left:20px;line-height:1.9;max-width:60ch"><li>Licensed, English-speaking mountain guides</li><li>Permits and National Park fees</li><li>Camping equipment and meals on multi-day trips</li><li>Door-to-trail logistics within ${esc(dest)}</li></ul><h3>Activities</h3><div class="detail-tags">${tags}</div><h3>Share this tour</h3><a class="btn btn-primary" href="https://wa.me/?text=${encodeURIComponent(title + ' ' + pageUrl)}">Share on WhatsApp</a></div><aside class="aside"><h4>Trip summary</h4><div class="price-panel"><span>${esc(price)}</span><small>No payment needed to enquire</small></div><div class="row"><span>Destination</span><b>${esc(dest)}</b></div><div class="row"><span>Duration</span><b>${esc(dur)}</b></div><div class="row"><span>Difficulty</span><b>${esc(diff)}</b></div><div class="row"><span>Min. age</span><b>${esc((t.age || [])[0] || 'All')}</b></div><a class="btn btn-primary wa" href="${esc(waUrl)}">📱 Enquire on WhatsApp</a><a class="btn btn-ghost wa" style="margin-top:10px" href="../index.html#contact">Contact form</a></aside></div><section class="related"><div class="section-head"><span class="eyebrow">Keep exploring</span><h2>Related tours</h2></div><div class="grid">${related}</div></section></div>
  </div>
</main>

<footer class="footer">
  <div class="wrap">
    <div>© <span class="yr"></span> Climb Indonesia — Adventure tours across the archipelago.</div>
    <div class="social">
      <a href="https://wa.me/${WA}">WhatsApp</a>
      <a href="../index.html">Home</a>
      <a href="../explorer.html">Explorer</a>
    </div>
  </div>
</footer>

<script>document.querySelectorAll('.yr').forEach(e=>e.textContent=new Date().getFullYear());</script>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</body>
</html>`;
}

let ok = 0, skipped = 0;
for (const t of T) {
  if (!t.slug) { skipped++; continue; }
  const dir = path.join(ROOT, 'tour', t.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildPage(t), 'utf8');
  fs.writeFileSync(path.join(dir, 'og-image.txt'), imgOf(t) || '(none — using default)', 'utf8');
  ok++;
}
console.log(`Generated ${ok} rich tour pages (skipped ${skipped}).`);
