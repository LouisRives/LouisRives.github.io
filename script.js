'use strict';

const NO_MOTION    = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
function lerp(a, b, t) { return a + (b - a) * t; }

/* ============================================================
   1.  CUSTOM CURSOR — reticle (desktop, fine-pointer only)
   ============================================================ */
(function initCursor() {
    if (NO_MOTION || !FINE_POINTER) return;

    document.documentElement.classList.add('has-custom-cursor');

    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.append(ring, dot);

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const pos    = { x: target.x, y: target.y };

    window.addEventListener('mousemove', e => {
        target.x = e.clientX;
        target.y = e.clientY;
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    }, { passive: true });

    function frame() {
        pos.x = lerp(pos.x, target.x, 0.18);
        pos.y = lerp(pos.y, target.y, 0.18);
        ring.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    document.addEventListener('mousedown', () => { ring.style.width = ring.style.height = '14px'; });
    document.addEventListener('mouseup',   () => { ring.style.width = ring.style.height = '22px'; });
})();

/* ============================================================
   2.  ABOUT SECTION — cursor-reveal scan
       A hidden monospace line only becomes legible inside a
       tight lit radius around the cursor. The cursor mark
       itself is handled by the global reticle above — this
       canvas only does the fog + hidden text + click ripples.
   ============================================================ */
(function initScanReveal() {
    const section = document.getElementById('about');
    if (!section || NO_MOTION) return;

    let canvas, ctx, W, H;
    let initialized = false;

    const pos    = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const ripples = [];
    let inside = false;

    function init() {
        if (initialized) return;
        initialized = true;

        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2;';
        section.style.position = 'relative';
        section.appendChild(canvas);

        ctx = canvas.getContext('2d');

        function resize() {
            W = canvas.width  = section.offsetWidth;
            H = canvas.height = section.offsetHeight;
            pos.x = target.x = W * 0.68;
            pos.y = target.y = H * 0.5;
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
    section.addEventListener('mouseenter', () => { inside = true; });
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

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#c7c1b4';
        ctx.font = '11px "IBM Plex Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u2191 \u2191 \u2193 \u2193 \u2190 \u2192 \u2190 \u2192 B A', W / 2, H * 0.92);
        ctx.restore();

        const fog = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 190);
        fog.addColorStop(0,    'rgba(10,10,9,0)');
        fog.addColorStop(0.30, 'rgba(10,10,9,0.10)');
        fog.addColorStop(0.65, 'rgba(10,10,9,0.74)');
        fog.addColorStop(1,    'rgba(10,10,9,1)');
        ctx.fillStyle = fog;
        ctx.fillRect(0, 0, W, H);

        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 85);
        glow.addColorStop(0, 'rgba(164,54,47,0.10)');
        glow.addColorStop(1, 'rgba(164,54,47,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        for (let i = ripples.length - 1; i >= 0; i--) {
            const rp = ripples[i];
            rp.r += 7; rp.life -= 0.028;
            if (rp.life <= 0) { ripples.splice(i, 1); continue; }
            ctx.strokeStyle = `rgba(164,54,47,${(rp.life * 0.4).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
})();

/* ============================================================
   3.  BUTTON CLICK FEEDBACK — hitstop
       A hard, non-eased brightness snap, not a particle burst.
       Ties directly to the "hitstop" game-feel technique.
   ============================================================ */
document.addEventListener('click', e => {
    if (NO_MOTION) return;
    const el = e.target.closest('.btn, .btn-lang, .social-link, .link-arrow');
    if (!el) return;
    el.classList.remove('is-hit');
    void el.offsetWidth; /* restart animation */
    el.classList.add('is-hit');
}, { passive: true });

/* ============================================================
   4.  KONAMI CODE  ↑↑↓↓←→←→BA  →  game modal
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
      <span class="gm-corner">//</span>
      <span class="gm-title">HYPER PULSAR MINI</span>
      <span class="gm-corner">//</span>
      <button class="gm-close" id="gmClose">X CLOSE</button>
    </div>
    <div class="gm-body">
      <iframe id="gmIframe" frameborder="0" title="Hyper Pulsar Mini"></iframe>
    </div>
    <div class="gm-footer">
      WASD / ZQSD &middot; MOVE &nbsp;|&nbsp; MOUSE &middot; AIM &amp; SHOOT &nbsp;|&nbsp; ESC &middot; CLOSE
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
