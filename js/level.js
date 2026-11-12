// 맵 데이터. h = 발판 윗면의 높이(바닥에서 위로), x = 왼쪽 끝, w = 폭.
// type: solid | ice | bounce | move   (move: ax/ay 진폭, per 주기)
import { C } from './config.js';

export const ZONES = [
  { name: '하역장',   from: 0,    sky: ['#17120e', '#261c14'], accent: '#e8a23a', sil: '#0e0b08' },
  { name: '배관 구역', from: 1250, sky: ['#0d1614', '#17302b'], accent: '#49c9a4', sil: '#08100e' },
  { name: '냉각탑',   from: 2620, sky: ['#0c1420', '#1c3350'], accent: '#8fd4ff', sil: '#070c14' },
  { name: '크레인',   from: 3980, sky: ['#1d1626', '#6a3a3c'], accent: '#ff8a4a', sil: '#120d18' },
  { name: '정상',     from: 5560, sky: ['#05070f', '#18203c'], accent: '#ff4d4d', sil: '#04050a' },
];

// 메인 루트 순서대로 적습니다. (검증 도구가 이 순서로 도달 가능 여부를 확인)
const P = [
  // 1구역: 하역장
  { x: 340, w: 520, h: 85 },
  { x: 900, w: 300, h: 180 },
  { x: 1130, w: 270, h: 280 },
  { x: 760, w: 260, h: 385 },
  { x: 380, w: 280, h: 490 },
  { x: 60, w: 240, h: 600 },
  { x: 330, w: 200, h: 760 },
  { x: 640, w: 220, h: 900 },
  { x: 960, w: 300, h: 1060 },
  // 2구역: 배관
  { x: 1200, w: 160, h: 1250 },
  { x: 820, w: 150, h: 1500 },
  { x: 480, w: 140, h: 1640 },
  { x: 150, w: 160, h: 1800 },
  { x: 0, w: 130, h: 2010 },
  { x: 330, w: 130, h: 2180 },
  { x: 650, w: 120, h: 2330 },
  { x: 980, w: 160, h: 2500 },
  // 3구역: 냉각탑
  { x: 1160, w: 240, h: 2700, type: 'ice' },
  { x: 780, w: 210, h: 2860, type: 'ice' },
  { x: 420, w: 170, h: 3010 },
  { x: 60, w: 220, h: 3180, type: 'ice' },
  { x: 350, w: 180, h: 3380, type: 'ice' },
  { x: 700, w: 130, h: 3540 },
  { x: 990, w: 210, h: 3700, type: 'ice' },
  { x: 1250, w: 150, h: 3900 },
  // 4구역: 크레인
  { x: 880, w: 170, h: 4080, type: 'move', ax: 150, per: 4.5 },
  { x: 480, w: 150, h: 4260 },
  { x: 130, w: 170, h: 4430, type: 'move', ay: 80, per: 3.5 },
  { x: 600, w: 140, h: 4760 },
  { x: 950, w: 160, h: 4930, type: 'move', ax: 170, per: 5 },
  { x: 1250, w: 150, h: 5120 },
  { x: 840, w: 140, h: 5300, type: 'move', ax: 120, per: 4 },
  { x: 470, w: 170, h: 5480 },
  // 5구역: 정상
  { x: 200, w: 120, h: 5600, type: 'bounce' },
  { x: 20, w: 120, h: 5950 },
  { x: 820, w: 130, h: 6340 },
  { x: 1160, w: 170, h: 6540 },
  { x: 900, w: 110, h: 6700, type: 'bounce' },
  { x: 560, w: 110, h: 7020 },
  { x: 120, w: 300, h: 7300, goal: true },
];

// 공중 탄약 상자: 닿으면 즉시 재장전
const CRATES = [
  { x: 420, h: 4660 },
  { x: 380, h: 6130 }, { x: 640, h: 6300 },
  { x: 400, h: 7200 },
];

// 벽면 안내 문구
export const SIGNS = [
  { x: 1130, h: 40, text: '조준하고 발사 - 반대쪽으로 날아갑니다' },
  { x: 1050, h: 300, text: '탄은 2발. 착지하면 재장전' },
  { x: 430, h: 690, text: '공중에서 한 발 더' },
  { x: 700, h: 2760, text: '얼음은 미끄럽습니다' },
  { x: 420, h: 4600, text: '탄약 상자 = 공중 재장전' },
  { x: 260, h: 5540, text: '스프링' },
];

export function buildWorld() {
  const top = 7300;
  const plats = [];
  // 바닥, 좌우 벽
  plats.push({ x: -400, y: 0, w: C.WORLD_W + 800, h: 400, type: 'solid', kind: 'ground' });
  plats.push({ x: -400, y: -(top + 3000), w: 400, h: top + 3400, type: 'solid', kind: 'wall' });
  plats.push({ x: C.WORLD_W, y: -(top + 3000), w: 400, h: top + 3400, type: 'solid', kind: 'wall' });
  P.forEach((p, i) => {
    plats.push({
      x: p.x, y: -p.h, w: p.w, h: p.th || 26, type: p.type || 'solid', kind: 'plat',
      bx: p.x, by: -p.h, ax: p.ax || 0, ay: p.ay || 0, per: p.per || 1,
      dx: 0, dy: 0, goal: !!p.goal, route: i, squash: 0,
    });
  });
  const crates = CRATES.map(c => ({ x: c.x, y: -c.h, active: true, timer: 0 }));
  const goal = plats.find(p => p.goal);
  return { t: 0, plats, crates, goal, top, spawn: { x: 250, y: -C.HH } };
}

export function zoneAt(height) {
  let z = 0;
  for (let i = 0; i < ZONES.length; i++) if (height >= ZONES[i].from) z = i;
  return z;
}
