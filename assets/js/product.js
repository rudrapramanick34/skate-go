/**
 * SKATE GO V2 - Product Detail Page (PDP)
 * V2 Auto-Slider, Variant Selectors, Supabase Data Sync & Related Products
 * File: assets/js/product.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('pdp-main-content');
  const crumbTitle = document.getElementById('pdp-crumb-title');
  const relatedGrid = document.getElementById('related-products-grid');

  const urlParams = new URLSearchParams(window.location.search);
  const slugParam = urlParams.get('slug');
  const idParam = urlParams.get('id');

  let product = null;

  try {
    if (slugParam) {
      if (window.dbService && typeof window.dbService.getProductBySlug === 'function') {
        const res = await window.dbService.getProductBySlug(slugParam);
        if (res && res.success && res.data) product = res.data;
      }
      if (!product && window.supabaseClient) {
        const { data } = await window.supabaseClient
          .from('products')
          .select('*, categories:category_id(*)')
          .eq('slug', slugParam)
          .single();
        if (data) product = data;
      }
    }

    if (!product && idParam && window.supabaseClient) {
      const { data } = await window.supabaseClient
        .from('products')
        .select('*, categories:category_id(*)')
        .eq('id', idParam)
        .single();
      if (data) product = data;
    }
  } catch (e) {
    console.warn('[Skate Go PDP] Supabase product query:', e);
  }

  if (!product) {
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Product Not Found</h2>
          <p>The gear you are looking for does not exist or has been removed.</p>
          <a href="shop.html" class="btn btn-primary" style="margin-top: 1rem;">Explore Catalog</a>
        </div>
      `;
    }
    if (relatedGrid && relatedGrid.parentElement) {
      relatedGrid.parentElement.style.display = 'none';
    }
    return;
  }

  // Stock calculations
  const currentStock = product.stock_quantity || 0;
  const reservedStock = product.reserved_stock || 0;
  const availableStock = Math.max(0, currentStock - reservedStock);
  const lowStockThreshold = product.low_stock_threshold || 5;

  const isOutOfStock = availableStock <= 0;
  const isLowStock = !isOutOfStock && availableStock <= lowStockThreshold;

  let stockStatusBadge = `<span class="stock-status-badge">In Stock (${availableStock} Units)</span>`;
  if (isOutOfStock) {
    stockStatusBadge = `<span class="stock-status-badge" style="background:rgba(220,38,38,0.1); color:var(--color-danger);">OUT OF STOCK</span>`;
  } else if (isLowStock) {
    stockStatusBadge = `<span class="stock-status-badge low-stock">Low Stock (${availableStock} Units Left)</span>`;
  }

  // Gallery Setup
  const galleryImages = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || 'assets/images/placeholder-gear.jpg'];

  const price = Number(product.price) || 0;
  const originalPrice = product.original_price ? Number(product.original_price) : null;
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercent = hasDiscount ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  let currentQuantity = 1;
  let selectedColor = (product.colors && product.colors.length > 0) ? product.colors[0] : null;
  let selectedSize = (product.sizes && product.sizes.length > 0) ? product.sizes[0] : null;

  document.title = `${product.title} | Skate Go`;
  if (crumbTitle) crumbTitle.textContent = product.title;

  const categoryName = product.categories ? product.categories.name : 'INLINE GEAR';

  container.innerHTML = `
    <div class="pdp-grid">
      <!-- V2 Gallery Column with Auto-Slider -->
      <div class="pdp-gallery-column">
        <div class="pdp-slider-wrapper" id="pdp-slider-wrapper">
          <div class="pdp-slides-container" id="pdp-slides-container">
            ${galleryImages.map((img, i) => `
              <div class="pdp-slide" data-slide-index="${i}">
                <img src="${img}" alt="${product.title} view ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}">
              </div>
            `).join('')}
          </div>

          ${galleryImages.length > 1 ? `
            <button class="pdp-slider-nav-btn pdp-slider-prev" id="slider-prev-btn" aria-label="Previous image">&larr;</button>
            <button class="pdp-slider-nav-btn pdp-slider-next" id="slider-next-btn" aria-label="Next image">&rarr;</button>
            <div class="pdp-dots-track" id="pdp-dots-track">
              ${galleryImages.map((_, i) => `<button class="pdp-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}
            </div>
          ` : ''}
        </div>

        ${galleryImages.length > 1 ? `
          <div class="pdp-thumbnails-strip" id="pdp-thumbnails">
            ${galleryImages.map((imgUrl, idx) => `
              <button class="thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" type="button">
                <img src="${imgUrl}" alt="thumb ${idx + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Details Column -->
      <div class="pdp-details-column">
        <div class="pdp-meta-top">
          <span class="pdp-category-badge">${categoryName}</span>
          ${product.brand ? `<span class="pdp-category-badge" style="background:var(--color-cream-warm); color:var(--color-dark);">${product.brand}</span>` : ''}
          ${stockStatusBadge}
        </div>

        <h1 class="pdp-title">${product.title}</h1>

        <div class="pdp-price-row">
          <span class="pdp-price">₹${price.toLocaleString('en-IN')}</span>
          ${hasDiscount ? `
            <span class="pdp-original-price">₹${originalPrice.toLocaleString('en-IN')}</span>
            <span class="pdp-discount-badge">${discountPercent}% OFF</span>
          ` : ''}
        </div>

        ${product.short_description ? `<p style="color:var(--color-text-secondary); font-size:0.95rem;">${product.short_description}</p>` : ''}

        <p style="color:var(--color-text-secondary); line-height:1.6;">${product.description}</p>

        <!-- Color Variant Options -->
        ${product.colors && product.colors.length > 0 ? `
          <div class="variant-section">
            <label class="variant-label">Color: <span id="selected-color-label">${selectedColor}</span></label>
            <div class="variant-options" id="color-chips-wrap">
              ${product.colors.map((color, idx) => `
                <button type="button" class="variant-chip ${idx === 0 ? 'active' : ''}" data-color="${color}">${color}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Size Variant Options -->
        ${product.sizes && product.sizes.length > 0 ? `
          <div class="variant-section">
            <label class="variant-label">Size / Fit: <span id="selected-size-label">${selectedSize}</span></label>
            <div class="variant-options" id="size-chips-wrap">
              ${product.sizes.map((size, idx) => `
                <button type="button" class="variant-chip ${idx === 0 ? 'active' : ''}" data-size="${size}">${size}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Quantity -->
        <div class="variant-section" style="${isOutOfStock ? 'opacity:0.5; pointer-events:none;' : ''}">
          <label class="variant-label">Quantity</label>
          <div class="quantity-control">
            <button id="qty-minus" class="qty-btn" type="button" ${isOutOfStock ? 'disabled' : ''}>-</button>
            <span id="qty-value" class="qty-val">1</span>
            <button id="qty-plus" class="qty-btn" type="button" ${isOutOfStock ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <!-- CTAs (Issue 5: ADD TO CART and Green BUY NOW Button) -->
        <div class="pdp-actions-grid">
          ${isOutOfStock ? `
            <button class="btn btn-outline btn-lg btn-full" disabled style="opacity:0.5; grid-column:1/-1;">OUT OF STOCK</button>
          ` : `
            <button class="btn btn-primary btn-lg" id="pdp-add-btn" type="button">+ ADD TO CART</button>
            <button class="btn btn-lg" id="pdp-buy-btn" type="button" style="background-color: #22C55E; color: #FFFFFF; font-weight: 800;">BUY NOW</button>
          `}
        </div>

        <!-- Trust Badges -->
        <div class="trust-badges-bar" style="margin-top:1rem;">
          <div class="trust-badge-card">
            <div class="trust-badge-title">100% GENUINE</div>
            <div class="trust-badge-desc">Precision inline hardware</div>
          </div>
          <div class="trust-badge-card">
            <div class="trust-badge-title">INDIA DISPATCH</div>
            <div class="trust-badge-desc">Express doorstep delivery</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Gallery Auto-Slider Logic
  initGallerySlider(galleryImages.length);

  // Variant Chip Selection
  document.querySelectorAll('#color-chips-wrap .variant-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      document.getElementById('selected-color-label').textContent = selectedColor;
      document.querySelectorAll('#color-chips-wrap .variant-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('#size-chips-wrap .variant-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSize = btn.dataset.size;
      document.getElementById('selected-size-label').textContent = selectedSize;
      document.querySelectorAll('#size-chips-wrap .variant-chip').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Quantity Modifier
  if (!isOutOfStock) {
    const qtyEl = document.getElementById('qty-value');
    document.getElementById('qty-minus')?.addEventListener('click', () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        qtyEl.textContent = currentQuantity;
      }
    });

    document.getElementById('qty-plus')?.addEventListener('click', () => {
      if (currentQuantity < availableStock) {
        currentQuantity++;
        qtyEl.textContent = currentQuantity;
      }
    });

    // Add To Cart
    document.getElementById('pdp-add-btn')?.addEventListener('click', () => {
      if (window.cartStore) {
        window.cartStore.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          quantity: currentQuantity,
          selectedColor,
          selectedSize,
          image: galleryImages[0]
        });
        showPdpToast(`Added ${product.title} to cart!`);
        if (typeof window.openCartDrawer === 'function') window.openCartDrawer();
      }
    });

    // Buy Now
    document.getElementById('pdp-buy-btn')?.addEventListener('click', () => {
      if (window.cartStore) {
        window.cartStore.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          quantity: currentQuantity,
          selectedColor,
          selectedSize,
          image: galleryImages[0]
        });
        window.location.href = 'checkout.html';
      }
    });
  }

  loadRelatedProducts(product.category_id, product.id);
});

function initGallerySlider(totalSlides) {
  if (totalSlides <= 1) return;

  let currentSlide = 0;
  let autoSlideTimer = null;
  const container = document.getElementById('pdp-slides-container');
  const dots = document.querySelectorAll('.pdp-dot');
  const thumbs = document.querySelectorAll('.thumb-btn');

  const goToSlide = (idx) => {
    currentSlide = (idx + totalSlides) % totalSlides;
    if (container) container.style.transform = `translateX(-${currentSlide * 100}%)`;

    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentSlide));
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    autoSlideTimer = setInterval(() => goToSlide(currentSlide + 1), 4000);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer) clearInterval(autoSlideTimer);
  };

  document.getElementById('slider-prev-btn')?.addEventListener('click', () => {
    goToSlide(currentSlide - 1);
    startAutoSlide();
  });

  document.getElementById('slider-next-btn')?.addEventListener('click', () => {
    goToSlide(currentSlide + 1);
    startAutoSlide();
  });

  dots.forEach(d => {
    d.addEventListener('click', () => {
      goToSlide(parseInt(d.dataset.index, 10));
      startAutoSlide();
    });
  });

  thumbs.forEach(t => {
    t.addEventListener('click', () => {
      goToSlide(parseInt(t.dataset.index, 10));
      startAutoSlide();
    });
  });

  // Touch Swipe
  const wrapper = document.getElementById('pdp-slider-wrapper');
  let startX = 0;
  wrapper?.addEventListener('touchstart', (e) => {
    stopAutoSlide();
    startX = e.touches[0].clientX;
  }, { passive: true });

  wrapper?.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) goToSlide(currentSlide + 1);
      else goToSlide(currentSlide - 1);
    }
    startAutoSlide();
  }, { passive: true });

  wrapper?.addEventListener('mouseenter', stopAutoSlide);
  wrapper?.addEventListener('mouseleave', startAutoSlide);

  startAutoSlide();
}

function showPdpToast(msg) {
  const toast = document.getElementById('pdp-toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2800);
  }
}

async function loadRelatedProducts(categoryId, currentProductId) {
  const relatedGrid = document.getElementById('related-products-grid');
  if (!relatedGrid || !window.supabaseClient) return;

  try {
    let query = window.supabaseClient
      .from('products')
      .select('*, categories:category_id(id, name, slug)')
      .eq('is_active', true)
      .neq('id', currentProductId)
      .limit(4);

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data } = await query;
    if (!data || data.length === 0) {
      if (relatedGrid.parentElement) relatedGrid.parentElement.style.display = 'none';
      return;
    }

    relatedGrid.innerHTML = data.map(p => {
      const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || 'assets/images/placeholder-gear.jpg');
      return `
        <article class="product-card">
          <a href="product.html?slug=${p.slug || ''}&id=${p.id}" class="product-card-image-wrapper">
            <img src="${img}" alt="${p.title}" loading="lazy" class="product-card-img" />
          </a>
          <div class="product-card-content">
            <h3 class="product-title"><a href="product.html?slug=${p.slug || ''}&id=${p.id}">${p.title}</a></h3>
            <div class="product-price-row">
              <span class="product-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (e) {
    if (relatedGrid.parentElement) relatedGrid.parentElement.style.display = 'none';
  }
}