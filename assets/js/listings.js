// assets/js/listings.js
(() => {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

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

  const splitCSV = (cell) =>
    String(cell || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const resolveImages = (title, imagesCell) => {
    const parts = splitCSV(imagesCell);
    if (parts.length) return parts;

    // Fallback: try local convention images/products/<slug>/1.png, else logo.
    const slug = slugify(title);
    return [`images/products/${slug}/1.png`, 'images/logo.png'];
  };

  const parseMoney = (v) => {
    const s = String(v || '').trim();
    if (!s) return null;
    const n = Number(s.replace(/[^0-9.\-]/g, '')); // allow "$20.00" or "20.00"
    return Number.isFinite(n) ? n : null;
  };

  const escapeHTML = (s) =>
    String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

  const rowToItem = (tr) => {
    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());

    // NEW schema (data/listings.html):
    // 0 category, 1 title, 2 share_url, 3 price, 4 sale_price, 5 images, 6 description
    const [categoryRaw, title, shareUrlRaw, priceRaw, saleRaw, imagesRaw, descRaw] = tds;

    const category = (categoryRaw || '').toLowerCase();
    const url = String(shareUrlRaw || '').trim();

    const price = parseMoney(priceRaw);
    const salePrice = parseMoney(saleRaw);

    const images = resolveImages(title, imagesRaw);
    const desc = (descRaw || '').trim();

    // On-sale is derived from the two numbers you enter
    const onSale = (salePrice != null && price != null && salePrice < price);
    const pct = onSale ? clamp(Math.round(((price - salePrice) / price) * 100), 1, 95) : 0;

    return {
      category,
      title,
      url,
      price,
      salePrice,
      onSale,
      pct,
      images,
      desc
    };
  };

  const priceHTML = (item) => {
    if (item.price == null) return '';
    if (item.onSale) {
      return `<div class="price">
        <span class="was">${fmt.format(item.price)}</span>
        <span class="now">${fmt.format(item.salePrice)}</span>
      </div>`;
    }
    return `<div class="price"><span class="now">${fmt.format(item.price)}</span></div>`;
  };

  const badgeHTML = (item) => item.onSale
    ? `<span class="badge off">-${item.pct}%</span>`
    : '';

  const descriptionHTML = (item) => {
    const d = (item.desc || '').trim();
    if (!d) return '';
    return `<p>${escapeHTML(d)}</p>`;
  };

  const cardHTML = (item) => {
    const hasMulti = item.images.length > 1;
    const safeTitle = escapeHTML(item.title);

    return `
      <article class="card product" role="link" tabindex="0"
        data-url="${escapeHTML(item.url)}"
        data-index="0" data-count="${item.images.length}">
        <div class="thumb">
          <img src="${escapeHTML(item.images[0])}" alt="${safeTitle}">
          ${badgeHTML(item)}
          ${hasMulti ? `
            <button class="img-nav prev" type="button" aria-label="Previous image">‹</button>
            <button class="img-nav next" type="button" aria-label="Next image">›</button>
            <span class="img-idx">1/${item.images.length}</span>
          ` : ``}
        </div>
        <h3>${safeTitle}</h3>
        ${priceHTML(item)}
        ${descriptionHTML(item)}
        <script type="application/json" class="images-json">${JSON.stringify(item.images)}</script>
      </article>
    `;
  };

  const shouldInclude = (item, collection) => {
    if (!item.url) return false; // don't render broken cards
    if (collection === 'all') return true;
    return item.category === collection;
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

  const attachHandlers = (root) => {
    // Carousel controls
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

    // Click-to-open (Share & Save URL)
    root.addEventListener('click', (e) => {
      const card = e.target.closest('.product');
      if (!card) return;
      if (e.target.closest('.img-nav')) return;

      const url = card.dataset.url;
      if (!url) return;

      window.open(url, '_blank', 'noopener');
    }, false);

    // Keyboard open
    root.addEventListener('keydown', (e) => {
      const card = e.target.closest?.('.product');
      if (!card) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const url = card.dataset.url;
        if (url) window.open(url, '_blank', 'noopener');
      }
    }, false);
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
      attachHandlers(grid);

      // Grain control: mark low-res thumbs to avoid aggressive upscaling
      const thumbs = document.querySelectorAll('.product .thumb img');
      const markIfLowRes = (img) => {
        const thumb = img.closest('.thumb');
        if (!thumb) return;

        const rect = thumb.getBoundingClientRect();
        const previewW = rect?.width || 350;
        const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        const threshold = Math.round(previewW * dpr);

        if (img.naturalWidth && img.naturalWidth < threshold) {
          thumb.classList.add('lowres');
        }
      };
      thumbs.forEach((img) => {
        if (img.complete && img.naturalWidth) markIfLowRes(img);
        else img.addEventListener('load', () => markIfLowRes(img), { once: true });
      });

    } catch (e) {
      console.error('Failed to load listings:', e);
    }
  };

  if (document.querySelector('.cards')) load();
})();
