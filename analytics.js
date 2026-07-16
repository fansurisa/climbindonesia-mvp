/* Climb Indonesia MVP — analytics injector.
   Reads window.SITE_CONFIG.analytics and injects the chosen provider.
   Safe no-op when disabled. */
(function () {
  var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.analytics) || {};
  if (!cfg.enabled) return;

  // Plausible
  if (cfg.plausible && cfg.plausible.enabled) {
    var p = document.createElement('script');
    p.defer = true;
    p.setAttribute('data-domain', cfg.plausible.domain);
    p.src = cfg.plausible.src;
    document.head.appendChild(p);
    return;
  }

  // Google Analytics 4
  if (cfg.ga4 && cfg.ga4.enabled) {
    var id = cfg.ga4.measurementId;
    if (!id || id.indexOf('G-') !== 0) return;
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id);
    return;
  }
})();
