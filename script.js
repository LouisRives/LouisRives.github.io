'use strict';

/* ── Motion preference ──────────────────────────── */
const NO_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function lerp(a, b, t) { return a + (b - a) * t; }

/* ============================================================
   1.  ABOUT SECTION
       · Flashlight fog-of-war
       · Konami code drawn on canvas, revealed only by light
       · Retro pixel torch cursor
   ============================================================ */
(function initFlashlight() {
  const section = document.getElementById('about');
  if (!section || NO_MOTION) return;

  let canvas, ctx, W, H;
  let initialized = false;

  const pos    = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const ripples = [];
  let inside = false;

  /* ── Pixel-art torch  (2px per cell, 5 cols × 10 rows) ── */
  const PX = 2;
  const TORCH = [
    [2,0,'#fff8c8'],
    [1,1,'#e8c97a'],[2,1,'#fff8c8'],[3,1,'#e8c97a'],
    [0,2,'#c9a84c'],[1,2,'#e8c97a'],[2,2,'#fff8c8'],[3,2,'#e8c97a'],[4,2,'#c9a84c'],
    [0,3,'#d4622a'],[1,3,'#c9a84c'],[2,3,'#e8c97a'],[3,3,'#c9a84c'],[4,3,'#d4622a'],
    [1,4,'#d4622a'],[2,4,'#c9a84c'],[3,4,'#d4622a'],
    [1,5,'#3a2810'],[2,5,'#4a3418'],[3,5,'#3a2810'],
    [1,6,'#3a2810'],[2,6,'#4a3418'],[3,6,'#3a2810'],
    [1,7,'#3a2810'],[2,7,'#4a3418'],[3,7,'#3a2810'],
    [1,8,'#3a2810'],[2,8,'#4a3418'],[3,8,'#3a2810'],
    [0,9,'#2a1c0a'],[1,9,'#3a2810'],[2,9,'#3a2810'],[3,9,'#3a2810'],[4,9,'#2a1c0a'],
  ];
  /* hotspot at flame tip = col 2, row 0 */
  const HOT_X = -(2 * PX);
  const HOT_Y = 0;

  function init() {
    if (initialized) return;
    initialized = true;

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
    section.style.position = 'relative';
    section.style.cursor   = 'none';
    section.prepend(canvas);

    const cont = section.querySelector('.container');
    if (cont) { cont.style.position = 'relative'; cont.style.zIndex = '1'; }

    ctx = canvas.getContext('2d');

    function resize() {
      W = canvas.width  = section.offsetWidth;
      H = canvas.height = section.offsetHeight;
      pos.x = target.x = W * 0.65;
      pos.y = target.y = H * 0.45;
    }
    new ResizeObserver(resize).observe(section);
    resize();
    requestAnimationFrame(frame);
  }

  section.addEventListener('mousemove', e => {
    init();
    const r = section.getBoundingClientRect();
    target.x = e.clientX - r.left;
    target.y = e.clientY - r.top;
    inside = true;
  }, { passive: true });

  section.addEventListener('mouseleave', () => { inside = false; });
  section.addEventListener('mouseenter', () => { inside = true; if (initialized) section.style.cursor = 'none'; });
  section.addEventListener('click', e => {
    if (!initialized) return;
    const r = section.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, life: 1 });
  });

  function frame() {
    requestAnimationFrame(frame);
    pos.x = lerp(pos.x, target.x, inside ? 0.09 : 0.02);
    pos.y = lerp(pos.y, target.y, inside ? 0.09 : 0.02);

    ctx.clearRect(0, 0, W, H);

    /* 1 — Konami text drawn first; fog will cover it away from cursor */
    ctx.save();
    ctx.globalAlpha = 0.44;
    ctx.fillStyle   = '#c9a84c';
    ctx.font        = '9px "Press Start 2P", monospace';
    ctx.textAlign   = 'center';
    ctx.fillText('\u2191  \u2191  \u2193  \u2193  \u2190  \u2192  \u2190  \u2192  B  A', W / 2, H * 0.88);
    ctx.restore();

    /* 2 — Fog of war */
    const fog = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 370);
    fog.addColorStop(0,    'rgba(11,11,16,0)');
    fog.addColorStop(0.20, 'rgba(11,11,16,0.04)');
    fog.addColorStop(0.48, 'rgba(11,11,16,0.58)');
    fog.addColorStop(1,    'rgba(11,11,16,0.92)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    /* 3 — Gold shimmer */
    const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 170);
    glow.addColorStop(0, 'rgba(201,168,76,0.16)');
    glow.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* 4 — Ripples */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += 7; rp.life -= 0.028;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(201,168,76,${(rp.life * 0.42).toFixed(2)})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* 5 — Pixel torch cursor */
    if (inside) {
      const t = Date.now();
      const flicker = 0.88 + Math.sin(t * 0.007) * 0.08 + Math.sin(t * 0.023) * 0.05;
      const tx = Math.round(pos.x) + HOT_X;
      const ty = Math.round(pos.y) + HOT_Y;

      /* glow halo around flame */
      const fg = ctx.createRadialGradient(tx + 2*PX, ty, 0, tx + 2*PX, ty, 20);
      fg.addColorStop(0, `rgba(232,201,122,${(0.32 * flicker).toFixed(2)})`);
      fg.addColorStop(1, 'rgba(232,201,122,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(tx + 2*PX - 22, ty - 22, 44, 44);

      /* torch pixels */
      for (const [col, row, color] of TORCH) {
        ctx.globalAlpha = row <= 4 ? flicker : 1;
        ctx.fillStyle   = color;
        ctx.fillRect(tx + col * PX, ty + row * PX, PX, PX);
      }
      ctx.globalAlpha = 1;
    }
  }
})();

