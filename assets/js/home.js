/**
 * SKATE GO V2 - Homepage Controller
 * Hydrates Dynamic Hero, Category Pills, Trending & Featured Supabase Products with Skeletons
 * File: assets/js/home.js
 */

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadCategoriesPills(),
    loadFeaturedAndTrendingProducts()
  ]);
});

async function loadCategoriesPills() {
  const container = document.getElementById('homeCategoryPills');
  if (!container || !window.dbService) return;

  try {
    const res = await window.dbService.getCategories({ includeHidden: false });
    if (res.success && res.data.length > 0) {
      container.innerHTML = res.data.map(cat => `
        <a href="shop.html?category=${cat.slug}" class="category-pill-item">
          <div class="category-pill-img-wrap">
            <img src="${cat.image_url || 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?q=80&w=200&auto=format&fit=crop'}" alt="${cat.name}" loading="lazy">
          </div>
          <span class="category-pill-name">${cat.name}</span>
        </a>
      `).join('');
    }
  } catch (e) {
    console.warn('[Skate Go Home] Category pills fetch:', e);
  }
}

async function loadFeaturedAndTrendingProducts() {
  const featuredGrid = document.getElementById('homeFeaturedGrid');
  const trendingGrid = document.getElementById('homeTrendingGrid');

  if (!featuredGrid && !trendingGrid) return;

  let products = [];
  if (window.dbService) {
    const res = await window.dbService.getProducts({ limit: 8 });
    if (res.success && res.data) products = res.data;
  }

  if (products.length === 0) {
    products = [
      {
        id: '1',
        title: 'Apex V2 80mm 85A Freeskate Wheels',
        price: 1890,
        original_price: 2400,
        slug: 'apex-v2-80mm-85a-wheels',
        images: ['https://images.unsplash.com/photo-1547447134-cd3f5c716030?q=80&w=600&auto=format&fit=crop']
      },
      {
        id: '2',
        title: 'Velocity Pro Ceramic ILQ-9 Bearings',
        price: 3490,
        original_price: 4200,
        slug: 'velocity-pro-ceramic-ilq9-bearings',
        images: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop']
      }
    ];
  }

  const renderGrid = (container, list) => {
    if (!container) return;
    container.innerHTML = list.map(p => {
      const img = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : (p.image || 'assets/images/placeholder-gear.jpg');
      const hasDiscount = p.original_price && p.original_price > p.price;
      const discountPct = hasDiscount ? Math.round(((p.original_price - p.price) / p.original_price) * 100) : 0;
      const productLink = `product.html?slug=${p.slug || ''}&id=${p.id}`;

      return `
        <article class="product-card" data-product-href="${productLink}" style="cursor: pointer;">
          ${hasDiscount ? `<span class="product-discount-tag">${discountPct}% OFF</span>` : ''}
          <a href="${productLink}" class="product-card-image-wrapper">
            <img src="${img}" alt="${p.title}" loading="lazy" class="product-card-img" />
          </a>
          <div class="product-card-content">
            <span class="product-category-tag">${p.categories?.name || 'INLINE GEAR'}</span>
            <h3 class="product-title"><a href="${productLink}">${p.title}</a></h3>
            <div class="product-price-row">
              <div>
                <span class="product-price">₹${Number(p.price).toLocaleString('en-IN')}</span>
                ${hasDiscount ? `<span class="product-orig-price">₹${Number(p.original_price).toLocaleString('en-IN')}</span>` : ''}
              </div>
              <button class="btn btn-primary btn-sm quick-add-btn" 
                      data-id="${p.id}" 
                      data-title="${p.title}" 
                      data-price="${p.price}" 
                      data-image="${img}">
                + Add
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Entire card click handler
    container.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const href = card.getAttribute('data-product-href');
        if (href) window.location.href = href;
      });
    });

    container.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (window.cartStore) {
          window.cartStore.addItem({
            id: btn.dataset.id,
            title: btn.dataset.title,
            price: parseFloat(btn.dataset.price),
            image: btn.dataset.image,
            quantity: 1
          });
          btn.textContent = 'ADDED!';
          setTimeout(() => { btn.textContent = '+ Add'; }, 1000);
          if (typeof window.openCartDrawer === 'function') window.openCartDrawer();
        }
      });
    });
  };

  if (featuredGrid) renderGrid(featuredGrid, products.slice(0, 4));
  if (trendingGrid) renderGrid(trendingGrid, products.slice(0, 4));
}