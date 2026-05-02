/* ============================================================
   PORTFOLIO — script.js
   Louis Rives-Lehtinen

   1. About section flashlight / cursor effects
   2. Button click animations (game feel)
   3. Konami code  ↑↑↓↓←→←→BA  →  game modal
   ============================================================ */

'use strict';

/* ── Motion preference ──────────────────────────────────────── */
const NO_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Lerp helper ────────────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }

/* ============================================================
   1.  ABOUT SECTION  ·  Flashlight + ripple cursor effect
   ============================================================ */
(function initFlashlight() {
  const section = document.getElementById('about');
  if (!section || NO_MOTION) return;

  let canvas, ctx, W, H, ro;
  let initialized = false;

  const pos    = { x: 0, y: 0 };   // smoothed
  const target = { x: 0, y: 0 };   // raw mouse
  const ripples = [];
  let inside = false;
  let rafId  = null;

  /* --- lazy init on first mousemove --- */
  function init() {
    if (initialized) return;
    initialized = true;

    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'pointer-events:none',
      'z-index:0',
    ].join(';');

    section.style.position = 'relative';
    section.prepend(canvas);

    /* lift content above canvas */
    const cont = section.querySelector('.container');
    if (cont) { cont.style.position = 'relative'; cont.style.zIndex = '1'; }

    ctx = canvas.getContext('2d');

    function resize() {
      W = canvas.width  = section.offsetWidth;
      H = canvas.height = section.offsetHeight;
      pos.x = target.x = W * 0.65;
      pos.y = target.y = H * 0.45;
    }
    ro = new ResizeObserver(resize);
    ro.observe(section);
    resize();

    rafId = requestAnimationFrame(frame);
  }

  /* --- events --- */
  section.addEventListener('mousemove', e => {
    init();
    const r = section.getBoundingClientRect();
    target.x = e.clientX - r.left;
    target.y = e.clientY - r.top;
    inside = true;
  }, { passive: true });

  section.addEventListener('mouseleave', () => { inside = false; });
  section.addEventListener('mouseenter', () => { inside = true;  });

  section.addEventListener('click', e => {
    if (!initialized) return;
    const r = section.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, life: 1 });
  });

  /* --- render loop --- */
  function frame() {
    rafId = requestAnimationFrame(frame);

    /* smooth follow — slower when mouse left section */
    const ease = inside ? 0.075 : 0.025;
    pos.x = lerp(pos.x, target.x, ease);
    pos.y = lerp(pos.y, target.y, ease);

    ctx.clearRect(0, 0, W, H);

    /* fog-of-war overlay with flashlight hole */
    const fog = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 350);
    fog.addColorStop(0,    'rgba(11,11,16,0)');
    fog.addColorStop(0.25, 'rgba(11,11,16,0.06)');
    fog.addColorStop(0.55, 'rgba(11,11,16,0.52)');
    fog.addColorStop(1,    'rgba(11,11,16,0.82)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    /* warm gold shimmer at cursor centre */
    const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 140);
    glow.addColorStop(0, 'rgba(201,168,76,0.055)');
    glow.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* click ripples */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r    += 7;
      rp.life -= 0.03;
      if (rp.life <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(201,168,76,${(rp.life * 0.38).toFixed(2)})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
})();

/* ============================================================
   2.  BUTTON CLICK ANIMATIONS  ·  scale pulse + pixel burst
   ============================================================ */
document.addEventListener('click', e => {
  if (NO_MOTION) return;
  const btn = e.target.closest('.btn, .btn-lang, .social-link');
  if (!btn) return;

  /* quick scale pulse */
  btn.style.transform = 'scale(0.92)';
  btn.style.transition = 'transform 0.08s ease';
  setTimeout(() => {
    btn.style.transform = '';
    btn.style.transition = '';
  }, 130);

  /* pixel burst */
  spawnBurst(e.clientX, e.clientY);
}, { passive: true });

function spawnBurst(cx, cy) {
  const OC = document.createElement('canvas');
  OC.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  OC.width  = window.innerWidth;
  OC.height = window.innerHeight;
  document.body.appendChild(OC);

  const ctx = OC.getContext('2d');
  const N   = 12;
  const pts = Array.from({ length: N }, (_, i) => {
    const a  = (Math.PI * 2 / N) * i + (Math.random() - 0.5) * 0.7;
    const sp = Math.random() * 5 + 2;
    return { x: cx, y: cy, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 1.8, life: 1, sz: Math.random()*4+2 };
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
      ctx.fillRect(Math.round(p.x - p.sz/2), Math.round(p.y - p.sz/2), Math.round(p.sz), Math.round(p.sz));
    }
    ctx.globalAlpha = 1;
    if (alive) { raf = requestAnimationFrame(tick); }
    else       { cancelAnimationFrame(raf); OC.remove(); }
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
  if (key === KONAMI[kIdx]) {
    kIdx++;
    if (kIdx === KONAMI.length) { kIdx = 0; openModal(); }
  } else {
    kIdx = (key === KONAMI[0]) ? 1 : 0;
  }
});

/* ── Build modal DOM once ───────────────────────────────────── */
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
      <iframe id="gmIframe" frameborder="0" title="Hyper Pulsar Mini game"></iframe>
    </div>
    <div class="gm-footer">
      WASD · MOVE &nbsp;|&nbsp; MOUSE · AIM &amp; SHOOT &nbsp;|&nbsp; ESC · CLOSE
    </div>
  </div>`;
document.body.appendChild($modal);

const $backdrop = $modal.querySelector('.gm-backdrop');
const $iframe   = $modal.querySelector('#gmIframe');
let   iframeLoaded = false;

function openModal() {
  $modal.classList.add('gm-active');
  document.body.style.overflow = 'hidden';
  if (!iframeLoaded) {
    /* detect subfolder depth so path works from any page */
    const depth = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean).length;
    const base  = window.location.hostname === '' ? ''           /* local file */
                : depth > 1               ? '../'                /* projects/ subfolder */
                :                           '';                  /* root */
    $iframe.src = base + 'game.html';
    iframeLoaded = true;
  }
}

function closeModal() {
  $modal.classList.remove('gm-active');
  document.body.style.overflow = '';
}

document.getElementById('gmClose').addEventListener('click', closeModal);
$backdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
