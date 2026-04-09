(() => {
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  const root = document.querySelector(".giveaway-page");
  const mount = document.getElementById("giveaway-card");

  if (!root || !mount) return;

  const CONFIG = {
    listingsUrl: "/data/listings.html",
    fallbackItem: (root.dataset.defaultItem || "").trim(),
    streamUrl: (root.dataset.streamUrl || "").trim(),
  };

  // ---------------------------
  // OPTIONAL MANUAL GIVEAWAY OVERRIDE
  // Uncomment this block when you want to feature an item
  // that is NOT in /data/listings.html.
  // Set url: "" if it is not for sale.
  // ---------------------------
const MANUAL_GIVEAWAY_ITEM = null; /*comment out if using manual giveaway below*/
    /*
  const MANUAL_GIVEAWAY_ITEM = {
    title: "Mystery Prize Box",
    url: "", // leave blank for non-sale / unlisted giveaway items
    price: null, // or 20.00 if you want a price shown
    salePrice: null,
    images: [
      "/images/giveaway/mystery-box-1.jpg",
      "/images/giveaway/mystery-box-2.jpg"
    ],
    desc: "A special stream-only giveaway item that is not listed in the shop.",
    category: "giveaway"
  };
  */
  
  const slugify = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

  const clamp = (n, min, max) =>
    Math.min(Math.max(Number(n) || 0, min), max);

  const splitCSV = (cell) =>
    String(cell || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const parseMoney = (v) => {
    const s = String(v || "").trim();
    if (!s) return null;
    const n = Number(s.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const escapeHTML = (s) =>
    String(s || "").replace(/[&<>"']/g, (c) => {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });

  const resolveImages = (title, imagesCell) => {
    const parts = splitCSV(imagesCell);
    if (parts.length) return parts;

    const slug = slugify(title);
    return [`/images/products/${slug}/1.png`, "/images/logo.png"];
  };

  const rowToItem = (tr) => {
    const tds = Array.from(tr.querySelectorAll("td")).map((td) =>
      td.textContent.trim()
    );

    // schema:
    // 0 category, 1 title, 2 share_url, 3 price, 4 sale_price, 5 images, 6 description
    const [categoryRaw, title, shareUrlRaw, priceRaw, saleRaw, imagesRaw, descRaw] =
      tds;

    const category = String(categoryRaw || "").toLowerCase();
    const url = String(shareUrlRaw || "").trim();
    const price = parseMoney(priceRaw);
    const salePrice = parseMoney(saleRaw);
    const images = resolveImages(title, imagesRaw);
    const desc = String(descRaw || "").trim();

    const onSale =
      salePrice != null && price != null && salePrice < price;
    const pct = onSale
      ? clamp(Math.round(((price - salePrice) / price) * 100), 1, 95)
      : 0;

    return {
      category,
      title,
      slug: slugify(title),
      url,
      price,
      salePrice,
      onSale,
      pct,
      images,
      desc,
    };
  };

  const getRequestedItem = () => {
    const params = new URLSearchParams(window.location.search);

    return {
      item:
        params.get("item") ||
        params.get("slug") ||
        params.get("listing") ||
        "",
      title: params.get("title") || "",
      url: params.get("url") || "",
    };
  };

  const matchesRequest = (item, req) => {
    if (req.item && item.slug === slugify(req.item)) return true;
    if (req.title && item.title.toLowerCase() === req.title.toLowerCase()) return true;
    if (req.url && item.url === req.url) return true;
    return false;
  };

  const priceHTML = (item) => {
    if (item.price == null) return "";

    if (item.onSale) {
      return `
        <div class="giveaway-price" aria-label="Price">
          <span class="was">${fmt.format(item.price)}</span>
          <span class="now">${fmt.format(item.salePrice)}</span>
          <span class="off">-${item.pct}% off</span>
        </div>
      `;
    }

    return `
      <div class="giveaway-price" aria-label="Price">
        <span class="now">${fmt.format(item.price)}</span>
      </div>
    `;
  };

  const renderError = (message) => {
    mount.setAttribute("aria-busy", "false");
    mount.innerHTML = `
      <div class="giveaway-error">
        <h2>Couldn’t load the giveaway item</h2>
        <p>${escapeHTML(message)}</p>
        <p><a href="/">Go back home</a></p>
      </div>
    `;
  };

  const renderItem = (item) => {
    const safeTitle = escapeHTML(item.title);
    const safeDesc = escapeHTML(item.desc);
    const hasMultiple = item.images.length > 1;

    mount.innerHTML = `
      <div class="giveaway-grid">
        <div class="giveaway-media">
          <div class="giveaway-stage">
            <img
              id="giveaway-image"
              src="${escapeHTML(item.images[0])}"
              alt="${safeTitle}"
            />
            ${
              hasMultiple
                ? `
                  <button class="giveaway-nav prev" type="button" aria-label="Previous image">‹</button>
                  <button class="giveaway-nav next" type="button" aria-label="Next image">›</button>
                  <span class="giveaway-count" id="giveaway-count">1/${item.images.length}</span>
                `
                : ""
            }
          </div>

          ${
            hasMultiple
              ? `
                <div class="giveaway-thumbs" id="giveaway-thumbs">
                  ${item.images
                    .map(
                      (src, i) => `
                        <button
                          class="giveaway-thumb ${i === 0 ? "is-active" : ""}"
                          type="button"
                          data-index="${i}"
                          aria-label="Show image ${i + 1}"
                        >
                          <img src="${escapeHTML(src)}" alt="" />
                        </button>
                      `
                    )
                    .join("")}
                </div>
              `
              : ""
          }
        </div>

        <div class="giveaway-copy">
          <span class="giveaway-pill">Featured giveaway item</span>

          <h2 class="giveaway-item-title">${safeTitle}</h2>

          ${priceHTML(item)}

          ${
            safeDesc
              ? `<p class="giveaway-desc">${safeDesc}</p>`
              : `<p class="giveaway-desc">This item is currently being featured on stream.</p>`
          }
          
          <div class="giveaway-actions">
            ${
              item.url
                ? `<a class="giveaway-cta" href="${escapeHTML(
                    item.url
                  )}" target="_blank" rel="noopener">View on Etsy</a>`
                : ""
            }
            ${
              CONFIG.streamUrl
                ? `<a class="giveaway-cta" href="${escapeHTML(
                    CONFIG.streamUrl
                  )}" target="_blank" rel="noopener">Watch stream</a>`
                : ""
            }
          </div>    
        </div>
      </div>
    `;

    mount.setAttribute("aria-busy", "false");

    if (hasMultiple) {
      bindGallery(item.images);
    }
  };

  const bindGallery = (images) => {
    const stageImg = document.getElementById("giveaway-image");
    const count = document.getElementById("giveaway-count");
    const thumbs = Array.from(document.querySelectorAll(".giveaway-thumb"));
    const prev = document.querySelector(".giveaway-nav.prev");
    const next = document.querySelector(".giveaway-nav.next");

    let index = 0;

    const update = (nextIndex) => {
      index = ((nextIndex % images.length) + images.length) % images.length;
      stageImg.src = images[index];

      if (count) {
        count.textContent = `${index + 1}/${images.length}`;
      }

      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle("is-active", i === index);
      });
    };

    prev?.addEventListener("click", () => update(index - 1));
    next?.addEventListener("click", () => update(index + 1));

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        update(Number(thumb.dataset.index || 0));
      });
    });
  };

    const normalizeManualItem = (item) => {
    const price = item?.price ?? null;
    const salePrice = item?.salePrice ?? null;
    const onSale =
      salePrice != null && price != null && salePrice < price;

    const pct = onSale
      ? clamp(Math.round(((price - salePrice) / price) * 100), 1, 95)
      : 0;

    return {
      category: String(item?.category || "giveaway").toLowerCase(),
      title: String(item?.title || "Giveaway Item").trim(),
      slug: slugify(item?.title || "giveaway-item"),
      url: String(item?.url || "").trim(),
      price,
      salePrice,
      onSale,
      pct,
      images:
        Array.isArray(item?.images) && item.images.length
          ? item.images
          : ["/images/logo.png"],
      desc: String(item?.desc || "").trim(),
    };
  };
  
  const load = async () => {
    try {
      if (MANUAL_GIVEAWAY_ITEM) {
        renderItem(normalizeManualItem(MANUAL_GIVEAWAY_ITEM));
        return;
      }
      const res = await fetch(CONFIG.listingsUrl, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Listings request failed with ${res.status}`);
      }

      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const rows = Array.from(doc.querySelectorAll("#listings tbody tr"));
      const items = rows.map(rowToItem).filter((item) => item.url && item.title);

      if (!items.length) {
        throw new Error("No valid listing rows were found.");
      }

      const req = getRequestedItem();

      const chosen =
        items.find((item) => matchesRequest(item, req)) ||
        items.find((item) => item.slug === slugify(CONFIG.fallbackItem)) ||
        items[0];

      renderItem(chosen);
    } catch (err) {
      console.error("Giveaway page failed:", err);
      renderError(err?.message || "Unknown error");
    }
  };

  load();
})();
