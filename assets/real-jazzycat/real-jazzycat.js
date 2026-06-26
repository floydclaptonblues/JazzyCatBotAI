(() => {
  const SCRIPT = document.currentScript;
  const SRC = SCRIPT && SCRIPT.src ? new URL(SCRIPT.src, document.baseURI) : null;
  const ROOT = SRC ? new URL('./', SRC).href : new URL('./assets/real-jazzycat/', document.baseURI).href;
  const MANIFEST_URL = new URL('manifest.json?v=20260626e', ROOT).href;
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULT_MANIFEST = {
    version: '2026-06-26e',
    enabled: true,
    mode: 'frames',
    optionalGif: 'jazzycat-photo-loop.gif',
    frames: [
      { name: 'trumpet-left', src: 'jazzycat-photo-trumpet-left.png', durationMs: 700 },
      { name: 'cute-center', src: 'jazzycat-photo-center.png', durationMs: 950 },
      { name: 'trumpet-right', src: 'jazzycat-photo-trumpet-right.png', durationMs: 700 },
      { name: 'center-look-up-alt', src: 'jazzycat-photo-center-look-up-alt.png', durationMs: 950 },
      { name: 'cute-center-hold', src: 'jazzycat-photo-center.png', durationMs: 1200 }
    ]
  };

  const css = `
    .real-jazzycat-layer{position:fixed;inset:0;z-index:8600;pointer-events:none;overflow:hidden;}
    .real-jazzycat-top-strip{position:fixed;left:0;right:0;top:70px;z-index:8650;display:grid;grid-template-columns:repeat(4,minmax(58px,132px));justify-content:center;align-items:start;gap:clamp(12px,3vw,42px);padding:0 12px;pointer-events:none;}
    .real-jazzycat-top-strip img{width:100%;max-height:150px;object-fit:contain;opacity:0;filter:drop-shadow(0 12px 14px rgba(0,0,0,.58));transition:opacity .18s ease, transform .18s ease;transform-origin:50% 100%;will-change:transform;}
    .real-jazzycat-top-strip img.is-ready{opacity:.96;}
    .real-jazzycat-top-strip img.cat-a{animation:catA 3.1s ease-in-out infinite;}
    .real-jazzycat-top-strip img.cat-b{animation:catB 3.7s ease-in-out infinite -.9s;}
    .real-jazzycat-top-strip img.cat-c{animation:catC 2.9s ease-in-out infinite -1.4s;}
    .real-jazzycat-top-strip img.cat-d{animation:catD 4.2s ease-in-out infinite -2.2s;}
    .real-jazzycat{position:fixed;right:18px;bottom:92px;z-index:8660;width:clamp(120px,13vw,210px);height:auto;max-width:32vw;filter:drop-shadow(0 16px 18px rgba(0,0,0,.55));transform-origin:50% 100%;animation:realJazzyCatFloat 3.8s ease-in-out infinite;opacity:0;transition:opacity .22s ease;user-select:none;-webkit-user-drag:none;}
    .real-jazzycat.is-ready{opacity:.98;}
    @keyframes catA{0%,100%{transform:translate(-3px,0) rotate(-1.2deg)}50%{transform:translate(3px,-9px) rotate(.7deg)}}
    @keyframes catB{0%,100%{transform:translate(2px,8px) rotate(.8deg)}50%{transform:translate(-4px,-4px) rotate(-.9deg)}}
    @keyframes catC{0%,100%{transform:translate(4px,3px) rotate(-.4deg)}50%{transform:translate(-2px,-10px) rotate(1.1deg)}}
    @keyframes catD{0%,100%{transform:translate(-2px,10px) rotate(.5deg)}50%{transform:translate(4px,-3px) rotate(-1deg)}}
    @keyframes realJazzyCatFloat{0%,100%{transform:translateY(0) rotate(-.8deg)}50%{transform:translateY(-8px) rotate(.8deg)}}
    @media(max-width:680px){.real-jazzycat-top-strip{top:62px;grid-template-columns:repeat(4,minmax(44px,84px));gap:4px;padding:0 5px}.real-jazzycat{width:92px;right:10px;bottom:92px;max-width:28vw;}}
    @media(prefers-reduced-motion:reduce){.real-jazzycat,.real-jazzycat-top-strip img{animation:none;}}
  `;

  function addStyle() {
    const prior = document.getElementById('real-jazzycat-style');
    if (prior) prior.remove();
    const style = document.createElement('style');
    style.id = 'real-jazzycat-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function preload(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function loadManifest() {
    try {
      const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('Manifest not found');
      const manifest = await response.json();
      return manifest && Array.isArray(manifest.frames) ? manifest : DEFAULT_MANIFEST;
    } catch (_) {
      return DEFAULT_MANIFEST;
    }
  }

  function buildFrameList(manifest) {
    const seen = new Set();
    return (manifest.frames || DEFAULT_MANIFEST.frames)
      .filter(frame => frame && frame.src)
      .filter(frame => {
        if (seen.has(frame.src)) return false;
        seen.add(frame.src);
        return true;
      })
      .map(frame => ({
        src: new URL(frame.src + '?v=' + encodeURIComponent(manifest.version || DEFAULT_MANIFEST.version), ROOT).href,
        durationMs: Number(frame.durationMs || 850),
        name: frame.name || frame.src
      }));
  }

  async function loadFrames(manifest) {
    const loaded = [];
    for (const frame of buildFrameList(manifest)) {
      try {
        await preload(frame.src);
        loaded.push(frame);
      } catch (_) {}
    }
    return loaded;
  }

  function makeLayer() {
    const old = document.querySelector('.real-jazzycat-layer');
    if (old) old.remove();
    const layer = document.createElement('div');
    layer.className = 'real-jazzycat-layer';
    layer.setAttribute('aria-hidden', 'true');
    const strip = document.createElement('div');
    strip.className = 'real-jazzycat-top-strip';
    ['cat-a','cat-b','cat-c','cat-d'].forEach((klass, index) => {
      const img = document.createElement('img');
      img.className = klass;
      img.alt = '';
      img.decoding = 'async';
      img.dataset.slotIndex = String(index);
      strip.appendChild(img);
    });
    const main = document.createElement('img');
    main.className = 'real-jazzycat';
    main.alt = '';
    main.decoding = 'async';
    layer.appendChild(strip);
    layer.appendChild(main);
    document.body.appendChild(layer);
    return { strip, main };
  }

  function cycleImage(img, frames, sequence, offsetMs) {
    let step = 0;
    const run = () => {
      const frame = frames[sequence[step % sequence.length] % frames.length];
      if (frame) {
        img.src = frame.src;
        img.classList.add('is-ready');
      }
      step += 1;
      const wait = Math.max(420, (frame ? frame.durationMs : 850) + offsetMs + ((step % 3) - 1) * 80);
      window.setTimeout(run, REDUCED ? 3000 : wait);
    };
    run();
  }

  function runTopStrip(strip, frames) {
    if (!frames.length) return;
    const sequences = [
      [0,1,0,3,1,2],
      [1,3,1,2,0,1],
      [2,1,2,3,1,0],
      [3,1,0,1,2,3]
    ];
    Array.from(strip.querySelectorAll('img')).forEach((img, index) => {
      img.src = frames[index % frames.length].src;
      img.classList.add('is-ready');
      if (!REDUCED) cycleImage(img, frames, sequences[index % sequences.length], index * 110);
    });
  }

  function runMain(main, manifest, frames) {
    if (!frames.length) return;
    if (manifest.mode === 'gif') {
      const gifSrc = new URL((manifest.optionalGif || 'jazzycat-photo-loop.gif') + '?v=' + encodeURIComponent(manifest.version || DEFAULT_MANIFEST.version), ROOT).href;
      preload(gifSrc).then(src => { main.src = src; main.classList.add('is-ready'); }).catch(() => cycleImage(main, frames, [0,1,2,3,1], 0));
      return;
    }
    cycleImage(main, frames, [0,1,2,3,1], 0);
  }

  async function boot() {
    const manifest = await loadManifest();
    if (manifest.enabled === false) return;
    addStyle();
    const frames = await loadFrames(manifest);
    if (!frames.length) return;
    const nodes = makeLayer();
    runTopStrip(nodes.strip, frames);
    runMain(nodes.main, manifest, frames);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
