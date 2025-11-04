// assets/js/main.js
(() => {
  // ---------------------------
  // Mobile 100vh fix via --vh
  // ---------------------------
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  setVh();
  window.addEventListener('resize', setVh, { passive: true });
  window.addEventListener('orientationchange', setVh, { passive: true });
  window.addEventListener('pageshow', setVh); // bfcache return

  // ---------------------------
  // Preload key images
  // ---------------------------
  const preload = (src) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve(src);
      img.src = src;
    });

  const preloadAll = async () => {
    const paths = [
      'images/logo.png',
      'images/etd.png',
      'images/yes.png',
      'images/run.png',
    ];
    await Promise.all(paths.map(preload));
    document.documentElement.classList.add('images-ready');
  };
  preloadAll();

  // ---------------------------
  // Home landing interactions (no keyboard shortcuts)
  // ---------------------------
  if (document.body.classList.contains('home')) {
    const yes = document.querySelector('.arcade-btn.yes');
    const run = document.querySelector('.arcade-btn.run');

    // Pointer press feedback (adds/removes .pressed class)
    [yes, run].filter(Boolean).forEach((b) => {
      const press = () => b.classList.add('pressed');
      const release = () => b.classList.remove('pressed');
      b.addEventListener('pointerdown', press);
      b.addEventListener('pointerup', release);
      b.addEventListener('pointerleave', release);
      b.addEventListener('blur', release);
    });
  }

  // ---------------------------
  // Prevent image dragging ghost
  // ---------------------------
  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });
})();
