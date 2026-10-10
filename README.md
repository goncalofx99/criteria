# CRITERIA

CRITERIA is a two-sided property marketplace. Sellers publish property listings; buyers publish their criteria. The same matching model connects both sides. Anyone can search and view active properties; posting, criteria discovery and conversations require an account with the appropriate role.

See FRONTEND.md for routes, auth, design implementation and local review mode; BACKEND.md for the API and schema; MOBILE.md for the Capacitor shell; DESIGN.md for the visual direction; and PERFORMANCE.md for the dated page-speed baseline.

## Workspace

| Package | Purpose |
| --- | --- |
| frontend/ | React 18, React Router 6, Vite, Tailwind and Apollo Client |
| server/ | Hono, Apollo GraphQL, Drizzle ORM and PostgreSQL |
| mobile/ | Capacitor 7 shell and native OAuth bridge; product logic remains in frontend/ |

The server issues JWTs for email/password and Google OAuth, stores data in PostgreSQL and signs Cloudflare R2 uploads. GraphQL subscriptions power in-app conversations. The frontend runs in a browser or inside the Capacitor WebView.

## Requirements

- Node.js 22 or newer and pnpm 10 or newer.
- PostgreSQL for live API development.
- Google OAuth credentials for live Google sign-in.
- Cloudflare R2 credentials for live image uploads.
- Xcode or Android Studio only for the corresponding native build.

## Local setup

~~~bash
pnpm install
cp server/.env.example server/.env
cp frontend/.env.example frontend/.env
pnpm --filter server db:migrate
pnpm dev
~~~

The frontend runs at http://localhost:5173 and the API at http://localhost:4000. Configure the server env file before starting a live API, and apply the latest migration (`0005`) before testing live sign-in. The frontend env file needs VITE_API_URL, VITE_GRAPHQL_URL and VITE_GRAPHQL_WS_URL pointed at that same API. For a deployed API or HTTPS tunnel, set the optional server `PUBLIC_API_URL` and register `${PUBLIC_API_URL}/auth/google/callback` in Google Cloud. The backend example lists the database, JWT, OAuth and R2 variables and the optional password-reset email sender.

Production frontend builds require HTTPS API/GraphQL URLs and a WSS subscription URL; local development can use HTTP/WS. The browser's optional Cloudflare Web Analytics integration remains disabled until a site token is configured and a visitor opts in. Review `LEGAL_REVIEW.md` before treating the published Privacy Policy and Terms as approved legal text.

For a safe UI review without a backend or an account, run the frontend Vite server and open http://localhost:5173/?review=1. The development-only switcher provides mock buyer, seller and both roles, ownership states, data, errors and direct route links. Its synthetic properties span all 18 mainland districts and both autonomous regions with matching municipalities. All review mutations stay in memory and reset on reload; the production build cannot enable review mode. Choosing Google sign-in leaves review through a full page reload and uses the live API, so start the API and migrate its database first. See FRONTEND.md for details.

## Common commands

~~~bash
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build

pnpm --filter frontend dev --host
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test
pnpm --filter frontend build

pnpm --filter server dev
pnpm --filter server test
pnpm --filter server db:generate
pnpm --filter server db:migrate
~~~

## Product and access model

The shared home at `/` is the starting point for signed-out visitors and members. Its search-first layout uses a property photo as an edge-to-edge backdrop, with a forest-green scrim behind the controls for legibility and restrained clay accents against the established green and sand palette. On phones, the photo is clearest above the search; on desktop, it opens up to the right of the controls. The single location/keyword field toggles between Properties and Criteria and accepts a keyword or a suggested Portuguese district, autonomous region or municipality (concelho). On desktop, place shortcuts start with a compact set and expand to the remaining districts and regions; a criteria publishing CTA follows. Home has no post feed. Properties search opens public results at `/feed`; Criteria search opens role-protected results at `/requests`. Results support server-side search, filters, sort, pagination and map bounds; active property listings and details are public. Buyers can publish criteria; sellers can discover criteria and publish properties; both-role accounts can do both. Owners can edit, archive and republish their posts. Criteria discovery, posting and conversations remain protected by account, role and ownership checks. Protected direct links preserve a return destination through sign-in.

The interface defaults to European Portuguese (`pt-PT`), with a locally saved English option. On desktop browsers the language switch is in the top bar; on phones and in the Capacitor app it is in Settings. Phone Home focuses on the photo-backed search and omits the sections below it; the full location index remains available through search suggestions. Phone Settings has an **About Criteria** tab for the Privacy Policy, Terms and contact email. Desktop Home keeps the supporting location links, criteria invitation and FAQ.

Property coordinates stored for matching are more precise than locations returned by public GraphQL queries. Contact happens through in-app conversations; the UI should not imply unsupported phone, tour or alert features.

## Authentication and media

Email signup sends an integer age, role and account details to the API. Google OAuth returns a single-use code to an allowed web or native callback, which the frontend exchanges for tokens. New Google accounts complete age and role onboarding. Access tokens are refreshed when expired. Password recovery uses the server reset endpoints and requires its email sender in production. Password recovery and account security emails are sent in Portuguese.

Photos upload with a server-issued presigned URL to Cloudflare R2. Browser uploads accept JPEG, PNG and WebP images; the client downsizes and re-encodes them to reduce transfer size and strip camera metadata. The server validates the authenticated user’s upload namespace and MIME/extension pairing.

## Mobile

The mobile package loads the deployed frontend or a LAN-served development frontend. It has no separate product state or API model. The iOS OAuth bridge uses ASWebAuthenticationSession; Android uses a Custom Tab and a deep-link callback. Follow MOBILE.md for native configuration and sync commands.
