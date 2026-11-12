// 효과음은 전부 Web Audio 합성. 고음 없이 낮고 묵직하게.
let ac = null, master = null, noiseBuf = null, wind = null, muted = false;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ac = new AC();
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 6;
  master = ac.createGain(); master.gain.value = muted ? 0 : 0.8;
  master.connect(comp); comp.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 1.5, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // 바람 소리(낙하 속도에 따라 커짐)
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
  const g = ac.createGain(); g.gain.value = 0;
  src.connect(lp); lp.connect(g); g.connect(master); src.start();
  wind = { lp, g };
}
export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.02); }
export function setWind(speed, height01) {
  if (!wind) return;
  const v = Math.min(1, speed / 1400);
  wind.g.gain.setTargetAtTime(0.03 + height01 * 0.05 + v * v * 0.5, ac.currentTime, 0.08);
  wind.lp.frequency.setTargetAtTime(220 + v * 900, ac.currentTime, 0.08);
}

function noise(dur, type, f0, f1, vol, q = 0.8, delay = 0) {
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 0.8, dur + 0.05);
}
function tone(dur, wave, f0, f1, vol, delay = 0) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(); o.type = wave;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  shot() { if (!ac) return;
    noise(0.03, 'bandpass', 900, 500, 0.9, 1.2);        // 격발
    noise(0.34, 'lowpass', 2200, 180, 1.0);             // 폭음
    tone(0.3, 'sine', 120, 36, 1.0);                    // 저음 타격
    noise(0.7, 'lowpass', 500, 90, 0.22, 0.5, 0.05);    // 잔향
  },
  dry() { if (!ac) return; noise(0.04, 'bandpass', 420, 300, 0.5, 3); },
  reload() { if (!ac) return;
    noise(0.04, 'bandpass', 650, 420, 0.5, 4);
    noise(0.05, 'bandpass', 380, 260, 0.6, 4, 0.11);
    tone(0.07, 'sine', 95, 60, 0.35, 0.11);
  },
  land(v) { if (!ac) return; const k = Math.min(1, v / 1200);
    noise(0.14, 'lowpass', 260 + k * 300, 70, 0.3 + k * 0.7);
    tone(0.16, 'sine', 85, 40, 0.3 + k * 0.6);
  },
  bump(v) { if (!ac) return; const k = Math.min(1, v / 1000);
    noise(0.08, 'lowpass', 400, 120, 0.2 + k * 0.5); tone(0.08, 'sine', 100, 55, 0.2 + k * 0.4);
  },
  bounce() { if (!ac) return; tone(0.22, 'triangle', 70, 150, 0.7); noise(0.1, 'lowpass', 300, 100, 0.4); },
  pickup() { if (!ac) return; tone(0.1, 'triangle', 165, 165, 0.4); tone(0.16, 'triangle', 220, 220, 0.4, 0.08);
    noise(0.05, 'bandpass', 500, 350, 0.4, 4, 0.02); },
  fall() { if (!ac) return; tone(0.5, 'sine', 140, 45, 0.35); },
  zone() { if (!ac) return; tone(0.5, 'triangle', 98, 98, 0.3); tone(0.7, 'triangle', 147, 147, 0.25, 0.12); },
  clear() { if (!ac) return; [98, 123.5, 147, 196].forEach((f, i) => tone(1.2, 'triangle', f, f, 0.35, i * 0.14)); },
};
