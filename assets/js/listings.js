// assets/js/listings.js
(() => {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  const parseBool = (v) => {
    if (!v) return false;
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'y' || s === '1';
  };
  const clamp = (n, min, max) => Math.min(Math.max(Number(n) || 0, min), max);

  const slugify = (s) =>
    String(s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');

  const getCollection = () => {
    const el = document.querySelector('main[data-collection]');
    return (el?.dataset?.collection || 'all').toLowerCase();
  };

  // Lightweight client-side thumb sync (no API key): try Etsy's oEmbed endpoint.
  // If Etsy blocks CORS in a user's browser, we fall back to whatever images are in the table.
  const oembedCache = new Map();
  const fetchOembed = async (listingUrl) => {
    const key = String(listingUrl || '');
    if (!key) return null;
    if (oembedCache.has(key)) return oembedCache.get(key);
    const p = fetch(`https://www.etsy.com/oembed?url=${encodeURIComponent(key)}&format=json`, {
      cache: 'force-cache'
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null);
    oembedCache.set(key, p);
    return p;
  };

  const placeholderDataUri =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0b0b0b"/>
            <stop offset="1" stop-color="#1a0f17"/>
          </linearGradient>
        </defs>
        <rect width="800" height="800" fill="url(#g)"/>
        <circle cx="400" cy="360" r="160" fill="#2a1b25"/>
        <path d="M320 520h160" stroke="#c9a8b8" stroke-width="18" stroke-linecap="round" opacity=".8"/>
        <text x="400" y="675" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, Roboto" font-size="42" fill="#c9a8b8" opacity=".9">Astro's Dungeon</text>
      </svg>
    `);

  const resolveImages = (name, imagesCell) => {
    const slug = slugify(name);
    const base = `images/products/${slug}/`;
    const parts = (imagesCell || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // IMPORTANT: if nothing is specified, we do *not* guess a local path.
    // We'll try Etsy oEmbed for a thumbnail and otherwise fall back to a placeholder.
    if (parts.length === 0) return [placeholderDataUri];

    return parts.map((p) => {
      // Absolute / special cases
      if (/^(https?:)?\/\//i.test(p) || p.startsWith('data:')) return p;

      // If caller already included a full site-relative path, keep it
      if (p.startsWith('images/')) return p;

      // If they provided a subpath like "notebook/1.png", treat it as under images/products/
      if (p.includes('/')) return `images/products/${p}`;

      // Otherwise assume it's a filename inside images/products/<slug>/
      return base + p;
    });
  };

  const rowToItem = (tr) => {
    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    // Schema: Name | URL | Price | Sale Price | Description | Type | Images
    const [name, url, priceRaw, saleRaw, desc, type, imagesRaw] = tds;
    const price = Number(priceRaw);
    const salePrice = saleRaw ? Number(saleRaw) : null;
    const onSale = Number.isFinite(salePrice) && salePrice > 0 && salePrice < price;
    const pct = onSale ? clamp(Math.round((1 - salePrice / price) * 100), 0, 95) : 0;
    const images = resolveImages(name, imagesRaw);

    return {
      name,
      url,
      price,
      desc,
      type: (type || '').toLowerCase(),
      onSale,
      pct,
      salePrice,
      images
    };
  };

  const priceHTML = (item) => item.onSale
    ? `<div class="price">
         <span class="was">${fmt.format(item.price)}</span>
         <span class="now">${fmt.format(item.salePrice)}</span>
       </div>`
    : `<div class="price"><span class="now">${fmt.format(item.price)}</span></div>`;

  const badgeHTML = (item) => item.onSale
    ? `<span class="badge off">-${item.pct}%</span>`
    : '';

  const cardHTML = (item) => {
    const hasMulti = item.images.length > 1;
    return `
      <article class="card product" role="link" tabindex="0" data-url="${item.url || ''}" data-index="0" data-count="${item.images.length}">
        <div class="thumb">
          <img src="${item.images[0]}" alt="${item.name}">
          ${badgeHTML(item)}
          ${hasMulti ? `
            <button class="img-nav prev" type="button" aria-label="Previous image">‹</button>
            <button class="img-nav next" type="button" aria-label="Next image">›</button>
            <span class="img-idx">1/${item.images.length}</span>
          ` : ``}
        </div>
        <h3>${item.name}</h3>
        ${priceHTML(item)}
        <p>${item.desc}</p>
        <script type="application/json" class="images-json">${JSON.stringify(item.images)}</script>
      </article>
    `;
  };

  const shouldInclude = (item, collection) => {
    if (collection === 'all') return true;
    if (collection === 'sale') return item.onSale;
    return item.type === collection;
  };

  const updateThumb = (card, idx) => {
    const imgs = JSON.parse(card.querySelector('.images-json').textContent);
    const img = card.querySelector('.thumb img');
    const badge = card.querySelector('.img-idx');
    const count = imgs.length;
    const next = ((idx % count) + count) % count;
    card.dataset.index = String(next);
    img.src = imgs[next];
    if (badge) badge.textContent = `${next + 1}/${count}`;
  };

  const attachCarousel = (root) => {
    // Event delegation for all cards
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.img-nav');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.product');
      if (!card) return;
      const dir = btn.classList.contains('next') ? 1 : -1;
      const idx = Number(card.dataset.index || 0) + dir;
      updateThumb(card, idx);
    }, false);

    // Card click-through to Etsy (Share & Save links live in data-url)
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.product');
      if (!card) return;
      // ignore clicks on carousel buttons (handled above)
      if (e.target.closest('.img-nav')) return;
      const url = card.dataset.url;
      if (url) window.open(url, '_blank', 'noopener');
    }, false);

    // Keyboard: Enter/Space opens the listing
    root.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.product');
      if (!card) return;
      const url = card.dataset.url;
      if (!url) return;
      e.preventDefault();
      window.open(url, '_blank', 'noopener');
    }, false);
  };

  const hydrateEtsyThumbs = async (root) => {
    const cards = Array.from(root.querySelectorAll('.product[data-url]'));
    await Promise.all(cards.map(async (card) => {
      const url = card.dataset.url;
      if (!url) return;

      // If the first image is already a real URL (not our placeholder data-uri), leave it.
      const img = card.querySelector('.thumb img');
      const jsonEl = card.querySelector('.images-json');
      if (!img || !jsonEl) return;

      const current = img.getAttribute('src') || '';
      const isPlaceholder = current.startsWith('data:image/svg+xml');

      const data = await fetchOembed(url);
      const thumb = data?.thumbnail_url;
      if (!thumb) return;

      // Swap primary image with Etsy thumb, keep carousel working
      const imgs = JSON.parse(jsonEl.textContent || '[]');
      if (Array.isArray(imgs) && imgs.length) {
        imgs[0] = thumb;
        jsonEl.textContent = JSON.stringify(imgs);
        if (isPlaceholder) img.src = thumb;
      }
    }));
  };

  const load = async () => {
    try {
      const res = await fetch('data/listings.html', { cache: 'no-store' });
      const txt = await res.text();
      const doc = new DOMParser().parseFromString(txt, 'text/html');
      const rows = Array.from(doc.querySelectorAll('#listings tbody tr'));
      const items = rows.map(rowToItem);

      const collection = getCollection();
      const filtered = items.filter(it => shouldInclude(it, collection));

      const grid = document.querySelector('.cards');
      if (!grid) return;
      grid.innerHTML = filtered.map(cardHTML).join('');
      attachCarousel(grid);
      hydrateEtsyThumbs(grid);

      // === Grain control: mark low-res thumbs to avoid aggressive upscaling ===
      const thumbs = document.querySelectorAll('.product .thumb img');

      const markIfLowRes = (img) => {
        const thumb = img.closest('.thumb');
        if (!thumb) return;

        // Use actual rendered size for threshold, respect HiDPI (cap at 2x)
        const rect = thumb.getBoundingClientRect();
        const previewW = rect?.width || 350;
        const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        const threshold = Math.round(previewW * dpr); // e.g., 350@1x, 700@2x

        if (img.naturalWidth && img.naturalWidth < threshold) {
          thumb.classList.add('lowres'); // CSS shrinks the box to reduce grain
        }
      };

      thumbs.forEach((img) => {
        if (img.complete && img.naturalWidth) {
          markIfLowRes(img);
        } else {
          img.addEventListener('load', () => markIfLowRes(img), { once: true });
        }
      });
      // === end grain control ===

    } catch (e) {
      console.error('Failed to load listings:', e);
    }
  };

  if (document.querySelector('.cards')) load();
})();
