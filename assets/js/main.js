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

  // ------------------------------------------------
  // Show focus ring only when navigating by keyboard
  // ------------------------------------------------
  const onFirstTab = (e) => {
    if (e.key === 'Tab') {
      document.documentElement.classList.add('user-is-tabbing');
      window.removeEventListener('keydown', onFirstTab);
    }
  };
  window.addEventListener('keydown', onFirstTab);
  window.addEventListener('mousedown', () =>
    document.documentElement.classList.remove('user-is-tabbing')
  );

  // ---------------------------
  // Home landing interactions
  // ---------------------------
  if (document.body.classList.contains('home')) {
    const yes = document.querySelector('.arcade-btn.yes');
    const run = document.querySelector('.arcade-btn.run');

    if (yes && run) {
      const buttons = [yes, run];

      // Ensure they’re focusable and focus the first one
      buttons.forEach((b) => b.setAttribute('tabindex', '0'));
      buttons[0].focus();

      // Keyboard controls
      window.addEventListener('keydown', (e) => {
        const tag = (e.target.tagName || '').toLowerCase();
        // Don’t hijack typing inside inputs/textareas/selects
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        const key = e.key.toLowerCase();

        // Quick shortcuts anywhere on the page
        if (key === 'y') { yes.click(); return; }
        if (key === 'r') { run.click(); return; }

        // Only do left/right navigation if a button has focus
        const focusedIsButton = document.activeElement?.classList?.contains('arcade-btn');
        if (!focusedIsButton) return;

        if (key === 'arrowright' || key === 'd') {
          e.preventDefault();
          const idx = buttons.indexOf(document.activeElement);
          buttons[(idx + 1) % buttons.length].focus();
        } else if (key === 'arrowleft' || key === 'a') {
          e.preventDefault();
          const idx = buttons.indexOf(document.activeElement);
          buttons[(idx - 1 + buttons.length) % buttons.length].focus();
        } else if (key === 'enter') {
          e.preventDefault();
          document.activeElement.click();
        }
      });

      // Pointer press feedback (adds/removes .pressed class)
      const press = (e) => e.currentTarget.classList.add('pressed');
      const release = (e) => e.currentTarget.classList.remove('pressed');
      buttons.forEach((b) => {
        b.addEventListener('pointerdown', press);
        b.addEventListener('pointerup', release);
        b.addEventListener('pointerleave', release);
        b.addEventListener('blur', release);
      });
    }
  }

  // ---------------------------
  // Prevent image dragging ghost
  // ---------------------------
  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') e.preventDefault();
  });
})();
