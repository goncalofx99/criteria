// ─────────────────────────────────────────────────────────────────────────────
// CRITERIA — Figma Design System Generator
// Creates: Design tokens, component library, and 5 app screens
// Stack: shadcn/ui dark theme + Tailwind CSS conventions
// Run via: Figma > Plugins > Development > Import plugin from manifest...
// ─────────────────────────────────────────────────────────────────────────────

(async () => {

  // ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
  // Mapped to Tailwind zinc/blue scale + shadcn CSS variable conventions

  const T = {
    // Backgrounds (zinc-950 → zinc-900 → zinc-800)
    bg:           '#09090b',  // zinc-950  — body / page bg
    surface:      '#18181b',  // zinc-900  — card, input bg
    surfaceEl:    '#1c1c1f',  // zinc-900+ — elevated card
    muted:        '#27272a',  // zinc-800  — muted area / divider
    mutedFg:      '#3f3f46',  // zinc-700  — subtle border

    // Borders
    border:       '#27272a',  // zinc-800
    borderHover:  '#52525b',  // zinc-600

    // Brand — blue-600 (Tailwind / shadcn primary)
    primary:      '#2563eb',  // blue-600
    primaryHov:   '#1d4ed8',  // blue-700
    primaryFg:    '#ffffff',
    primaryGlow:  '#2563eb',  // used at low opacity

    // Blue tints
    blue300:      '#93c5fd',
    blue400:      '#60a5fa',
    blue900:      '#1e3a5f',

    // Text
    fg:           '#fafafa',  // zinc-50
    fgMuted:      '#a1a1aa',  // zinc-400
    fgSubtle:     '#52525b',  // zinc-600

    // Status
    green:        '#22c55e',
    greenBg:      '#14532d',
    greenFg:      '#4ade80',
    red:          '#ef4444',
    redBg:        '#450a0a',
    amber:        '#f59e0b',
    amberBg:      '#451a03',
    amberFg:      '#fbbf24',
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────

  function hexToRGB(h) {
    h = h.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    }
  }

  function solidFill(color, opacity) {
    if (opacity === undefined) opacity = 1
    if (!color) return []
    var rgb = hexToRGB(color)
    return [{ type: 'SOLID', color: rgb, opacity: opacity }]
  }

  async function loadFonts() {
    await Promise.all([
      figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
      figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
    ])
  }

  // Create a text node
  function txt(content, opts = {}) {
    const n = figma.createText()
    n.characters = String(content)
    n.fontSize = opts.size || 14
    n.fontName = { family: 'Inter', style: opts.weight || 'Regular' }
    n.fills = solidFill(opts.color || T.fg)
    if (opts.ls !== undefined) n.letterSpacing = { value: opts.ls, unit: 'PERCENT' }
    if (opts.lh) n.lineHeight = { value: opts.lh, unit: 'PIXELS' }
    if (opts.opacity !== undefined) n.opacity = opts.opacity
    if (opts.align) n.textAlignHorizontal = opts.align
    // Fixed width wraps to height
    if (opts.w) {
      n.textAutoResize = 'HEIGHT'
      n.resize(opts.w, n.height)
    } else {
      n.textAutoResize = 'WIDTH_AND_HEIGHT'
    }
    return n
  }

  // Create a rectangle
  function rect(w, h, opts = {}) {
    const r = figma.createRectangle()
    r.resize(w, h)
    r.fills = opts.fill ? solidFill(opts.fill, opts.alpha) : []
    if (opts.radius !== undefined) r.cornerRadius = opts.radius
    if (opts.stroke) {
      r.strokes = solidFill(opts.stroke)
      r.strokeWeight = opts.sw || 1
      r.strokeAlign = 'INSIDE'
    }
    if (opts.name) r.name = opts.name
    return r
  }

  // Create a frame (with optional auto-layout)
  function frm(opts = {}) {
    const f = figma.createFrame()
    if (opts.name) f.name = opts.name

    // Auto-layout setup (must happen before resize to work correctly)
    if (opts.dir) {
      f.layoutMode = opts.dir  // 'HORIZONTAL' | 'VERTICAL'
      f.itemSpacing = opts.gap || 0
      f.paddingLeft   = opts.pl !== undefined ? opts.pl : (opts.px !== undefined ? opts.px : (opts.p || 0))
      f.paddingRight  = opts.pr !== undefined ? opts.pr : (opts.px !== undefined ? opts.px : (opts.p || 0))
      f.paddingTop    = opts.pt !== undefined ? opts.pt : (opts.py !== undefined ? opts.py : (opts.p || 0))
      f.paddingBottom = opts.pb !== undefined ? opts.pb : (opts.py !== undefined ? opts.py : (opts.p || 0))
      f.primaryAxisAlignItems  = opts.main  || 'MIN'
      f.counterAxisAlignItems  = opts.cross || 'MIN'
      // Sizing modes
      const isH = opts.dir === 'HORIZONTAL'
      if (opts.w !== undefined) {
        if (isH) f.primaryAxisSizingMode  = 'FIXED'
        else     f.counterAxisSizingMode  = 'FIXED'
      } else {
        if (isH) f.primaryAxisSizingMode  = 'AUTO'
        else     f.counterAxisSizingMode  = 'AUTO'
      }
      if (opts.h !== undefined) {
        if (isH) f.counterAxisSizingMode  = 'FIXED'
        else     f.primaryAxisSizingMode  = 'FIXED'
      } else {
        if (isH) f.counterAxisSizingMode  = 'AUTO'
        else     f.primaryAxisSizingMode  = 'AUTO'
      }
    }

    // Resize (safe: only if both w and h known, otherwise let auto-layout handle it)
    if (opts.w !== undefined && opts.h !== undefined) {
      f.resize(opts.w, opts.h)
    } else if (opts.w !== undefined) {
      f.resize(opts.w, Math.max(f.height, 1))
    } else if (opts.h !== undefined) {
      f.resize(Math.max(f.width, 1), opts.h)
    }

    f.fills = opts.fill ? solidFill(opts.fill, opts.alpha) : []
    f.clipsContent = opts.clip !== false

    if (opts.radius !== undefined) f.cornerRadius = opts.radius
    if (opts.tlr !== undefined) f.topLeftRadius     = opts.tlr
    if (opts.trr !== undefined) f.topRightRadius    = opts.trr
    if (opts.blr !== undefined) f.bottomLeftRadius  = opts.blr
    if (opts.brr !== undefined) f.bottomRightRadius = opts.brr

    if (opts.stroke) {
      f.strokes = solidFill(opts.stroke)
      f.strokeWeight = opts.sw || 1
      f.strokeAlign = opts.sa || 'INSIDE'
    }
    if (opts.effects) f.effects = opts.effects
    return f
  }

  // Append children and return parent (chainable helper)
  function append(parent, ...children) {
    for (const c of children) if (c) parent.appendChild(c)
    return parent
  }

  // Position a node
  function at(node, x, y) { node.x = x; node.y = y; return node }

  // Shadow effect
  function shadow(color, opacity, x, y, blur) {
    var rgb = hexToRGB(color)
    return { type: 'DROP_SHADOW', color: { r: rgb.r, g: rgb.g, b: rgb.b, a: opacity }, offset: { x: x, y: y }, radius: blur, spread: 0, visible: true, blendMode: 'NORMAL' }
  }

  // ─── PAGE SETUP ─────────────────────────────────────────────────────────────

  await loadFonts()

  function getOrMakePage(name) {
    let page = figma.root.children.find(p => p.name === name)
    if (!page) { page = figma.createPage(); page.name = name }
    else { for (const c of [...page.children]) c.remove() }
    return page
  }

  const dsPage      = getOrMakePage('🎨 Design System')
  const screensPage = getOrMakePage('📱 Screens')

  // ═══════════════════════════════════════════════════════════════════════════
  //  DESIGN SYSTEM PAGE
  // ═══════════════════════════════════════════════════════════════════════════

  await figma.setCurrentPageAsync(dsPage)

  let Y = 0  // running y-position on the DS page
  const SECTION_GAP = 72

  function dsTitle(label, y) {
    const t = txt(label, { size: 22, weight: 'Semi Bold', color: T.fg })
    at(t, 0, y)
    dsPage.appendChild(t)
    return y + 48
  }

  function dsDivider(y) {
    const r = rect(1200, 1, { fill: T.border })
    at(r, 0, y)
    dsPage.appendChild(r)
    return y + SECTION_GAP
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  {
    const logo = frm({ name: 'DS / Header', dir: 'HORIZONTAL', gap: 14, cross: 'CENTER' })
    const icon = frm({ name: 'Logo', w: 48, h: 48, fill: T.primary, radius: 14 })
    const lTxt = txt('C', { size: 26, weight: 'Bold', color: '#fff' })
    at(lTxt, 12, 8); icon.appendChild(lTxt)
    const headText = frm({ name: 'Heading', dir: 'VERTICAL', gap: 4 })
    append(headText,
      txt('CRITERIA', { size: 28, weight: 'Bold', color: T.fg }),
      txt('Design System  ·  shadcn/ui + Tailwind CSS dark theme', { size: 14, color: T.fgMuted }),
    )
    append(logo, icon, headText)
    at(logo, 0, Y)
    dsPage.appendChild(logo)
    Y += 80
    Y = dsDivider(Y)
  }

  // ── Colors ─────────────────────────────────────────────────────────────────
  Y = dsTitle('Colors', Y)
  {
    const groups = [
      { name: 'Background',  swatches: [
        { name: 'bg\nzinc-950',      hex: T.bg },
        { name: 'surface\nzinc-900', hex: T.surface },
        { name: 'surfaceEl',         hex: T.surfaceEl },
        { name: 'muted\nzinc-800',   hex: T.muted },
      ]},
      { name: 'Border', swatches: [
        { name: 'border\nzinc-800',  hex: T.border },
        { name: 'borderHover\nzinc-600', hex: T.borderHover },
      ]},
      { name: 'Brand', swatches: [
        { name: 'primary\nblue-600', hex: T.primary },
        { name: 'primaryHov\nblue-700', hex: T.primaryHov },
        { name: 'blue-400',          hex: T.blue400 },
        { name: 'blue-300',          hex: T.blue300 },
      ]},
      { name: 'Text', swatches: [
        { name: 'fg\nzinc-50',       hex: T.fg },
        { name: 'fg-muted\nzinc-400',hex: T.fgMuted },
        { name: 'fg-subtle\nzinc-600',hex: T.fgSubtle },
      ]},
      { name: 'Status', swatches: [
        { name: 'success\ngreen-500', hex: T.green },
        { name: 'destructive\nred-500', hex: T.red },
        { name: 'warning\namber-500',   hex: T.amber },
      ]},
    ]

    let gX = 0
    for (const g of groups) {
      const gLabel = txt(g.name, { size: 12, weight: 'Medium', color: T.fgSubtle })
      at(gLabel, gX, Y)
      dsPage.appendChild(gLabel)

      let sX = gX
      for (const sw of g.swatches) {
        const sW = 88, sH = 64
        const card = frm({ name: `Color / ${sw.name}`, w: sW, h: sH + 44, fill: T.surface, radius: 8, stroke: T.border })
        const colorBlock = rect(sW, sH, { fill: sw.hex, radius: 0 })
        colorBlock.topLeftRadius = 8; colorBlock.topRightRadius = 8
        const label = txt(sw.name, { size: 10, color: T.fgMuted, w: sW - 12 })
        at(label, 6, sH + 6)
        append(card, colorBlock, label)
        at(card, sX, Y + 22)
        dsPage.appendChild(card)
        sX += sW + 10
      }
      gX = sX + 28
    }
    Y += 160
  }

  Y = dsDivider(Y)

  // ── Typography ──────────────────────────────────────────────────────────────
  Y = dsTitle('Typography  ·  Inter', Y)
  {
    const scale = [
      { token: 'display',     label: 'Find Your Perfect Home',                         size: 36, weight: 'Bold',      lh: 44 },
      { token: 'h1',          label: 'Beautiful 3-bed Apartment in Lisbon',            size: 28, weight: 'Bold',      lh: 36 },
      { token: 'h2',          label: 'Bidirectional Property Matching',                size: 22, weight: 'Semi Bold', lh: 30 },
      { token: 'h3',          label: 'Create a Seller Post',                           size: 18, weight: 'Semi Bold', lh: 26 },
      { token: 'body-lg',     label: 'Browse properties and connect with verified buyers', size: 16, weight: 'Regular', lh: 24 },
      { token: 'body',        label: 'Sunny flat near the river · Lisbon, Portugal',    size: 14, weight: 'Regular', lh: 22 },
      { token: 'body-md',     label: 'Posted 2 days ago · 95 m²  ·  3 bed  ·  2 bath', size: 14, weight: 'Medium',  lh: 22 },
      { token: 'small',       label: 'Matched 12 buyers · Active listing',              size: 12, weight: 'Regular', lh: 18 },
      { token: 'label',       label: 'SELLER POST  ·  €350,000',                        size: 11, weight: 'Medium',  lh: 16, ls: 5 },
      { token: 'caption',     label: 'Updated 3 minutes ago',                           size: 11, weight: 'Regular', lh: 16, color: T.fgSubtle },
    ]

    for (const s of scale) {
      const row = frm({ name: `Type / ${s.token}`, dir: 'HORIZONTAL', gap: 24, cross: 'CENTER' })
      const tokenLabel = txt(s.token, { size: 11, weight: 'Medium', color: T.fgSubtle, w: 96 })
      const sizeLabel  = txt(`${s.size}/${s.lh || s.size * 1.5}`, { size: 10, color: T.fgSubtle, w: 48 })
      const sample     = txt(s.label, { size: s.size, weight: s.weight, lh: s.lh, color: s.color || T.fg, ls: s.ls })
      append(row, tokenLabel, sizeLabel, sample)
      at(row, 0, Y)
      dsPage.appendChild(row)
      Y += (s.lh || s.size + 8) + 16
    }
    Y += 8
  }

  Y = dsDivider(Y)

  // ── Buttons ──────────────────────────────────────────────────────────────────
  Y = dsTitle('Buttons', Y)
  {
    const variants = [
      { label: 'Create Post',    fill: T.primary,   textColor: '#fff',     stroke: null },
      { label: 'View Details',   fill: T.surface,   textColor: T.fg,       stroke: T.border },
      { label: 'Filter',         fill: null,        textColor: T.fg,       stroke: T.border },
      { label: 'Skip',           fill: null,        textColor: T.fgMuted,  stroke: null },
      { label: 'Delete Post',    fill: T.red,       textColor: '#fff',     stroke: null },
    ]

    // Default size row
    let bX = 0
    for (const v of variants) {
      const b = frm({ name: `Btn / ${v.label}`, dir: 'HORIZONTAL', gap: 6, px: 16, py: 10, main: 'CENTER', cross: 'CENTER', fill: v.fill, radius: 8, stroke: v.stroke })
      append(b, txt(v.label, { size: 14, weight: 'Medium', color: v.textColor }))
      at(b, bX, Y); dsPage.appendChild(b)
      bX += b.width + 12
    }
    Y += 48

    // Size variants
    const sizes = [
      { label: 'sm',   px: 12, py: 6,  size: 12 },
      { label: 'md',   px: 16, py: 10, size: 14 },
      { label: 'lg',   px: 24, py: 14, size: 16 },
      { label: 'icon', px: 10, py: 10, size: 14 },
    ]
    bX = 0
    for (const s of sizes) {
      const b = frm({ name: `Btn / ${s.label}`, dir: 'HORIZONTAL', px: s.px, py: s.py, main: 'CENTER', cross: 'CENTER', fill: T.primary, radius: 8 })
      append(b, txt(s.label === 'icon' ? '→' : s.label, { size: s.size, weight: 'Medium', color: '#fff' }))
      at(b, bX, Y); dsPage.appendChild(b)
      bX += b.width + 12
    }
    Y += 48

    // States: hover, disabled, loading
    const states = ['Default', 'Hover', 'Disabled', 'Loading']
    bX = 0
    const stateFills  = [T.primary, T.primaryHov, T.surface, T.primary]
    const stateAlpha  = [1, 1, 1, 1]
    const stateOpacity = [1, 1, 0.4, 0.8]
    const stateLabels = ['Publish Post', 'Publish Post', 'Publish Post', '● Publishing…']
    for (let i = 0; i < states.length; i++) {
      const b = frm({ name: `Btn / State / ${states[i]}`, dir: 'HORIZONTAL', px: 16, py: 10, main: 'CENTER', cross: 'CENTER', fill: stateFills[i], radius: 8, stroke: i === 2 ? T.border : null })
      b.opacity = stateOpacity[i]
      append(b, txt(stateLabels[i], { size: 14, weight: 'Medium', color: '#fff' }))
      at(b, bX, Y); dsPage.appendChild(b)
      bX += b.width + 12
    }
    Y += 52
  }

  Y = dsDivider(Y)

  // ── Form Controls ────────────────────────────────────────────────────────────
  Y = dsTitle('Form Controls', Y)
  {
    function inputField(labelText, placeholder, state = 'default', valueText = '') {
      const group = frm({ name: `Input / ${state}`, dir: 'VERTICAL', gap: 6 })
      const lColor = state === 'error' ? T.red : T.fgMuted
      const lTxt = txt(state === 'error' ? `${labelText} — required` : labelText, { size: 12, weight: 'Medium', color: lColor })
      const borderColor = state === 'focused' ? T.primary : state === 'error' ? T.red : T.border
      const sw = state === 'focused' ? 2 : 1
      const input = frm({ name: 'Input', w: 280, h: 42, fill: T.surface, radius: 8, stroke: borderColor, sw, dir: 'HORIZONTAL', px: 12, cross: 'CENTER' })
      const inputTxt = txt(valueText || placeholder, { size: 14, color: valueText ? T.fg : T.fgSubtle })
      input.appendChild(inputTxt)
      append(group, lTxt, input)
      if (state === 'error') {
        group.appendChild(txt('This field is required', { size: 11, color: T.red }))
      }
      return group
    }

    const inputs = [
      inputField('Location', 'Lisbon, Portugal', 'default'),
      inputField('Price (€)', '350,000', 'focused', '350,000 €'),
      inputField('Email', 'your@email.com', 'error'),
      inputField('Search', 'Search properties…', 'default', 'Lisbon'),
    ]
    let iX = 0
    for (const inp of inputs) {
      at(inp, iX, Y); dsPage.appendChild(inp)
      iX += 296
    }
    Y += 92

    // Select + Textarea
    const select = frm({ name: 'Select', w: 280, h: 42, fill: T.surface, radius: 8, stroke: T.border, dir: 'HORIZONTAL', px: 12, py: 0, cross: 'CENTER', main: 'SPACE_BETWEEN' })
    append(select, txt('Apartment', { size: 14, color: T.fg }), txt('▾', { size: 12, color: T.fgMuted }))
    at(select, 0, Y); dsPage.appendChild(select)

    const textarea = frm({ name: 'Textarea', w: 280, h: 88, fill: T.surface, radius: 8, stroke: T.border, dir: 'VERTICAL', p: 12 })
    textarea.appendChild(txt('Sunny flat with Tagus river views, recently renovated kitchen and bathrooms…', { size: 14, color: T.fgMuted, w: 256, lh: 22 }))
    at(textarea, 296, Y); dsPage.appendChild(textarea)

    // Checkbox + Toggle row
    const checkRow = frm({ name: 'Checkbox row', dir: 'HORIZONTAL', gap: 24, cross: 'CENTER' })
    // Checkbox checked
    const cbChecked = frm({ name: 'Checkbox / checked', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
    const cbBox = frm({ name: 'Box', w: 18, h: 18, fill: T.primary, radius: 4 })
    cbBox.appendChild((() => { const t = txt('✓', { size: 12, weight: 'Bold', color: '#fff' }); t.x = 3; t.y = 2; return t })())
    append(cbChecked, cbBox, txt('Active listing', { size: 14, color: T.fg }))
    // Toggle on
    const toggle = frm({ name: 'Toggle / on', w: 44, h: 24, fill: T.primary, radius: 12, dir: 'HORIZONTAL', px: 2, cross: 'CENTER' })
    const toggleKnob = frm({ name: 'Knob', w: 20, h: 20, fill: '#fff', radius: 10 })
    toggleKnob.x = 22
    toggle.layoutMode = 'NONE'; toggle.appendChild(toggleKnob)
    const toggleRow = frm({ name: 'Toggle row', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
    append(toggleRow, toggle, txt('Show on map', { size: 14, color: T.fg }))
    append(checkRow, cbChecked, toggleRow)
    at(checkRow, 608, Y); dsPage.appendChild(checkRow)

    Y += 112
  }

  Y = dsDivider(Y)

  // ── Cards ─────────────────────────────────────────────────────────────────────
  Y = dsTitle('Cards', Y)
  {
    // — Property Listing Card (Seller) —
    function makeSellerCard() {
      const card = frm({ name: 'Card / Seller Post', w: 312, fill: T.surface, radius: 12, stroke: T.border, dir: 'VERTICAL', clip: true })

      // Image area
      const imgArea = frm({ name: 'Image', w: 312, h: 176, fill: T.muted })
      const imgIcon = txt('🏠', { size: 52 }); at(imgIcon, 128, 60); imgArea.appendChild(imgIcon)
      // Seller badge
      const badge = frm({ name: 'Seller Badge', dir: 'HORIZONTAL', px: 8, py: 4, main: 'CENTER', cross: 'CENTER', fill: T.primary, radius: 6 })
      badge.appendChild(txt('SELLER', { size: 9, weight: 'Medium', color: '#fff', ls: 6 }))
      at(badge, 12, 12); imgArea.appendChild(badge)
      // Price overlay
      const priceOverlay = frm({ name: 'Price', w: 312, h: 40, fill: T.bg, alpha: 0.75, dir: 'HORIZONTAL', px: 14, cross: 'CENTER', main: 'SPACE_BETWEEN' })
      priceOverlay.appendChild(txt('€350,000', { size: 18, weight: 'Bold', color: T.fg }))
      priceOverlay.appendChild(txt('Active', { size: 11, weight: 'Medium', color: T.greenFg }))
      at(priceOverlay, 0, 176 - 40); imgArea.appendChild(priceOverlay)
      card.appendChild(imgArea)

      // Body
      const body = frm({ name: 'Body', w: 312, dir: 'VERTICAL', gap: 10, px: 14, pt: 14, pb: 14 })
      body.appendChild(txt('Beautiful 3-bed apartment in Lisbon', { size: 15, weight: 'Semi Bold', color: T.fg, w: 284 }))

      const locRow = frm({ name: 'Location', dir: 'HORIZONTAL', gap: 6, cross: 'CENTER' })
      append(locRow, txt('📍', { size: 12 }), txt('Alfama, Lisbon, Portugal', { size: 12, color: T.fgMuted }))

      const statsRow = frm({ name: 'Stats', dir: 'HORIZONTAL', gap: 16, cross: 'CENTER' })
      for (const s of ['3 bed', '2 bath', '95 m²']) {
        const item = frm({ name: s, dir: 'HORIZONTAL', gap: 4, cross: 'CENTER' })
        item.appendChild(txt(s, { size: 12, weight: 'Medium', color: T.fgMuted }))
        statsRow.appendChild(item)
      }

      const divider = rect(284, 1, { fill: T.border })

      const footer = frm({ name: 'Footer', w: 284, h: 36, dir: 'HORIZONTAL', cross: 'CENTER', main: 'SPACE_BETWEEN' })
      footer.appendChild(txt('12 matches', { size: 12, color: T.blue400 }))
      const viewBtn = frm({ name: 'View Btn', dir: 'HORIZONTAL', px: 12, py: 6, fill: T.primary, radius: 6 })
      viewBtn.appendChild(txt('View Matches', { size: 12, weight: 'Medium', color: '#fff' }))
      footer.appendChild(viewBtn)

      append(body, locRow, statsRow, divider, footer)
      card.appendChild(body)
      return card
    }

    // — Buyer Post Card —
    function makeBuyerCard() {
      const card = frm({ name: 'Card / Buyer Post', w: 312, fill: T.surface, radius: 12, stroke: T.border, dir: 'VERTICAL', clip: true })

      const header = frm({ name: 'Header', w: 312, fill: T.surfaceEl, dir: 'HORIZONTAL', px: 14, py: 14, gap: 12, cross: 'CENTER' })
      const av = frm({ name: 'Avatar', w: 40, h: 40, fill: T.primary, radius: 20 })
      const avTxt = txt('JD', { size: 13, weight: 'Bold', color: '#fff' }); at(avTxt, 10, 11); av.appendChild(avTxt)
      const info = frm({ name: 'Info', dir: 'VERTICAL', gap: 2 })
      append(info, txt('João Duarte', { size: 14, weight: 'Semi Bold', color: T.fg }), txt('Looking to buy', { size: 12, color: T.fgMuted }))
      const buyerBadge = frm({ name: 'Buyer Badge', dir: 'HORIZONTAL', px: 8, py: 3, fill: T.blue900, radius: 6 })
      buyerBadge.appendChild(txt('BUYER', { size: 9, weight: 'Medium', color: T.blue400, ls: 5 }))
      append(header, av, info, buyerBadge)
      card.appendChild(header)

      const body = frm({ name: 'Body', w: 312, dir: 'VERTICAL', gap: 10, px: 14, pt: 12, pb: 14 })
      body.appendChild(txt('Looking for apartment in Lisbon', { size: 15, weight: 'Semi Bold', color: T.fg, w: 284 }))

      const budgetRow = frm({ name: 'Budget', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
      append(budgetRow, txt('Budget', { size: 12, color: T.fgMuted }), txt('€200k – €500k', { size: 13, weight: 'Semi Bold', color: T.fg }))

      const reqRow = frm({ name: 'Reqs', dir: 'HORIZONTAL', gap: 6 })
      for (const req of ['2+ bed', '1+ bath', '10 km radius']) {
        const pill = frm({ name: req, dir: 'HORIZONTAL', px: 10, py: 4, fill: T.surfaceEl, radius: 20, stroke: T.border })
        pill.appendChild(txt(req, { size: 11, weight: 'Medium', color: T.fgMuted }))
        reqRow.appendChild(pill)
      }

      const chatBtn = frm({ name: 'Chat Btn', w: 284, h: 38, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER', fill: T.surface, radius: 8, stroke: T.border })
      chatBtn.appendChild(txt('Start Conversation', { size: 13, weight: 'Medium', color: T.fg }))

      append(body, budgetRow, reqRow, chatBtn)
      card.appendChild(body)
      return card
    }

    // — Match Result Card —
    function makeMatchCard() {
      const card = frm({ name: 'Card / Match', w: 312, fill: T.surface, radius: 12, stroke: T.primary, sw: 1, dir: 'VERTICAL', clip: true })

      const matchHeader = frm({ name: 'Match Header', w: 312, fill: '#051629', dir: 'HORIZONTAL', px: 14, py: 10, cross: 'CENTER', main: 'SPACE_BETWEEN' })
      const mlRow = frm({ name: 'Label', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
      const dot = frm({ name: 'Dot', w: 8, h: 8, fill: T.green, radius: 4 })
      append(mlRow, dot, txt('New Match', { size: 12, weight: 'Semi Bold', color: T.greenFg }))
      matchHeader.appendChild(mlRow); matchHeader.appendChild(txt('1h ago', { size: 11, color: T.fgSubtle }))
      card.appendChild(matchHeader)

      const body = frm({ name: 'Body', w: 312, dir: 'VERTICAL', gap: 12, px: 14, pt: 14, pb: 14 })
      body.appendChild(txt('Ana Costa', { size: 16, weight: 'Semi Bold', color: T.fg }))
      body.appendChild(txt('Looking for 3-bed apartment · €300k–€450k', { size: 12, color: T.fgMuted }))

      const scoreRow = frm({ name: 'Score Row', dir: 'HORIZONTAL', gap: 10, cross: 'CENTER' })
      const bar = frm({ name: 'Bar', w: 170, h: 6, fill: T.muted, radius: 3 })
      const fill94 = frm({ name: 'Fill', w: 160, h: 6, fill: T.green, radius: 3 })
      bar.appendChild(fill94)
      append(scoreRow, txt('Match', { size: 12, color: T.fgMuted }), bar, txt('94%', { size: 13, weight: 'Bold', color: T.greenFg }))

      const ctaBtn = frm({ name: 'CTA', w: 284, h: 40, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER', fill: T.primary, radius: 8, effects: [shadow(T.primary, 0.35, 0, 4, 12)] })
      ctaBtn.appendChild(txt('Start Conversation', { size: 14, weight: 'Medium', color: '#fff' }))

      append(body, scoreRow, ctaBtn)
      card.appendChild(body)
      return card
    }

    const sc = makeSellerCard();  at(sc, 0,   Y); dsPage.appendChild(sc)
    const bc = makeBuyerCard();   at(bc, 336, Y); dsPage.appendChild(bc)
    const mc = makeMatchCard();   at(mc, 672, Y); dsPage.appendChild(mc)
    Y += 420
  }

  Y = dsDivider(Y)

  // ── Badges & Tags ─────────────────────────────────────────────────────────────
  Y = dsTitle('Badges & Tags', Y)
  {
    const defs = [
      { label: 'Seller',   fill: T.primary,   color: '#fff',       stroke: null },
      { label: 'Buyer',    fill: T.blue900,    color: T.blue400,    stroke: null },
      { label: 'Active',   fill: T.greenBg,    color: T.greenFg,    stroke: null },
      { label: 'Matched',  fill: T.greenBg,    color: T.greenFg,    stroke: null },
      { label: 'Pending',  fill: T.amberBg,    color: T.amberFg,    stroke: null },
      { label: 'Expired',  fill: T.redBg,      color: T.red,        stroke: null },
      { label: 'POC',      fill: T.surfaceEl,  color: T.fgMuted,    stroke: T.border },
      { label: 'New',      fill: T.blue900,    color: T.blue400,    stroke: null },
      { label: 'Verified', fill: T.greenBg,    color: T.greenFg,    stroke: null },
    ]
    let bx = 0
    for (const d of defs) {
      const pill = frm({ name: `Badge / ${d.label}`, dir: 'HORIZONTAL', px: 10, py: 4, fill: d.fill, radius: 20, stroke: d.stroke })
      pill.appendChild(txt(d.label, { size: 12, weight: 'Medium', color: d.color }))
      at(pill, bx, Y); dsPage.appendChild(pill)
      bx += pill.width + 10
    }
    Y += 48
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  SCREENS PAGE — 5 mobile screens (390 × 844 — iPhone 14 Pro)
  // ═══════════════════════════════════════════════════════════════════════════

  await figma.setCurrentPageAsync(screensPage)

  const SW = 390, SH = 844, GAP = 80
  let SX = 0  // running x for each screen

  function screen(name) {
    const s = frm({ name, w: SW, h: SH, fill: T.bg, clip: true })
    s.x = SX; s.y = 0
    SX += SW + GAP
    screensPage.appendChild(s)
    return s
  }

  function statusBar(parent, y = 0) {
    const sb = frm({ name: 'Status Bar', w: SW, h: 44, fill: 'transparent', dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 24 })
    sb.fills = []
    append(sb, txt('9:41', { size: 15, weight: 'Semi Bold', color: T.fg }),
               txt('●●● ▲ 🔋', { size: 10, color: T.fg }))
    at(sb, 0, y); parent.appendChild(sb)
    return 44
  }

  function tabBar(parent) {
    const bar = frm({ name: 'Tab Bar', w: SW, h: 82, fill: T.surface, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 24, stroke: T.border, sa: 'OUTSIDE' })
    const tabs = [
      { icon: '🏠', label: 'Home',    active: false },
      { icon: '🔍', label: 'Matches', active: false },
      { icon: '＋', label: 'Post',    active: false },
      { icon: '💬', label: 'Chats',   active: false },
      { icon: '👤', label: 'Profile', active: false },
    ]
    for (const t of tabs) {
      const item = frm({ name: t.label, dir: 'VERTICAL', gap: 4, main: 'CENTER', cross: 'CENTER' })
      append(item,
        txt(t.icon, { size: 22 }),
        txt(t.label, { size: 10, weight: t.active ? 'Medium' : 'Regular', color: t.active ? T.blue400 : T.fgSubtle }),
      )
      bar.appendChild(item)
    }
    at(bar, 0, SH - 82); parent.appendChild(bar)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 1 — Login / Onboarding
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('01 · Login')
    statusBar(s, 0)

    // Glow blobs
    const blob1 = frm({ name: 'Glow', w: 300, h: 300, fill: T.primary, alpha: 0.06, radius: 150 })
    at(blob1, 45, 160); s.appendChild(blob1)

    // Logo
    const logoIcon = frm({ name: 'Logo Icon', w: 72, h: 72, fill: T.primary, radius: 22, effects: [shadow(T.primary, 0.4, 0, 8, 24)] })
    const lc = txt('C', { size: 40, weight: 'Bold', color: '#fff' }); at(lc, 20, 10); logoIcon.appendChild(lc)
    at(logoIcon, 159, 200); s.appendChild(logoIcon)

    const appName = txt('CRITERIA', { size: 30, weight: 'Bold', color: T.fg, ls: 8 }); at(appName, 89, 290); s.appendChild(appName)
    const tagline = txt('Find your perfect match in real estate', { size: 15, color: T.fgMuted, w: 300 })
    tagline.textAlignHorizontal = 'CENTER'; at(tagline, 45, 330); s.appendChild(tagline)

    // Feature bullets
    const feats = [
      { icon: '🏠', text: 'List and browse properties' },
      { icon: '🔍', text: 'AI-powered bidirectional matching' },
      { icon: '💬', text: 'Connect directly with buyers & sellers' },
    ]
    let fy = 394
    for (const f of feats) {
      const row = frm({ name: f.text, dir: 'HORIZONTAL', gap: 14, cross: 'CENTER' })
      const iconBox = frm({ name: 'Icon Box', w: 40, h: 40, fill: T.primary, alpha: 0.12, radius: 12 })
      const ic = txt(f.icon, { size: 20 }); at(ic, 10, 8); iconBox.appendChild(ic)
      append(row, iconBox, txt(f.text, { size: 14, color: T.fgMuted }))
      at(row, 32, fy); s.appendChild(row)
      fy += 56
    }

    // Google CTA
    const cta = frm({ name: 'Google CTA', w: 326, h: 54, fill: '#ffffff', radius: 14, dir: 'HORIZONTAL', gap: 12, main: 'CENTER', cross: 'CENTER', effects: [shadow('#000', 0.2, 0, 4, 16)] })
    const gCircle = frm({ name: 'G', w: 24, h: 24, fill: T.primary, radius: 12 })
    const gTxt = txt('G', { size: 13, weight: 'Bold', color: '#fff' }); at(gTxt, 7, 4); gCircle.appendChild(gTxt)
    append(cta, gCircle, txt('Continue with Google', { size: 16, weight: 'Semi Bold', color: '#09090b' }))
    at(cta, 32, 624); s.appendChild(cta)

    const termsText = txt('By continuing you agree to our Terms of Service and Privacy Policy', { size: 11, color: T.fgSubtle, w: 326, lh: 17 })
    termsText.textAlignHorizontal = 'CENTER'; at(termsText, 32, 694); s.appendChild(termsText)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 2 — Home / Listings Feed
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('02 · Home — Listings')
    statusBar(s, 0)

    // Top nav
    const nav = frm({ name: 'Nav', w: SW, h: 56, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 20 })
    nav.fills = []
    const navLeft = frm({ name: 'Left', dir: 'VERTICAL', gap: 2 })
    append(navLeft, txt('CRITERIA', { size: 20, weight: 'Bold', color: T.fg }), txt('📍 Lisbon, Portugal', { size: 12, color: T.fgMuted }))
    const av = frm({ name: 'Avatar', w: 36, h: 36, fill: T.primary, radius: 18 })
    const avTxt = txt('JD', { size: 12, weight: 'Bold', color: '#fff' }); at(avTxt, 7, 9); av.appendChild(avTxt)
    append(nav, navLeft, av); at(nav, 0, 44); s.appendChild(nav)

    // Search
    const search = frm({ name: 'Search Bar', w: 350, h: 44, fill: T.surface, radius: 22, stroke: T.border, dir: 'HORIZONTAL', gap: 10, px: 14, cross: 'CENTER' })
    append(search, txt('🔍', { size: 14 }), txt('Search location, type…', { size: 13, color: T.fgSubtle }))
    at(search, 20, 108); s.appendChild(search)

    // Filter chips
    const chipRow = frm({ name: 'Filters', dir: 'HORIZONTAL', gap: 8, px: 0 })
    const chipData = ['All', 'Apartment', 'House', 'Studio', '< €500k']
    for (let i = 0; i < chipData.length; i++) {
      const chip = frm({ name: chipData[i], dir: 'HORIZONTAL', px: 14, py: 7, fill: i === 0 ? T.primary : T.surface, radius: 20, stroke: i === 0 ? null : T.border })
      chip.appendChild(txt(chipData[i], { size: 13, weight: i === 0 ? 'Medium' : 'Regular', color: i === 0 ? '#fff' : T.fgMuted }))
      chipRow.appendChild(chip)
    }
    at(chipRow, 20, 164); s.appendChild(chipRow)

    // Listing rows
    function listingRow(title, price, loc, badge, offsetY) {
      const card = frm({ name: `Listing: ${title}`, w: 350, fill: T.surface, radius: 12, stroke: T.border, dir: 'HORIZONTAL', gap: 14, p: 14, cross: 'CENTER' })
      const thumb = frm({ name: 'Thumb', w: 72, h: 72, fill: T.muted, radius: 10 })
      const ti = txt('🏠', { size: 28 }); at(ti, 18, 18); thumb.appendChild(ti)

      const info = frm({ name: 'Info', dir: 'VERTICAL', gap: 4 })
      const topRow = frm({ name: 'Top', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
      const bl = frm({ name: 'Badge', dir: 'HORIZONTAL', px: 6, py: 2, fill: badge === 'SELLER' ? T.primary : T.blue900, radius: 4 })
      bl.appendChild(txt(badge, { size: 9, weight: 'Medium', color: badge === 'SELLER' ? '#fff' : T.blue400, ls: 3 }))
      append(topRow, bl, txt('2d ago', { size: 11, color: T.fgSubtle }))
      append(info, topRow, txt(title, { size: 14, weight: 'Semi Bold', color: T.fg }), txt(price, { size: 15, weight: 'Bold', color: T.fg }), txt(loc, { size: 12, color: T.fgMuted }))

      append(card, thumb, info)
      at(card, 20, offsetY); s.appendChild(card)
      return card
    }

    listingRow('3-bed apartment, Lisbon', '€350,000', '📍 Alfama · 95m² · 3 bed', 'SELLER', 208)
    listingRow('Buyer: Looking in Lisbon', '€200k – €500k', '📍 Lisbon, 10 km radius', 'BUYER', 322)
    listingRow('Modern studio flat, Porto', '€185,000', '📍 Porto · 42m² · 1 bed', 'SELLER', 436)
    listingRow('Looking: 2-bed family home', '€320k – €480k', '📍 Cascais, 15 km radius', 'BUYER', 550)

    // FAB
    const fab = frm({ name: 'FAB', w: 56, h: 56, fill: T.primary, radius: 28, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER', effects: [shadow(T.primary, 0.45, 0, 6, 18)] })
    fab.appendChild(txt('+', { size: 28, weight: 'Bold', color: '#fff' }))
    at(fab, 314, 724); s.appendChild(fab)

    // Tab Bar — Home active
    const bar = frm({ name: 'Tab Bar', w: SW, h: 82, fill: T.surface, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 24, stroke: T.border, sa: 'OUTSIDE' })
    const tabs2 = [
      { icon: '🏠', label: 'Home',    active: true },
      { icon: '🔍', label: 'Matches', active: false },
      { icon: '＋', label: 'Post',    active: false },
      { icon: '💬', label: 'Chats',   active: false },
      { icon: '👤', label: 'Profile', active: false },
    ]
    for (const t of tabs2) {
      const item = frm({ name: t.label, dir: 'VERTICAL', gap: 4, main: 'CENTER', cross: 'CENTER' })
      append(item, txt(t.icon, { size: 22 }), txt(t.label, { size: 10, weight: t.active ? 'Medium' : 'Regular', color: t.active ? T.blue400 : T.fgSubtle }))
      bar.appendChild(item)
    }
    at(bar, 0, SH - 82); s.appendChild(bar)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 3 — Create Post
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('03 · Create Post')
    statusBar(s, 0)

    // Nav
    const nav = frm({ name: 'Nav', w: SW, h: 52, fill: T.surface, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 20, stroke: T.border, sa: 'OUTSIDE' })
    append(nav, txt('← Back', { size: 14, color: T.blue400 }), txt('Create Post', { size: 17, weight: 'Semi Bold', color: T.fg }), txt('Save Draft', { size: 14, color: T.fgMuted }))
    at(nav, 0, 44); s.appendChild(nav)

    // Toggle
    const toggle = frm({ name: 'Type Toggle', w: 350, h: 46, fill: T.surface, radius: 10, stroke: T.border, dir: 'HORIZONTAL', p: 4, gap: 4 })
    for (const [i, label] of ['Seller Post', 'Buyer Post'].entries()) {
      const opt = frm({ name: label, w: 167, h: 38, fill: i === 0 ? T.primary : 'transparent', radius: 8, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER' })
      opt.fills = i === 0 ? solidFill(T.primary) : []
      opt.appendChild(txt(label, { size: 14, weight: 'Medium', color: i === 0 ? '#fff' : T.fgMuted }))
      toggle.appendChild(opt)
    }
    at(toggle, 20, 110); s.appendChild(toggle)

    // Form fields
    const fields = [
      { label: 'Title',             ph: 'e.g. Beautiful 3-bed apartment in Lisbon', h: 44 },
      { label: 'Description',       ph: 'Describe the property…',                    h: 88 },
      { label: 'Location',          ph: 'Lisbon, Portugal',                           h: 44 },
      { label: 'Price (€)',         ph: '350,000',                                    h: 44 },
    ]
    let fy = 172
    for (const f of fields) {
      const lbl = txt(f.label, { size: 13, weight: 'Medium', color: T.fgMuted })
      at(lbl, 20, fy); s.appendChild(lbl); fy += 24
      const inp = frm({ name: `Field: ${f.label}`, w: 350, h: f.h, fill: T.surface, radius: 8, stroke: T.border, dir: 'HORIZONTAL', px: 12, cross: 'CENTER' })
      inp.appendChild(txt(f.ph, { size: 14, color: T.fgSubtle }))
      at(inp, 20, fy); s.appendChild(inp); fy += f.h + 18
    }

    // Property type chips
    const ptLabel = txt('Property Type', { size: 13, weight: 'Medium', color: T.fgMuted })
    at(ptLabel, 20, fy); s.appendChild(ptLabel); fy += 24
    const ptRow = frm({ name: 'Prop Types', dir: 'HORIZONTAL', gap: 8 })
    for (const [i, pt] of ['Apartment', 'House', 'Studio', 'Villa'].entries()) {
      const chip = frm({ name: pt, dir: 'HORIZONTAL', px: 12, py: 8, fill: i === 0 ? T.blue900 : T.surface, radius: 8, stroke: i === 0 ? T.primary : T.border })
      chip.appendChild(txt(pt, { size: 13, weight: i === 0 ? 'Medium' : 'Regular', color: i === 0 ? T.blue400 : T.fgMuted }))
      ptRow.appendChild(chip)
    }
    at(ptRow, 20, fy); s.appendChild(ptRow)

    // Submit
    const submitBtn = frm({ name: 'Publish CTA', w: 350, h: 54, fill: T.primary, radius: 14, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER', effects: [shadow(T.primary, 0.3, 0, 4, 14)] })
    submitBtn.appendChild(txt('Publish Post', { size: 16, weight: 'Semi Bold', color: '#fff' }))
    at(submitBtn, 20, SH - 100); s.appendChild(submitBtn)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 4 — Matching Results
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('04 · Matching Results')
    statusBar(s, 0)

    // Header
    const header = frm({ name: 'Header', w: SW, h: 90, fill: T.surface, dir: 'VERTICAL', gap: 6, px: 20, pt: 6, pb: 14, stroke: T.border, sa: 'OUTSIDE' })
    const hTop = frm({ name: 'Top', dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER' })
    append(hTop, txt('← Back', { size: 14, color: T.blue400 }), txt('Matches', { size: 17, weight: 'Semi Bold', color: T.fg }), txt('Filter', { size: 14, color: T.blue400 }))
    header.appendChild(hTop)
    header.appendChild(txt('3-bed apartment, Alfama · 12 matches', { size: 13, color: T.fgMuted }))
    at(header, 0, 44); s.appendChild(header)

    // Stats bar
    const statsBar = frm({ name: 'Stats Bar', w: SW, h: 52, fill: '#060e1e', dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 20 })
    const sbLeft = frm({ name: 'Left', dir: 'VERTICAL', gap: 2 })
    append(sbLeft, txt('Matching algorithm', { size: 11, weight: 'Medium', color: T.blue400 }), txt('Sorted by compatibility score', { size: 11, color: T.fgSubtle }))
    const matchPill = frm({ name: 'Count', dir: 'HORIZONTAL', px: 10, py: 4, fill: T.primary, radius: 20 })
    matchPill.appendChild(txt('12 matches', { size: 12, weight: 'Medium', color: '#fff' }))
    append(statsBar, sbLeft, matchPill)
    at(statsBar, 0, 134); s.appendChild(statsBar)

    // Match rows
    const matches = [
      { name: 'Ana Costa',      initials: 'AC', score: 94, sub: 'Looking for 3-bed · €300k–€450k',   time: '1h ago',  isNew: true },
      { name: 'Miguel Santos',  initials: 'MS', score: 87, sub: 'Flexible buyer · €280k–€500k',       time: '3h ago',  isNew: true },
      { name: 'Sofia Rodrigues',initials: 'SR', score: 76, sub: 'First-time buyer · €250k–€380k',     time: '1d ago',  isNew: false },
      { name: 'Carlos Lima',    initials: 'CL', score: 71, sub: 'Family home seeker · €320k–€420k',   time: '2d ago',  isNew: false },
      { name: 'Beatriz Faria',  initials: 'BF', score: 68, sub: 'Investment buyer · €200k–€400k',     time: '3d ago',  isNew: false },
    ]

    let my = 186
    for (const m of matches) {
      const row = frm({ name: `Match: ${m.name}`, w: SW, fill: m.isNew ? '#070f1e' : T.bg, dir: 'HORIZONTAL', gap: 14, px: 20, py: 14, cross: 'CENTER', stroke: T.border, sa: 'OUTSIDE' })

      const avatar = frm({ name: 'Avatar', w: 46, h: 46, fill: T.primary, alpha: m.isNew ? 1 : 0.55, radius: 23 })
      const avTxt = txt(m.initials, { size: 13, weight: 'Bold', color: '#fff' }); at(avTxt, 9, 13); avatar.appendChild(avTxt)

      const info = frm({ name: 'Info', dir: 'VERTICAL', gap: 3 })
      const infoTop = frm({ name: 'Top', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
      infoTop.appendChild(txt(m.name, { size: 14, weight: 'Semi Bold', color: T.fg }))
      if (m.isNew) {
        const nb = frm({ name: 'New', dir: 'HORIZONTAL', px: 6, py: 2, fill: T.greenBg, radius: 20 })
        nb.appendChild(txt('New', { size: 10, weight: 'Medium', color: T.greenFg }))
        infoTop.appendChild(nb)
      }
      append(info, infoTop, txt(m.sub, { size: 12, color: T.fgMuted }), txt(m.time, { size: 11, color: T.fgSubtle }))

      // Score circle
      const circle = frm({ name: 'Score Circle', w: 44, h: 44, fill: T.surface, radius: 22, stroke: m.score > 85 ? T.green : m.score > 75 ? T.primary : T.borderHover, sw: 2 })
      const scoreTxt = txt(`${m.score}%`, { size: 11, weight: 'Bold', color: m.score > 85 ? T.greenFg : m.score > 75 ? T.blue400 : T.fgMuted })
      at(scoreTxt, m.score >= 90 ? 4 : 3, 14); circle.appendChild(scoreTxt)

      append(row, avatar, info, circle)
      at(row, 0, my); s.appendChild(row)
      my += row.height + 1
    }

    // Bottom CTA
    const bottomBar = frm({ name: 'Bottom Bar', w: SW, fill: T.surface, dir: 'HORIZONTAL', gap: 12, px: 20, py: 14, stroke: T.border, sa: 'OUTSIDE' })
    const btn1 = frm({ name: 'Btn All', w: 148, h: 46, fill: T.surface, radius: 10, stroke: T.border, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER' })
    btn1.appendChild(txt('Message All', { size: 14, weight: 'Medium', color: T.fg }))
    const btn2 = frm({ name: 'Btn Top 3', w: 148, h: 46, fill: T.primary, radius: 10, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER' })
    btn2.appendChild(txt('Message Top 3', { size: 14, weight: 'Medium', color: '#fff' }))
    append(bottomBar, btn1, btn2)
    at(bottomBar, 0, SH - bottomBar.height - 28); s.appendChild(bottomBar)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 5 — Chat / Conversation
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('05 · Chat')
    statusBar(s, 0)

    // Header
    const chatHeader = frm({ name: 'Chat Header', w: SW, h: 68, fill: T.surface, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 16, stroke: T.border, sa: 'OUTSIDE' })
    chatHeader.appendChild(txt('← Back', { size: 14, color: T.blue400 }))
    const cInfo = frm({ name: 'Center', dir: 'VERTICAL', gap: 2, cross: 'CENTER' })
    append(cInfo, txt('Ana Costa', { size: 15, weight: 'Semi Bold', color: T.fg }), txt('● Online · 3-bed, Alfama', { size: 11, color: T.greenFg }))
    chatHeader.appendChild(cInfo)
    chatHeader.appendChild(txt('⋯', { size: 22, color: T.fgMuted }))
    at(chatHeader, 0, 44); s.appendChild(chatHeader)

    // Property reference chip
    const propChip = frm({ name: 'Prop Ref', w: 350, fill: T.surface, radius: 10, stroke: T.border, dir: 'HORIZONTAL', gap: 12, px: 12, py: 10, cross: 'CENTER' })
    const propThumb = frm({ name: 'Thumb', w: 48, h: 48, fill: T.muted, radius: 8 })
    const pti = txt('🏠', { size: 22 }); at(pti, 12, 10); propThumb.appendChild(pti)
    const propInfo = frm({ name: 'Info', dir: 'VERTICAL', gap: 2 })
    append(propInfo, txt('3-bed apartment, Alfama', { size: 13, weight: 'Medium', color: T.fg }), txt('€350,000 · 95 m² · Seller post', { size: 11, color: T.fgMuted }))
    append(propChip, propThumb, propInfo)
    at(propChip, 20, 126); s.appendChild(propChip)

    // Date divider
    const dateDivider = frm({ name: 'Date Divider', dir: 'HORIZONTAL', gap: 12, cross: 'CENTER' })
    const dLine1 = rect(120, 1, { fill: T.border }); const dLine2 = rect(120, 1, { fill: T.border })
    append(dateDivider, dLine1, txt('Today', { size: 11, color: T.fgSubtle }), dLine2)
    at(dateDivider, 20, 194); s.appendChild(dateDivider)

    // Messages
    const msgs = [
      { body: 'Hi! I saw your listing for the 3-bed apartment in Alfama. Is it still available?', mine: false, time: '14:32' },
      { body: 'Yes, it is! Just listed it yesterday. Are you looking to buy in that area?', mine: true, time: '14:35' },
      { body: 'Exactly! My budget is around €350k. Could we arrange a viewing this weekend?', mine: false, time: '14:37' },
      { body: 'Of course! Saturday afternoon works for me. What time suits you best?', mine: true, time: '14:40' },
      { body: 'Around 3pm would be perfect 👍', mine: false, time: '14:41' },
    ]

    let msgY = 216
    for (const m of msgs) {
      const maxW = 248
      const bubbleColor = m.mine ? T.primary : T.surface
      const bubble = frm({ name: `Bubble: ${m.body.slice(0, 20)}…`, fill: bubbleColor, radius: 18, dir: 'HORIZONTAL', px: 14, py: 10,
        tlr: 18, trr: 18, blr: m.mine ? 18 : 4, brr: m.mine ? 4 : 18, stroke: m.mine ? null : T.border
      })
      const bText = txt(m.body, { size: 14, color: m.mine ? '#fff' : T.fg, w: maxW, lh: 21 })
      bubble.appendChild(bText)

      const timeT = txt(m.time, { size: 10, color: T.fgSubtle })

      const bW = maxW + 28
      const bX = m.mine ? (SW - 20 - bW) : 20
      at(bubble, bX, msgY); s.appendChild(bubble)
      msgY += bubble.height + 4
      const tX = m.mine ? (SW - 20 - timeT.width) : 20
      at(timeT, tX, msgY); s.appendChild(timeT)
      msgY += 20
    }

    // Input bar
    const inputBar = frm({ name: 'Input Bar', w: SW, h: 74, fill: T.surface, dir: 'HORIZONTAL', gap: 10, px: 16, cross: 'CENTER', stroke: T.border, sa: 'OUTSIDE' })
    const msgInput = frm({ name: 'Msg Input', w: 272, h: 44, fill: T.bg, radius: 22, stroke: T.border, dir: 'HORIZONTAL', px: 16, cross: 'CENTER' })
    msgInput.appendChild(txt('Type a message…', { size: 14, color: T.fgSubtle }))
    const sendBtn = frm({ name: 'Send', w: 44, h: 44, fill: T.primary, radius: 22, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER' })
    sendBtn.appendChild(txt('↑', { size: 20, weight: 'Bold', color: '#fff' }))
    append(inputBar, msgInput, sendBtn)
    at(inputBar, 0, SH - 74); s.appendChild(inputBar)
  }

  // ─────────────────────────────────────────────────────────────────
  // Screen 6 — Conversation List (Chats tab)
  // ─────────────────────────────────────────────────────────────────
  {
    const s = screen('06 · Chats List')
    statusBar(s, 0)

    const nav = frm({ name: 'Nav', w: SW, h: 52, fill: T.surface, dir: 'HORIZONTAL', main: 'SPACE_BETWEEN', cross: 'CENTER', px: 20, stroke: T.border, sa: 'OUTSIDE' })
    append(nav, txt('Conversations', { size: 20, weight: 'Bold', color: T.fg }), txt('✏️', { size: 20 }))
    at(nav, 0, 44); s.appendChild(nav)

    // Search
    const search = frm({ name: 'Search', w: 350, h: 42, fill: T.surface, radius: 10, stroke: T.border, dir: 'HORIZONTAL', gap: 10, px: 14, cross: 'CENTER' })
    append(search, txt('🔍', { size: 14 }), txt('Search conversations…', { size: 13, color: T.fgSubtle }))
    at(search, 20, 106); s.appendChild(search)

    const convos = [
      { name: 'Ana Costa',       sub: 'Around 3pm would be perfect 👍',       time: '14:41', unread: 1,  postType: 'SELLER' },
      { name: 'Miguel Santos',   sub: 'When can I visit the property?',        time: '11:20', unread: 3,  postType: 'SELLER' },
      { name: 'Sofia Rodrigues', sub: 'Thanks, I\'ll have a look at it',       time: 'Tue',   unread: 0,  postType: 'SELLER' },
      { name: 'Rui Pereira',     sub: 'Is the price negotiable?',              time: 'Mon',   unread: 0,  postType: 'BUYER' },
      { name: 'Mariana Lopes',   sub: 'Great! See you Saturday.',              time: 'Sun',   unread: 0,  postType: 'BUYER' },
    ]

    let cy = 162
    for (const c of convos) {
      const row = frm({ name: `Convo: ${c.name}`, w: SW, fill: T.bg, dir: 'HORIZONTAL', gap: 14, px: 20, py: 14, cross: 'CENTER', stroke: T.border, sa: 'OUTSIDE' })

      const av = frm({ name: 'Avatar', w: 48, h: 48, fill: c.unread > 0 ? T.primary : T.surface, radius: 24, stroke: c.unread === 0 ? T.border : null })
      const initials = c.name.split(' ').map(n => n[0]).join('')
      const avTxt = txt(initials, { size: 14, weight: 'Bold', color: c.unread > 0 ? '#fff' : T.fgMuted }); at(avTxt, 10, 14); av.appendChild(avTxt)

      const info = frm({ name: 'Info', dir: 'VERTICAL', gap: 3 })
      const infoTop = frm({ name: 'Top', dir: 'HORIZONTAL', gap: 8, cross: 'CENTER' })
      infoTop.appendChild(txt(c.name, { size: 15, weight: c.unread > 0 ? 'Semi Bold' : 'Regular', color: T.fg }))
      const ptBadge = frm({ name: 'Type', dir: 'HORIZONTAL', px: 5, py: 2, fill: c.postType === 'SELLER' ? T.primary : T.blue900, radius: 4 })
      ptBadge.appendChild(txt(c.postType, { size: 8, weight: 'Medium', color: c.postType === 'SELLER' ? '#fff' : T.blue400, ls: 2 }))
      infoTop.appendChild(ptBadge)
      append(info, infoTop, txt(c.sub, { size: 13, color: c.unread > 0 ? T.fg : T.fgMuted }))

      const rightCol = frm({ name: 'Right', dir: 'VERTICAL', gap: 6, cross: 'MAX' })
      rightCol.appendChild(txt(c.time, { size: 11, color: c.unread > 0 ? T.blue400 : T.fgSubtle }))
      if (c.unread > 0) {
        const badge = frm({ name: 'Unread', w: 20, h: 20, fill: T.primary, radius: 10, dir: 'HORIZONTAL', main: 'CENTER', cross: 'CENTER' })
        badge.appendChild(txt(String(c.unread), { size: 11, weight: 'Bold', color: '#fff' }))
        rightCol.appendChild(badge)
      }

      append(row, av, info, rightCol)
      at(row, 0, cy); s.appendChild(row)
      cy += row.height + 1
    }

    tabBar(s)
  }

  // ─────────────────────────────────────────────────────────────────
  // Scroll into view + done
  // ─────────────────────────────────────────────────────────────────
  figma.viewport.scrollAndZoomIntoView(screensPage.children)
  figma.notify('✅ CRITERIA Design System generated! Check "🎨 Design System" and "📱 Screens" pages.', { timeout: 6000 })
  figma.closePlugin()

})()
