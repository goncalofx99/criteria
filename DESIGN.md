# CRITERIA experience specification and work plan

Status: implementation on `codex/full-ux-overhaul`, reviewed in draft PR #8. This is the product and design reference for the overhaul. Code determines shipped behavior; the verification section distinguishes local review from external-service testing. Subsequent desktop, navigation, brand, and theme refinements are documented below.

## Product, routes, and roles

CRITERIA is a two-sided Portuguese property marketplace. Sellers post properties; buyers post their criteria publicly to eligible sellers. Matching works in both directions. Conversations connect a buyer and seller around a listing or request. A member may have a buyer, seller, or both role. Buyers discover properties and publish requests. Sellers discover buyer requests and publish properties. Both-role members can do both. Owners can see and edit their own posts even after changing roles; publishing or republishing requires the relevant current role.

Routes are landing `/`, sign-in/up, forgot/reset password, OAuth callback, onboarding, Explore `/feed`, Create `/create`, Inbox `/inbox` and `/inbox/:id`, Profile `/profile`, listing `/listing/:id` and edit, and buyer request `/criteria/:id` and edit. Protected direct links preserve the intended destination through sign-in and onboarding. Feed URLs preserve search, type, filters, sort, page, list/map view, and map bounds.

| Journey | Signed out | Buyer | Seller | Both |
| --- | --- | --- | --- | --- |
| Explore listings and listing details | Sign in, then resume the link | View; contact seller on another user's listing | View; publish properties | View; publish properties and contact other sellers |
| Explore buyer requests and request details | Sign in; seller role then required | Own requests only; explain the role restriction on another request's link | View and contact another buyer | View and contact another buyer |
| Create | Sign in and finish onboarding | Buyer request | Property listing | Choose either post type |
| Edit/archive/republish | Sign in | Own posts remain editable and archivable; republish needs the relevant role | Same ownership rule | Same ownership rule |
| Inbox/profile | Sign in | Participant threads and owned posts | Participant threads and owned posts | Participant threads and owned posts |

The core acceptance journey is: open a filtered result, inspect its detail, contact the other party or edit if owner, and return to the same result URL. A direct detail link has a safe Explore fallback. A role change does not remove ownership access to existing drafts or archived posts, but does limit new publishing.

## Reference interpretation

The four supplied images suggest strong photo-led cards, concise grouped filters, map/list switching near the results, spacious details, and an editorial type hierarchy. They are interaction references, not assets or pixel targets. Keep CRITERIA's forest green and sand; do not transplant the examples' black, burgundy, neon, or single-sided property positioning.

## Audit findings

The following were confirmed in code or local runtime before implementation:

| Priority | Finding | Required experience |
| --- | --- | --- |
| P0 | Desktop had a permanent app rail beside a permanent filter column; wide Capacitor screens were capped at 480px. | One top navigation at 768px+, safe-area bottom tabs below. Search is part of Explore and filters open on demand. Tablet and native wide viewports respond to width. |
| P0 | Legacy feed queries lacked search text, sort, total count and map-bounds data; result state was not linkable. | URL-backed search/filter/sort/list-map/page/bounds with matching server pagination and counts; back from detail returns to that result URL. |
| P0 | Carto map tiles displayed `API KEY REQUIRED` in runtime review. | Working tiles and visible attribution; decide on a production map provider before high traffic. |
| P0 | Creation always sent `images: []`; editing a selected address could leave old coordinates. | Photo validation/upload/gallery and a deliberate no-photo state. Clear coordinates until a new address or preset is selected. |
| P0 | Conversation APIs existed but details had no usable contact path or Inbox. | Role-aware contact actions, thread list, thread view, send/realtime receive, and clear error/empty states. |
| P0 | Password-recovery link was inert; OAuth native redirect carried credentials; direct links could bypass unfinished onboarding. | Recovery request/confirm, short-lived one-time OAuth code, onboarding gate, auth return destination. |
| P0 | Nonowners could receive exact address/coordinates, and upload presigning accepted arbitrary keys. | Coarse nonowner location, owner-scoped image keys, role and ownership enforcement on server. |
| P1 | Residential form fields were required for land/commercial; “remove” had no visible recovery. | Type-aware forms; archive and republish; honest status labels. |
| P1 | Currency was abbreviated; details had weak next actions; controls had missing accessible names, focus, or state. | Full euro prices, match/contact paths, 44px targets, labels, pressed state, visible focus, 200% zoom, reduced motion. |
| P1 | iOS signup's keyboard-height transform moved the footer over name fields in a simulator; autofocus opened the keyboard immediately. | Keep form/footer in normal flow and let the WebView scroll focused inputs; do not autofocus the first step. |
| P1 | Reference documentation described obsolete auth and public query behavior. | Rewrite frontend/backend/mobile/environment docs from code. |

