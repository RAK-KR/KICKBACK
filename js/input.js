// 마우스: 움직여서 조준, 클릭으로 발사.  터치: 누른 채 끌어서 조준, 떼면 발사.
// 마우스는 포인터 잠금 상태에서 '이동량 x 감도'로 가상 조준점을 움직입니다. (잠금이 안 되는 환경은 실제 커서 위치 사용)
export function createInput(canvas, handlers) {
  const s = { x: 0, y: 0, touch: false, holding: false, has: false, sens: 1, locked: false };
  const pos = (e) => { const r = canvas.getBoundingClientRect(); s.x = e.clientX - r.left; s.y = e.clientY - r.top; s.has = true; };
  s.lock = () => { if (s.touch || !canvas.requestPointerLock) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 무시 */ } };
  s.unlock = () => { if (document.pointerLockElement === canvas) document.exitPointerLock(); };
  document.addEventListener('pointerlockchange', () => {
    s.locked = document.pointerLockElement === canvas;
    if (!s.locked) handlers.lockLost();
  });
  // 메뉴 위에 있을 때도 실제 커서 위치를 기억해 두었다가, 잠금이 걸리면 그 자리에서 조준점이 시작됩니다.
  window.addEventListener('pointermove', (e) => { if (!s.locked && e.pointerType === 'mouse' && e.target !== canvas) pos(e); });
  canvas.addEventListener('pointermove', (e) => {
    if (s.locked) {
      s.x = Math.max(0, Math.min(window.innerWidth, s.x + e.movementX * s.sens));
      s.y = Math.max(0, Math.min(window.innerHeight, s.y + e.movementY * s.sens));
      s.has = true; return;
    }
    if (e.pointerType === 'touch' && !s.holding) return; pos(e);
  });
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); if (!s.locked) pos(e);
    s.touch = e.pointerType === 'touch';
    if (s.touch) { s.holding = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ } }
    else if (e.button === 0) { if (!s.locked) s.lock(); handlers.fire(); }
  });
  const up = (e) => { if (s.touch && s.holding) { pos(e); s.holding = false; handlers.fire(); } };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { s.holding = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyP') handlers.pause();
    else if (e.code === 'KeyM') handlers.mute();
    else if (e.code === 'BracketLeft') handlers.sens(-0.1);
    else if (e.code === 'BracketRight') handlers.sens(0.1);
  });
  window.addEventListener('blur', () => handlers.blur());
  return s;
}
