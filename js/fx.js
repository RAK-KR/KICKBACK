// 파티클과 화면 흔들림
import { C } from './config.js';

export function createFx() { return { list: [], shake: 0, flash: 0 }; }
const add = (fx, o) => { if (fx.list.length < 600) fx.list.push(o); };
const rnd = (a, b) => a + Math.random() * (b - a);

export function muzzle(fx, x, y, dx, dy) {
  add(fx, { k: 'flash', x, y, dx, dy, life: 0.07, max: 0.07 });
  for (let i = 0; i < 7; i++) {
    const a = Math.atan2(dy, dx) + rnd(-0.35, 0.35), v = rnd(60, 260);
    add(fx, { k: 'smoke', x: x + dx * 10, y: y + dy * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: rnd(0.35, 0.8), max: 0.8, s: rnd(5, 11) });
  }
  for (let i = 0; i < 8; i++) {
    const a = Math.atan2(dy, dx) + rnd(-0.3, 0.3), v = rnd(400, 900);
    add(fx, { k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.06, 0.16), max: 0.16, c: '#ffd9a0' });
  }
  fx.shake = Math.max(fx.shake, 7);
}
export function tracer(fx, x1, y1, x2, y2, hitWall) {
  add(fx, { k: 'tracer', x: x1, y: y1, x2, y2, life: 0.07, max: 0.07 });
  if (hitWall) for (let i = 0; i < 4; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(80, 320);
    add(fx, { k: 'spark', x: x2, y: y2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 900, life: rnd(0.12, 0.3), max: 0.3, c: '#ffc070' });
  }
}
export function shells(fx, x, y) {
  for (let i = 0; i < C.MAG; i++) add(fx, { k: 'shell', x, y: y - 6, vx: rnd(-140, 140), vy: rnd(-330, -220), g: 1500, rot: rnd(0, 6), vr: rnd(-14, 14), life: 0.9, max: 0.9 });
}
export function dust(fx, x, y, power, color = '#b8aa98') {
  const n = 4 + Math.floor(power * 10);
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1;
    add(fx, { k: 'dust', x: x + rnd(-8, 8), y: y - 2, vx: dir * rnd(40, 220) * (0.5 + power), vy: rnd(-90, -10), life: rnd(0.25, 0.6), max: 0.6, s: rnd(4, 9), c: color });
  }
  fx.shake = Math.max(fx.shake, power * 12);
}
export function burst(fx, x, y, color) {
  for (let i = 0; i < 14; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(120, 380);
    add(fx, { k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, life: rnd(0.2, 0.45), max: 0.45, c: color });
  }
}
export function text(fx, x, y, str, color) { add(fx, { k: 'text', x, y, vx: 0, vy: -40, life: 1.6, max: 1.6, str, c: color }); }

export function updateFx(fx, dt) {
  fx.shake *= Math.exp(-14 * dt); if (fx.shake < 0.1) fx.shake = 0;
  const L = fx.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const p = L[i]; p.life -= dt;
    if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
    if (p.vx !== undefined) {
      if (p.g) p.vy += p.g * dt;
      if (p.k === 'smoke' || p.k === 'dust') { p.vx *= Math.exp(-4 * dt); p.vy *= Math.exp(-4 * dt); p.s += 14 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
  }
}

export function drawFx(ctx, fx) {
  for (const p of fx.list) {
    const a = Math.max(0, p.life / p.max);
    switch (p.k) {
      case 'flash': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.dy, p.dx));
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(10, 0, 0, 10, 0, 70);
        g.addColorStop(0, `rgba(255,236,190,${a})`); g.addColorStop(0.4, `rgba(255,150,50,${a * 0.6})`); g.addColorStop(1, 'rgba(255,90,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(10, 0, 70, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,245,220,${a})`;
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(58, -16); ctx.lineTo(40, -3); ctx.lineTo(78, 0); ctx.lineTo(40, 3); ctx.lineTo(58, 16); ctx.lineTo(0, 5); ctx.fill();
        ctx.restore(); break;
      }
      case 'tracer':
        ctx.strokeStyle = `rgba(255,225,170,${a * 0.7})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); break;
      case 'spark':
        ctx.strokeStyle = p.c; ctx.globalAlpha = a; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025); ctx.stroke(); ctx.globalAlpha = 1; break;
      case 'smoke':
        ctx.fillStyle = `rgba(190,185,180,${a * 0.28})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); break;
      case 'dust':
        ctx.globalAlpha = a * 0.4; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; break;
      case 'shell':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, a * 3);
        ctx.fillStyle = '#b3261e'; ctx.fillRect(-5, -2.5, 7, 5); ctx.fillStyle = '#d9a441'; ctx.fillRect(2, -2.5, 3, 5);
        ctx.restore(); ctx.globalAlpha = 1; break;
      case 'text':
        ctx.globalAlpha = Math.min(1, a * 2); ctx.fillStyle = p.c; ctx.font = '700 22px Bahnschrift, "DIN Alternate", "Noto Sans KR", sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(p.str, p.x, p.y); ctx.globalAlpha = 1; break;
    }
  }
}
