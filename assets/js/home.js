/**
 * Skate Go - Home Page Controller
 * Module 10: Dynamic Store Announcement, Hero Banner, & Maintenance Mode Integration
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkMaintenanceAndHydrateStore();
  await loadFeaturedProducts();
});

/**
 * Section 7: Maintenance Mode Check & Section 5: Dynamic Homepage Hydration
 */
async function checkMaintenanceAndHydrateStore() {
  if (!window.dbService) return;

  try {
    const settingsRes = await window.dbService.getStoreSettings();
    if (!settingsRes.success || !settingsRes.data) return;

    const s = settingsRes.data;

    // 1. Check Maintenance Mode (Skip if admin is logged in)
    const client = await window.dbService.getClient();
    const { data: authData } = await client.auth.getSession();
    const isAdmin = !!(authData && authData.session);

    if (s.maintenance_mode && !isAdmin) {
      renderMaintenanceOverlay(s);
      return;
    }

    // 2. Hydrate Announcement Bar
    if (s.announcement_bar_enabled && s.announcement_bar_text) {
      let annBar = document.getElementById('storeAnnouncementBar');
      if (!annBar) {
        annBar = document.createElement('div');
        annBar.id = 'storeAnnouncementBar';
        annBar.style.cssText = 'background:var(--color-primary, #e63946); color:#fff; text-align:center; padding:0.4rem 1rem; font-size:0.8rem; font-weight:600; letter-spacing:0.03em;';
        document.body.insertBefore(annBar, document.body.firstChild);
      }
      annBar.textContent = s.announcement_bar_text;
    }

    // 3. Hydrate Dynamic Hero Banner if elements exist
    const heroTitle = document.getElementById('heroBannerTitle');
    const heroSubtitle = document.getElementById('heroBannerSubtitle');
    const heroCta = document.getElementById('heroBannerCta');
    const heroSection = document.getElementById('heroBannerSection');

    if (heroTitle && s.hero_banner_title) heroTitle.textContent = s.hero_banner_title;
    if (heroSubtitle && s.hero_banner_subtitle) heroSubtitle.textContent = s.hero_banner_subtitle;
    if (heroCta && s.hero_banner_cta_text) {
      heroCta.textContent = s.hero_banner_cta_text;
      if (s.hero_banner_cta_link) heroCta.setAttribute('href', s.hero_banner_cta_link);
    }
    if (heroSection && s.hero_banner_image) {
      heroSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.8)), url('${s.hero_banner_image}')`;
    }

  } catch (err) {
    console.warn('[Skate Go Home] Store hydration warning:', err);
  }
}

/**
 * SECTION 7: Professional Maintenance Overlay Screen
 */
function renderMaintenanceOverlay(s) {
  document.body.innerHTML = `
    <div style="min-height: 100vh; background: #0a0a0a; color: #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; font-family: system-ui, sans-serif;">
      ${s.store_logo ? `<img src="${s.store_logo}" alt="${s.store_name}" style="max-height: 60px; margin-bottom: 1.5rem;">` : '<h1 style="color: #e63946; font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem;">Skate Go</h1>'}
      <div style="background: rgba(230, 57, 70, 0.1); border: 1px solid #e63946; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin-bottom: 1.5rem;">🛠️</div>
      <h2 style="font-size: 1.8rem; font-weight: 700; margin-bottom: 0.75rem; letter-spacing: 0.05em;">STORE UNDER MAINTENANCE</h2>
      <p style="color: #a0a0a0; max-width: 500px; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem;">
        We are currently updating our inventory with the latest inline speed equipment and wheels. We will be back online shortly!
      </p>
      <div style="background: #141414; border: 1px solid #262626; border-radius: 8px; padding: 1.25rem 2rem; max-width: 400px; width: 100%;">
        <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; margin-bottom: 0.5rem; font-weight: 600;">Urgent Customer Support</div>
        <div style="font-weight: 600; color: #fff;">WhatsApp: +${s.whatsapp_number || '917063062326'}</div>
        <div style="font-size: 0.85rem; color: #aaa; margin-top: 0.25rem;">Email: ${s.support_email || 'support@skatelab.in'}</div>
      </div>
      <a href="/admin/index.html" style="margin-top: 2rem; font-size: 0.75rem; color: #555; text-decoration: underline;">Admin Gateway Login</a>
    </div>
  `;
}

// Fallback Accessories Categories
const FALLBACK_FEATURED = [
  {
    id: 'wh-8085a',
    title: 'Lab Speed 110mm 85A Wheels (Pack of 6)',
    slug: 'lab-speed-110mm-85a-wheels-6pack',
    price: 3499,
    category_slug: 'wheels',
    category_name: 'Inline Wheels',
    stock_quantity: 12,
    images: ['https://images.unsplash.com/photo-1547447134-cd3f5c716030?q=80&w=600&auto=format&fit=crop']
  },
  {
    id: 'br-ilq9',
    title: 'Apex Swiss Ceramic Inline Bearings (16 Pack)',
    slug: 'apex-swiss-ceramic-inline-bearings-16pack',
    price: 4200,
    category_slug: 'bearings',
    category_name: 'Swiss Bearings',
    stock_quantity: 8,
    images: ['https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop']
  }
];

async function loadFeaturedProducts() {
  const gridContainer = document.getElementById('homeFeaturedGrid');
  if (!gridContainer) return;

  let products = [];

  if (window.dbService && typeof window.dbService.getProducts === 'function') {
    try {
      const response = await window.dbService.getProducts({ limit: 4 });
      if (response && response.success && response.data && response.data.length > 0) {
        products = response.data;
      }
    } catch (error) {
      console.warn('Supabase fetch fallback triggered:', error);
    }
  }

  if (!products || products.length === 0) {
    products = FALLBACK_FEATURED;
  }

  renderProductGrid(gridContainer, products);
}

function renderProductGrid(container, products) {
  container.innerHTML = products.map(product => {
    const imageUrl = (product.images && product.images[0]) 
      ? product.images[0] 
      : 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?q=80&w=600&auto=format&fit=crop';

    const categoryLabel = product.category_name || (product.categories ? product.categories.name : 'Inline Gear');

    return `
      <div class="product-card">
        <a href="product.html?slug=${product.slug || product.id}" class="product-card-image-wrapper">
          <img src="${imageUrl}" alt="${product.title}" loading="lazy" class="product-card-img" />
          <span class="product-badge">${categoryLabel}</span>
        </a>
        <div class="product-card-content">
          <h3 class="product-title">
            <a href="product.html?slug=${product.slug || product.id}">${product.title}</a>
          </h3>
          <div class="product-price-row">
            <span class="product-price">₹${product.price.toLocaleString('en-IN')}</span>
            <button class="btn btn-primary btn-sm quick-add-btn" 
                    data-id="${product.id}" 
                    data-title="${product.title}" 
                    data-price="${product.price}" 
                    data-image="${imageUrl}">
              + Add
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.quick-add-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      const item = {
        id: button.dataset.id,
        title: button.dataset.title,
        price: parseFloat(button.dataset.price),
        image: button.dataset.image,
        quantity: 1
      };

      if (window.cartStore) {
        window.cartStore.addItem(item);
        
        const originalText = button.textContent;
        button.textContent = 'ADDED!';
        button.style.backgroundColor = '#00E676';
        button.style.color = '#000000';

        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = '';
          button.style.color = '';
        }, 1200);

        if (typeof window.openCartDrawer === 'function') {
          window.openCartDrawer();
        }
      }
    });
  });
}