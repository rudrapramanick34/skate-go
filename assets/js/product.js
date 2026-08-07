/**
 * Skate Go - Product Detail Page (PDP)
 * Module 05 & Module 10 Integration - Product Specifications, Variant Handling, Policies & Related Gear
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
    // 1. Fetch by Slug if provided
    if (slugParam) {
      if (window.dbService && typeof window.dbService.getProductBySlug === 'function') {
        const res = await window.dbService.getProductBySlug(slugParam);
        if (res && res.success && res.data) {
          product = res.data;
        }
      }
      
      // Fallback directly to Supabase client if window.dbService is still initializing or omitted method
      if (!product && window.supabaseClient) {
        const { data } = await window.supabaseClient
          .from('products')
          .select('*, categories:category_id(*)')
          .eq('slug', slugParam)
          .single();
        if (data) product = data;
      }
    }

    // 2. Fetch by ID if slug parameter was absent or didn't return a record
    if (!product && idParam) {
      if (window.supabaseClient) {
        const { data } = await window.supabaseClient
          .from('products')
          .select('*, categories:category_id(*)')
          .eq('id', idParam)
          .single();
        if (data) product = data;
      }
    }
  } catch (e) {
    console.warn('Supabase product query warning:', e);
  }

  if (!product) {
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem;">
          <h2>Product Not Found</h2>
          <p>The product you are looking for does not exist or has been removed.</p>
          <a href="shop.html" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Back to Categories</a>
        </div>
      `;
    }
    if (relatedGrid && relatedGrid.parentElement) {
      relatedGrid.parentElement.style.display = 'none';
    }
    return;
  }

  // Inventory & Stock Calculations
  const currentStock = product.stock_quantity || 0;
  const reservedStock = product.reserved_stock || 0;
  const availableStock = Math.max(0, currentStock - reservedStock);
  const lowStockThreshold = product.low_stock_threshold || 5;

  const isOutOfStock = availableStock <= 0;
  const isLowStock = !isOutOfStock && availableStock <= lowStockThreshold;

  let stockStatusBadge = `<span class="stock-status-badge">In Stock (${availableStock} Available)</span>`;
  if (isOutOfStock) {
    stockStatusBadge = `<span class="stock-status-badge" style="background:#7F1D1D; color:#FCA5A5;">OUT OF STOCK</span>`;
  } else if (isLowStock) {
    stockStatusBadge = `<span class="stock-status-badge low-stock">Low Stock (Only ${availableStock} Left!)</span>`;
  }

  // Gallery Images Setup
  const galleryImages = (Array.isArray(product.images) && product.images.length > 0)
    ? product.images
    : [product.image || 'assets/images/placeholder-gear.jpg'];

  // Price & Discount Calculations
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
      <!-- Gallery Column -->
      <div class="pdp-gallery-column">
        <div class="pdp-main-image-wrap" id="pdp-main-image-wrap">
          <img id="pdp-main-image" src="${galleryImages[0]}" alt="${product.title}">
        </div>

        ${galleryImages.length > 1 ? `
          <div class="pdp-thumbnails-strip" id="pdp-thumbnails">
            ${galleryImages.map((imgUrl, idx) => `
              <button class="thumb-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" type="button">
                <img src="${imgUrl}" alt="thumbnail ${idx + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Details Column -->
      <div class="pdp-details-column">
        <div class="pdp-meta-top">
          <span class="pdp-category-badge">${categoryName}</span>
          ${product.brand ? `<span class="pdp-brand-badge" style="background:rgba(255,255,255,0.08); padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; margin-left:0.4rem;">${product.brand}</span>` : ''}
          ${stockStatusBadge}
        </div>

        <h1 class="pdp-title">${product.title}</h1>

        <div class="pdp-price-row">
          <span class="pdp-price">₹${price.toLocaleString('en-IN')}</span>
          ${hasDiscount ? `
            <span class="pdp-original-price" style="text-decoration: line-through; color: #888; margin-left: 0.5rem; font-size: 1.1rem;">₹${originalPrice.toLocaleString('en-IN')}</span>
            <span class="pdp-discount-badge" style="color: #22c55e; font-weight: 600; margin-left: 0.5rem; font-size: 0.95rem;">(${discountPercent}% OFF)</span>
          ` : ''}
          <span class="tax-inclusive-tag">Inc. of all taxes</span>
        </div>

        ${product.short_description ? `<p class="pdp-short-desc" style="color:#aaa; font-size:0.95rem; margin-bottom:1rem;">${product.short_description}</p>` : ''}

        <p class="pdp-description">${product.description}</p>

        <!-- Technical Specifications Box -->
        ${(product.brand || product.weight || product.categories) ? `
          <div class="pdp-specs-box" style="margin: 1.5rem 0; padding: 1rem; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <h4 style="margin-bottom: 0.5rem; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; color: #aaa;">Technical Specifications</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; font-size: 0.9rem;">
              ${product.brand ? `<div><strong>Brand:</strong> ${product.brand}</div>` : ''}
              ${product.weight ? `<div><strong>Weight:</strong> ${product.weight}</div>` : ''}
              <div><strong>Category:</strong> ${categoryName}</div>
              <div><strong>Quality:</strong> Authentic Skate Go India</div>
            </div>
          </div>
        ` : ''}

        <!-- Color Options -->
        ${product.colors && product.colors.length > 0 ? `
          <div class="variant-section">
            <label class="variant-label">Color Option: <span id="selected-color-name">${selectedColor}</span></label>
            <div class="variant-options" id="color-options-wrap">
              ${product.colors.map((color, idx) => `
                <button type="button" class="variant-chip ${idx === 0 ? 'active' : ''}" data-color="${color}">${color}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Size Options -->
        ${product.sizes && product.sizes.length > 0 ? `
          <div class="variant-section">
            <label class="variant-label">Size / Spec: <span id="selected-size-name">${selectedSize}</span></label>
            <div class="variant-options" id="size-options-wrap">
              ${product.sizes.map((size, idx) => `
                <button type="button" class="variant-chip ${idx === 0 ? 'active' : ''}" data-size="${size}">${size}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Quantity Control -->
        <div class="quantity-section" style="${isOutOfStock ? 'opacity:0.5; pointer-events:none;' : ''}">
          <label class="variant-label">Quantity</label>
          <div class="quantity-control">
            <button id="qty-minus" class="qty-btn" type="button" ${isOutOfStock ? 'disabled' : ''}>-</button>
            <span id="qty-value" class="qty-val">1</span>
            <button id="qty-plus" class="qty-btn" type="button" ${isOutOfStock ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <!-- Call to Actions -->
        <div class="pdp-actions-grid">
          ${isOutOfStock ? `
            <button class="btn btn-primary btn-lg" disabled style="opacity:0.5; cursor:not-allowed; background:#444; border-color:#444; grid-column: 1 / -1;">
              OUT OF STOCK
            </button>
          ` : `
            <button class="btn btn-primary btn-lg" id="pdp-add-btn" type="button">ADD TO CART</button>
            <button class="btn btn-buy-now btn-lg" id="pdp-buy-now-btn" type="button">BUY NOW</button>
          `}
        </div>

        <!-- Order & Return Policy Section -->
        <div class="pdp-policy-section" style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
          <h3 style="font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1rem; color: #fff;">Order & Return Policy</h3>
          <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.75rem; font-size: 0.88rem; color: #ccc;">
            <li style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e; flex-shrink: 0;"><path d="M5 12l5 5L20 7"></path></svg>
              <span><strong>Fast Dispatch:</strong> Orders processed within 24-48 hours with door-to-door tracking.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e; flex-shrink: 0;"><path d="M5 12l5 5L20 7"></path></svg>
              <span><strong>7-Day Replacement:</strong> Hassel-free replacements for size exchanges or factory defects.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e; flex-shrink: 0;"><path d="M5 12l5 5L20 7"></path></svg>
              <span><strong>100% Authentic:</strong> Directly imported high-performance skating equipment.</span>
            </li>
            <li style="display: flex; align-items: center; gap: 0.6rem;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #22c55e; flex-shrink: 0;"><path d="M5 12l5 5L20 7"></path></svg>
              <span><strong>Secure Checkout:</strong> Encrypted payments via Instant UPI, Advance COD, & Cards.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Gallery Thumbnails Click Handler
  const mainImage = document.getElementById('pdp-main-image');
  document.querySelectorAll('.thumb-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'), 10);
      if (mainImage && galleryImages[idx]) {
        mainImage.src = galleryImages[idx];
      }
      document.querySelectorAll('.thumb-btn').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Color Selector Click Handler
  const colorNameLabel = document.getElementById('selected-color-name');
  document.querySelectorAll('#color-options-wrap .variant-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const colorVal = btn.getAttribute('data-color');
      selectedColor = colorVal;
      if (colorNameLabel) colorNameLabel.textContent = colorVal;
      document.querySelectorAll('#color-options-wrap .variant-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Size Selector Click Handler
  const sizeNameLabel = document.getElementById('selected-size-name');
  document.querySelectorAll('#size-options-wrap .variant-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const sizeVal = btn.getAttribute('data-size');
      selectedSize = sizeVal;
      if (sizeNameLabel) sizeNameLabel.textContent = sizeVal;
      document.querySelectorAll('#size-options-wrap .variant-chip').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  if (!isOutOfStock) {
    // Quantity Control Handlers
    const qtyVal = document.getElementById('qty-value');
    document.getElementById('qty-minus')?.addEventListener('click', () => {
      if (currentQuantity > 1) {
        currentQuantity--;
        if (qtyVal) qtyVal.textContent = currentQuantity;
      }
    });

    document.getElementById('qty-plus')?.addEventListener('click', () => {
      if (currentQuantity < availableStock) {
        currentQuantity++;
        if (qtyVal) qtyVal.textContent = currentQuantity;
      }
    });

    // Toast Helper
    const showToast = (message) => {
      const toast = document.getElementById('pdp-toast');
      if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    };

    // Add To Cart Click Handler
    document.getElementById('pdp-add-btn')?.addEventListener('click', () => {
      if (window.cartStore) {
        window.cartStore.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          quantity: currentQuantity,
          selectedColor: selectedColor,
          selectedSize: selectedSize,
          image: galleryImages[0]
        });
        showToast(`Added ${product.title} to cart!`);
        if (typeof window.openCartDrawer === 'function') {
          window.openCartDrawer();
        }
      }
    });

    // Buy Now Click Handler
    document.getElementById('pdp-buy-now-btn')?.addEventListener('click', () => {
      if (window.cartStore) {
        window.cartStore.addItem({
          id: product.id,
          title: product.title,
          price: product.price,
          quantity: currentQuantity,
          selectedColor: selectedColor,
          selectedSize: selectedSize,
          image: galleryImages[0]
        });
        window.location.href = 'checkout.html';
      }
    });
  }

  // Related Products Auto-Loader
  loadRelatedProducts(product.category_id, product.id);
});

/**
 * Loads related products from the same category or general active Categories
 */
