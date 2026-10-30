// Flappy Eagle sprites. Everything is drawn at the game's logical resolution
// (180x320) and scaled up with nearest-neighbour filtering for the pixel look.
const Sprites = (() => {
  const W = 180, H = 320, GROUND_H = 56;

  const C = {
    ink: '#2B1B12', brownDark: '#3B2616', brown: '#6B4A2E', brownLight: '#94643F',
    maroon: '#8C2232', maroonDark: '#5E1622', maroonLight: '#A8394A',
    gold: '#DBCCA4', goldDark: '#B39C68', cream: '#F4EEDC', white: '#FFFFFF',
    stoneLight: '#E4DDCD', stone: '#C9C0AF', stoneMid: '#B3A994', stoneDark: '#A39A89',
    stoneDeep: '#7E7568', stoneInk: '#3A332D', glass: '#2D3646', glassLight: '#4A5A72',
  };

  const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

  // Rows of characters -> canvas; '.' is transparent. Ragged rows are fine.
  function fromGrid(rows, pal) {
    const c = canvas(Math.max(...rows.map(r => r.length)), rows.length), g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1);
    }));
    return c;
  }

  // Paint `top` over `base` at (ox, oy); both are row arrays.
  function overlay(base, top, ox, oy) {
    const out = base.map(r => [...r]);
    top.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch !== '.' && out[y + oy]) out[y + oy][x + ox] = ch;
    }));
    return out.map(r => r.join(''));
  }

  // ---------- Eagle (Baldwin-style bald eagle with a maroon scarf) ----------
  const EAGLE_PAL = {
    K: C.ink, B: '#5C3A22', b: '#40271A', L: '#8A5D3B', l: '#A7774F',
    W: C.white, w: '#D6D1C6', Y: '#F2B53A', y: '#C2851C', E: '#111111', e: C.white,
    M: C.maroon, m: C.maroonDark,
  };
  const EAGLE_BODY = [
    '..............KKKKK.......',
    '............KKWWWWWKK.....',
    '...........KWWWWWWWWWK....',
    '..........KWWWWWWWWWWWK...',
    '.....KKKKKwWWWWWWKKWWWK...',
    '...KKBBBBBwWWWWWWEeWWYYK..',
    '..KBBBBBBBBwWWWWWEEWYYYYK.',
    '.KBBBBBBBBBBwwWWWWWyyKKyK.',
    'KKBBBBBBBBBMMMMMMMMKKK.K..',
    'KWWKBBBBBBBMmMMMMmMBK.....',
    'KWWWKBBBBBBBBMMBBBBBK.....',
    'KWWWWBBBBBBBBBmMBBBBK.....',
    '.KWWWKBBBBBBBBBBBBBK......',
    '..KKK.KbbBBBBBBBBBK.......',
    '.......KKbbbbbbbbK........',
    '.........KKKKKKKK.........',
    '..........KYK.KYK.........',
  ];
  const WING_UP = [
    'K.........',
    'KLK.......',
    'KLLK..K...',
    'KLLLKKLK..',
    '.KLLLLLLK.',
    '..KlLLLLLK',
    '...KKKKKKK',
  ];
  const WING_MID = [
    '....KKKKKK.',
    '..KKlLLLLLK',
    '.KLLLLLLLLK',
    'KbLbLbLLLK.',
    '.K.K.KKKK..',
  ];
  const WING_DOWN = [
    'KKKKKKKKK.',
    'KlLLLLLLK.',
    '.KLLLLLLK.',
    '..KLLLLK..',
    '...KLbK...',
    '....KK....',
  ];
  const eagle = [
    overlay(EAGLE_BODY, WING_UP, 3, 3),
    overlay(EAGLE_BODY, WING_MID, 2, 8),
    overlay(EAGLE_BODY, WING_DOWN, 3, 9),
  ].map(rows => fromGrid(rows, EAGLE_PAL));

  // ---------- Gasson Hall tower ----------
  // Body tile repeats vertically; cap carries the parapet and gilded pinnacles.
  const TOWER_W = 27, CAP_W = 35, CAP_H = 22, CAP_EDGE = 11; // CAP_EDGE: parapet top row (the gap edge)

  function makeTowerBody() {
    const c = canvas(TOWER_W, 32), g = c.getContext('2d');
    const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    r(C.stone, 0, 0, TOWER_W, 32);
    // stone courses with staggered joints
    for (let y = 7; y < 32; y += 8) r(C.stoneMid, 5, y, 17, 1);
    for (let row = 0; row < 4; row++)
      for (let x = 5 + (row % 2 ? 4 : 8); x < 22; x += 8) r(C.stoneMid, x, row * 8, 1, 7);
    // buttresses: lit on the left, shaded on the right
    r(C.stoneLight, 1, 0, 3, 32); r(C.stoneDark, 4, 0, 1, 32);
    r(C.stoneDeep, 22, 0, 1, 32); r(C.stoneDark, 23, 0, 3, 32);
    r(C.stoneMid, 1, 30, 3, 1); r(C.stoneDeep, 23, 30, 3, 1); // weathering ledges
    // paired lancet windows
    for (const wx of [9, 15]) {
      r(C.stoneDeep, wx - 1, 6, 5, 21);
      r(C.stone, wx - 1, 6, 1, 2); r(C.stone, wx + 3, 6, 1, 2); r(C.stone, wx - 1, 5, 5, 1);
      r(C.stoneDeep, wx + 1, 5, 1, 1);
      r(C.glass, wx, 8, 3, 18); r(C.glass, wx + 1, 7, 1, 1);
      r(C.glassLight, wx, 9, 1, 16);
      r(C.stoneLight, wx - 1, 26, 5, 1); // sill
    }
    r(C.stoneInk, 0, 0, 1, 32); r(C.stoneInk, TOWER_W - 1, 0, 1, 32);
    return c;
  }

  function makeTowerCap() {
    const c = canvas(CAP_W, CAP_H), g = c.getContext('2d');
    const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // pinnacles: outline, then lit/mid/shade columns, widening downward
    const widths = [1, 1, 2, 2, 2, 2, 3, 3, 3];
    for (const cx of [3, 17, 31]) {
      r(C.gold, cx, 0, 1, 2); r(C.goldDark, cx, 1, 1, 1);
      widths.forEach((hw, i) => {
        const y = 2 + i;
        r(C.stoneInk, cx - hw, y, hw * 2 + 1, 1);
        if (hw > 1) { r(C.stoneLight, cx - hw + 1, y, hw - 1, 1); r(C.stoneDark, cx + 1, y, hw - 1, 1); }
        r(C.stone, cx, y, 1, 1);
      });
      for (const [y, d] of [[5, 3], [8, 4]]) { r(C.stoneInk, cx - d, y, 1, 1); r(C.stoneInk, cx + d, y, 1, 1); } // crockets
    }
    // crenellated parapet
    r(C.stoneInk, 1, 11, 33, 4);
    r(C.stone, 2, 12, 31, 2); r(C.stoneLight, 2, 12, 31, 1);
    for (const x of [8, 12, 22, 26]) r(C.stoneInk, x, 11, 2, 2);
    // belt course with dentils
    r(C.stoneInk, 0, 15, CAP_W, 4);
    r(C.stoneMid, 1, 16, CAP_W - 2, 2);
    for (let x = 2; x < CAP_W - 2; x += 3) r(C.stoneDeep, x, 17, 1, 1);
    // corbels stepping in to the body width
    r(C.stoneInk, 2, 19, CAP_W - 4, 1); r(C.stoneDark, 3, 19, CAP_W - 6, 1);
    r(C.stoneInk, 4, 20, TOWER_W, 2); r(C.stoneLight, 5, 20, 3, 2); r(C.stone, 8, 20, 18, 2); r(C.stoneDark, 26, 20, 4, 2);
    return c;
  }

  const towerBody = makeTowerBody(), towerCap = makeTowerCap();
  const towerCapFlip = (() => {
    const c = canvas(CAP_W, CAP_H), g = c.getContext('2d');
    g.translate(0, CAP_H); g.scale(1, -1); g.drawImage(towerCap, 0, 0);
    return c;
  })();

  // Draw one tower. x is the cap's left edge; edgeY is the gap edge (parapet top).
  // fromTop=true hangs the tower from the sky with pinnacles pointing down.
  function drawTower(g, x, edgeY, fromTop, groundY = H - GROUND_H) {
    const bx = x + (CAP_W - TOWER_W) / 2;
    if (fromTop) {
      const capY = edgeY + CAP_EDGE - CAP_H;
      for (let y = capY - 32; y > -32; y -= 32) g.drawImage(towerBody, bx, y);
      g.drawImage(towerCapFlip, x, capY);
    } else {
      const capY = edgeY - CAP_EDGE;
      for (let y = capY + CAP_H; y < groundY; y += 32) g.drawImage(towerBody, bx, y);
      g.drawImage(towerCap, x, capY);
    }
  }

  // ---------- Background: the Quad ----------
  function makeBackground() {
    const bh = H - GROUND_H, c = canvas(W, bh), g = c.getContext('2d');
    const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const wrap = fn => [-W, 0, W].forEach(fn);
    const blob = (col, cx, cy, rad) => {
      for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++)
        if (x * x + y * y <= rad * rad + rad) r(col, cx + x, cy + y, 1, 1);
    };

    // sky in banded steps with a dithered seam
    const bands = [[0, '#6FB2DE'], [60, '#86C0E5'], [100, '#9FCEEA'], [135, '#B8DCEF'], [160, '#CFE7F2']];
    bands.forEach(([y, col], i) => r(col, 0, y, W, (bands[i + 1] || [bh])[0] - y));
    bands.slice(1).forEach(([y], i) => {
      for (let x = 0; x < W; x++) {
        if (x % 2 === 0) r(bands[i][1], x, y, 1, 1);
        if (x % 4 === 0) r(bands[i][1], x, y + 1, 1, 1);
      }
    });

    // clouds
    const puffs = [[0, 168, 9], [12, 161, 11], [25, 166, 8], [34, 170, 6], [60, 166, 7], [72, 160, 10], [86, 167, 8],
      [118, 165, 9], [131, 158, 12], [146, 165, 8], [158, 169, 7]];
    wrap(o => puffs.forEach(([x, y, rad]) => blob('#DCEBF3', x + o, y, rad + 1)));
    wrap(o => puffs.forEach(([x, y, rad]) => blob(C.white, x + o, y, rad)));
    wrap(o => puffs.forEach(([x, y, rad]) => r('#EAF2F7', x + o - rad, y + rad - 2, rad * 2, 2)));

    // distant collegiate-gothic buildings (hazy so the foreground towers read first)
    const S = { wall: '#D6CDBB', shade: '#BDB39F', win: '#8E8576', roof: '#8A8792', roofDark: '#6E6B76', ink: '#6A6258' };
    const gable = (x, w, baseY, peakH) => {
      for (let i = 0; i < peakH; i++) {
        const hw = Math.round((i + 1) * (w / 2) / peakH);
        r(i === 0 ? S.ink : S.roof, x + w / 2 - hw, baseY - peakH + i, hw * 2, 1);
        r(S.roofDark, x + w / 2, baseY - peakH + i, hw, 1);
      }
    };
    const hall = (x, w, top, peakH) => {
      r(S.wall, x, top, w, 218 - top); r(S.shade, x + w - 3, top, 3, 218 - top);
      for (let wx = x + 3; wx < x + w - 5; wx += 6) { r(S.win, wx, top + 6, 2, 8); r(S.win, wx, top + 18, 2, 8); }
      if (peakH) gable(x, w, top, peakH);
      r(S.ink, x, top, w, 1);
    };
    const tower = (x, w, top) => {
      r(S.wall, x, top, w, 218 - top); r(S.shade, x + w - 3, top, 3, 218 - top);
      r(S.ink, x - 1, top - 1, w + 2, 2);
      for (const px of [x, x + w - 2]) { r(S.wall, px, top - 9, 2, 8); r(S.ink, px, top - 11, 2, 2); r(C.goldDark, px, top - 13, 1, 2); }
      r(S.win, x + 5, top + 8, 2, 16); r(S.win, x + w - 7, top + 8, 2, 16);
      r(S.win, x + 5, top + 32, 2, 12); r(S.win, x + w - 7, top + 32, 2, 12);
    };
    wrap(o => {
      hall(o + 4, 52, 176, 14);         // library hall
      hall(o + 64, 38, 186, 10);
      hall(o + 100, 60, 182, 16);       // main hall
      tower(o + 122, 16, 128);          // Gasson-style tower behind the trees
      hall(o + 162, 26, 190, 8);
    });

    // tree line
    const trees = [[2, 210, 10], [16, 205, 12], [31, 212, 9], [44, 207, 11], [58, 213, 8], [70, 206, 12], [85, 211, 10],
      [98, 214, 8], [110, 208, 11], [147, 209, 12], [162, 213, 9], [173, 207, 10]];
    wrap(o => trees.forEach(([x, y, rad]) => blob('#2F6A34', x + o, y, rad)));
    wrap(o => trees.forEach(([x, y, rad]) => blob('#45903F', x + o - 1, y - 1, rad - 2)));
    wrap(o => trees.forEach(([x, y, rad]) => blob('#62AE55', x + o - 3, y - 4, Math.max(2, rad - 7))));

    // lawn with mowing stripes, plus two campus lamps
    r('#78BE5A', 0, 222, W, bh - 222);
    for (let x = 0; x < W; x += 12) r('#6EB352', x, 224, 6, bh - 224);
    r('#3E7F3A', 0, 222, W, 2);
    for (const lx of [52, 140]) {
      r('#2E2A2A', lx, 220, 1, 26); r('#2E2A2A', lx - 2, 246, 5, 2);
      r('#2E2A2A', lx - 2, 213, 5, 7); r(C.gold, lx - 1, 214, 3, 5); r('#2E2A2A', lx - 1, 212, 3, 1);
    }
    return c;
  }

  // ---------- Ground: grass verge, granite curb, brick walk ----------
  function makeGround() {
    const c = canvas(W, GROUND_H), g = c.getContext('2d');
    const r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    r('#2E5E2A', 0, 0, W, 1);
    r('#7FC65B', 0, 1, W, 3);
    for (let x = 0; x < W; x += 6) { r('#A6DD72', x, 1, 2, 1); r('#5FA046', x + 3, 3, 2, 1); }
    r('#DCD4C3', 0, 4, W, 1); r('#BFB6A4', 0, 5, W, 2); r('#8E8577', 0, 7, W, 1);
    for (let x = 0; x < W; x += 30) r('#8E8577', x, 4, 1, 3);
    const bricks = ['#9C4E35', '#8A432D', '#A85A3E', '#94492F', '#A35238'];
    r('#C9B68E', 0, 8, W, GROUND_H - 8); // mortar
    for (let row = 0, y = 8; y < GROUND_H; row++, y += 6) {
      const off = row % 2 ? 6 : 0;
      for (let i = -1; i < 16; i++) {
        const x = i * 12 + off, k = ((i + 15) % 15 * 7 + row * 3) % bricks.length;
        r(bricks[k], x, y, 11, 5);
        r('#B8694B', x, y, 11, 1);
      }
    }
    return c;
  }

  const background = makeBackground(), ground = makeGround();

  // ---------- Pixel font (5x7, original) ----------
  const FONT = {
    A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
    C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
    D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
    E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
    F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
    G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
    H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
    I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    J: ['..###', '...#.', '...#.', '...#.', '#..#.', '#..#.', '.##..'],
    K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
    L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
    M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
    N: ['#...#', '#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#'],
    O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
    Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
    R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
    S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
    T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
    U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
    V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
    W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
    X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
    Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
    Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
    0: ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
    1: ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
    2: ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
    3: ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
    4: ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
    5: ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
    6: ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
    7: ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
    8: ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
    9: ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
    '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
    '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
    '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
    '.': ['.....', '.....', '.....', '.....', '.....', '.....', '..#..'],
    ':': ['.....', '..#..', '.....', '.....', '.....', '..#..', '.....'],
    '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
    '/': ['....#', '...#.', '...#.', '..#..', '.#...', '.#...', '#....'],
    "'": ['..#..', '..#..', '.....', '.....', '.....', '.....', '.....'],
    ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  };

  // Text -> canvas. Layers (back to front): shadow, outline2, outline, fill.
  // fg2 colours the lower half of each glyph for a two-tone shine.
  function text(str, { scale = 1, fg = C.white, fg2, outline = C.ink, outline2, shadow } = {}) {
    str = String(str).toUpperCase();
    const pad = (outline ? 1 : 0) + (outline2 ? 1 : 0);
    const adv = outline ? 7 : 6; // extra gap so outlines don't fuse letters together
    const gw = str.length * adv - (adv - 5) + pad * 2, gh = 7 + pad * 2 + (shadow ? 1 : 0);
    const grid = Array.from({ length: gh }, () => Array(gw).fill(null));
    const mask = Array.from({ length: gh }, () => Array(gw).fill(false));
    [...str].forEach((ch, i) => (FONT[ch] || FONT['?']).forEach((row, y) => [...row].forEach((p, x) => {
      if (p === '#') mask[y + pad][i * adv + x + pad] = true;
    })));
    const dilate = m => m.map((row, y) => row.map((_, x) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m[y + dy]?.[x + dx]) return true;
      return false;
    }));
    const o1 = dilate(mask), o2 = outline2 ? dilate(o1) : o1;
    const paint = (m, col, dy = 0) => m.forEach((row, y) => row.forEach((on, x) => {
      if (on && grid[y + dy]) grid[y + dy][x] = col;
    }));
    if (shadow) paint(o2, shadow, 1);
    if (outline2) paint(o2, outline2);
    if (outline) paint(o1, outline);
    mask.forEach((row, y) => row.forEach((on, x) => { if (on) grid[y][x] = fg2 && y - pad >= 4 ? fg2 : fg; }));
    const c = canvas(gw * scale, gh * scale), g = c.getContext('2d');
    grid.forEach((row, y) => row.forEach((col, x) => {
      if (col) { g.fillStyle = col; g.fillRect(x * scale, y * scale, scale, scale); }
    }));
    return c;
  }

  // ---------- UI pieces ----------
  // Bevelled box with clipped corners: ink outline, face, top highlight, bottom lip.
  function box(w, h, face, light, dark, lip = 2) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = (col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    r(C.ink, 1, 0, w - 2, h); r(C.ink, 0, 1, w, h - 2);
    r(dark, 1, 1, w - 2, h - 2);
    r(face, 1, 1, w - 2, h - 2 - lip);
    r(light, 2, 1, w - 4, 1);
    return c;
  }

  function button(w, h, label, pressed = false) {
    const c = canvas(w, h + 2), g = c.getContext('2d');
    const y = pressed ? 2 : 0;
    g.drawImage(box(w, h, C.maroon, C.maroonLight, C.maroonDark, pressed ? 0 : 2), 0, y);
    const t = text(label, { fg: C.gold, outline: C.maroonDark });
    g.drawImage(t, Math.round((w - t.width) / 2), y + Math.round((h - (pressed ? 0 : 2) - t.height) / 2));
    return c;
  }

  function plusButton(size = 22, pressed = false) {
    const c = canvas(size, size + 2), g = c.getContext('2d');
    const y = pressed ? 2 : 0, m = Math.round(size * 0.27), t = 4, inner = size - 2 - (pressed ? 0 : 2);
    g.drawImage(box(size, size, C.gold, C.cream, C.goldDark, pressed ? 0 : 2), 0, y);
    g.fillStyle = C.maroon;
    g.fillRect(m, y + Math.round((inner - t) / 2) + 1, size - m * 2, t);
    g.fillRect(Math.round((size - t) / 2), y + m, t, inner - m * 2 + 2);
    return c;
  }

  // Score / results card: brown frame, maroon inner border, cream face.
  function panel(w, h) {
    const c = canvas(w, h), g = c.getContext('2d');
    const r = (col, x, y, ww, hh) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
    g.drawImage(box(w, h, C.brown, C.brownLight, C.brownDark, 2), 0, 0);
    r(C.maroon, 3, 3, w - 6, h - 8); r(C.maroonLight, 3, 3, w - 6, 1);
    r(C.cream, 5, 5, w - 10, h - 12); r(C.goldDark, 5, h - 8, w - 10, 1);
    return c;
  }

  const tapIcon = fromGrid([
    '....KK......',
    '...KWWK.....',
    '...KWWK.....',
    '...KWWK.....',
    '...KWWKKK...',
    '.KKKWWKWWKK.',
    'KWWKWWKWWKWK',
    'KWWWWWWWWWWK',
    'KWWWWWWWWWWK',
    '.KWWWWWWWWWK',
    '.KWWWWWWWWK.',
    '..KWWWWWWWK.',
    '..KMMMMMMMK.',
    '..KKKKKKKKK.',
  ], { K: C.ink, W: C.white, M: C.maroon });

  // ---------- Loss scenes ----------
  // A tiny painter for bigger illustrations: shapes are point tests, painted back to
  // front with a 1px outline and automatic light (top-left) and shade (bottom-right) rims.
  function painter(w, h, base) {
    const px = new Array(w * h).fill(base);
    const has = (m, x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
    const mask = f => {
      const m = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (f(x + 0.5, y + 0.5)) m[y * w + x] = 1;
      return m;
    };
    const each = (m, fn) => { for (let i = 0; i < m.length; i++) if (m[i]) fn(i % w, (i / w) | 0, i); };
    const P = {
      px, w, h,
      ell: (cx, cy, rx, ry, rot = 0) => (x, y) => {
        const c = Math.cos(rot), s = Math.sin(rot), dx = x - cx, dy = y - cy;
        const u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
        return u * u + v * v <= 1;
      },
      poly: pts => (x, y) => {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      },
      or: (...fs) => (x, y) => fs.some(f => f(x, y)),
      and: (...fs) => (x, y) => fs.every(f => f(x, y)),
      not: f => (x, y) => !f(x, y),
      // a thick line from (x1, y1) to (x2, y2)
      seg: (x1, y1, x2, y2, wd) => (x, y) => {
        const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
        return (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2 <= (wd / 2) ** 2;
      },
      // a hanging drip: a strip with a rounded bottom
      drip: (x, y0, len, wd) => (px_, py) => (Math.abs(px_ - x) <= wd / 2 && py >= y0 && py <= y0 + len) ||
        (px_ - x) ** 2 / (wd / 2 + 0.4) ** 2 + (py - y0 - len) ** 2 / (wd / 2 + 0.6) ** 2 <= 1,
      shape(f, { fill, outline, light, shade, lw = 1, sw = 2, pattern }) {
        const m = mask(f);
        if (outline) each(m, (x, y) => {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has(m, x + dx, y + dy) && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) px[(y + dy) * w + x + dx] = outline;
        });
        each(m, (x, y, i) => {
          px[i] = fill;
          if (shade && !has(m, x + sw, y + sw)) px[i] = shade;
          if (light && !has(m, x - lw, y - lw)) px[i] = light;
          if (pattern) { const c = pattern(x, y); if (c) px[i] = c; }
        });
        return m;
      },
      dot: (x, y, c) => { if (x >= 0 && y >= 0 && x < w && y < h) px[(y | 0) * w + (x | 0)] = c; },
      toCanvas() {
        const c = canvas(w, h), g = c.getContext('2d');
        px.forEach((col, i) => { if (col) { g.fillStyle = col; g.fillRect(i % w, (i / w) | 0, 1, 1); } });
        return c;
      },
    };
    return P;
  }

  // "Melted": the eagle sprawled on the floor under a collapsed sundae, clutching a dollar.
  function makeMeltedScene() {
    const p = painter(176, 108, '#535E56'), { ell, poly, or, and, drip, seg } = p;
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    // speckled floor, darkening toward the corners with a random dither
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const d = Math.sqrt(((x - 88) / 88) ** 2 + ((y - 54) / 54) ** 2), dark = Math.min(1, Math.max(0, (d - 0.8) / 0.55));
      if (rnd() < dark) p.dot(x, y, rnd() < dark * 0.6 ? '#323A35' : '#3E4741');
      const r = rnd();
      if (r < 0.035) p.dot(x, y, '#93A699'); else if (r < 0.06) p.dot(x, y, '#3E4741'); else if (r < 0.066) p.dot(x, y, '#6FB39A');
    }
    p.shape(ell(100, 82, 48, 12), { fill: '#434C46' }); // soft cast shadow under the body

    const INK = '#2B1B12';
    const PINK = { fill: '#F09CC4', outline: '#B4366E', light: '#FBC6DE', shade: '#D9709F' };
    const VAN = { fill: '#F3E6BD', outline: '#A8915E', light: '#FFF8E1', shade: '#DCCB98' };
    const CHOC = { fill: '#5B3427', outline: '#33190F', light: '#7C4A36', shade: '#472619' };

    // puddles and splats on the floor
    p.shape(or(ell(36, 66, 19, 9, 0.1), ell(24, 74, 10, 5), ell(50, 76, 12, 5), ell(18, 60, 7, 5)),
      { fill: '#D9529E', outline: '#A3307A', light: '#EE7DB8' });
    p.shape(ell(22, 38, 13, 5, -0.15), { fill: '#D9529E', outline: '#A3307A', light: '#EE7DB8' });
    p.shape(ell(160, 72, 10, 4, 0.1), PINK);

    // tail feathers and a taloned foot sticking up, behind the body
    p.shape(poly([[128, 62], [150, 58], [158, 66], [152, 74], [132, 72]]), {
      fill: '#FFFFFF', outline: INK, shade: '#D6D1C6',
      pattern: (x, y) => y > 62 && y < 72 && (x === 144 || x === 150) ? '#D6D1C6' : null,
    });
    const YEL = { fill: '#F2B53A', outline: INK, light: '#FFD36B', shade: '#C2851C', sw: 1 };
    p.shape(seg(138, 56, 148, 40, 6), { ...YEL, pattern: (x, y) => (x + 2 * y) % 5 === 0 ? '#C2851C' : null });
    for (const [x, y, cx, cy] of [[141, 31, -1, 2], [147, 28, 1, 1], [155, 31, 2, 1], [156, 42, 1, -2]]) {
      p.shape(seg(149, 38, x, y, 4), YEL);
      p.shape(or(seg(x, y, x + cx * 1.5, y - 2, 2), seg(x + cx * 1.5, y - 2, x + cx * 2.5, y - 2 + cy, 1.5)), { fill: INK }); // hooked claw
    }
    p.shape(ell(149, 38, 4, 3.5), YEL); // foot pad

    // body with scalloped feathers, scarf, head
    p.shape(ell(98, 60, 42, 25, -0.12), {
      fill: '#5C3A22', outline: INK, light: '#7A5033', shade: '#40271A', sw: 3,
      pattern: (x, y) => {
        const lx = (x + (Math.floor(y / 4) % 2) * 3) % 6, ly = y % 4;
        return (ly === 3 && lx >= 1 && lx <= 4) || (ly === 2 && (lx === 0 || lx === 5)) ? '#4A2E1B' : null;
      },
    });
    p.shape(and(ell(63, 52, 9, 15, 0.35), ell(98, 60, 50, 40)), { fill: '#8C2232', outline: INK, light: '#A8394A', shade: '#5E1622' });
    p.shape(ell(46, 47, 17, 14, 0.25), { fill: '#FFFFFF', outline: INK, shade: '#D6D1C6', sw: 2 });

    // open beak with the tongue lolling out
    p.shape(poly([[29, 60], [24, 66], [27, 70], [33, 67], [39, 60]]), { fill: '#C2851C', outline: INK });
    p.shape(poly([[30, 59], [27, 64], [33, 66], [36, 61]]), { fill: '#5E1622' });
    p.shape(or(ell(27, 67, 3.5, 2.2, 0.6), drip(25, 66, 5, 3)), { fill: '#E8789A', outline: '#A3204D', light: '#F5A6BE' });
    p.shape(poly([[38, 50], [27, 54], [20, 60], [21, 64], [25, 61], [31, 59], [39, 58]]), { fill: '#F2B53A', outline: INK, light: '#FFD36B', shade: '#C2851C', sw: 1 });

    // dazed, half-lidded eye
    p.shape(ell(45, 46, 5, 4.2), { fill: '#FFFFFF', outline: INK });
    p.shape(and(ell(45, 46, 5, 4.2), (x, y) => y < 46), { fill: '#CFC8BA' });
    for (let x = 41; x <= 49; x++) p.dot(x, 46, INK);
    p.shape(ell(44, 48, 1.6, 1.4), { fill: '#111111' });
    for (let x = 41; x <= 48; x++) p.dot(x, 52, '#B9B2A5');
    for (const [x, y] of [[39, 39], [40, 39], [41, 38], [42, 38], [43, 38], [44, 37]]) p.dot(x, y, INK);

    // melting scoop on the head, then the cone stuck in it like a horn
    p.shape(or(ell(41, 34, 12, 5, -0.15), drip(33, 34, 7, 3), drip(46, 35, 5, 3), drip(51, 33, 3, 3)), VAN);
    p.shape(poly([[33, 33], [48, 30], [30, 3]]), {
      fill: '#D9A55B', outline: '#7A4A1C', light: '#ECC27E', shade: '#B07A36', sw: 1,
      pattern: (x, y) => ((x + 2 * y) % 6 === 0 || (2 * y - x + 60) % 6 === 0) ? '#B07A36' : null,
    });

    // raised wing, feathers fanned, clutching a crumpled dollar
    const WING = { fill: '#5C3A22', outline: INK, light: '#7A5033', shade: '#40271A', sw: 1 };
    p.shape(or(seg(70, 46, 72, 26, 11), ell(72, 24, 8, 5)), { ...WING, sw: 2 });
    // the dollar: crumpled outer edge, printed border, portrait oval
    p.shape(poly([[59, 5], [74, 3], [76, 1], [90, 1], [92, 12], [80, 13], [77, 15], [61, 16]]), { fill: '#B7D3A6', outline: '#3F6B35', light: '#D6EACB', shade: '#8DB57E', sw: 1 });
    p.shape(poly([[62, 7], [88, 4], [89, 10], [64, 13]]), { fill: '#A9C99A', outline: '#6E9C60' });
    p.shape(ell(76, 8.5, 3.6, 3), { fill: '#8DB57E', outline: '#3F6B35' });
    p.dot(76, 8, '#D6EACB');
    for (const [x, y] of [[63, 9], [87, 6], [64, 12], [88, 9]]) p.dot(x, y, '#3F6B35');
    p.shape(seg(70, 4, 72, 15, 1), { fill: '#8DB57E' }); // crease
    // primary feathers curling over the bill like fingers
    for (const [x, y] of [[63, 16], [67, 12], [72, 11], [77, 12], [81, 16]]) p.shape(seg(72, 24, x, y, 4.2), WING);

    // the sundae on the body: strawberry layer dripping, vanilla mound, cherry
    const drips = [[70, 9], [76, 15], [82, 7], [88, 19], [95, 11], [101, 22], [108, 13], [114, 18], [121, 9], [127, 16], [133, 8]];
    p.shape(or(ell(102, 45, 36, 11, -0.1), ...drips.map(([x, len]) => drip(x, 46, len, 4))), PINK);
    p.shape(or(ell(104, 34, 28, 12, -0.1), ell(88, 39, 15, 8), ell(121, 39, 14, 8), drip(84, 42, 4, 4), drip(117, 42, 5, 4)), VAN);
    p.shape(or(seg(104, 17, 106, 11, 1.4), seg(106, 11, 110, 7, 1.4)), { fill: '#5A2A1A' }); // stem
    p.shape(ell(103, 20, 4.6, 4.2), { fill: '#C8102E', outline: '#5E0A15', light: '#F0566B', shade: '#8E0B20', sw: 1 });
    p.dot(101, 18, '#FFFFFF');

    // chocolate puddle swallowing the lower body, plus splats
    p.shape(or(ell(102, 95, 46, 10), ell(72, 99, 20, 6), ell(140, 91, 22, 8), ell(84, 86, 14, 8, -0.3), ell(122, 86, 12, 7, 0.4)), CHOC);
    for (const [x, y, rx, ry] of [[30, 94, 5, 3], [43, 99, 6, 3], [20, 101, 4, 2.4], [57, 104, 5, 2.4], [163, 84, 6, 3], [170, 92, 3.5, 2]])
      p.shape(ell(x, y, rx, ry), CHOC);

    return p.toCanvas();
  }

  const lossScenes = [makeMeltedScene()];

  return {
    W, H, GROUND_H, C, TOWER_W, CAP_W, CAP_H, CAP_EDGE,
    eagle, towerBody, towerCap, towerCapFlip, background, ground, tapIcon, lossScenes,
    drawTower, text, button, plusButton, panel, canvas,
  };
})();
