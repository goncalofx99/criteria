// CRITERIA – Component Library
// Paste this into Figma: Plugins → Development → Run script
// Uses Lucide icon SVG paths (no emojis), shadcn/ui-inspired components

async function main() {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  // ── Helpers ──────────────────────────────────────────────────────────────

  function h(hex) {
    return {
      r: parseInt(hex.slice(1, 3), 16) / 255,
      g: parseInt(hex.slice(3, 5), 16) / 255,
      b: parseInt(hex.slice(5, 7), 16) / 255,
    };
  }

  function addText(parent, str, x, y, size, colorHex, style = 'Regular', opts = {}) {
    const t = figma.createText();
    t.fontName = { family: 'Inter', style };
    t.characters = str;
    t.x = x; t.y = y;
    t.fontSize = size;
    t.fills = [{ type: 'SOLID', color: h(colorHex) }];
    if (opts.letterSpacing) t.letterSpacing = opts.letterSpacing;
    if (opts.opacity !== undefined) t.opacity = opts.opacity;
    parent.appendChild(t);
    return t;
  }

  function addRect(parent, x, y, w, hh, colorHex, radius = 0) {
    const r = figma.createRectangle();
    r.x = x; r.y = y; r.resize(w, hh);
    r.fills = [{ type: 'SOLID', color: h(colorHex) }];
    if (radius) r.cornerRadius = radius;
    parent.appendChild(r);
    return r;
  }

  function makeFrame(name, x, y, w, hh, fillHex = '#ffffff', radius = 0) {
    const f = figma.createFrame();
    f.name = name; f.x = x; f.y = y;
    f.resize(w, hh);
    f.fills = [{ type: 'SOLID', color: h(fillHex) }];
    if (radius) f.cornerRadius = radius;
    return f;
  }

  function shadow(node, a = 0.08, y = 4, blur = 16) {
    node.effects = [{
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a },
      offset: { x: 0, y },
      radius: blur,
      spread: 0,
      visible: true,
      blendMode: 'NORMAL',
    }];
  }

  // Lucide icon SVG paths (stroke, no fill, strokeWidth=2)
  const ICONS = {
    home:       'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
    plus:       'M12 5v14 M5 12h14',
    inbox:      'M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    user:       'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    search:     'M21 21l-6-6 M15 9a6 6 0 1 1-12 0 6 6 0 0 1 12 0',
    chevLeft:   'M15 18l-6-6 6-6',
    mapPin:     'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
    bed:        'M2 4v16 M2 8h18a2 2 0 0 1 2 2v10 M2 17h20 M6 8v9',
    bath:       'M9 6 C9 3 14 3 14 6 L14 12 M3 12h18 M3 12a9 3 0 0 0 18 0 M12 12v9',
    maximize:   'M8 3H5a2 2 0 0 0-2 2v3 M21 8V5a2 2 0 0 0-2-2h-3 M3 16v3a2 2 0 0 0 2 2h3 M16 21h3a2 2 0 0 0 2-2v-3',
    heart:      'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
    arrowRight: 'M5 12h14 M12 5l7 7-7 7',
    send:       'M22 2L11 13 M22 2L15 22l-4-9-9-4 22-7z',
    x:          'M18 6L6 18 M6 6l12 12',
    check:      'M20 6L9 17l-5-5',
    building:   'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4',
    euro:       'M4 10h12 M4 14h9 M19.5 8a5 5 0 1 0 0 8',
    filter:     'M22 3H2l8 9.46V19l4 2V12.46L22 3',
  };

  function addIcon(parent, iconKey, x, y, size = 20, colorHex = '#344e41') {
    const paths = ICONS[iconKey];
    if (!paths) return;
    const group = figma.createFrame();
    group.name = `icon-${iconKey}`;
    group.x = x; group.y = y;
    group.resize(size, size);
    group.fills = [];
    group.clipsContent = false;

    paths.split(' M ').forEach((part, i) => {
      const d = i === 0 ? part : 'M ' + part;
      const vec = figma.createVector();
      vec.vectorPaths = [{ windingRule: 'NONE', data: d }];
      vec.strokes = [{ type: 'SOLID', color: h(colorHex) }];
      vec.strokeWeight = 2;
      vec.strokeCap = 'ROUND';
      vec.strokeJoin = 'ROUND';
      vec.fills = [];
      // Scale from 24x24 to target size
      const scale = size / 24;
      vec.resize(size, size);
      vec.rescaleContent(scale);
      group.appendChild(vec);
    });
    parent.appendChild(group);
    return group;
  }

  // ── Clear existing content ─────────────────────────────────────────────

  const tokensPage = figma.root.children.find(p => p.name === '🎨 Tokens & Atoms');
  const componentsPage = figma.root.children.find(p => p.name === '🃏 Components');
  const screensPage = figma.root.children.find(p => p.name === '📱 Screens');

  // Clear all pages
  for (const page of [tokensPage, componentsPage, screensPage]) {
    await figma.setCurrentPageAsync(page);
    for (const node of [...page.children]) node.remove();
  }

  // ── PAGE 1: TOKENS & ATOMS ────────────────────────────────────────────

  await figma.setCurrentPageAsync(tokensPage);
  tokensPage.backgrounds = [{ type: 'SOLID', color: h('#f0f0ee') }];

  // ── Section label helper ──
  function sectionLabel(text, x, y) {
    addText(tokensPage, text.toUpperCase(), x, y, 10, '#9ca3af', 'Medium', { letterSpacing: { value: 1.5, unit: 'PIXELS' } });
  }

  // ── COLORS ──
  sectionLabel('Color Tokens', 60, 60);
  const colorData = [
    ['Primary',    '#344e41', 'Brand'],
    ['Primary-700','#2d4438', 'Dark'],
    ['Primary-600','#52796f', 'Hover'],
    ['Primary-400','#84a98c', 'Light'],
    ['Primary-200','#cad2c5', 'Pale'],
    ['Accent',     '#f5f0e8', 'Sand'],
    ['Background', '#fafaf8', 'App BG'],
    ['Surface',    '#ffffff', 'Card'],
    ['Border',     '#e5e7eb', 'Line'],
    ['Text-900',   '#1a1a1a', 'Title'],
    ['Text-500',   '#6b7280', 'Body'],
    ['Text-300',   '#9ca3af', 'Muted'],
    ['Error',      '#ef4444', 'Danger'],
    ['Success',    '#22c55e', 'Positive'],
  ];

  colorData.forEach(([name, hex, desc], i) => {
    const col = i % 7, row = Math.floor(i / 7);
    const x = 60 + col * 130, y = 80 + row * 104;

    const sw = figma.createRectangle();
    sw.name = name; sw.x = x; sw.y = y;
    sw.resize(64, 64); sw.cornerRadius = 12;
    sw.fills = [{ type: 'SOLID', color: h(hex) }];
    if (['#ffffff', '#fafaf8', '#f5f0e8', '#e5e7eb'].includes(hex)) {
      sw.strokes = [{ type: 'SOLID', color: h('#d1d5db') }];
      sw.strokeWeight = 1;
    }
    tokensPage.appendChild(sw);
    addText(tokensPage, name, x, y + 70, 10, '#1a1a1a', 'Medium');
    addText(tokensPage, hex, x, y + 82, 9, '#6b7280');
    addText(tokensPage, desc, x, y + 94, 9, '#9ca3af');
  });

  // ── TYPOGRAPHY ──
  sectionLabel('Typography Scale', 60, 316);
  const tf = makeFrame('Typography', 60, 336, 900, 410, '#ffffff', 12);
  shadow(tf, 0.05, 2, 8);
  tokensPage.appendChild(tf);

  const typoData = [
    ['Display',    32, 'Bold',      'Find your perfect property'],
    ['H1',         24, 'Semi Bold', 'Browse Properties & Buyers'],
    ['H2',         20, 'Semi Bold', '3-Bed Apartment · Chiado'],
    ['H3',         18, 'Medium',    '€320,000 – €380,000'],
    ['Body Large', 16, 'Regular',   'Sellers can see what buyers are looking for, and vice versa.'],
    ['Body',       14, 'Regular',   '2 bed · 1 bath · 75m² · Lisbon, Portugal'],
    ['Caption',    12, 'Regular',   'Posted 2 days ago · Active listing'],
    ['Label',      11, 'Medium',    'PROPERTY TYPE · BUYER CRITERIA'],
  ];

  let ty = 24;
  typoData.forEach(([name, size, style, sample], i) => {
    addText(tf, name, 20, ty + Math.max(0, (size - 11) / 2), 10, '#9ca3af');
    addText(tf, sample, 120, ty, size, '#1a1a1a', style,
      name === 'Label' ? { letterSpacing: { value: 1.2, unit: 'PIXELS' } } : {});
    if (i < typoData.length - 1) {
      addRect(tf, 20, ty + size + 10, 860, 1, '#f3f4f6');
    }
    ty += size + 24;
  });

  // ── SPACING ──
  sectionLabel('Spacing', 1000, 60);
  const sf = makeFrame('Spacing', 1000, 80, 200, 220, '#ffffff', 12);
  shadow(sf, 0.05, 2, 8);
  tokensPage.appendChild(sf);
  [4, 8, 12, 16, 20, 24, 32, 48].forEach((s, i) => {
    addRect(sf, 20, 20 + i * 24, s, 12, '#344e41', 3);
    addText(sf, `${s}px`, 20 + s + 8, 20 + i * 24, 10, '#6b7280');
  });

  // ── RADIUS ──
  sectionLabel('Border Radius', 1000, 316);
  const rf = makeFrame('Radius', 1000, 336, 200, 220, '#ffffff', 12);
  shadow(rf, 0.05, 2, 8);
  tokensPage.appendChild(rf);
  [[4,'sm — inputs'],[6,'md — buttons'],[8,'lg — chips'],[12,'xl — cards'],[16,'2xl — modals'],[9999,'full — pills']].forEach(([r, label], i) => {
    const sq = figma.createRectangle();
    sq.x = 20; sq.y = 20 + i * 32; sq.resize(28, 20);
    sq.cornerRadius = Math.min(r, 10);
    sq.fills = [{ type: 'SOLID', color: h('#344e41') }];
    rf.appendChild(sq);
    addText(rf, label, 56, 20 + i * 32 + 4, 10, '#6b7280');
  });

  // ── PAGE 1: ATOMS ─────────────────────────────────────────────────────

  // ── BUTTONS ──
  sectionLabel('Buttons', 60, 770);

  const btnVariants = [
    { name: 'Default',     bg: '#344e41', fg: '#ffffff', border: null,      label: 'Get started' },
    { name: 'Secondary',   bg: '#f5f0e8', fg: '#344e41', border: null,      label: 'Learn more' },
    { name: 'Outline',     bg: '#ffffff', fg: '#344e41', border: '#344e41', label: 'View all' },
    { name: 'Ghost',       bg: '#f9fafb', fg: '#344e41', border: null,      label: 'Cancel' },
    { name: 'Destructive', bg: '#ef4444', fg: '#ffffff', border: null,      label: 'Delete post' },
    { name: 'Disabled',    bg: '#f3f4f6', fg: '#9ca3af', border: null,      label: 'Unavailable' },
  ];

  const btnFrame = makeFrame('Buttons', 60, 792, 960, 120, '#ffffff', 12);
  shadow(btnFrame, 0.05, 2, 8);
  tokensPage.appendChild(btnFrame);
  addText(btnFrame, 'Button Variants', 20, 16, 12, '#1a1a1a', 'Semi Bold');

  btnVariants.forEach(({ name, bg, fg, border, label }, i) => {
    const btn = makeFrame(`Button/${name}`, 20 + i * 154, 44, 140, 40, bg, 6);
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    if (border) {
      btn.strokes = [{ type: 'SOLID', color: h(border) }];
      btn.strokeWeight = 1.5;
      btn.strokeAlign = 'INSIDE';
    }
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: 'Medium' };
    t.characters = label; t.fontSize = 14;
    t.fills = [{ type: 'SOLID', color: h(fg) }];
    btn.appendChild(t);
    btnFrame.appendChild(btn);
    addText(btnFrame, name, 20 + i * 154, 92, 10, '#9ca3af');
  });

  // Small buttons
  sectionLabel('Button Sizes', 60, 928);
  const btnSizeFrame = makeFrame('Button Sizes', 60, 948, 640, 100, '#ffffff', 12);
  shadow(btnSizeFrame, 0.05, 2, 8);
  tokensPage.appendChild(btnSizeFrame);
  addText(btnSizeFrame, 'Size variants (Default style)', 20, 14, 11, '#9ca3af');

  [['Large', 48, 16, 14], ['Default', 40, 16, 14], ['Small', 32, 12, 12], ['XSmall', 28, 10, 11]].forEach(([sz, h40, px, fs], i) => {
    const btn = makeFrame(`Button/${sz}`, 20 + i * 148, 32, 140, h40, '#344e41', 6);
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: 'Medium' };
    t.characters = sz; t.fontSize = fs;
    t.fills = [{ type: 'SOLID', color: h('#ffffff') }];
    btn.appendChild(t);
    btnSizeFrame.appendChild(btn);
  });

  // ── BADGES ──
  sectionLabel('Badges', 60, 1064);
  const badgeFrame = makeFrame('Badges', 60, 1084, 960, 96, '#ffffff', 12);
  shadow(badgeFrame, 0.05, 2, 8);
  tokensPage.appendChild(badgeFrame);
  addText(badgeFrame, 'Status & Role Badges', 20, 14, 11, '#9ca3af');

  const badgeData = [
    { label: 'Buyer',    bg: '#f0fdf4', fg: '#166534' },
    { label: 'Seller',   bg: '#eff6ff', fg: '#1e40af' },
    { label: 'Both',     bg: '#faf5ff', fg: '#6b21a8' },
    { label: 'Active',   bg: '#f0fdf4', fg: '#166534' },
    { label: 'Inactive', bg: '#f9fafb', fg: '#6b7280' },
    { label: 'New',      bg: '#fef3c7', fg: '#92400e' },
    { label: 'Verified', bg: '#ecfdf5', fg: '#065f46' },
    { label: 'For Sale', bg: '#344e41', fg: '#ffffff' },
    { label: 'Wanted',   bg: '#f5f0e8', fg: '#344e41' },
  ];

  badgeData.forEach(({ label, bg, fg }, i) => {
    const b = makeFrame(`Badge/${label}`, 20 + i * 100, 36, 88, 28, bg, 14);
    b.layoutMode = 'HORIZONTAL';
    b.primaryAxisAlignItems = 'CENTER';
    b.counterAxisAlignItems = 'CENTER';
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: 'Medium' };
    t.characters = label; t.fontSize = 11;
    t.fills = [{ type: 'SOLID', color: h(fg) }];
    b.appendChild(t);
    badgeFrame.appendChild(b);
    addText(badgeFrame, label, 20 + i * 100, 72, 9, '#9ca3af');
  });

  // ── INPUTS ──
  sectionLabel('Form Inputs', 60, 1196);
  const inputFrame = makeFrame('Inputs', 60, 1216, 960, 168, '#ffffff', 12);
  shadow(inputFrame, 0.05, 2, 8);
  tokensPage.appendChild(inputFrame);
  addText(inputFrame, 'Input states & variants', 20, 14, 11, '#9ca3af');

  const inputStates = [
    { name: 'Default',  bg: '#fafaf8', border: '#e5e7eb', val: '',                 ph: 'Search location...',  bw: 1 },
    { name: 'Focused',  bg: '#ffffff', border: '#344e41', val: 'Lisbon, Portugal',  ph: '',                    bw: 2 },
    { name: 'Filled',   bg: '#ffffff', border: '#e5e7eb', val: '€320,000',          ph: '',                    bw: 1 },
    { name: 'Error',    bg: '#fff5f5', border: '#ef4444', val: 'Invalid value',      ph: '',                    bw: 1.5 },
    { name: 'Disabled', bg: '#f3f4f6', border: '#e5e7eb', val: 'Disabled',          ph: '',                    bw: 1 },
  ];

  inputStates.forEach(({ name, bg, border, val, ph, bw }, i) => {
    const inp = makeFrame(`Input/${name}`, 20 + i * 184, 40, 172, 40, bg, 6);
    inp.strokes = [{ type: 'SOLID', color: h(border) }];
    inp.strokeWeight = bw;
    inp.strokeAlign = 'INSIDE';
    const isDisabled = name === 'Disabled';
    const t = figma.createText();
    t.fontName = { family: 'Inter', style: 'Regular' };
    t.characters = val || ph; t.fontSize = 14; t.x = 12; t.y = 12;
    t.fills = [{ type: 'SOLID', color: h(val ? '#1a1a1a' : '#9ca3af') }];
    if (isDisabled) t.opacity = 0.5;
    inp.appendChild(t);
    inputFrame.appendChild(inp);
    addText(inputFrame, name, 20 + i * 184, 90, 10, '#9ca3af');

    if (name === 'Error') {
      addText(inputFrame, 'Required field', 20 + i * 184, 104, 10, '#ef4444');
    }
  });

  // Select
  const sel = makeFrame('Input/Select', 20, 120, 172, 40, '#fafaf8', 6);
  sel.strokes = [{ type: 'SOLID', color: h('#e5e7eb') }];
  sel.strokeWeight = 1; sel.strokeAlign = 'INSIDE';
  const selT = figma.createText();
  selT.fontName = { family: 'Inter', style: 'Regular' };
  selT.characters = 'Property Type'; selT.fontSize = 14; selT.x = 12; selT.y = 12;
  selT.fills = [{ type: 'SOLID', color: h('#9ca3af') }];
  sel.appendChild(selT);
  inputFrame.appendChild(sel);
  addText(inputFrame, 'Select', 20, 152, 10, '#9ca3af');

  // ── PAGE 2: COMPONENTS ───────────────────────────────────────────────

  await figma.setCurrentPageAsync(componentsPage);
  componentsPage.backgrounds = [{ type: 'SOLID', color: h('#f0f0ee') }];

  function compLabel(text, x, y) {
    addText(componentsPage, text.toUpperCase(), x, y, 10, '#9ca3af', 'Medium',
      { letterSpacing: { value: 1.5, unit: 'PIXELS' } });
  }

  // ── PROPERTY CARD ──
  compLabel('Property Card', 60, 60);
  const pc = makeFrame('PropertyCard', 60, 80, 320, 400, '#ffffff', 16);
  shadow(pc, 0.08, 4, 24);
  componentsPage.appendChild(pc);

  // Image area
  const img = addRect(pc, 0, 0, 320, 192, '#cad2c5');
  img.topLeftRadius = 16; img.topRightRadius = 16; img.bottomLeftRadius = 0; img.bottomRightRadius = 0;
  // building icon in image
  addIcon(pc, 'building', 136, 76, 48, '#52796f');

  // For Sale badge
  const fsBadge = makeFrame('Badge/ForSale', 16, 16, 76, 26, '#344e41', 13);
  fsBadge.layoutMode = 'HORIZONTAL';
  fsBadge.primaryAxisAlignItems = 'CENTER';
  fsBadge.counterAxisAlignItems = 'CENTER';
  const fst = figma.createText(); fst.fontName = { family: 'Inter', style: 'Medium' };
  fst.characters = 'For Sale'; fst.fontSize = 11;
  fst.fills = [{ type: 'SOLID', color: h('#ffffff') }];
  fsBadge.appendChild(fst); pc.appendChild(fsBadge);

  // Save button
  const saveBtn = makeFrame('SaveBtn', 274, 16, 32, 32, '#ffffff', 8);
  saveBtn.opacity = 0.9;
  componentsPage.appendChild(saveBtn); // temp
  addIcon(pc, 'heart', 282, 24, 18, '#344e41');
  componentsPage.removeChild(saveBtn);
  pc.appendChild(saveBtn);

  // Content
  addText(pc, '€340,000', 20, 208, 22, '#1a1a1a', 'Bold');
  addText(pc, '3-Bed Apartment in Chiado', 20, 238, 14, '#1a1a1a', 'Medium');
  addText(pc, 'Chiado, Lisbon', 20, 258, 13, '#6b7280');

  addRect(pc, 20, 280, 280, 1, '#f3f4f6');

  // Stats row with icons
  addIcon(pc, 'bed', 20, 292, 16, '#6b7280');
  addText(pc, '3', 40, 292, 12, '#6b7280');
  addIcon(pc, 'bath', 80, 292, 16, '#6b7280');
  addText(pc, '2', 100, 292, 12, '#6b7280');
  addIcon(pc, 'maximize', 140, 292, 16, '#6b7280');
  addText(pc, '85m²', 160, 292, 12, '#6b7280');

  addRect(pc, 20, 318, 280, 1, '#f3f4f6');

  // CTA
  const pcCta = makeFrame('CTA', 20, 330, 280, 44, '#344e41', 8);
  pcCta.layoutMode = 'HORIZONTAL';
  pcCta.primaryAxisAlignItems = 'CENTER';
  pcCta.counterAxisAlignItems = 'CENTER';
  const pcCtat = figma.createText(); pcCtat.fontName = { family: 'Inter', style: 'Medium' };
  pcCtat.characters = 'View Property'; pcCtat.fontSize = 14;
  pcCtat.fills = [{ type: 'SOLID', color: h('#ffffff') }];
  pcCta.appendChild(pcCtat); pc.appendChild(pcCta);

  // ── CRITERIA CARD ──
  compLabel('Criteria Card', 420, 60);
  const cc = makeFrame('CriteriaCard', 420, 80, 320, 400, '#ffffff', 16);
  shadow(cc, 0.08, 4, 24);
  componentsPage.appendChild(cc);

  // Top accent bar
  addRect(cc, 0, 0, 320, 4, '#344e41').topLeftRadius = 16;
  cc.children[cc.children.length - 1].topRightRadius = 16;

  // Header
  const buyBadge = makeFrame('Badge/Buyer', 20, 20, 60, 24, '#f0fdf4', 12);
  buyBadge.layoutMode = 'HORIZONTAL';
  buyBadge.primaryAxisAlignItems = 'CENTER';
  buyBadge.counterAxisAlignItems = 'CENTER';
  const bbt = figma.createText(); bbt.fontName = { family: 'Inter', style: 'Medium' };
  bbt.characters = 'Buyer'; bbt.fontSize = 11;
  bbt.fills = [{ type: 'SOLID', color: h('#166534') }];
  buyBadge.appendChild(bbt); cc.appendChild(buyBadge);

  // Avatar
  const av = figma.createEllipse(); av.x = 272; av.y = 16; av.resize(36, 36);
  av.fills = [{ type: 'SOLID', color: h('#cad2c5') }]; cc.appendChild(av);
  addText(cc, 'GF', 281, 27, 11, '#344e41', 'Semi Bold');

  addText(cc, 'Looking in Lisbon', 20, 60, 18, '#1a1a1a', 'Semi Bold');

  addRect(cc, 20, 90, 280, 1, '#f3f4f6');

  const criteriaRows = [
    ['Budget', '€280,000 – €380,000'],
    ['Type', 'Apartment'],
    ['Bedrooms', '2 or more'],
    ['Location', 'Lisbon · 10km radius'],
    ['Size', '60m² – 100m²'],
  ];

  criteriaRows.forEach(([label, val], i) => {
    addText(cc, label, 20, 102 + i * 44, 10, '#9ca3af', 'Medium',
      { letterSpacing: { value: 0.5, unit: 'PIXELS' } });
    addText(cc, val, 20, 116 + i * 44, 13, '#1a1a1a', 'Medium');
    if (i < criteriaRows.length - 1) addRect(cc, 20, 140 + i * 44, 280, 1, '#f3f4f6');
  });

  // CTA
  const ccCta = makeFrame('CTA', 20, 338, 280, 44, '#f5f0e8', 8);
  ccCta.layoutMode = 'HORIZONTAL';
  ccCta.primaryAxisAlignItems = 'CENTER';
  ccCta.counterAxisAlignItems = 'CENTER';
  const ccCtat = figma.createText(); ccCtat.fontName = { family: 'Inter', style: 'Medium' };
  ccCtat.characters = 'Reach Out'; ccCtat.fontSize = 14;
  ccCtat.fills = [{ type: 'SOLID', color: h('#344e41') }];
  ccCta.appendChild(ccCtat); cc.appendChild(ccCta);

  // ── BOTTOM NAV ──
  compLabel('Bottom Navigation', 60, 512);
  const nav = makeFrame('BottomNav', 60, 532, 390, 80, '#ffffff', 0);
  nav.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.06 },
    offset: { x: 0, y: -2 },
    radius: 16,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];
  addRect(nav, 0, 0, 390, 1, '#f3f4f6');
  componentsPage.appendChild(nav);

  const navItems = [
    { icon: 'home',    label: 'Feed',    active: true },
    { icon: 'plus',    label: 'Post',    active: false },
    { icon: 'inbox',   label: 'Inbox',   active: false },
    { icon: 'user',    label: 'Profile', active: false },
  ];

  navItems.forEach(({ icon, label, active }, i) => {
    const col = active ? '#344e41' : '#9ca3af';
    const ix = 8 + i * 94;
    addIcon(nav, icon, ix + 28, 12, 24, col);
    addText(nav, label, ix + (label.length > 4 ? 22 : 30), 42, 10, col, active ? 'Medium' : 'Regular');
    if (active) {
      const dot = figma.createEllipse(); dot.x = ix + 44; dot.y = 62; dot.resize(4, 4);
      dot.fills = [{ type: 'SOLID', color: h('#344e41') }]; nav.appendChild(dot);
    }
  });

  // Nav state variants label
  compLabel('Navigation States', 60, 636);

  navItems.forEach(({ icon, label }, activeIdx) => {
    const navV = makeFrame(`BottomNav/${label}Active`, 60 + activeIdx * 420, 656, 390, 80, '#ffffff', 0);
    addRect(navV, 0, 0, 390, 1, '#f3f4f6');
    componentsPage.appendChild(navV);
    navItems.forEach(({ icon: ic, label: lb }, i) => {
      const isActive = i === activeIdx;
      const col = isActive ? '#344e41' : '#9ca3af';
      const ix = 8 + i * 94;
      addIcon(navV, ic, ix + 28, 12, 24, col);
      addText(navV, lb, ix + (lb.length > 4 ? 22 : 30), 42, 10, col, isActive ? 'Medium' : 'Regular');
    });
    addText(componentsPage, `${label} active`, 60 + activeIdx * 420, 748, 10, '#9ca3af');
  });

  // ── CHAT BUBBLE COMPONENTS ──
  compLabel('Chat Bubbles', 60, 776);

  const sentBubble = makeFrame('Bubble/Sent', 60, 796, 240, 52, '#344e41', 12);
  sentBubble.topRightRadius = 4;
  addText(sentBubble, 'Is this still available?', 16, 16, 14, '#ffffff');
  addText(sentBubble, '14:32', 168, 34, 10, '#84a98c');
  componentsPage.appendChild(sentBubble);

  const recvBubble = makeFrame('Bubble/Received', 320, 796, 240, 52, '#f3f4f6', 12);
  recvBubble.topLeftRadius = 4;
  addText(recvBubble, 'Yes, still on the market!', 16, 16, 14, '#1a1a1a');
  addText(recvBubble, '14:33', 168, 34, 10, '#9ca3af');
  componentsPage.appendChild(recvBubble);

  console.log('✅ All components built. Open the file to see the result.');
}

main().catch(err => console.error(err));
