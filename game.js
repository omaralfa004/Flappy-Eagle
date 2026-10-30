// Flappy Eagle. The game runs at a fixed 60 steps/second so the feel is the same
// on 60 Hz and 120 Hz screens. Menus are real HTML (index.html) laid over the canvas.
const S = Sprites;

// All feel numbers live here. Units: logical pixels, per 1/60 s step.
const TUNING = {
  gravity: 0.24,     // downward acceleration each step
  flap: -4.4,        // vertical speed set on each tap
  maxFall: 7,        // terminal fall speed
  speed: 1.25,       // tower and ground scroll speed
  gap: 74,           // vertical opening between a tower pair
  spacing: 104,      // horizontal distance between tower pairs
  gapTopMin: 40,     // highest the opening's top edge can sit
  gapTopMax: 170,    // lowest the opening's top edge can sit
  maxShift: 90,      // largest jump in opening height between neighbouring pairs
};

const STEP = 1 / 60, GROUND_Y = S.H - S.GROUND_H, EAGLE_X = 50, HIT_R = 7;
const MAX_PLAYERS = 10, TRIES = 2, TAU = Math.PI * 2;
const PLAYER_COLORS = ['#8C2232', '#DBCCA4', '#3F8A48', '#3E7CB1', '#D9822B', '#6C4A9E', '#2A8C82', '#8B5E3C', '#C2577A', '#5B6770'];

const $ = id => document.getElementById(id);
const cv = $('game'), g = cv.getContext('2d');
g.imageSmoothingEnabled = false;

const textCache = new Map();
const txt = (str, opts = {}) => {
  const key = str + JSON.stringify(opts);
  if (!textCache.has(key)) textCache.set(key, S.text(str, { outline: S.C.ink, ...opts }));
  return textCache.get(key);
};
const WORDMARK = { scale: 3, fg: S.C.gold, fg2: S.C.goldDark, outline: S.C.maroon, outline2: S.C.ink, shadow: S.C.brownDark };
const BANNER = { scale: 2, fg: S.C.gold, fg2: S.C.goldDark, outline: S.C.maroon, outline2: S.C.ink };

const mod = (a, m) => ((a % m) + m) % m;
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const rgb = hex => hex.match(/\w\w/g).map(h => parseInt(h, 16));
const lum = hex => rgb(hex).map(v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
// Ink or white, whichever reads better on the given colour.
const textOn = hex => (lum(hex) + 0.05) / (lum(S.C.ink) + 0.05) > 1.05 / (lum(hex) + 0.05) ? S.C.ink : '#FFFFFF';

let best = 0;
try { best = +localStorage.getItem('flappyEagleBest') || 0; } catch {}

const game = {
  state: 'title', // title | setup | order | wheel | ready | play | dead | over | results
  mode: 'solo',   // solo | multi
  y: 150, vy: 0, angle: 0, wingT: 0,
  towers: [], score: 0, newBest: false,
  groundX: 0, bgX: 0, t: 0, flash: 0, overAt: 0,
  loss: null, // index into LOSSES while a loss screen shows
};
// players: [{ name, color, best, played }]; queue: indices still to play; current: index playing now
const match = { players: [], order: 'standard', queue: [], current: 0, try: 1 };
const wheel = { slots: [], angle: 0, from: 0, to: 0, start: 0, dur: 1, winner: -1, doneAt: 0 };
Object.assign(window, { game, match, wheel }); // handy for console tinkering

// Loss screens, shown after a multiplayer player's last try. The art keeps its own resolution
// (2 art pixels per game pixel, on the #lossArt canvas) and its edge colour fills the whole screen.
const LOSSES = [
  ['melted-sprite-320x180', 'The eagle sprawled under a melted ice cream sundae'],
  ['scream-sprite-160x200', 'The eagle on its knees, screaming, wings clutching its head', '#775636'], // edge is mostly outline, so use the carpet
  ['dark-sprite-180x180', 'The eagle staring out of the dark with one huge eye and a white glove'],
  ['sideeye-sprite-200x160', 'The eagle as a round emoji, giving side-eye'],
  ['crying-sprite-216x144', 'The eagle as a crying emoji, wings thrown up'],
].map(([file, alt, fill]) => {
  const L = { alt, fill, art: null, bg: S.C.ink, dark: true }, img = new Image();
  img.onload = () => bakeLoss(L, img);
  img.src = `Loss%20screen%20renders/${file}.png`;
  return L;
});

// Fill colour = the given fill, else the most common edge pixel; the outer band is dithered into it so busy scenes melt into the fill.
function bakeLoss(L, img) {
  const c = S.canvas(img.width, img.height), x = c.getContext('2d'), w = c.width, h = c.height;
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, w, h), p = new Uint32Array(d.data.buffer), counts = new Map();
  const tally = i => counts.set(p[i], (counts.get(p[i]) || 0) + 1);
  for (let i = 0; i < w; i++) { tally(i); tally(i + (h - 1) * w); }
  for (let j = 0; j < h; j++) { tally(j * w); tally(j * w + w - 1); }
  const bg = L.fill ? new Uint32Array(new Uint8ClampedArray([...rgb(L.fill), 255]).buffer)[0] : [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const F = 12, BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const e = Math.min(i, y, w - 1 - i, h - 1 - y);
    if (e < F && e * 16 / F <= BAYER[(y & 3) * 4 + (i & 3)]) p[y * w + i] = bg;
  }
  x.putImageData(d, 0, 0);
  L.bg = '#' + [bg & 255, bg >> 8 & 255, bg >> 16 & 255].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  L.dark = textOn(L.bg) !== S.C.ink;
  L.art = c;
}

