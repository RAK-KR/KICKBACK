// 순수 물리. DOM을 쓰지 않으므로 Node에서도 그대로 돌릴 수 있습니다.
import { C } from './config.js';

export function createPlayer(x, y) {
  return { x, y, vx: 0, vy: 0, grounded: false, ground: null, ammo: C.MAG,
    fireCd: 0, groundT: 0, lastGroundY: y, won: false };
}

// (dx,dy) = 조준 방향 단위 벡터. 반대쪽으로 밀려납니다.
export function fire(p, dx, dy) {
  if (p.ammo <= 0 || p.fireCd > 0) return false;
  p.ammo--; p.fireCd = C.FIRE_CD; p.groundT = 0;
  p.vx -= dx * C.RECOIL; p.vy -= dy * C.RECOIL;
  if (p.grounded) {
    if (p.vy < -1) { p.grounded = false; p.ground = null; }
    else p.vy = 0;
  }
  const sp = Math.hypot(p.vx, p.vy);
  if (sp > C.MAX_SPEED) { p.vx *= C.MAX_SPEED / sp; p.vy *= C.MAX_SPEED / sp; }
  return true;
}

export function updatePlatforms(world, dt) {
  world.t += dt;
  for (const r of world.plats) {
    if (r.type !== 'move') continue;
    const s = Math.sin(world.t * Math.PI * 2 / r.per);
    const nx = r.bx + r.ax * s, ny = r.by + r.ay * s;
    r.dx = nx - r.x; r.dy = ny - r.y; r.x = nx; r.y = ny;
  }
  for (const c of world.crates) {
    if (!c.active) { c.timer -= dt; if (c.timer <= 0) c.active = true; }
  }
}

const hit = (p, r) => p.x + C.HW > r.x && p.x - C.HW < r.x + r.w && p.y + C.HH > r.y && p.y - C.HH < r.y + r.h;

export function stepPlayer(world, p, dt, ev) {
  const wasGrounded = p.grounded, prevGround = p.ground;
  if (p.fireCd > 0) p.fireCd -= dt;
  if (wasGrounded && prevGround && prevGround.type === 'move') { p.x += prevGround.dx; p.y += prevGround.dy; }

  // 마찰
  if (wasGrounded) {
    const f = prevGround && prevGround.type === 'ice' ? C.ICE_FRICTION : C.FRICTION;
    p.vx *= Math.exp(-f * dt);
    if (Math.abs(p.vx) < 6 && f > 1) p.vx = 0;
  } else p.vx *= Math.exp(-C.AIR_DRAG * dt);
  p.vy += C.GRAVITY * dt;
  if (p.vy > C.MAX_SPEED) p.vy = C.MAX_SPEED;

  // 가로 이동
  const ox = p.x;
  p.x += p.vx * dt;
  for (const r of world.plats) {
    if (!hit(p, r)) continue;
    const left = ox < r.x + r.w / 2;
    p.x = left ? r.x - C.HW : r.x + r.w + C.HW;
    const sp = Math.abs(p.vx);
    if ((left && p.vx > 0) || (!left && p.vx < 0)) {
      p.vx = sp > 70 ? -p.vx * C.WALL_REST : 0;
      if (sp > 120 && ev) ev.push({ t: 'bump', v: sp, x: left ? r.x : r.x + r.w, y: p.y });
    }
  }

  // 세로 이동
  p.grounded = false; p.ground = null;
  p.y += p.vy * dt;
  for (const r of world.plats) {
    if (!hit(p, r)) continue;
    if (p.vy >= 0) {
      p.y = r.y - C.HH;
      if (r.type === 'bounce' && p.vy > 60) {
        p.vy = -C.BOUNCE_V; r.squash = 1;
        if (ev) ev.push({ t: 'bounce', x: p.x, y: r.y });
        continue;
      }
      if (!wasGrounded && ev) ev.push({ t: 'land', v: p.vy, x: p.x, y: r.y, ice: r.type === 'ice' });
      p.vy = 0; p.grounded = true; p.ground = r;
    } else {
      p.y = r.y + r.h + C.HH;
      if (p.vy < -150 && ev) ev.push({ t: 'bump', v: -p.vy, x: p.x, y: r.y + r.h });
      p.vy = 0;
    }
  }

  // 탄약 상자
  for (const c of world.crates) {
    if (!c.active) continue;
    if (Math.hypot(c.x - p.x, c.y - p.y) < C.CRATE_R) {
      c.active = false; c.timer = C.CRATE_RESPAWN; p.ammo = C.MAG; p.fireCd = 0;
      if (ev) ev.push({ t: 'pickup', x: c.x, y: c.y });
    }
  }

  // 착지 처리: 재장전, 추락 기록, 골
  if (p.grounded) {
    if (!wasGrounded) {
      const drop = p.y - p.lastGroundY;
      if (drop > C.FALL_NOTICE && ev) ev.push({ t: 'fall', d: drop, x: p.x, y: p.y });
      p.lastGroundY = p.y; p.groundT = 0;
    }
    p.groundT += dt;
    if (p.ammo < C.MAG && p.groundT >= C.RELOAD_TIME) {
      p.ammo = C.MAG;
      if (ev) ev.push({ t: 'reload', x: p.x, y: p.y });
    }
    if (p.ground.goal && !p.won) { p.won = true; if (ev) ev.push({ t: 'goal' }); }
  }
}
