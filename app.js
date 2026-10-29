'use strict';

const $ = (id) => document.getElementById(id);

const DEFAULTS = {
  N: 200,
  m: 2,
  colorMode: 'indice',   // 'indice' | 'longitud' | 'solido'
  color: '#38bdf8',
  hue: 190,
  alpha: 0.5,
  lineWidth: 1,
  bg: '#0b1020',
  showCircle: true,
  showPoints: true,
  showNumbers: false,
  speed: 0.1,            // unidades de m por segundo
};

const LIMITS = { N_MIN: 2, N_MAX: 10000 };
const STORAGE_KEY = 'circunferencia-modular:v1';

const state = { ...DEFAULTS, ...loadSaved(), playing: false };

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}
function persist() {
  try {
    const { playing, ...rest } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch { /* sin almacenamiento: no pasa nada */ }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v) => String(Number(v.toFixed(3)));

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------

/**
 * Dibuja la circunferencia de multiplicación en un contexto de `size` x `size` px.
 * El destino de cada punto se calcula como ángulo continuo (sin redondear),
 * así los valores decimales de m se ven suaves.
 */
function draw(ctx, size, s, opts = {}) {
  const { N, m } = s;
  const r = size * 0.44;
  const k = size / 800; // escala grosores y textos al tamaño del lienzo
  // Punto 0 a la izquierda, numeración en sentido horario
  const ang = (t) => Math.PI + (2 * Math.PI * t) / N;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (opts.transparent) {
    ctx.clearRect(0, 0, size, size);
  } else {
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.translate(size / 2, size / 2);
  ctx.lineCap = 'round';

  if (s.showCircle) {
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2 * k;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  // Cada línea se traza por separado para que la opacidad se acumule
  // donde se cruzan muchas: eso es lo que hace brillar la envolvente.
  ctx.globalAlpha = s.alpha;
  ctx.lineWidth = s.lineWidth * k;
  ctx.strokeStyle = s.color;
  for (let i = 0; i < N; i++) {
    const a = ang(i);
    const b = ang(i * m);
    if (s.colorMode !== 'solido') {
      const t = s.colorMode === 'indice'
        ? i / N
        : Math.abs(Math.sin((b - a) / 2)); // longitud relativa de la cuerda (0..1)
      ctx.strokeStyle = `hsl(${(s.hue + t * 300) % 360}, 90%, 62%)`;
    }
    ctx.beginPath();
    ctx.moveTo(r * Math.cos(a), r * Math.sin(a));
    ctx.lineTo(r * Math.cos(b), r * Math.sin(b));
    ctx.stroke();
  }

  if (s.showPoints && N <= 2000) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#cbd5e1';
    const pr = clamp(300 / N, 0.8, 4) * k;
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      ctx.beginPath();
      ctx.arc(r * Math.cos(a), r * Math.sin(a), pr, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  if (s.showNumbers && N <= 100) {
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${clamp(600 / N, 9, 16) * k}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rt = r + 18 * k;
    for (let i = 0; i < N; i++) {
      const a = ang(i);
      ctx.fillText(String(i), rt * Math.cos(a), rt * Math.sin(a));
    }
  }
  ctx.restore();

  if (opts.label) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `600 ${22 * k}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`N = ${N}   ·   m = ${fmt(m)}`, 24 * k, size - 22 * k);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Lienzo en pantalla
// ---------------------------------------------------------------------------

const canvas = $('lienzo');
const ctx = canvas.getContext('2d');
const stage = $('stage');

function resize() {
  const cs = getComputedStyle(stage);
  const w = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const css = Math.max(100, Math.floor(Math.min(w, h)));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = canvas.style.height = `${css}px`;
  canvas.width = canvas.height = Math.round(css * dpr);
  requestRender();
}
new ResizeObserver(resize).observe(stage);

let pending = false;
function requestRender() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    draw(ctx, canvas.width, state);
    updateHud();
  });
}

function updateHud() {
  const { N, m } = state;
  let extra = '';
  if (Number.isInteger(m) && m >= 2 && m < N / 2) {
    extra = m === 2 ? ' · cardioide' : m === 3 ? ' · nefroide' : ` · ${m - 1} lóbulos`;
  }
  $('hud').textContent = `N = ${N} · m = ${fmt(m)}${extra}`;
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------

const inputs = {
  nNum: $('N-num'), nRange: $('N-range'),
  mNum: $('m-num'), mRange: $('m-range'),
};

/** Refleja el estado en los controles, sin tocar el que el usuario está escribiendo. */
function syncInputs() {
  const active = document.activeElement;
  const put = (el, v) => { if (el !== active) el.value = v; };
  put(inputs.nNum, state.N);
  put(inputs.nRange, Math.min(state.N, +inputs.nRange.max));
  put(inputs.mNum, fmt(state.m));
  put(inputs.mRange, clamp(state.m, 0, +inputs.mRange.max));

  document.querySelectorAll('[data-key]').forEach((el) => {
    const v = state[el.dataset.key];
    if (el.type === 'checkbox') el.checked = v; else put(el, v);
  });
  $('row-color').hidden = state.colorMode !== 'solido';
  $('row-hue').hidden = state.colorMode === 'solido';

  document.querySelectorAll('.presets button').forEach((b) => {
    b.classList.toggle('active', +b.dataset.m === state.m);
  });
}

function setN(v) {
  v = Math.round(v);
  if (!Number.isFinite(v)) return;
  state.N = clamp(v, LIMITS.N_MIN, LIMITS.N_MAX);
  syncInputs();
  requestRender();
}

function setM(v) {
  if (!Number.isFinite(v)) return;
  state.m = Math.round(v * 1e6) / 1e6; // evita arrastrar errores como 2.0000000001
  syncInputs();
  requestRender();
}

inputs.nRange.addEventListener('input', () => { setN(+inputs.nRange.value); persist(); });
inputs.mRange.addEventListener('input', () => { setM(+inputs.mRange.value); persist(); });
// Escribir a mano: se aplica mientras escribes y se normaliza al salir del campo
inputs.nNum.addEventListener('input', () => setN(parseFloat(inputs.nNum.value)));
inputs.mNum.addEventListener('input', () => setM(parseFloat(inputs.mNum.value)));
[inputs.nNum, inputs.mNum].forEach((el) => {
  el.addEventListener('change', () => { el.blur(); syncInputs(); persist(); });
});

document.querySelectorAll('[data-dm]').forEach((b) => {
  b.addEventListener('click', () => { setM(state.m + parseFloat(b.dataset.dm)); persist(); });
});

document.querySelectorAll('.presets button').forEach((b) => {
  b.addEventListener('click', () => {
    if (b.dataset.n) setN(+b.dataset.n);
    setM(+b.dataset.m);
    persist();
  });
});

document.querySelectorAll('[data-key]').forEach((el) => {
  el.addEventListener('input', () => {
    const key = el.dataset.key;
    if (el.type === 'checkbox') state[key] = el.checked;
    else if (el.type === 'range' || el.type === 'number') state[key] = parseFloat(el.value);
    else state[key] = el.value;
    syncInputs();
    requestRender();
    persist();
  });
});

$('reset').addEventListener('click', () => {
  stop();
  Object.assign(state, DEFAULTS);
  syncInputs();
  requestRender();
  persist();
});

// ---------------------------------------------------------------------------
// Animación
// ---------------------------------------------------------------------------

let lastT = 0;
function tick(t) {
  if (!state.playing) return;
  const dt = lastT ? (t - lastT) / 1000 : 0;
  lastT = t;
  setM(state.m + state.speed * dt);
  requestAnimationFrame(tick);
}
function play() {
  state.playing = true;
  lastT = 0;
  $('play').innerHTML = '&#10073;&#10073; Pausar';
  requestAnimationFrame(tick);
}
function stop() {
  state.playing = false;
  $('play').innerHTML = '&#9654; Animar m';
  persist();
}
const togglePlay = () => (state.playing ? stop() : play());
$('play').addEventListener('click', togglePlay);

// ---------------------------------------------------------------------------
// Guardar PNG
// ---------------------------------------------------------------------------

function guardar() {
  const size = +$('export-size').value;
  const off = document.createElement('canvas');
  off.width = off.height = size;
  draw(off.getContext('2d'), size, state, {
    label: $('export-label').checked,
    transparent: $('export-transparent').checked,
  });
  off.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `circulo_N${state.N}_m${fmt(state.m)}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}
$('save').addEventListener('click', guardar);

// ---------------------------------------------------------------------------
// Teclado
// ---------------------------------------------------------------------------

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea, button')) return;
  const big = e.shiftKey;
  switch (e.key) {
    case ' ': e.preventDefault(); togglePlay(); break;
    case 'ArrowRight': e.preventDefault(); setM(state.m + (big ? 1 : 0.01)); break;
    case 'ArrowLeft': e.preventDefault(); setM(state.m - (big ? 1 : 0.01)); break;
    case 'ArrowUp': e.preventDefault(); setN(state.N + (big ? 10 : 1)); break;
    case 'ArrowDown': e.preventDefault(); setN(state.N - (big ? 10 : 1)); break;
    case 's': case 'S': guardar(); break;
    default: return;
  }
  persist();
});

syncInputs();
resize();
