/**
 * Skate Go - Categories Page Controller
 * Module 05: Dynamic Supabase Category Filtering, Clickable Cards & Skeleton Loading
 */

document.addEventListener('DOMContentLoaded', async () => {
  const gridContainer = document.getElementById('catalog-products-grid');
  const categoryFiltersContainer = document.getElementById('category-filters');
  const sortSelect = document.getElementById('sort-select');

  let currentProducts = [];
  let categoriesMap = {};
  let activeCategorySlug = 'all';

  // Issue 4: Render initial skeleton loading state
  if (gridContainer) {
    gridContainer.innerHTML = Array(6).fill(0).map(() => `
      <div class="skeleton-card" style="background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1rem; display:flex; flex-direction:column; gap:0.75rem;">
        <div style="width:100%; aspect-ratio:1; background:var(--color-surface-secondary); border-radius:var(--radius-sm);"></div>
        <div style="height:14px; width:70%; background:var(--color-surface-secondary); border-radius:4px;"></div>
        <div style="height:14px; width:40%; background:var(--color-surface-secondary); border-radius:4px;"></div>
      </div>
    `).join('');
  }

  // Read URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get('category');
  if (categoryParam) {
    activeCategorySlug = categoryParam.toLowerCase();
  }

  await loadCategories();
  await loadCatalogProducts();

  async function loadCategories() {
    if (window.dbService && typeof window.dbService.getCategories === 'function') {
      const res = await window.dbService.getCategories({ includeHidden: false });
      if (res.success && res.data.length > 0) {
        renderCategoryButtons(res.data);
      }
    }
  }

  function renderCategoryButtons(categories) {
    if (!categoryFiltersContainer) return;

    let html = `<button class="filter-btn ${activeCategorySlug === 'all' ? 'active' : ''}" data-slug="all">All Accessories</button>`;

    categories.forEach(cat => {
      categoriesMap[cat.id] = cat.name;
      const isActive = activeCategorySlug === cat.slug.toLowerCase();
      html += `<button class="filter-btn ${isActive ? 'active' : ''}" data-slug="${cat.slug}">${cat.name}</button>`;
    });

    categoryFiltersContainer.innerHTML = html;

    // Attach click listeners
    categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        categoryFiltersContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategorySlug = btn.getAttribute('data-slug').toLowerCase();
        renderProducts();
      });
    });
  }

  async function loadCatalogProducts() {
    if (window.dbService && typeof window.dbService.getProducts === 'function') {
      const res = await window.dbService.getProducts({ limit: 100 });
      if (res.success && res.data) {
        currentProducts = res.data;
      }
    }
    renderProducts();
  }

  function renderProducts() {
    if (!gridContainer) return;

    let filtered = [...currentProducts];

    // Filter by active category slug
    if (activeCategorySlug !== 'all') {
      filtered = filtered.filter(p => p.categories && p.categories.slug.toLowerCase() === activeCategorySlug);
    }

    // Sort
    const sortValue = sortSelect ? sortSelect.value : 'newest';
    if (sortValue === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    }

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #AAA;">No items available in this category.</div>`;
      return;
    }

    gridContainer.innerHTML = filtered.map(p => {
      const availableStock = Math.max(0, (p.stock_quantity || 0) - (p.reserved_stock || 0));
      const isOutOfStock = availableStock <= 0;
      const mainImg = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || 'assets/images/placeholder-gear.jpg');
      const productLink = `product.html?slug=${p.slug || ''}&id=${p.id}`;

      // Issue 3: Entire product card is clickable via wrapping or data-href click handler
      return `
        <article class="product-card ${isOutOfStock ? 'out-of-stock-card' : ''}" data-product-href="${productLink}" style="cursor: pointer;">
          <div class="product-card-img" style="background-image: url('${mainImg}'); background-size: cover; background-position: center; min-height: 180px; position: relative;">
            ${isOutOfStock ? `<span style="position: absolute; top: 10px; right: 10px; background: #7F1D1D; color: #FCA5A5; font-size: 0.7rem; font-weight: bold; padding: 0.25rem 0.5rem; border-radius: 4px; text-transform: uppercase;">OUT OF STOCK</span>` : ''}
          </div>

          <h3 class="product-card-title">
            <a href="${productLink}" style="color:var(--color-text-main); text-decoration:none;">${p.title}</a>
          </h3>

          <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 0.75rem; line-height:1.4;">
            ${p.description ? p.description.slice(0, 90) + '...' : ''}
          </p>

          <div class="product-card-price" style="margin-bottom:0.5rem;">₹${(Number(p.price) || 0).toLocaleString('en-IN')}</div>

          ${isOutOfStock ? `
            <button class="btn btn-outline btn-sm btn-full" disabled style="opacity: 0.5; cursor: not-allowed;">
              OUT OF STOCK
            </button>
          ` : `
            <button class="btn btn-primary btn-sm btn-full add-to-bag-btn" 
              data-id="${p.id}" 
              data-title="${p.title.replace(/"/g, '&quot;')}" 
              data-price="${p.price}"
              data-image="${mainImg}">
              + ADD TO CART
            </button>
          `}
        </article>
      `;
    }).join('');

    // Issue 3: Make complete product card clickable while preventing button conflict
    gridContainer.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return; // let buttons/links handle themselves
        const href = card.getAttribute('data-product-href');
        if (href) window.location.href = href;
      });
    });

    // Attach Add To Cart Listeners
    document.querySelectorAll('.add-to-bag-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const title = btn.getAttribute('data-title');
        const price = parseFloat(btn.getAttribute('data-price'));
        const image = btn.getAttribute('data-image');

        if (window.cartStore) {
          window.cartStore.addItem({ id, title, price, quantity: 1, image });
          if (typeof window.openCartDrawer === 'function') {
            window.openCartDrawer();
          }
        }
      });
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', renderProducts);
  }
});