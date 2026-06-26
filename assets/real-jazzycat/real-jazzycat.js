(() => {
  const SCRIPT = document.currentScript;
  const SRC = SCRIPT && SCRIPT.src ? new URL(SCRIPT.src, document.baseURI) : null;
  const ROOT = SRC ? new URL('./', SRC).href : new URL('./assets/real-jazzycat/', document.baseURI).href;
  const MANIFEST_URL = new URL('manifest.json?v=20260626d', ROOT).href;
  const REDUCED =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = `
    .real-jazzycat-layer{
      position:fixed;
      inset:0;
      z-index:8600;
      pointer-events:none;
      overflow:hidden;
    }

    .real-jazzycat-top-strip{
      position:fixed;
      left:0;
      right:0;
      top:74px;
      z-index:8650;
      display:flex;
      justify-content:center;
      align-items:flex-start;
      gap:clamp(10px,2vw,26px);
      pointer-events:none;
      padding:0 14px;
      min-height:120px;
    }

    .real-jazzycat-top-strip img{
      width:clamp(72px,8vw,132px);
      max-height:148px;
      object-fit:contain;
      opacity:0;
      filter:drop-shadow(0 12px 14px rgba(0,0,0,.55));
      transition:opacity .22s ease;
      transform-origin:50% 100%;
      animation:realJazzyCatTopFloat 3.2s ease-in-out infinite;
      will-change:transform;
    }

    .real-jazzycat-top-strip img.is-ready{opacity:.96;}
    .real-jazzycat-top-strip img:nth-child(2){animation-delay:-.7s;}
    .real-jazzycat-top-strip img:nth-child(3){animation-delay:-1.4s;}
    .real-jazzycat-top-strip img:nth-child(4){animation-delay:-2.1s;}

    .real-jazzycat{
      position:fixed;
      right:18px;
      bottom:92px;
      width:clamp(120px,13vw,210px);
      height:auto;
      max-width:32vw;
      filter:drop-shadow(0 16px 18px rgba(0,0,0,.55));
      transform-origin:50% 100%;
      animation:realJazzyCatFloat 3.8s ease-in-out infinite;
      opacity:0;
      transition:opacity .22s ease;
      user-select:none;
      -webkit-user-drag:none;
    }

    .real-jazzycat.is-ready{opacity:.98;}

    @keyframes realJazzyCatFloat{
      0%,100%{transform:translateY(0) rotate(-.8deg)}
      50%{transform:translateY(-8px) rotate(.8deg)}
    }

    @keyframes realJazzyCatTopFloat{
      0%,100%{transform:translateY(0) rotate(-.6deg)}
      50%{transform:translateY(-7px) rotate(.6deg)}
    }

    @media(max-width:680px){
      .real-jazzycat{
        width:92px;
        right:10px;
        bottom:92px;
        max-width:28vw;
      }

      .real-jazzycat-top-strip{
        top:64px;
        justify-content:space-around;
        gap:4px;
        padding:0 5px;
      }

      .real-jazzycat-top-strip img{
        width:clamp(54px,20vw,84px);
        max-height:96px;
      }
    }

    @media(prefers-reduced-motion:reduce){
      .real-jazzycat,
      .real-jazzycat-top-strip img{
        animation:none;
      }
    }
  `;

  function addStyle() {
    const oldStyle = document.getElementById('real-jazzycat-style');
    if (oldStyle) oldStyle.remove();

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
    const response = await fetch(MANIFEST_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Real JazzyCat manifest not available.');
    return response.json();
  }

  function makeLayer() {
    const old = document.querySelector('.real-jazzycat-layer');
    if (old) old.remove();

    const layer = document.createElement('div');
    layer.className = 'real-jazzycat-layer';
    layer.setAttribute('aria-hidden', 'true');

    const strip = document.createElement('div');
    strip.className = 'real-jazzycat-top-strip';

    for (let i = 0; i < 4; i += 1) {
      const topCat = document.createElement('img');
      topCat.alt = '';
      topCat.decoding = 'async';
      topCat.dataset.slotIndex = String(i);
      strip.appendChild(topCat);
    }

    layer.appendChild(strip);

    const img = document.createElement('img');
    img.className = 'real-jazzycat';
    img.alt = '';
    img.decoding = 'async';
    layer.appendChild(img);

    document.body.appendChild(layer);
    return { main: img, strip };
  }

  function uniqueFrames(manifest) {
    const seen = new Set();

    return (manifest.frames || [])
      .filter(frame => {
        if (!frame || !frame.src || seen.has(frame.src)) return false;
        seen.add(frame.src);
        return true;
      })
      .map(frame => ({
        src: new URL(
          frame.src + '?v=' + encodeURIComponent(manifest.version || Date.now()),
          ROOT
        ).href,
        durationMs: Number(frame.durationMs || 850),
        name: frame.name || ''
      }));
  }

  async function runGif(img, manifest) {
    const gifSrc = new URL(
      (manifest.optionalGif || 'jazzycat-photo-loop.gif') +
        '?v=' +
        encodeURIComponent(manifest.version || Date.now()),
      ROOT
    ).href;

    await preload(gifSrc);
    img.src = gifSrc;
    img.classList.add('is-ready');
  }

  function startCycle(img, frames, sequence, durationOffset) {
    let i = 0;

    const tick = () => {
      const frame = frames[sequence[i % sequence.length]];

      if (frame) {
        img.src = frame.src;
        img.classList.add('is-ready');
      }

      const base = frame ? frame.durationMs : 900;
      const variance = ((i % 3) - 1) * 70;
      const wait = Math.max(420, base + durationOffset + variance);

      i += 1;
      window.setTimeout(tick, REDUCED ? 3000 : wait);
    };

    tick();
  }

  async function runTopStrip(strip, manifest) {
    const frames = uniqueFrames(manifest);
    if (!frames.length) return;

    const available = [];
    for (const frame of frames) {
      try {
        await preload(frame.src);
        available.push(frame);
      } catch (_) {}
    }

    if (!available.length) return;

    const imgs = Array.from(strip.querySelectorAll('img'));

    // Each cat gets a different order, so they don't all switch together.
    const baseSequences = [
      [0, 1, 0, 3, 0, 1], // cat 1
      [1, 3, 1, 2, 1, 0], // cat 2
      [2, 1, 2, 3, 2, 1], // cat 3
      [3, 1, 0, 1, 3, 2]  // cat 4
    ].map(seq => seq.map(index => index % available.length));

    imgs.forEach((img, catIndex) => {
      const initial = available[catIndex % available.length];
      img.src = initial.src;
      img.classList.add('is-ready');

      if (!REDUCED) {
        startCycle(
          img,
          available,
          baseSequences[catIndex % baseSequences.length],
          catIndex * 90
        );
      }
    });
  }

  async function runFrames(img, manifest) {
    const frames = (manifest.frames || [])
      .filter(frame => frame && frame.src)
      .map(frame => ({
        src: new URL(
          frame.src + '?v=' + encodeURIComponent(manifest.version || Date.now()),
          ROOT
        ).href,
        durationMs: Number(frame.durationMs || 850)
      }));

    if (!frames.length) return;

    const loaded = [];
    for (const frame of frames) {
      try {
        await preload(frame.src);
        loaded.push(frame);
      } catch (_) {}
    }

    if (!loaded.length) return;

    let i = 0;
    const show = () => {
      const frame = REDUCED
        ? loaded.find(item => /center/i.test(item.src)) || loaded[0]
        : loaded[i % loaded.length];

      img.src = frame.src;
      img.classList.add('is-ready');

      if (!REDUCED) {
        i += 1;
        window.setTimeout(show, frame.durationMs);
      }
    };

    show();
  }

  async function boot() {
    try {
      const manifest = await loadManifest();
      if (!manifest || manifest.enabled === false) return;

      addStyle();
      const nodes = makeLayer();

      await runTopStrip(nodes.strip, manifest);

      if (manifest.mode === 'gif') await runGif(nodes.main, manifest);
      else await runFrames(nodes.main, manifest);
    } catch (_) {
      // Optional layer; fail silently.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
