/* Climb Indonesia MVP — site-wide config (no build step, plain script).
   Loaded before analytics.js on every page. */
window.SITE_CONFIG = {
  // ---- Analytics ----
  // Set `enabled: true` once you have an account. Both providers supported.
  // Only ONE should be enabled at a time.
  analytics: {
    enabled: false,

    // Option A: Plausible (privacy-friendly, no cookie banner needed).
    // Create a site at plausible.io with domain fansurisa.github.io
    plausible: {
      enabled: false,
      domain: 'fansurisa.github.io',      // your Plausible site domain
      src: 'https://plausible.io/js/script.js'
    },

    // Option B: Google Analytics 4.
    ga4: {
      enabled: false,
      measurementId: 'G-XXXXXXXXXX'        // e.g. G-ABC123XYZ
    }
  }
};