// Random loss screen, never the same one twice in a row.
let lastLoss = -1;
function pickLoss() {
  let i = Math.floor(rand() * (LOSSES.length - 1));
  if (lastLoss >= 0 && i >= lastLoss) i++;
  return (lastLoss = i);
}

const announce = msg => { $('status').textContent = msg; };
const nameOf = i => match.players[i].name || `PLAYER ${i + 1}`;
const cleanName = s => s.toUpperCase().replace(/[^A-Z0-9 !?.'-]/g, '').slice(0, 10); // only glyphs the pixel font has

// ---------- screens ----------
function showScreen(id) {
  for (const s of ['titleUI', 'setupUI', 'orderUI', 'resultsUI']) $(s).hidden = s !== id;
  if (id) $(id).querySelector('[data-focus]')?.focus();
}

function resetFlight() {
  Object.assign(game, { y: 150, vy: 0, angle: 0, towers: [], score: 0, newBest: false, loss: null });
}

function goTitle() {
  game.state = 'title'; game.mode = 'solo';
  resetFlight();
  showScreen('titleUI');
  announce('Flappy Eagle. Tap, click, or press Space for 1 player, or choose Multiplayer.');
}

function toReady() {
  resetFlight();
  game.state = 'ready';
  showScreen(null);
  announce(game.mode === 'solo'
    ? 'Get ready. Tap, click, or press Space to flap.'
    : `${nameOf(match.current)}, try ${match.try} of ${TRIES}. Each player gets ${TRIES} tries and the best one counts. Tap or press Space to start.`);
}

function openSetup() {
  game.state = 'setup';
  if (!match.players.length) addPlayer(false), addPlayer(false);
  renderCards();
  showScreen('setupUI');
}

function addPlayer(focus = true) {
  if (match.players.length >= MAX_PLAYERS) return;
  match.players.push({ name: '', color: PLAYER_COLORS[match.players.length], best: 0 });
  if (!focus) return;
  renderCards();
  const inputs = $('cards').querySelectorAll('input');
  inputs[inputs.length - 1].focus();
  if (match.players.length === MAX_PLAYERS) announce('Maximum of 10 players reached.');
}

function renderCards() {
  $('cards').querySelectorAll('input').forEach(saveName); // keep anything typed before the boxes are rebuilt
  const add = $('addPlayer');
  $('cards').innerHTML = match.players.map((p, i) => `
    <div class="card">
      <span class="num" style="background:${p.color};color:${textOn(p.color)}" aria-hidden="true">${i + 1}</span>
      <input data-i="${i}" value="${p.name}" placeholder="PLAYER ${i + 1}" aria-label="Player ${i + 1} name"
             maxlength="10" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="next">
    </div>`).join('');
  $('cards').append(add);
  add.hidden = match.players.length >= MAX_PLAYERS;
  $('playerCount').textContent = `${match.players.length} / ${MAX_PLAYERS} players`;
}

function chooseOrder(kind) {
  match.order = kind;
  match.queue = match.players.map((_, i) => i);
  match.players.forEach(p => { p.best = 0; p.played = false; });
  game.mode = 'multi';
  nextPlayer();
}

function nextPlayer() {
  if (!match.queue.length) return showResults();
  if (match.order === 'random' && match.queue.length > 1) return startWheel();
  beginTurn(match.queue.shift());
}

function beginTurn(i) {
  match.current = i; match.try = 1;
  toReady();
}

function showResults() {
  game.state = 'results';
  resetFlight();
  // Players who never went (game ended early) sink to the bottom with a "-".
  const ranked = match.players.map((p, i) => ({ ...p, i }))
    .sort((a, b) => b.played - a.played || b.best - a.best || a.i - b.i);
  $('board').innerHTML = ranked.map(p => {
    const rank = p.played ? 1 + ranked.filter(q => q.played && q.best > p.best).length : '-'; // ties share a rank
    return `<li class="${rank === 1 ? 'first' : ''}">
      <span>${rank}${p.played ? '.' : ''}</span>
      <span class="num" style="background:${p.color};color:${textOn(p.color)}" aria-label="player ${p.i + 1}">${p.i + 1}</span>
      <span>${nameOf(p.i)}</span>
      <span class="score" ${p.played ? '' : 'aria-label="did not play"'}>${p.played ? p.best : '-'}</span>
    </li>`;
  }).join('');
  showScreen('resultsUI');
  const top = ranked.filter(p => p.played && p.best === ranked[0].best).map(p => nameOf(p.i));
  announce(top.length
    ? `Final scores. ${top.join(' and ')} ${top.length > 1 ? 'tie' : 'wins'} with ${ranked[0].best}.`
    : 'Game ended before anyone played.');
}

// ---------- wheel ----------
function startWheel() {
  game.state = 'wheel';
  resetFlight();
  showScreen(null);
  wheel.slots = [...match.queue];
  wheel.from = mod(wheel.angle, TAU);
  // Random stop: every slot equally likely, landing well inside it so it never stops on a divider.
  const n = wheel.slots.length, local = (Math.floor(rand() * n) + 0.15 + rand() * 0.7) * TAU / n;
  wheel.to = wheel.from + (4 + Math.floor(rand() * 3)) * TAU + mod(-Math.PI / 2 - local - wheel.from, TAU);
  wheel.start = game.t;
  wheel.dur = 240 + Math.floor(rand() * 60);
  wheel.winner = -1;
  announce('Spinning the wheel to pick the next player.');
}

const slotUnderPointer = () => Math.floor(mod(-Math.PI / 2 - wheel.angle, TAU) / (TAU / wheel.slots.length));

function updateWheel() {
  const p = Math.min(1, (game.t - wheel.start) / wheel.dur);
  wheel.angle = wheel.from + (wheel.to - wheel.from) * (1 - (1 - p) ** 3); // fast start, slow finish
  if (p === 1 && wheel.winner < 0) {
    wheel.winner = slotUnderPointer();
    wheel.doneAt = game.t;
    announce(`${nameOf(wheel.slots[wheel.winner])} is up!`);
  }
  if (wheel.winner >= 0 && game.t - wheel.doneAt > 100) finishWheel();
}

function finishWheel() {
  const i = wheel.slots[wheel.winner];
  match.queue.splice(match.queue.indexOf(i), 1);
  beginTurn(i);
}

// ---------- flight ----------
function flap() {
  game.vy = TUNING.flap;
  game.wingT = 0;
}

function input() {
  $('fsTip').hidden = true;
  switch (game.state) {
    case 'title': game.mode = 'solo'; toReady(); break;
    case 'ready': game.state = 'play'; flap(); break;
    case 'play': flap(); break;
    case 'wheel': if (wheel.winner >= 0 && game.t - wheel.doneAt > 20) finishWheel(); break;
    case 'over':
      if (game.t - game.overAt <= 36) break; // short lockout so a panic tap doesn't skip the results
      if (game.mode === 'solo') toReady();
      else if (match.try < TRIES) { match.try++; toReady(); }
      else nextPlayer();
  }
}

function spawnTower(x) {
  const prev = game.towers.at(-1);
  const base = prev ? prev.gapTop : (TUNING.gapTopMin + TUNING.gapTopMax) / 2;
  const shift = (Math.random() * 2 - 1) * TUNING.maxShift;
  const gapTop = Math.round(Math.min(TUNING.gapTopMax, Math.max(TUNING.gapTopMin, base + shift)));
  game.towers.push({ x, gapTop, scored: false });
}

// Collision boxes for one pair: cap and body for the top and bottom tower.
// Pinnacles are left out on purpose, as a little grace.
function towerRects({ x, gapTop }) {
  const gapBot = gapTop + TUNING.gap, capH = S.CAP_H - S.CAP_EDGE, bx = x + (S.CAP_W - S.TOWER_W) / 2;
  return [
    [bx, -1000, S.TOWER_W, gapTop - capH + 1000],
    [x + 1, gapTop - capH, S.CAP_W - 2, capH],
    [x + 1, gapBot, S.CAP_W - 2, capH],
    [bx, gapBot + capH, S.TOWER_W, GROUND_Y - gapBot - capH],
  ];
}

function circleHitsRect(cx, cy, r, [x, y, w, h]) {
  const dx = cx - Math.max(x, Math.min(cx, x + w)), dy = cy - Math.max(y, Math.min(cy, y + h));
  return dx * dx + dy * dy < r * r;
}
console.assert(circleHitsRect(10, 10, 5, [12, 0, 10, 20]) && !circleHitsRect(0, 0, 5, [6, 6, 10, 10]), 'circleHitsRect');

function die() {
  game.state = 'dead';
  game.flash = 1;
  if (game.mode === 'multi') {
    const p = match.players[match.current];
    p.best = Math.max(p.best, game.score);
    p.played = true;
    if (match.try === TRIES) game.loss = pickLoss();
  } else if (game.score > best) {
    best = game.score; game.newBest = true;
    try { localStorage.setItem('flappyEagleBest', best); } catch {}
  }
}

function update() {
  game.t++;
  game.flash = Math.max(0, game.flash - 0.08);
  if (game.state !== 'dead' && game.state !== 'over') {
    game.groundX = (game.groundX + TUNING.speed) % S.W;
    game.bgX = (game.bgX + TUNING.speed * 0.25) % S.W;
  }

  if (game.state === 'wheel') return updateWheel();
  if (game.state === 'title' || game.state === 'ready') {
    game.y = 150 + Math.sin(game.t / 10) * 3;
    game.wingT++;
    return;
  }

  if (game.state === 'play' || game.state === 'dead') {
    game.vy = Math.min(TUNING.maxFall, game.vy + TUNING.gravity);
    game.y += game.vy;
    // nose up right after a flap, then tip into a dive as speed builds
    const target = game.vy < 1.5 ? -0.4 : Math.min(1.5, (game.vy - 1.5) * 0.4);
    game.angle += (target - game.angle) * (target > game.angle ? 0.12 : 0.4);
    if (game.angle < 1.1) game.wingT++;
  }

  if (game.state === 'play') {
    for (const t of game.towers) t.x -= TUNING.speed;
    if (!game.towers.length || game.towers.at(-1).x < S.W - TUNING.spacing) spawnTower(game.towers.length ? game.towers.at(-1).x + TUNING.spacing : S.W + 20);
    if (game.towers[0].x < -S.CAP_W) game.towers.shift();

    for (const t of game.towers) {
      if (!t.scored && t.x + S.CAP_W / 2 < EAGLE_X) { t.scored = true; game.score++; }
      if (towerRects(t).some(r => circleHitsRect(EAGLE_X, game.y, HIT_R, r))) return die();
    }
  }

  if ((game.state === 'play' || game.state === 'dead') && game.y + HIT_R >= GROUND_Y) {
    game.y = GROUND_Y - HIT_R;
    if (game.state === 'play') die();
    game.state = 'over';
    game.overAt = game.t;
    announce(game.mode === 'solo'
      ? `Game over. Score ${game.score}. Best ${best}.${game.newBest ? ' New best!' : ''} Tap or press Space to try again, or choose 1 Player, Multiplayer or Home.`
      : `${nameOf(match.current)} scored ${game.score}. Best so far ${match.players[match.current].best}.${game.loss != null ? ` ${LOSSES[game.loss].alt}.` : ''} Tap or press Space to continue.`);
  }
}

// ---------- drawing ----------
const center = (img, y) => g.drawImage(img, Math.round((S.W - img.width) / 2), Math.round(y));

function badge(x, y, i, size = 13) {
  const col = match.players[i].color;
  g.fillStyle = S.C.ink; g.fillRect(x, y, size, size);
  g.fillStyle = col; g.fillRect(x + 1, y + 1, size - 2, size - 2);
  const n = txt(String(i + 1), { fg: textOn(col), outline: null });
  g.drawImage(n, x + Math.round((size - n.width) / 2), y + Math.round((size - n.height) / 2));
}

function draw() {
  const loss = game.state === 'over' && game.loss != null && LOSSES[game.loss].art ? LOSSES[game.loss] : null;
  showLossArt(loss);
  if (loss) { g.fillStyle = loss.bg; g.fillRect(0, 0, S.W, S.H); }
  else {
    for (const o of [0, S.W]) g.drawImage(S.background, Math.floor(o - game.bgX), 0);
    for (const t of game.towers) {
      S.drawTower(g, Math.round(t.x), t.gapTop, true);
      S.drawTower(g, Math.round(t.x), t.gapTop + TUNING.gap, false);
    }
    for (const o of [0, S.W]) g.drawImage(S.ground, Math.floor(o - game.groundX), GROUND_Y);
  }

  const menu = ['setup', 'order', 'results', 'wheel'].includes(game.state);
  if (menu) {
    g.fillStyle = 'rgba(43,27,18,0.5)'; // darken the scrolling scene behind menus
    g.fillRect(0, 0, S.W, S.H);
  } else if (!loss) { // the loss art replaces the scene, eagle included
    const frame = [0, 1, 2, 1][Math.floor(game.wingT / 5) % 4];
    g.save();
    g.translate(EAGLE_X, Math.round(game.y));
    g.rotate(game.angle);
    g.drawImage(S.eagle[frame], -13, -9);
    g.restore();
  }

  const multi = game.mode === 'multi';
  const showEnd = multi && (game.state === 'over' || game.state === 'wheel');
  if ($('endUI').hidden === showEnd) $('endUI').hidden = !showEnd;
  // setup and results keep their own buttons along the bottom edge, so the toggle steps aside there
  const showFs = FS.touch && !FS.installed && !['play', 'dead', 'setup', 'results'].includes(game.state);
  if ($('fsBtn').hidden === showFs) { $('fsBtn').hidden = !showFs; if (!showFs) $('fsTip').hidden = true; }
  // solo game over: switch modes or go home, offered once the panic-tap lockout ends
  const showOver = !multi && game.state === 'over' && game.t - game.overAt > 36;
  if ($('overUI').hidden === showOver) $('overUI').hidden = !showOver;
  if (game.state === 'title') {
    center(txt('FLAPPY', WORDMARK), 40);
    center(txt('EAGLE', WORDMARK), 70);
    center(S.tapIcon, 176);
    center(txt('TAP TO PLAY'), 194);
  } else if (game.state === 'ready') {
    if (multi) drawTurnIntro();
    else center(txt('GET READY', BANNER), 70);
    center(S.tapIcon, 176);
    center(txt(multi ? 'TAP TO START' : 'TAP TO FLAP'), 194);
  } else if (game.state === 'play' || game.state === 'dead') {
    center(txt(String(game.score), { scale: 3 }), 16);
    if (multi) center(txt(`${nameOf(match.current)} - TRY ${match.try}/${TRIES}`), 46);
  } else if (game.state === 'over') {
    drawResults(loss);
  } else if (game.state === 'wheel') {
    drawWheel();
  }

  if (game.flash) {
    g.fillStyle = `rgba(255,255,255,${game.flash})`;
    g.fillRect(0, 0, S.W, S.H);
  }
}

function drawTurnIntro() {
  const name = txt(nameOf(match.current), BANNER), w = name.width + 17, x = Math.round((S.W - w) / 2);
  badge(x, 58, match.current);
  g.drawImage(name, x + 17, 54);
  center(txt(`TRY ${match.try} OF ${TRIES}`, { fg: S.C.gold }), 82);
  center(txt(`${TRIES} TRIES EACH.`), 214);
  center(txt('YOUR BEST ONE COUNTS.'), 225);
}

// The loss art sits on its own canvas over the game canvas, placed in game pixels.
function lossBox(L) {
  const w = L.art.width / 2, h = L.art.height / 2;
  return { x: (S.W - w) / 2, y: 48 + Math.round((142 - h) / 2), w, h };
}
function showLossArt(L) {
  const el = $('lossArt');
  $('endUI').classList.toggle('on-dark', !!L && L.dark);
  document.documentElement.classList.toggle('lossfill', !!L);
  if (L) document.documentElement.style.setProperty('--lossbg', L.bg);
  if (!L) { if (!el.hidden) el.hidden = true; return; }
  if (el.getAttribute('aria-label') !== L.alt) {
    const b = lossBox(L);
    el.width = L.art.width; el.height = L.art.height;
    el.getContext('2d').drawImage(L.art, 0, 0);
    el.setAttribute('aria-label', L.alt);
    Object.assign(el.style, { left: `calc(var(--u) * ${b.x})`, top: `calc(var(--u) * ${b.y})`, width: `calc(var(--u) * ${b.w})`, height: `calc(var(--u) * ${b.h})` });
  }
  el.hidden = false;
}

let panelImg;
function drawResults(loss) {
  const multi = game.mode === 'multi', since = game.t - game.overAt, drop = Math.max(0, 12 - since) * 2; // banner slides in
  // on a loss screen, plain text follows the art's background: ink on light, outlined white on dark
  const plain = loss && !loss.dark ? { fg: S.C.ink, outline: null } : {};
  center(txt('GAME OVER', BANNER), (loss ? 8 : 58) - drop);
  if (multi) center(txt(`${nameOf(match.current)} - TRY ${match.try}/${TRIES}`, plain), loss ? 36 : 84);
  if (!panelImg) panelImg = S.panel(132, 70);
  const px = (S.W - panelImg.width) / 2, py = loss ? 196 : 100, shown = multi ? match.players[match.current].best : best;
  g.drawImage(panelImg, px, py);
  g.drawImage(txt('SCORE', { fg: S.C.maroon, outline: null }), px + 12, py + 14);
  g.drawImage(txt('BEST', { fg: S.C.maroon, outline: null }), px + 12, py + 38);
  const sc = txt(String(game.score), { scale: 2 }), bs = txt(String(shown), { scale: 2 });
  g.drawImage(sc, px + panelImg.width - 12 - sc.width, py + 9);
  g.drawImage(bs, px + panelImg.width - 12 - bs.width, py + 33);
  if (game.newBest) g.drawImage(txt('NEW!', { fg: S.C.white, outline: S.C.maroon }), px + 46, py + 38);
  if (since <= 36) return;
  const last = multi && match.try === TRIES && !match.queue.length;
  center(txt(!multi ? 'TAP TO RETRY' : last ? 'TAP FOR RESULTS' : match.try < TRIES ? 'TAP FOR TRY 2' : 'TAP FOR NEXT PLAYER', plain), loss ? 274 : 192);
}

const WR = 62, WD = WR * 2 + 1, WCY = 112, wheelCv = S.canvas(WD, WD), wctx = wheelCv.getContext('2d');
function drawWheel() {
  center(txt("WHO'S NEXT?", BANNER), 16);
  const n = wheel.slots.length, seg = TAU / n, img = wctx.createImageData(WD, WD), d = img.data;
  const cols = wheel.slots.map(i => rgb(match.players[i].color));
  const [ink, gold, goldD, maroon, white] = [S.C.ink, S.C.gold, S.C.goldDark, S.C.maroon, '#FFFFFF'].map(rgb);
  const blink = wheel.winner >= 0 && Math.floor((game.t - wheel.doneAt) / 8) % 2 === 0;
  for (let y = 0; y < WD; y++) for (let x = 0; x < WD; x++) {
    const dx = x - WR, dy = y - WR, r = Math.hypot(dx, dy);
    if (r > WR + 0.5) continue;
    let c;
    if (r > WR - 0.8 || (r > WR - 5 && r <= WR - 4)) c = ink;      // outer edge and inner rim line
    else if (r > WR - 4) c = r > WR - 2.5 ? gold : goldD;             // gold rim
    else if (r < 6) c = r < 5 ? maroon : ink;                         // hub
    else {
      const local = mod(Math.atan2(dy, dx) - wheel.angle, TAU), k = Math.floor(local / seg);
      const edge = Math.min(local - k * seg, (k + 1) * seg - local) * r; // distance to the nearest divider
      c = edge < 0.7 ? ink : blink && k === wheel.winner ? white : cols[k];
    }
    const o = (y * WD + x) * 4;
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  wctx.putImageData(img, 0, 0);
  const cx = S.W >> 1, top = WCY - WR;
  g.drawImage(wheelCv, cx - WR, top);
  wheel.slots.forEach((i, k) => {
    const a = (k + 0.5) * seg + wheel.angle, num = txt(String(i + 1));
    g.drawImage(num, Math.round(cx + Math.cos(a) * WR * 0.64 - num.width / 2), Math.round(WCY + Math.sin(a) * WR * 0.64 - num.height / 2));
  });
  // pointer at the top
  for (let i = 0; i < 9; i++) {
    const hw = 4 - (i >> 1);
    g.fillStyle = S.C.ink; g.fillRect(cx - hw - 1, top - 4 + i, hw * 2 + 3, 1);
    if (hw > 0 && i < 8) { g.fillStyle = i ? S.C.maroon : S.C.maroonLight; g.fillRect(cx - hw, top - 4 + i, hw * 2 + 1, 1); }
  }
  // legend: two columns of colour badges and names
  const rows = Math.ceil(n / 2);
  wheel.slots.forEach((i, k) => {
    const x = k < rows ? 6 : 94, y = 184 + (k % rows) * 13;
    badge(x, y, i, 11);
    const won = k === wheel.winner;
    g.drawImage(txt(nameOf(i), won ? { fg: S.C.gold, outline: S.C.maroon } : {}), x + 13, y + 1);
  });
  if (wheel.winner >= 0) {
    center(txt(`${nameOf(wheel.slots[wheel.winner])} IS UP!`, { fg: S.C.gold, outline: S.C.maroon, outline2: S.C.ink }), 256);
    if (game.t - wheel.doneAt > 20) center(txt('TAP TO GO'), 274);
  }
}

// ---------- input ----------
// Taps anywhere outside the menus' own controls drive the game.
addEventListener('pointerdown', e => {
  if (e.target.closest('button, input, .dim')) return;
  e.preventDefault(); input();
});
addEventListener('keydown', e => {
  if (e.repeat || !['Space', 'ArrowUp', 'Enter'].includes(e.code) || e.target.closest?.('button, input')) return;
  e.preventDefault(); input();
});

$('soloBtn').onclick = $('overSolo').onclick = () => { game.mode = 'solo'; toReady(); };
$('multiBtn').onclick = $('overMulti').onclick = openSetup;
$('homeBtn').onclick = goTitle;
$('addPlayer').onclick = () => addPlayer();
// Phone keyboards compose words before committing them; rewriting the box mid-composition can make
// the keyboard drop or overwrite the text, so clean up only once a word is committed.
function saveName(input) {
  const clean = cleanName(input.value);
  if (clean !== input.value) input.value = clean;
  match.players[+input.dataset.i].name = clean.trim();
}
$('cards').addEventListener('input', e => { if (e.target.matches('input') && !e.isComposing) saveName(e.target); });
$('cards').addEventListener('compositionend', e => { if (e.target.matches('input')) saveName(e.target); });
$('cards').addEventListener('change', e => { if (e.target.matches('input')) saveName(e.target); });
const saveAllNames = () => $('cards').querySelectorAll('input').forEach(saveName);
$('cards').addEventListener('keydown', e => { // Enter moves to the next name box
  if (e.key !== 'Enter' || !e.target.matches('input')) return;
  e.preventDefault();
  const next = $('cards').querySelectorAll('input')[+e.target.dataset.i + 1];
  (next || $('setupNext')).focus();
});
$('setupBack').onclick = () => { saveAllNames(); goTitle(); };
$('setupNext').onclick = () => { saveAllNames(); game.state = 'order'; showScreen('orderUI'); };
$('orderBack').onclick = openSetup;
$('orderStandard').onclick = () => chooseOrder('standard');
$('orderRandom').onclick = () => chooseOrder('random');
$('againBtn').onclick = () => { game.state = 'order'; showScreen('orderUI'); };
$('menuBtn').onclick = goTitle;
$('endBtn').onclick = showResults;

// Full screen toggle for phones and tablets. iPhone Safari has no fullscreen API, so there it explains
// Add to Home Screen instead (the home-screen app opens full screen and needs no toggle).
const FS = {
  touch: matchMedia('(pointer: coarse)').matches,
  installed: matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true,
  api: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
};
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
$('fsBtn').onclick = async () => {
  if (!FS.api) { $('fsTip').hidden = !$('fsTip').hidden; return; }
  try {
    if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else {
      const el = document.documentElement;
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' });
      screen.orientation?.lock?.('portrait').catch(() => {}); // Android: the game is portrait
    }
  } catch {}
};
function syncFs() {
  const on = isFull();
  $('fsBtn').classList.toggle('on', on);
  $('fsBtn').setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen');
}
document.addEventListener('fullscreenchange', syncFs);
document.addEventListener('webkitfullscreenchange', syncFs);

// Fit the 180x320 game to the window, using whole-number scaling when there's room.
// Screens taller than 9:16 (most modern phones) fill the width exactly and extend the scene into the
// space above and below; everything else keeps whole-number scaling with a frame.
const sky = S.background.getContext('2d').getImageData(0, 0, 1, 1).data;
$('above').style.background = `rgb(${sky[0]},${sky[1]},${sky[2]})`;
const brick = S.canvas(S.W, S.GROUND_H - 8); // brick courses only: 8 rows of 6px, tiles vertically
brick.getContext('2d').drawImage(S.ground, 0, -8);
$('below').style.backgroundImage = `url(${brick.toDataURL()})`;
function fit() {
  const tall = innerHeight / innerWidth > S.H / S.W;
  const s = tall ? innerWidth / S.W : Math.min(innerWidth / S.W, innerHeight / S.H);
  document.documentElement.classList.toggle('tall', tall);
  document.documentElement.style.setProperty('--u', (s >= 2 && !tall ? Math.floor(s) : s) + 'px');
  $('below').style.backgroundSize = `calc(var(--u) * ${S.W}) calc(var(--u) * ${brick.height})`;
}
addEventListener('resize', fit);
fit();

goTitle();
let last = performance.now(), acc = 0;
requestAnimationFrame(function loop(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) { update(); acc -= STEP; }
  draw();
  requestAnimationFrame(loop);
});
