# CRITERIA design guidelines

## Direction

An editorial property journal paired with a useful market workspace. Keep the existing forest green `#344e41` and sand `#f5f0e8` brand anchors. Use white and warm paper for breathing room, deep green for navigation and primary actions, and photography as the strongest visual element. Buyer requests use a warm tinted card so the two sides of the market are recognizable at a glance.

The references informed four choices: image-led listing cards; concise, grouped filters; a map/list switch close to results; and a persistent side rail on desktop. The finished product should retain CRITERIA's identity rather than copy the sample screens or their black, burgundy, and neon accents.

## Foundations

- Source of truth for HSL colors and shadows: `frontend/src/index.css`. Tailwind maps those tokens in `frontend/tailwind.config.ts`; change the variables to adjust the palette.
- Reusable visual basis: `frontend/src/design-basis.css`, imported after Tailwind styles. Prefer its semantic classes for cards, panels, typography, and responsive shell; use Tailwind for local layout.
- Heading type: DM Sans, tight spacing and clear size hierarchy. Body type: Inter. Use short eyebrow labels above page titles and avoid all-caps body copy.
- Warm paper canvas, white raised surfaces, hairline borders, soft green shadows. Keep generous spacing between content groups; use rounded corners purposefully (24px panels, pill tabs/chips).
- Buttons and selected controls use forest green with high-contrast white text. Focus rings remain visible for keyboard use. Hover elevation is subtle and disabled for reduced motion.

| Element | Default |
| --- | --- |
| Canvas | Warm paper (`--background`) |
| Primary action / navigation | Forest green (`--primary`, `--primary-900`) |
| Surface | White (`--surface`) with warm hairline (`--border`) |
| Display title | DM Sans, 32–58px, tight tracking |
| Body | Inter, 14–16px, 1.5 line height |
| Cards and panels | 24px radius; soft shadow; 20–28px padding |
| Inputs | 48px minimum height; 12px radius |
| Touch targets | At least 44px where practical |

## Responsive behavior

| Surface | Narrow web and native | Desktop web (1024px+) |
| --- | --- | --- |
| Primary navigation | Fixed bottom tabs, safe-area aware | Persistent deep-green side rail with labels |
| Feed | Single-column cards and expandable filters | Two-column workspace: visible filter panel and card grid |
| Details | Full-width image and stacked content | Wide image/content composition with readable text width |
| Create/edit | Stacked sections | Centered form column inside a roomy canvas |
| Profile | Stacked identity and posts | Wide identity panel and multi-column posts |

Native stays in the 480px app shell even if a device reports a wide viewport. Use `html.web` when applying desktop shell behavior so Capacitor does not accidentally get desktop navigation.

Desktop navigation begins at 1024px and uses a 244–264px rail. The feed gains a 240–270px filter column there; results use two cards per row from 768px and three from 1536px. On narrow screens, filters open in the document flow and the bottom navigation respects safe-area insets.

## Product patterns

- Properties and buyer criteria stay symmetric in information hierarchy: headline value, title, location, key specs, and human owner.
- Show result count and active view near the feed grid. Keep filtering independent of list/map presentation.
- Empty states explain the next useful action in plain language. Forms group questions by topic and use the same section treatment for create and edit.
- Never obscure a property image with dense controls; keep badges small and readable. When no image exists, show a deliberate location fallback.
- Property cards use a 4:3 image. The price, title, location, specifications, and owner follow in that order. Buyer requests use a compact forest header and a warm surface, then budget, title, area, specifications, and buyer.
- Treat tabs and filter chips as stateful controls: expose their selected state with `aria-pressed`. Keep list/map as a view choice, with neither one changing the active filters.