/* ============================================================
   2.  BUTTON CLICK ANIMATIONS
   ============================================================ */
document.addEventListener('click', e => {
  if (NO_MOTION) return;
  const btn = e.target.closest('.btn, .btn-lang, .social-link');
  if (!btn) return;
  btn.style.transform  = 'scale(0.92)';
  btn.style.transition = 'transform 0.08s ease';
  setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 130);
  spawnBurst(e.clientX, e.clientY);
}, { passive: true });

function spawnBurst(cx, cy) {
  const OC = document.createElement('canvas');
  OC.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  OC.width = window.innerWidth; OC.height = window.innerHeight;
  document.body.appendChild(OC);
  const ctx = OC.getContext('2d');
  const pts = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.7;
    const s = Math.random() * 5 + 2;
    return { x: cx, y: cy, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 1.8, life: 1, sz: Math.random()*4+2 };
  });
  let raf;
  (function tick() {
    ctx.clearRect(0, 0, OC.width, OC.height);
    let alive = false;
    for (const p of pts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.22; p.life -= 0.038;
      if (p.life <= 0) continue;
      alive = true;
      ctx.globalAlpha = p.life;
      ctx.fillStyle   = p.life > 0.5 ? '#e8c97a' : '#c9a84c';
      ctx.fillRect(Math.round(p.x-p.sz/2), Math.round(p.y-p.sz/2), Math.round(p.sz), Math.round(p.sz));
    }
    ctx.globalAlpha = 1;
    if (alive) raf = requestAnimationFrame(tick);
    else { cancelAnimationFrame(raf); OC.remove(); }
  })();
}

/* ============================================================
   3.  KONAMI CODE  ↑↑↓↓←→←→BA  →  game modal
   ============================================================ */
const KONAMI = ['arrowup','arrowup','arrowdown','arrowdown',
                'arrowleft','arrowright','arrowleft','arrowright','b','a'];
let kIdx = 0;
document.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (key === KONAMI[kIdx]) { kIdx++; if (kIdx === KONAMI.length) { kIdx = 0; openModal(); } }
  else kIdx = key === KONAMI[0] ? 1 : 0;
});

const $modal = document.createElement('div');
$modal.id = 'gameModal';
$modal.innerHTML = `
  <div class="gm-backdrop"></div>
  <div class="gm-window">
    <div class="gm-titlebar">
      <span class="gm-corner">◆</span>
      <span class="gm-title">HYPER PULSAR MINI</span>
      <span class="gm-corner">◆</span>
      <button class="gm-close" id="gmClose">✕ CLOSE</button>
    </div>
    <div class="gm-body">
      <iframe id="gmIframe" frameborder="0" title="Hyper Pulsar Mini"></iframe>
    </div>
    <div class="gm-footer">
      WASD · MOVE &nbsp;|&nbsp; MOUSE · AIM &amp; SHOOT &nbsp;|&nbsp; ESC · CLOSE
    </div>
  </div>`;
document.body.appendChild($modal);

const $iframe = $modal.querySelector('#gmIframe');
let iframeLoaded = false;

function openModal() {
  $modal.classList.add('gm-active');
  document.body.style.overflow = 'hidden';
  if (!iframeLoaded) {
    const depth = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean).length;
    $iframe.src = (depth > 1 ? '../' : '') + 'game.html';
    iframeLoaded = true;
  }
}
function closeModal() { $modal.classList.remove('gm-active'); document.body.style.overflow = ''; }

document.getElementById('gmClose').addEventListener('click', closeModal);
$modal.querySelector('.gm-backdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