Real-environment verification remains necessary for migrations on a deployed database; Google callbacks and physical iOS/Android return; Resend delivery; R2 PUT/CORS; WebSocket resume; high-volume search; production tile capacity. Fixtures and local tests do not prove these integrations.

## Navigation and journeys

| Surface | Phone web and phone Capacitor | Tablet, desktop, wide Capacitor |
| --- | --- | --- |
| Primary navigation | Three fixed tabs: Explore, **Create centered**, Inbox; safe-area aware. A persistent branded header links to Explore and places Profile at the top right. At 320px Profile is an accessible icon to preserve the wordmark. | One forest-green top bar with Explore, Create, Inbox, Profile, theme control, and account actions; no side rail. |
| Explore | Search and result type above cards; Filter dialog; list/map switch; count, sort and pagination. | Same controls on a wider canvas; multi-column cards or a larger map. Filters remain a dialog, not a competing permanent panel. |
| Detail | Image, value/specs, description, approximate map, person, contact/match action in reading order. | Balanced split hero at 1024px+: image beside price, summary, and seller/contact actions; deeper details and map follow below. |
| Create/edit | Stacked sections, type-aware fields, address preview and photos. | Centered form up to about 840px with more whitespace. |
| Inbox | Thread list then thread; visible back to list. | Two-pane inbox inside the content area. |

The navigation destinations are role-neutral. Explore shows properties to buyers and sellers; buyer requests are seller/both only. Create shows post kinds the current role can publish. Profile shows owned active and archived posts from any prior role. Server authorization is authoritative. A forbidden direct link should explain the role requirement; a missing post should explain that it is unavailable. List and map share filter state. A direct detail link falls back to Explore; a card-opened detail returns to the saved results URL. Browser back/forward must reproduce feed controls, not just the visual tab.

## Design foundation

`frontend/src/index.css` owns HSL color tokens and shadows. `frontend/tailwind.config.ts` maps those tokens to Tailwind utilities. `frontend/src/design-basis.css` owns shared composition classes. Existing `src/components/ui` primitives are the component foundation; Radix Slot and class-variance-authority are already present for the button API. Add a shadcn/ui primitive only when it solves a specific accessibility or interaction need, and restyle it with these same tokens. Do not introduce a second palette or reset.

| Foundation | Rule |
| --- | --- |
| Color | Forest green `#344e41` for actions, deep green `#1a2e22` for navigation, sand `#f5f0e8` and warm paper for canvases, white raised surfaces. Restrained clay appears in small editorial accents and card treatment. Dark mode uses deep forest surfaces, warm text, sage links and the same action green. Semantic status tokens require readable foreground contrast. |
| Type | DM Sans headings, Inter body. Page titles 32–48px, sections 18–24px, body 14–16px with comfortable leading, metadata 12–13px. Avoid all-caps prose. |
| Space | 4px rhythm; page gutters 16–24px on phones and 32–40px on wide screens; 24–32px between sections. Reading width stays restrained. |
| Shape/depth | 12px inputs, 16–24px cards/panels, pill chips. Hairline borders and soft green shadows establish hierarchy without decorating every item. |
| Images | 4:3 listing cards, generous detail hero, `object-cover`; a designed fallback when no photo exists. Alt text reflects content. |
| Interaction | At least 44px targets, visible focus, names for icon controls, `aria-pressed` for choices, dialog focus restoration, disabled/loading/error/retry states. |
| Motion | Short 150–200ms transitions and `prefers-reduced-motion`; no forced smooth scroll. |
| Breakpoints | Under 768px stack with brand/profile header and centered three-tab navigation; 768px+ top nav and wider grid; 1024px+ structured detail/form/profile layouts; wide screens add columns without stretched text. Capacitor follows viewport width. |

The existing roof-and-C mark from `frontend/public/icon-192.png` identifies the app in the shell and landing page. The visible theme control offers Light, Dark, and System; System follows OS changes. The preference persists locally, and a synchronous document-head script applies it before React paints. The `dark` class changes semantic CSS variables in `index.css`; Tailwind uses the same variables, so components do not need a parallel palette. Only the default OpenStreetMap raster pane receives a dark treatment; map markers, popups, controls and custom map providers retain their own colors.

