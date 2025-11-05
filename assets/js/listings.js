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

  const resolveImages = (name, imagesCell) => {
    const slug = slugify(name);
    const base = `images/products/${slug}/`;
    const parts = (imagesCell || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (parts.length === 0) return [`${base}1.png`]; // default guess
    return parts.map(p => (p.includes('/') ? p : base + p));
  };

  const rowToItem = (tr) => {
    const tds = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    const [name, priceRaw, desc, type, saleRaw, offRaw, imagesRaw] = tds;
    const price = Number(priceRaw);
    const onSale = parseBool(saleRaw);
    const pct = onSale ? clamp(offRaw, 0, 95) : 0;
    const salePrice = onSale ? Math.round(price * (1 - pct / 100) * 100) / 100 : null;
    const images = resolveImages(name, imagesRaw);

    return {
      name,
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
      <article class="card product" data-index="0" data-count="${item.images.length}">
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
      const card = btn.closest('.product');
      if (!card) return;
      const dir = btn.classList.contains('next') ? 1 : -1;
      const idx = Number(card.dataset.index || 0) + dir;
      updateThumb(card, idx);
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
      attachCarousel(grid);

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
