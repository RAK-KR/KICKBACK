// 게임 진행 총괄: 상태, 루프, 이벤트 연결
import { C } from './config.js';
import { buildWorld, ZONES, zoneAt } from './level.js';
import { createPlayer, fire, updatePlatforms, stepPlayer } from './physics.js';
import { createRenderer } from './render.js';
import { createFx, updateFx, muzzle, tracer, shells, dust, burst, text } from './fx.js';
import { createInput } from './input.js';
import { initAudio, sfx, setMuted, setWind } from './audio.js';
import * as store from './storage.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const R = createRenderer(canvas);
const fx = createFx();
const opt = store.loadOpt();
let world, p, cam, stats;
let state = 'title';       // title | play | pause | clear
let acc = 0, last = 0, time = 0, kick = 0, squash = 0, saveT = 0, lastZone = 0;
const aim = { x: 1, y: 0 };

function fmtTime(t) {
  const m = Math.floor(t / 60), s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}
const meters = (y) => Math.max(0, Math.round((-(y + C.HH)) / C.UNIT_PER_M));

function newRun(save) {
  world = buildWorld();
  p = createPlayer(world.spawn.x, world.spawn.y);
  stats = { time: 0, shots: 0, falls: 0, bestH: 0, started: false };
  if (save) {
    p.x = save.x; p.y = save.y; p.lastGroundY = save.y;
    Object.assign(stats, { time: save.time, shots: save.shots, falls: save.falls, bestH: save.bestH, started: save.time > 0 });
  }
  cam = { x: p.x, y: p.y - 120 };
  fx.list.length = 0; lastZone = zoneAt(-p.y);
}

function saveNow() {
  if (p.won || !p.grounded) return;
  if (p.ground && p.ground.type === 'move') return;
  store.writeSave({ x: p.x, y: p.y, time: stats.time, shots: stats.shots, falls: stats.falls, bestH: stats.bestH });
}

function rayHit(ox, oy, dx, dy, max) {
  let best = max;
  for (const r of world.plats) {
    const tx1 = (r.x - ox) / dx, tx2 = (r.x + r.w - ox) / dx, ty1 = (r.y - oy) / dy, ty2 = (r.y + r.h - oy) / dy;
    const tn = Math.max(Math.min(tx1, tx2), Math.min(ty1, ty2)), tf = Math.min(Math.max(tx1, tx2), Math.max(ty1, ty2));
    if (tf >= tn && tf > 0 && tn > 0 && tn < best) best = tn;
  }
  return best;
}

function updateAim() {
  if (!input.has) return;
  const s = R.toScreen(cam, p.x, p.y + 3);
  const dx = input.x - s.x, dy = input.y - s.y, d = Math.hypot(dx, dy);
  if (d > 4) { aim.x = dx / d; aim.y = dy / d; }
}

function tryFire() {
  if (state !== 'play') return;
  initAudio(); updateAim();
  if (!fire(p, aim.x, aim.y)) { if (p.ammo <= 0) sfx.dry(); return; }
  stats.started = true; stats.shots++; kick = 1;
  const mx = p.x + aim.x * 36, my = p.y + 3 + aim.y * 36;
  muzzle(fx, mx, my, aim.x, aim.y);
  for (let i = 0; i < 6; i++) {
    const a = Math.atan2(aim.y, aim.x) + (Math.random() - 0.5) * 0.24;
    const dx = Math.cos(a) || 1e-6, dy = Math.sin(a) || 1e-6, d = rayHit(mx, my, dx, dy, 760);
    tracer(fx, mx, my, mx + dx * d, my + dy * d, d < 760);
  }
  sfx.shot();
}

function handle(ev) {
  for (const e of ev) {
    switch (e.t) {
      case 'land': { const k = Math.min(1, e.v / 1300); squash = Math.max(squash, 0.3 + k * 0.7); dust(fx, e.x, e.y, k, e.ice ? '#cfe9ff' : '#b8aa98'); sfx.land(e.v); break; }
      case 'bump': sfx.bump(e.v); fx.shake = Math.max(fx.shake, Math.min(8, e.v / 150)); break;
      case 'bounce': sfx.bounce(); burst(fx, e.x, e.y, '#ff8a2a'); squash = 0.6; break;
      case 'pickup': sfx.pickup(); burst(fx, e.x, e.y, '#a9d86e'); text(fx, e.x, e.y - 30, '재장전', '#a9d86e'); break;
      case 'reload': sfx.reload(); shells(fx, e.x, e.y); break;
      case 'fall': stats.falls++; sfx.fall(); text(fx, e.x, e.y - 60, `-${Math.round(e.d / C.UNIT_PER_M)}m`, '#ff5a46'); break;
      case 'goal': finish(); break;
    }
  }
}

function finish() {
  state = 'clear'; sfx.clear(); store.clearSave();
  const best = store.loadBest(), isNew = !best || stats.time < best.time;
  if (isNew) store.writeBest({ time: stats.time, shots: stats.shots, falls: stats.falls });
  $('clear-time').textContent = fmtTime(stats.time);
  $('clear-shots').textContent = stats.shots;
  $('clear-falls').textContent = stats.falls;
  $('clear-best').textContent = isNew ? '신기록' : `최고 기록 ${fmtTime(best.time)}`;
  setTimeout(() => show('clear'), 900);
}

function show(name) {
  for (const id of ['title', 'pause', 'clear']) $(id).classList.toggle('on', id === name);
  $('hud').classList.toggle('on', !name);
  if (name) input.unlock();
  canvas.style.cursor = name ? 'default' : 'none';
}