Use plain, accurate copy: “Archive listing”, “Republish”, “Message seller”, “Buyer requests”. State who can see buyer requests. Mark a nonowner map as approximate. Empty states suggest the next action. Prices are full euro amounts and areas use m².

## States and verification matrix

Every route needs loading, populated, empty, error and permission states. Forms additionally need invalid, submitting, success, archive/edit and upload-failure states. List/map must cover no imagery, no tiles, no results and long titles. Local review mode offers buyer/seller/both, owned/other/archived posts, slow/error/empty responses, signed-out, and incomplete onboarding. Check 320px, 390px, 768px, 1024px and 1440px, plus landscape tablet; keyboard-only use, screen-reader order/names, 200% zoom, touch/safe areas, reduced motion and back/forward.

Local Vite review mode opts in with `?review=1`. It uses in-memory fixtures and mutations, blocks real backend writes and unknown requests, and is gated by compile-time `DEV`. Production bundles are checked for review markers. It supports layout and journey review; real auth, database, media and native integrations require staging tests.

Review matrix: signed-out and unfinished-onboarding direct links; buyer, seller and both-role navigation; own, other and archived listings/requests; new and edited posts; matching and no matches; inbox empty/thread/send/error; list and map with active filters, pagination and no results; photos present/missing/upload failure; and slow or failed requests. Confirm the URL, focus target, visible loading/error copy, and role permission at each transition. Run the same journeys at phone, tablet and desktop widths and in the native WebView where available.

Theme and layout checks additionally cover Light/Dark/System on landing and auth, Explore list/map/filter dialog, both detail types, create/edit, Inbox and Profile. Verify theme persistence on reload and OS preference changes, map label readability, keyboard focus and contrast on every surface. At 320px and 390px check the top-right Profile affordance, centered Create tab and safe-area padding; at 768px, 1024px and 1440px check nav fit, horizontal overflow, page gutters, grid density and split-detail balance. The development fixture illustrates structure and states; production photos and external identity providers still require their own smoke tests.

## Priorities and acceptance gates

1. **Foundation/data (P0):** server search/count/sort/bounds, role/ownership gates, location privacy, upload keys, onboarding/OAuth. Gate: schema validation, server typecheck/tests, direct-link safety.
2. **Navigation/discovery (P0):** one responsive navigation model and URL-backed Explore list/map/filter/search/sort/page. Gate: direct link and back/forward reproduce results across phone/tablet/desktop.
3. **Create/detail/profile/messaging (P0/P1):** type-aware fields, photo upload, archive/republish, matches, contact, Inbox, owned states. Gate: buyer/seller/both and own/other/archived journeys; no inert CTA.
4. **Auth/polish (P1):** sign-in/up, onboarding, recovery, native callback, design states and accessibility. Gate: keyboard, zoom, network error and native smoke checks.
5. **Release checks:** frontend/server typecheck, lint, tests and build; staging migration and external-service smoke test; production mock exclusion. Run migrations before server deploy. Keep follow-up work in the existing draft PR until reviewed and approved for merge.

## Dependencies, risks, and owner decisions

- Run migrations `0003` and `0004` before deploying server changes. Existing Google users without an onboarding-completed marker may be asked to complete onboarding once; existing password users are backfilled as complete.
- Recovery needs Resend credentials, a verified sender and frontend origin. Google requires exact callback registration and a matching `FRONTEND_URL` per environment; preview and LAN origins need their own trusted configuration. One-time OAuth state/code currently lives in process memory, so multiple API instances need shared short-lived storage.
- Browser image PUTs need R2 CORS for the site origin. The app re-encodes photos to remove GPS and other camera metadata, but the direct R2 upload flow does not enforce this for other clients; a server-side image pipeline is needed for that guarantee. Removed photos remain publicly accessible to anyone with their old URL. Reference tracking and an asynchronous cleanup job are needed before deletion can be reliable.
- Public location labels and location search currently recognize a conservative set of Portuguese cities. Unknown places fall back to “Portugal” or “Approximate area”, and a district in a geocoder label can appear as its city. Add a structured locality field from geocoding before promising accurate public labels/search across the whole country; keep the street-level address owner-only. Owners can still type an address into the title or description, so public copy should remind them not to include private location details there.
- Official OSM tiles solved the broken review map. Select a compliant production tile provider and budget before scale. Map results are capped at 200 markers; dense areas need aggregation or clustering.
- Confirm whether buyer requests should ever be public to signed-out visitors. Current UI and server keep discovery seller-gated. Any policy change must update both layers.
