(() => {
  const ROOT = './assets/real-jazzycat/';
  const MANIFEST_URL = ROOT + 'manifest.json?v=20260626a';
  const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const css = `
    .real-jazzycat-layer{
      position:fixed;
      inset:0;
      z-index:8600;
      pointer-events:none;
      overflow:hidden;
    }
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
    @media(max-width:680px){
      .real-jazzycat{
        width:92px;
        right:10px;
        bottom:92px;
        max-width:28vw;
      }
    }
    @media(prefers-reduced-motion:reduce){
      .real-jazzycat{animation:none;}
    }
  `;

  function addStyle() {
    const style = document.createElement('style');
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
    const layer = document.createElement('div');
    layer.className = 'real-jazzycat-layer';
    layer.setAttribute('aria-hidden', 'true');
    const img = document.createElement('img');
    img.className = 'real-jazzycat';
    img.alt = '';
    img.decoding = 'async';
    layer.appendChild(img);
    document.body.appendChild(layer);
    return img;
  }

  async function runGif(img, manifest) {
    const gifSrc = ROOT + (manifest.optionalGif || 'jazzycat-photo-loop.gif') + '?v=' + encodeURIComponent(manifest.version || Date.now());
    await preload(gifSrc);
    img.src = gifSrc;
    img.classList.add('is-ready');
  }

  async function runFrames(img, manifest) {
    const frames = (manifest.frames || [])
      .filter(frame => frame && frame.src)
      .map(frame => ({
        src: ROOT + frame.src + '?v=' + encodeURIComponent(manifest.version || Date.now()),
        durationMs: Number(frame.durationMs || 850)
      }));

    if (!frames.length) return;

    const loaded = [];
    for (const frame of frames) {
      try {
        await preload(frame.src);
        loaded.push(frame);
      } catch (_) {
        // Missing drop-in assets should fail silently instead of showing a broken image.
      }
    }

    if (!loaded.length) return;

    let i = 0;
    const show = () => {
      const frame = REDUCED ? (loaded.find(item => /center/i.test(item.src)) || loaded[0]) : loaded[i % loaded.length];
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
      const img = makeLayer();
      if (manifest.mode === 'gif') await runGif(img, manifest);
      else await runFrames(img, manifest);
    } catch (_) {
      // Counterpart layer is optional; never block the real JazzyCat app.
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