async function loadRelatedProducts(categoryId, currentProductId) {
  const relatedGrid = document.getElementById('related-products-grid');
  if (!relatedGrid) return;

  try {
    let relatedProducts = [];

    if (window.supabaseClient) {
      let query = window.supabaseClient
        .from('products')
        .select('*, categories:category_id(id, name, slug)')
        .eq('is_active', true)
        .neq('id', currentProductId)
        .limit(4);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        relatedProducts = data;
      } else if (categoryId) {
        // Fallback: load general active products if current category has no other products
        const { data: generalData } = await window.supabaseClient
          .from('products')
          .select('*, categories:category_id(id, name, slug)')
          .eq('is_active', true)
          .neq('id', currentProductId)
          .limit(4);
        if (generalData) relatedProducts = generalData;
      }
    } else if (window.dbService && typeof window.dbService.getProducts === 'function') {
      const res = await window.dbService.getProducts({ limit: 8 });
      if (res && res.success && res.data) {
        relatedProducts = res.data.filter(p => p.id !== currentProductId).slice(0, 4);
      }
    }

    if (!relatedProducts || relatedProducts.length === 0) {
      if (relatedGrid.parentElement) {
        relatedGrid.parentElement.style.display = 'none';
      }
      return;
    }

    relatedGrid.innerHTML = relatedProducts.map(p => {
      const pImage = (Array.isArray(p.images) && p.images.length > 0) ? p.images[0] : (p.image || 'assets/images/placeholder-gear.jpg');
      const pPrice = Number(p.price) || 0;
      const pOriginalPrice = p.original_price ? Number(p.original_price) : null;
      const pHasDiscount = pOriginalPrice && pOriginalPrice > pPrice;

      return `
        <div class="product-card">
          <a href="product.html?slug=${p.slug || ''}&id=${p.id}" class="product-card-link">
            <div class="product-image-wrap">
              <img src="${pImage}" alt="${p.title}" loading="lazy">
            </div>
            <div class="product-card-body">
              <span class="product-card-category">${p.categories ? p.categories.name : 'INLINE GEAR'}</span>
              <h3 class="product-card-title">${p.title}</h3>
              <div class="product-card-price-row">
                <span class="product-card-price">₹${pPrice.toLocaleString('en-IN')}</span>
                ${pHasDiscount ? `<span class="product-card-original-price" style="text-decoration:line-through; color:#888; font-size:0.85rem; margin-left:0.4rem;">₹${pOriginalPrice.toLocaleString('en-IN')}</span>` : ''}
              </div>
            </div>
          </a>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.warn('Could not load related products:', err);
    if (relatedGrid.parentElement) {
      relatedGrid.parentElement.style.display = 'none';
    }
  }
}