function refreshTitle() {
  const save = store.loadSave(), best = store.loadBest();
  $('btn-continue').style.display = save ? '' : 'none';
  $('btn-continue').textContent = save ? `이어하기  ${meters(save.y)}m` : '이어하기';
  $('title-best').textContent = best ? `최고 기록 ${fmtTime(best.time)} / ${best.shots}발` : '';
}

function start(save) { initAudio(); newRun(save); state = 'play'; show(null); input.lock(); }
function pause() {
  if (state === 'play') { state = 'pause'; saveNow(); $('btn-restart').textContent = '처음부터'; $('btn-restart').dataset.arm = ''; show('pause'); }
  else if (state === 'pause') { state = 'play'; show(null); input.lock(); }
}
function toggleMute() { opt.mute = !opt.mute; store.writeOpt(opt); setSens(opt.sens, false);
setMuted(opt.mute); $('btn-sound').textContent = opt.mute ? '소리 꺼짐' : '소리 켜짐'; }

// 조준 감도 (0.2 ~ 3.0)
function setSens(v, toast) {
  opt.sens = Math.round(Math.max(0.2, Math.min(3, v)) * 100) / 100; store.writeOpt(opt);
  input.sens = opt.sens;
  for (const el of document.querySelectorAll('.sens-range')) el.value = opt.sens;
  for (const el of document.querySelectorAll('.sens-val')) el.textContent = opt.sens.toFixed(2);
  if (toast) { const t = $('toast'); t.textContent = `조준 감도 ${opt.sens.toFixed(2)}`; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); }
}
const input = createInput(canvas, { fire: tryFire, pause, mute: toggleMute,
  sens: (d) => setSens(opt.sens + d, true),
  lockLost: () => { if (state === 'play') pause(); },
  blur: () => { if (state === 'play') pause(); } });
for (const el of document.querySelectorAll('.sens-range')) el.addEventListener('input', () => setSens(parseFloat(el.value), false));

$('btn-continue').onclick = () => start(store.loadSave());
$('btn-new').onclick = () => { store.clearSave(); start(null); };
$('btn-resume').onclick = pause;
$('btn-sound').onclick = toggleMute;
$('btn-pause').onclick = pause;
$('btn-restart').onclick = (e) => {
  const b = e.currentTarget;
  if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = '한 번 더 누르면 처음부터'; return; }
  store.clearSave(); start(null);
};
$('btn-again').onclick = () => start(null);
$('btn-totitle').onclick = () => { newRun(null); state = 'title'; refreshTitle(); show('title'); };
window.addEventListener('resize', R.resize);
window.addEventListener('beforeunload', () => { if (state === 'play' || state === 'pause') saveNow(); });

function tick(dt) {
  const ev = [];
  updatePlatforms(world, dt);
  stepPlayer(world, p, dt, ev);
  handle(ev);
  if (stats.started && !p.won) stats.time += dt;
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; time += dt;
  if (state === 'play' || state === 'clear') {
    updateAim();
    acc += dt;
    while (acc >= C.STEP) { tick(C.STEP); acc -= C.STEP; }
    saveT += dt; if (saveT > 2) { saveT = 0; if (state === 'play') saveNow(); }
  }
  if (state !== 'pause') updateFx(fx, dt);
  kick = Math.max(0, kick - dt * 9); squash = Math.max(0, squash - dt * 5);

  // 카메라
  const vh = R.h / R.scale, vw = R.w / R.scale;
  const ty = p.y - vh * 0.08 + Math.max(-vh * 0.2, Math.min(vh * 0.3, p.vy * 0.16));
  const k = 1 - Math.exp(-7 * dt);
  cam.y += (ty - cam.y) * k;
  cam.y = Math.min(cam.y, 60 - vh / 2 + vh * 0.12 + 40);
  let tx = C.WORLD_W / 2;
  if (vw < C.WORLD_W + 120) tx = Math.max(vw / 2 - 60, Math.min(C.WORLD_W + 60 - vw / 2, p.x));
  cam.x += (tx - cam.x) * k;

  const h = -(p.y + C.HH);
  if (h > stats.bestH) stats.bestH = h;
  const z = zoneAt(h);
  if (z !== lastZone && state === 'play') {
    if (z > lastZone) { sfx.zone(); const el = $('zone'); el.textContent = `${z + 1}구역  ${ZONES[z].name}`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    lastZone = z;
  }
  setWind(state === 'play' ? Math.hypot(p.vx, p.vy) : 0, Math.min(1, h / world.top));

  $('hud-height').textContent = meters(p.y);
  $('hud-best').textContent = `최고 ${Math.round(stats.bestH / C.UNIT_PER_M)}m`;
  $('hud-time').textContent = fmtTime(stats.time);
  $('hud-sub').textContent = `${stats.shots}발 · 추락 ${stats.falls}`;

  R.draw({ world, p, cam, fx, view: {
    time, aimX: aim.x, aimY: aim.y, kick, squash, height: h, bestH: stats.bestH,
    showAim: state === 'play' && (!input.touch || input.holding),
    cursor: state === 'play' && input.has && !input.touch ? { x: input.x, y: input.y } : null,
  } });
}

setSens(opt.sens, false);
setMuted(opt.mute); $('btn-sound').textContent = opt.mute ? '소리 꺼짐' : '소리 켜짐';
newRun(null); refreshTitle(); show('title');
requestAnimationFrame(frame);
// 테스트용 접근점
window.__game = { get p() { return p; }, get stats() { return stats; }, get state() { return state; }, get world() { return world; } };
