// 화면 그리기 전담
import { C } from './config.js';
import { ZONES, SIGNS, zoneAt } from './level.js';
import { drawFx } from './fx.js';

const FONT = 'Bahnschrift, "DIN Alternate", "Roboto Condensed", "Noto Sans KR", sans-serif';
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// 높이에 따라 구역 색을 부드럽게 섞음
function palette(height) {
  const z = zoneAt(height), cur = ZONES[z], nxt = ZONES[z + 1];
  let t = 0;
  if (nxt) t = Math.max(0, Math.min(1, (height - (nxt.from - 260)) / 260));
  const o = nxt && t > 0 ? nxt : cur;
  return { top: mix(cur.sky[0], o.sky[0], t), bot: mix(cur.sky[1], o.sky[1], t), accent: mix(cur.accent, o.accent, t), sil: mix(cur.sil, o.sil, t), z, t };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const R = { w: 0, h: 0, dpr: 1, scale: 1 };
  R.resize = () => {
    R.dpr = Math.min(2, window.devicePixelRatio || 1);
    R.w = window.innerWidth; R.h = window.innerHeight;
    canvas.width = Math.round(R.w * R.dpr); canvas.height = Math.round(R.h * R.dpr);
    R.scale = Math.max(R.w / C.VIEW_W, R.h / C.VIEW_H);
  };
  R.resize();
  R.toScreen = (cam, x, y) => ({ x: (x - cam.x) * R.scale + R.w / 2, y: (y - cam.y) * R.scale + R.h / 2 });

  function background(cam, pal, time) {
    const g = ctx.createLinearGradient(0, 0, 0, R.h);
    g.addColorStop(0, pal.top); g.addColorStop(1, pal.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.w, R.h);
    const height = -cam.y;
    // 별 (상층부)
    const starA = Math.max(0, Math.min(1, (height - 4600) / 1200));
    if (starA > 0) {
      for (let i = 0; i < 90; i++) {
        const x = hash(i) * R.w, y = (hash(i + 500) * R.h * 1.6 - cam.y * 0.03) % (R.h * 1.6);
        const tw = 0.5 + 0.5 * Math.sin(time * (0.5 + hash(i + 9)) + i);
        ctx.fillStyle = `rgba(230,235,255,${starA * (0.25 + 0.5 * tw) * hash(i + 77)})`;
        ctx.fillRect(x, ((y % (R.h * 1.6)) + R.h * 1.6) % (R.h * 1.6) - R.h * 0.3, 2, 2);
      }
    }
    // 원경 구조물 2겹
    const silA = 1 - Math.max(0, Math.min(0.85, (height - 3800) / 2200));
    for (const [f, a, lw] of [[0.22, 0.55, 30], [0.48, 0.9, 54]]) {
      ctx.fillStyle = pal.sil; ctx.globalAlpha = a * silA;
      const s = R.scale * (0.55 + f), ox = cam.x * f, oy = cam.y * f;
      const period = 330;
      const x0 = Math.floor((ox - R.w / 2 / s) / period) - 1, x1 = Math.ceil((ox + R.w / 2 / s) / period) + 1;
      for (let i = x0; i <= x1; i++) {
        const wx = i * period + hash(i * 3 + f * 100) * 160, cw = lw * (0.6 + hash(i + f * 31));
        ctx.fillRect((wx - ox) * s + R.w / 2, 0, cw * s, R.h);
      }
      const yp = 420;
      const y0 = Math.floor((oy - R.h / 2 / s) / yp) - 1, y1 = Math.ceil((oy + R.h / 2 / s) / yp) + 1;
      for (let j = y0; j <= y1; j++) {
        const wy = j * yp + hash(j * 7 + f * 50) * 200, sy = (wy - oy) * s + R.h / 2;
        ctx.fillRect(0, sy, R.w, 16 * s * (0.6 + hash(j + 3)));
        // 대각 보강재
        ctx.beginPath(); const bx = (hash(j * 13 + f) * 1200 - ox) * s + R.w / 2;
        ctx.moveTo(bx, sy); ctx.lineTo(bx + 14 * s, sy); ctx.lineTo(bx + 200 * s, sy + yp * s * 0.5); ctx.lineTo(bx + 186 * s, sy + yp * s * 0.5); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function wall(x, cam, pal, left) {
    const viewH = R.h / R.scale, y0 = cam.y - viewH / 2 - 40, y1 = Math.min(400, cam.y + viewH / 2 + 40);
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(x, y0, 400, y1 - y0);
    const ex = left ? x + 400 : x;
    ctx.fillStyle = '#1d1d22'; ctx.fillRect(left ? ex - 10 : ex, y0, 10, y1 - y0);
    ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.5; ctx.fillRect(left ? ex - 2 : ex, y0, 2, y1 - y0); ctx.globalAlpha = 1;
    // 높이 눈금 (10m 간격)
    const step = 10 * C.UNIT_PER_M;
    ctx.font = `700 18px ${FONT}`; ctx.textAlign = left ? 'right' : 'left';
    for (let m = Math.ceil(-y1 / step); m <= Math.floor(-y0 / step); m++) {
      if (m <= 0) continue; const y = -m * step;
      ctx.fillStyle = '#34343c'; ctx.fillRect(left ? ex - 46 : ex + 10, y - 1, 36, 2);
      if (left) { ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.textAlign = 'left'; ctx.fillText(m * 10 + 'm', ex + 10, y - 6); ctx.fillRect(ex, y - 1, 60, 2); }
    }
  }

  function platform(r, pal, time) {
    const { x, y, w, h } = r;
    if (r.kind === 'ground') {
      ctx.fillStyle = '#101013'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#26262c'; ctx.fillRect(x, y, w, 6);
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.6; ctx.fillRect(x, y, w, 2); ctx.globalAlpha = 1;
      return;
    }
    if (r.type === 'ice') {
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#d8f1ff'); g.addColorStop(0.25, '#7fb9e0'); g.addColorStop(1, '#2d5f8a');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x, y, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = 14; i < w - 20; i += 46) { ctx.beginPath(); ctx.moveTo(x + i, y + 6); ctx.lineTo(x + i + 16, y + 6); ctx.lineTo(x + i + 6, y + h - 6); ctx.lineTo(x + i - 10, y + h - 6); ctx.fill(); }
      ctx.fillStyle = '#9fd0ee';
      for (let i = 8; i < w - 8; i += 22) { const l = 6 + hash(r.route * 31 + i) * 20; ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 10, y + h); ctx.lineTo(x + i + 5, y + h + l); ctx.fill(); }
      return;
    }
    if (r.type === 'bounce') {
      r.squash = Math.max(0, r.squash - 0.06);
      const k = r.squash * 10;
      ctx.fillStyle = '#17171b'; ctx.fillRect(x, y + 10, w, h - 10);
      ctx.strokeStyle = '#6d6d78'; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 12; i < w; i += 24) { ctx.moveTo(x + i - 6, y + 10); ctx.lineTo(x + i + 6, y + 5 + k / 2); ctx.lineTo(x + i - 6, y + 5 + k / 2); }
      ctx.stroke();
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x - 3, y + k, w + 6, 6);
      ctx.fillStyle = '#1a1205';
      for (let i = 6; i < w; i += 20) { ctx.beginPath(); ctx.moveTo(x + i, y + k + 6); ctx.lineTo(x + i + 6, y + k); ctx.lineTo(x + i + 10, y + k); ctx.lineTo(x + i + 4, y + k + 6); ctx.fill(); }
      return;
    }
    // 강철 빔
    if (r.type === 'move') {
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x + 14, y); ctx.lineTo(x + w / 2, y - 220); ctx.lineTo(x + w - 14, y); ctx.moveTo(x + w / 2, y - 220); ctx.lineTo(x + w / 2, y - 620); ctx.stroke();
    }
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#3a3a42'); g.addColorStop(0.2, '#26262c'); g.addColorStop(1, '#131316');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#0c0c0e'; ctx.fillRect(x + 6, y + 9, w - 12, h - 18);
    ctx.fillStyle = r.goal ? '#ffffff' : pal.accent; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#55555f';
    for (let i = 10; i < w - 6; i += 28) { ctx.fillRect(x + i, y + 5, 3, 3); ctx.fillRect(x + i, y + h - 7, 3, 3); }
    // 끝단 경고 줄무늬
    ctx.save(); ctx.beginPath(); ctx.rect(x, y + 3, 16, h - 3); ctx.rect(x + w - 16, y + 3, 16, h - 3); ctx.clip();
    ctx.fillStyle = r.type === 'move' ? '#ff8a4a' : '#d9a441'; ctx.globalAlpha = 0.85;
    for (let i = -h; i < w + h; i += 12) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + 6, y + h); ctx.lineTo(x + i + 6 + h, y); ctx.lineTo(x + i + h, y); ctx.fill(); }
    ctx.restore();
    if (r.type === 'move') {
      const on = Math.sin(time * 6) > 0;
      ctx.fillStyle = on ? '#ff5a2a' : '#4a1c10'; ctx.fillRect(x + w / 2 - 4, y - 8, 8, 8);
    }
    if (r.goal) goalBeacon(x + w - 60, y, time);
  }

  function goalBeacon(x, y, time) {
    ctx.fillStyle = '#24242a'; ctx.fillRect(x - 3, y - 190, 6, 190);
    ctx.strokeStyle = '#24242a'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - 22 + i * 3, y - i * 36); ctx.lineTo(x, y - i * 36 - 36); ctx.lineTo(x + 22 - i * 3, y - i * 36); ctx.stroke(); }
    const p = 0.5 + 0.5 * Math.sin(time * 3);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y - 196, 0, x, y - 196, 90);
    g.addColorStop(0, `rgba(255,70,60,${0.5 + p * 0.5})`); g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y - 196, 90, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffd0c8'; ctx.fillRect(x - 5, y - 202, 10, 10);
  }

  function crate(c, time) {
    const y = c.y + Math.sin(time * 2.4 + c.x) * 5;
    if (!c.active) { ctx.strokeStyle = 'rgba(160,200,120,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.strokeRect(c.x - 17, y - 13, 34, 26); ctx.setLineDash([]); return; }
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.x, y, 0, c.x, y, 60);
    g.addColorStop(0, 'rgba(170,220,110,0.35)'); g.addColorStop(1, 'rgba(170,220,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, y, 60, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#2f3b22'; ctx.fillRect(c.x - 19, y - 14, 38, 28);
    ctx.fillStyle = '#56703a'; ctx.fillRect(c.x - 19, y - 14, 38, 5);
    ctx.strokeStyle = '#a9d86e'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 19, y - 14, 38, 28);
    for (const dx of [-7, 5]) { ctx.fillStyle = '#b3261e'; ctx.fillRect(c.x + dx - 2, y - 4, 6, 11); ctx.fillStyle = '#d9a441'; ctx.fillRect(c.x + dx - 2, y + 7, 6, 3); }
  }

  // 2등신 캐릭터 + 산탄총
  function player(p, view) {
    const { aimX: ax, aimY: ay, kick, squash, time } = view;
    const face = ax >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(p.x, p.y + C.HH);
    const sq = 1 - squash * 0.28; ctx.scale(1 + squash * 0.22, sq);
    // 목도리 (속도 반대 방향으로 날림)
    const sx = -p.vx * 0.03 - face * 10, sy = -p.vy * 0.03 + Math.sin(time * 9) * 2;
    ctx.strokeStyle = '#c8322c'; ctx.lineWidth = 6; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(-face * 4, -19); ctx.quadraticCurveTo(-face * 12 + sx * 0.4, -20 + sy * 0.2, Math.max(-34, Math.min(34, sx)) - face * 6, -18 + Math.max(-24, Math.min(24, sy))); ctx.stroke();
    // 다리
    const air = !p.grounded;
    ctx.fillStyle = '#1b1c22';
    ctx.fillRect(-9, -9, 7, air ? 6 : 9); ctx.fillRect(2, -9, 7, air ? 7 : 9);
    ctx.fillStyle = '#0c0c0f'; ctx.fillRect(-10, air ? -4 : -3, 9, 3); ctx.fillRect(1, air ? -3 : -3, 9, 3);
    // 몸통
    ctx.fillStyle = '#d96a24'; ctx.beginPath(); ctx.moveTo(-10, -8); ctx.lineTo(-11, -20); ctx.lineTo(11, -20); ctx.lineTo(10, -8); ctx.fill();
    ctx.fillStyle = '#a84c14'; ctx.fillRect(-10, -11, 20, 3);
    ctx.fillStyle = '#c8322c'; ctx.fillRect(-9, -22, 18, 5);
    // 머리
    ctx.fillStyle = '#f0c9a4'; ctx.beginPath(); ctx.arc(0, -31, 12.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#22232b'; ctx.beginPath(); ctx.arc(0, -33, 13.5, Math.PI, 0); ctx.lineTo(13.5, -31); ctx.lineTo(-13.5, -31); ctx.fill();
    ctx.fillStyle = '#3a3c48'; ctx.fillRect(-13.5, -34, 27, 4);
    ctx.fillStyle = '#e8a23a'; ctx.fillRect(face > 0 ? 2 : -11, -35, 9, 6); // 고글
    ctx.fillStyle = '#15151a'; ctx.fillRect(face * 3 + (face > 0 ? 0 : -3), -28, 3, 4); ctx.fillRect(face * 9 + (face > 0 ? -3 : 0), -28, 3, 4);
    // 총
    ctx.translate(0, -17); ctx.rotate(Math.atan2(ay, ax));
    if (face < 0) ctx.scale(1, -1);
    ctx.translate(-kick * 9, 0);
    ctx.fillStyle = '#6b3d1e'; ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(4, -3); ctx.lineTo(4, 4); ctx.lineTo(-10, 8); ctx.lineTo(-13, 3); ctx.fill();
    ctx.fillStyle = '#2b2c33'; ctx.fillRect(3, -4, 12, 8);
    ctx.fillStyle = '#4a4c57'; ctx.fillRect(14, -4, 20, 3.4); ctx.fillRect(14, 0, 20, 3.4);
    ctx.fillStyle = '#16161a'; ctx.fillRect(32, -4.5, 3, 8.5);
    ctx.fillStyle = '#f0c9a4'; ctx.fillRect(6, 2, 6, 5); ctx.fillRect(17, 2, 6, 4);
    ctx.restore();
  }

  function aimGuide(p, view) {
    const { aimX: ax, aimY: ay } = view, ox = p.x, oy = p.y + 3;
    const ready = p.ammo > 0;
    ctx.strokeStyle = ready ? 'rgba(255,90,70,0.75)' : 'rgba(150,150,160,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]);
    ctx.beginPath(); ctx.moveTo(ox + ax * 44, oy + ay * 44); ctx.lineTo(ox + ax * 190, oy + ay * 190); ctx.stroke(); ctx.setLineDash([]);
    // 반동 방향 표시
    ctx.strokeStyle = ready ? 'rgba(255,255,255,0.6)' : 'rgba(150,150,160,0.25)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const d = 40 + i * 13, cx = ox - ax * d, cy = oy - ay * d, nx = -ay, ny = ax;
      ctx.globalAlpha = 1 - i * 0.28;
      ctx.beginPath(); ctx.moveTo(cx + ax * 6 + nx * 7, cy + ay * 6 + ny * 7); ctx.lineTo(cx, cy); ctx.lineTo(cx + ax * 6 - nx * 7, cy + ay * 6 - ny * 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  R.draw = (S) => {
    const { world, p, cam, fx, view } = S, time = view.time;
    const pal = palette(-cam.y);
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    background(cam, pal, time);
    const shx = (Math.random() - 0.5) * fx.shake, shy = (Math.random() - 0.5) * fx.shake;
    const sc = R.scale * R.dpr;
    ctx.setTransform(sc, 0, 0, sc, (R.w / 2 + shx) * R.dpr - cam.x * sc, (R.h / 2 + shy) * R.dpr - cam.y * sc);
    const vh = R.h / R.scale / 2 + 80, vw = R.w / R.scale / 2 + 80;

    // 안내 문구
    ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center';
    for (const s of SIGNS) {
      if (Math.abs(-s.h - cam.y) > vh) continue;
      ctx.fillStyle = pal.accent; ctx.globalAlpha = 0.5; ctx.fillText(s.text, s.x, -s.h);
      const tw = ctx.measureText(s.text).width; ctx.fillRect(s.x - tw / 2, -s.h + 9, tw, 2); ctx.globalAlpha = 1;
    }
    wall(-400, cam, pal, true); wall(C.WORLD_W, cam, pal, false);
    for (const r of world.plats) {
      if (r.kind === 'wall') continue;
      if (r.y > cam.y + vh || r.y + r.h < cam.y - vh - (r.type === 'move' ? 0 : 220)) { if (r.type !== 'move') continue; if (r.y < cam.y - vh) continue; }
      if (r.x > cam.x + vw || r.x + r.w < cam.x - vw) continue;
      platform(r, pal, time);
    }
    for (const c of world.crates) if (Math.abs(c.y - cam.y) < vh) crate(c, time);
    if (view.showAim) aimGuide(p, view);
    player(p, view);
    drawFx(ctx, fx);

    // 화면 고정 UI
    ctx.setTransform(R.dpr, 0, 0, R.dpr, 0, 0);
    // 빠른 낙하 시 속도선
    if (p.vy > 900) {
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.25, (p.vy - 900) / 2400)})`; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 14; i++) { const x = hash(i + Math.floor(time * 30)) * R.w, y = hash(i * 3 + Math.floor(time * 30)) * R.h; ctx.moveTo(x, y); ctx.lineTo(x, y - 90); }
      ctx.stroke();
    }
    // 진행도 막대
    const bx = R.w - 18, by = 90, bh = R.h - 180;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(bx, by, 3, bh);
    for (const z of ZONES) { const y = by + bh * (1 - z.from / world.top); ctx.fillStyle = z.accent; ctx.fillRect(bx - 4, y - 1, 11, 2); }
    const prog = Math.max(0, Math.min(1, view.height / world.top)), best = Math.max(0, Math.min(1, view.bestH / world.top));
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 6, by + bh * (1 - best) - 1, 15, 2);
    ctx.fillStyle = pal.accent; ctx.fillRect(bx, by + bh * (1 - prog), 3, bh * prog);
    ctx.fillStyle = '#fff'; ctx.fillRect(bx - 5, by + bh * (1 - prog) - 3, 13, 6);
    // 탄 표시
    const cx = R.w / 2, cy = R.h - 46;
    for (let i = 0; i < C.MAG; i++) {
      const x = cx + (i - (C.MAG - 1) / 2) * 26, on = i < p.ammo;
      ctx.fillStyle = on ? '#c8322c' : 'rgba(255,255,255,0.12)'; ctx.fillRect(x - 8, cy - 18, 16, 26);
      ctx.fillStyle = on ? '#d9a441' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x - 8, cy + 8, 16, 8);
    }
    if (p.grounded && p.ammo < C.MAG) {
      const k = Math.min(1, p.groundT / C.RELOAD_TIME);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(cx - 26, cy + 22, 52 * k, 2);
    }
    // 조준점 (마우스)
    if (view.cursor) {
      const { x, y } = view.cursor;
      ctx.strokeStyle = p.ammo > 0 ? '#ff5a46' : '#8a8a94'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 14); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    // 가장자리 어둡게
    const v = ctx.createRadialGradient(R.w / 2, R.h / 2, Math.min(R.w, R.h) * 0.45, R.w / 2, R.h / 2, Math.max(R.w, R.h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, R.w, R.h);
  };
  return R;
}
