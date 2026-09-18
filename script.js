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

/* ============================================================
   5.  TARGET PRACTICE — hidden shooting game over the portrait
       Slow-drifting shapes, each with a small red critical spot.
       Body hit = kill. Critical hit = kill + hitstop + shake.
       Drop matching .wav files in ressources/sfx/ to arm audio:
         ressources/sfx/shoot.wav     (every shot, hit or miss)
         ressources/sfx/hit.wav       (body hit)
         ressources/sfx/critical.wav  (critical / headshot)
   ============================================================ */
(function initTargetPractice() {
    const figure = document.querySelector('#about .photo');
    const canvas = figure && figure.querySelector('canvas.photo-game');
    if (!figure || !canvas || NO_MOTION) return;

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;

    function resize() {
        const r = figure.getBoundingClientRect();
        W = canvas.width  = Math.max(1, Math.round(r.width));
        H = canvas.height = Math.max(1, Math.round(r.height));
    }
    new ResizeObserver(resize).observe(figure);
    resize();

    /* ── Aim reticle (precise, no lerp — this needs to be exact) ── */
    let reticle = null;
    if (FINE_POINTER) {
        reticle = document.createElement('div');
        reticle.className = 'cursor-reticle';
        document.body.appendChild(reticle);
    }

    canvas.addEventListener('mouseenter', () => {
        document.documentElement.classList.add('is-aiming');
        if (reticle) reticle.classList.add('active');
    });
    canvas.addEventListener('mouseleave', () => {
        document.documentElement.classList.remove('is-aiming');
        if (reticle) reticle.classList.remove('active');
    });
    canvas.addEventListener('mousemove', e => {
        if (reticle) reticle.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    });

    function toLocal(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        return { x: clientX - r.left, y: clientY - r.top };
    }

    /* ── State ── */
    let shapes = [];
    let particles = [];
    let popups = [];
    let spawnAt = performance.now() + 1800;
    let hitstopUntil = 0;
    let shakeUntil = 0;
    let shakeMag = 0;

    const KINDS = ['circle', 'triangle', 'diamond'];

    function spawnShape() {
        if (shapes.length >= 3 || W < 40 || H < 40) return;
        const size = 12 + Math.random() * 7;
        const fromLeft = Math.random() < 0.5;
        const y = size * 2 + Math.random() * Math.max(1, H - size * 4);
        const x = fromLeft ? -size : W + size;
        const vx = (fromLeft ? 1 : -1) * (0.25 + Math.random() * 0.25);
        const vy = (Math.random() - 0.5) * 0.15;
        const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
        const critAngle = Math.random() * Math.PI * 2;
        const critDist = size * 0.42;
        shapes.push({
            x, y, vx, vy, size, kind, alive: true,
            angle: 0, spin: (Math.random() - 0.5) * 0.014,
            critX: Math.cos(critAngle) * critDist,
            critY: Math.sin(critAngle) * critDist,
        });
    }

    function critWorldPos(s) {
        const c = Math.cos(s.angle), sn = Math.sin(s.angle);
        return { x: s.x + s.critX * c - s.critY * sn, y: s.y + s.critX * sn + s.critY * c };
    }

    function playSfx(name) {
        try {
            const a = new Audio(`ressources/sfx/${name}.wav`);
            a.volume = 0.5;
            a.play().catch(() => {});
        } catch (e) {}
    }

    function burst(x, y, color, n, spread) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = Math.random() * spread + 0.5;
            particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, sz: Math.random() * 2.4 + 1.2, color, ring: false });
        }
    }

    function shoot(clientX, clientY) {
        const p = toLocal(clientX, clientY);
        let hit = null, critical = false;

        for (const s of shapes) {
            const c = critWorldPos(s);
            if (Math.hypot(p.x - c.x, p.y - c.y) <= 6) { hit = s; critical = true; break; }
        }
        if (!hit) {
            for (const s of shapes) {
                if (Math.hypot(p.x - s.x, p.y - s.y) <= s.size) { hit = s; break; }
            }
        }

        particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 1, sz: 1, color: 'rgba(234,229,216,0.9)', ring: true });
        playSfx('shoot');

        if (hit) {
            hit.alive = false;
            if (critical) {
                burst(hit.x, hit.y, '#a4362f', 15, 3.1);
                burst(hit.x, hit.y, '#eae5d8', 7, 2.1);
                hitstopUntil = performance.now() + 80;
                shakeUntil = performance.now() + 220;
                shakeMag = 7;
                popups.push({ x: hit.x, y: hit.y - 14, life: 1, text: 'HEADSHOT' });
                playSfx('critical');
            } else {
                burst(hit.x, hit.y, '#8f897c', 9, 2.1);
                burst(hit.x, hit.y, '#eae5d8', 4, 1.5);
                playSfx('hit');
            }
            shapes = shapes.filter(s => s.alive);
        }
    }

    canvas.addEventListener('click', e => shoot(e.clientX, e.clientY));

    function drawShape(s) {
        /* dark backing disc so the outline reads over any part of the photo */
        ctx.fillStyle = 'rgba(10,10,9,0.38)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 1.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.strokeStyle = 'rgba(234,229,216,0.75)';
        ctx.fillStyle = 'rgba(234,229,216,0.07)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (s.kind === 'circle') {
            ctx.arc(0, 0, s.size, 0, Math.PI * 2);
        } else if (s.kind === 'triangle') {
            ctx.moveTo(0, -s.size); ctx.lineTo(s.size * 0.87, s.size * 0.6); ctx.lineTo(-s.size * 0.87, s.size * 0.6); ctx.closePath();
        } else {
            ctx.moveTo(0, -s.size); ctx.lineTo(s.size, 0); ctx.lineTo(0, s.size); ctx.lineTo(-s.size, 0); ctx.closePath();
        }
        ctx.fill(); ctx.stroke();
        ctx.restore();

        const c = critWorldPos(s);
        ctx.fillStyle = '#a4362f';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        requestAnimationFrame(draw);
        const now = performance.now();
        const frozen = now < hitstopUntil;

        if (!frozen) {
            if (now >= spawnAt) { spawnShape(); spawnAt = now + 2600 + Math.random() * 3000; }
            for (const s of shapes) { s.x += s.vx; s.y += s.vy; s.angle += s.spin; }
            shapes = shapes.filter(s => s.x > -80 && s.x < W + 80);

            for (const p of particles) {
                p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.96; p.vy *= 0.96;
                p.life -= 0.035;
            }
            particles = particles.filter(p => p.life > 0);

            for (const t of popups) { t.y -= 0.4; t.life -= 0.02; }
            popups = popups.filter(t => t.life > 0);
        }

        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (now < shakeUntil) {
            const decay = (shakeUntil - now) / 220;
            figure.style.transform = `translate(${(Math.random()-0.5)*shakeMag*decay}px, ${(Math.random()-0.5)*shakeMag*decay}px)`;
        } else if (figure.style.transform) {
            figure.style.transform = '';
        }

        for (const s of shapes) drawShape(s);

        for (const p of particles) {
            ctx.globalAlpha = Math.max(p.life, 0);
            if (p.ring) {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, (1 - p.life) * 10, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - p.sz/2, p.y - p.sz/2, p.sz, p.sz);
            }
        }
        ctx.globalAlpha = 1;

        for (const t of popups) {
            ctx.globalAlpha = Math.max(t.life, 0);
            ctx.fillStyle = '#a4362f';
            ctx.font = '600 9px "IBM Plex Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
    requestAnimationFrame(draw);
})();
