# CRITERIA performance baseline

Measured 9 October 2026 against the **currently deployed** `https://criteria-app.com/` homepage, before the local changes in this checkout are deployed. [PageSpeed Insights report](https://pagespeed.web.dev/analysis/https-criteria-app-com/9c2fitqq5q?form_factor=mobile). These are Lighthouse lab results, not field Core Web Vitals; PageSpeed reported no real-user data for this URL.

| Emulation | Performance | First contentful paint | Largest contentful paint | Total blocking time | Layout shift |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile, slow 4G | 85 | 2.8 s | 3.2 s | 0 ms | 0.002 |
| Desktop | 100 | 0.5 s | 0.7 s | 0 ms | 0.001 |

The live report identified render-blocking requests (about 1.4 s estimated mobile savings), unused JavaScript (about 72 KiB), unused CSS (about 15 KiB), low-contrast text on the landing CTA, and a missing main landmark. The local changes darken the muted text token, add the landmark, self-host interface fonts, keep the map bundle lazy, and add route-level code splitting. The report also flagged the old deployment's missing meta description and invalid `robots.txt`; local source now supplies both.

The local production build currently has a 142 KiB gzipped entry JavaScript chunk, 18 KiB gzipped stylesheet, and a 47 KiB gzipped map chunk that loads only when the map is opened. Browser uploads downsize and re-encode images to at most 2000 pixels on the longest edge. These build sizes are not a page-load score.

## After deployment

Run PageSpeed on both mobile and desktop for `/`, then manually test signed-in Explore list/map, a property detail, a buyer request, and Inbox on a mid-range phone and desktop. Record LCP, INP, CLS, transfer size, and slow-network behavior. Check the consent notice, cached return navigation, and images with real data. Confirm Vercel serves unknown direct routes with HTTP 404 and that public metadata, robots and sitemap are reachable. Keep scores as dated measurements rather than permanent promises.
