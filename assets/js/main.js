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

// home-specific preloads (button.png, respawn optional)
(() => {
  const extra = ['images/button.png', 'images/respawn.png'];
  extra.forEach(src => {
    const img = new Image();
    img.src = src;
  });
})();

// --- Mobile drawer (hamburger) ---
(() => {
  const toggle   = document.querySelector('.mobile-nav-toggle');
  const drawer   = document.getElementById('mobile-drawer');
  const backdrop = document.querySelector('.mobile-drawer-backdrop');
  const mq       = window.matchMedia('(max-width: 700px)');
  let lastFocus  = null;

  const openDrawer = () => {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    drawer.removeAttribute('aria-hidden');
    backdrop?.classList.add('open');
    backdrop?.removeAttribute('hidden');
    document.body.classList.add('menu-open');
    toggle?.setAttribute('aria-expanded', 'true');
    // focus first actionable element
    const first = drawer.querySelector('a, button');
    first && first.focus();
  };

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('open');
    backdrop?.setAttribute('hidden', '');
    document.body.classList.remove('menu-open');
    toggle?.setAttribute('aria-expanded', 'false');
    lastFocus?.focus?.();
  };

  toggle?.addEventListener('click', () => {
    drawer?.classList.contains('open') ? closeDrawer() : openDrawer();
  });

  backdrop?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (e) => {
    if (e.target.closest('.drawer-close')) closeDrawer();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer();
  });

  // If user rotates or resizes to desktop, ensure drawer is closed
  mq.addEventListener?.('change', () => {
    if (!mq.matches) closeDrawer();
  });
})();
