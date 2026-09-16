/**
 * SKATE GO V2 - Dynamic Cart Drawer, Global Theme Engine, Custom Cursor & Page Loader
 * File: assets/js/cart-drawer.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initGlobalThemeEngine();
  initPageLoader();
  initCustomDesktopCursor();
  injectCartDrawerMarkup();
  bindCartDrawerEvents();
  bindMobileNavEvents();
  renderCartDrawer();
  updateAllCartBadges();

  // Listen to single standardized cart update event
  window.addEventListener('skate_go_cart_updated', () => {
    renderCartDrawer();
    updateAllCartBadges();
  });
});

/**
 * 1. Unified Global Theme Engine
 */
function initGlobalThemeEngine() {
  const currentTheme = localStorage.getItem('skate_go_theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const active = document.documentElement.getAttribute('data-theme');
      const next = active === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('skate_go_theme', next);
    });
  });
}

/**
 * 2. Branded Page Loader Controller
 */
function initPageLoader() {
  const loader = document.getElementById('global-page-loader');
  if (!loader) return;

  const hideLoader = () => {
    loader.classList.add('loaded');
    setTimeout(() => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 600);
  };

  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 300);
  } else {
    window.addEventListener('load', () => setTimeout(hideLoader, 300));
  }
}

/**
 * 3. Desktop Custom Magnetic Cursor
 */
function initCustomDesktopCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // Skip touch devices

  let dot = document.querySelector('.custom-cursor-dot');
  let outline = document.querySelector('.custom-cursor-outline');

  if (!dot || !outline) {
    dot = document.createElement('div');
    dot.className = 'custom-cursor-dot';
    outline = document.createElement('div');
    outline.className = 'custom-cursor-outline';
    document.body.appendChild(dot);
    document.body.appendChild(outline);
  }

  let mouseX = 0, mouseY = 0;
  let outlineX = 0, outlineY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    document.body.classList.add('cursor-active');

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
  });

  const animateCursor = () => {
    outlineX += (mouseX - outlineX) * 0.18;
    outlineY += (mouseY - outlineY) * 0.18;
    outline.style.transform = `translate3d(${outlineX}px, ${outlineY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  };
  requestAnimationFrame(animateCursor);

  // Hover effect over clickable targets
  const interactiveTargets = 'a, button, input, select, textarea, .product-card, .thumb-btn, .variant-chip';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveTargets)) {
      document.body.classList.add('cursor-hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveTargets)) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

/**
 * 4. Slide-over Cart Drawer DOM Injection
 */
function injectCartDrawerMarkup() {
  if (document.getElementById('cart-drawer')) return;

  const drawerHTML = `
    <div id="cart-drawer-overlay" class="cart-drawer-overlay" aria-hidden="true"></div>
    <aside id="cart-drawer" class="cart-drawer" aria-label="Shopping Cart Drawer" role="dialog" aria-hidden="true">
      <header class="cart-drawer-header">
        <div class="cart-drawer-title-wrap">
          <h2 class="cart-drawer-title">YOUR GEAR BAG</h2>
          <span id="cart-drawer-count-badge" class="cart-drawer-badge">0 ITEMS</span>
        </div>
        <button id="cart-drawer-close" class="cart-drawer-close-btn" aria-label="Close Cart">&times;</button>
      </header>

      <section class="cart-drawer-shipping-tracker" id="cart-shipping-tracker"></section>
      <div id="cart-drawer-items" class="cart-drawer-items"></div>
      <footer id="cart-drawer-footer" class="cart-drawer-footer"></footer>
    </aside>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHTML);
}

function bindCartDrawerEvents() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const closeBtn = document.getElementById('cart-drawer-close');

  overlay?.addEventListener('click', closeCartDrawer);
  closeBtn?.addEventListener('click', closeCartDrawer);

  document.querySelectorAll('[data-action="open-cart"]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });
}

function bindMobileNavEvents() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('mobile-nav-close');
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-nav-overlay');

  const openMobileNav = () => {
    drawer?.classList.add('active');
    overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeMobileNav = () => {
    drawer?.classList.remove('active');
    overlay?.classList.remove('active');
    document.body.style.overflow = '';
  };

  toggleBtn?.addEventListener('click', openMobileNav);
  closeBtn?.addEventListener('click', closeMobileNav);
  overlay?.addEventListener('click', closeMobileNav);
}

window.openCartDrawer = function() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (overlay && drawer) {
    overlay.classList.add('active');
    drawer.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
};

window.closeCartDrawer = function() {
  const overlay = document.getElementById('cart-drawer-overlay');
  const drawer = document.getElementById('cart-drawer');
  if (overlay && drawer) {
    overlay.classList.remove('active');
    drawer.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
};

function updateAllCartBadges() {
  if (!window.cartStore) return;
  const count = window.cartStore.getItemCount();
  
  // Header badges + Bottom navigation badges
  document.querySelectorAll('.cart-count-badge, #cart-count, #bottom-nav-cart-badge').forEach(badge => {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  });
}

function renderCartDrawer() {
  if (!window.cartStore) return;
  const state = window.cartStore.getCartState();
  const countBadge = document.getElementById('cart-drawer-count-badge');
  const trackerContainer = document.getElementById('cart-shipping-tracker');
  const itemsContainer = document.getElementById('cart-drawer-items');
  const footerContainer = document.getElementById('cart-drawer-footer');

  if (!itemsContainer || !footerContainer) return;

  if (countBadge) {
    countBadge.textContent = `${state.itemCount} ${state.itemCount === 1 ? 'ITEM' : 'ITEMS'}`;
  }

  // 1. Shipping Progress
  const prog = state.shippingProgress;
  if (trackerContainer) {
    if (state.items.length === 0) {
      trackerContainer.innerHTML = '';
    } else {
      trackerContainer.innerHTML = `
        <div class="shipping-progress-info" style="font-size:0.8rem; margin-bottom:0.35rem;">
          ${prog.isUnlocked 
            ? '<span class="shipping-status unlocked" style="color:var(--color-success); font-weight:800;">⚡ FREE SHIPPING UNLOCKED!</span>' 
            : `<span class="shipping-status">Add <strong style="color:var(--color-primary)">₹${prog.remaining}</strong> more for <strong>FREE Shipping</strong></span>`
          }
        </div>
        <div class="shipping-progress-bar-bg">
          <div class="shipping-progress-bar-fill" style="width: ${prog.percentage}%"></div>
        </div>
      `;
    }
  }

  // 2. Empty State
  if (state.items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state" style="text-align:center; padding: 3rem 1rem;">
        <div style="color: var(--color-text-secondary); margin-bottom: 1rem; opacity: 0.5;">
          <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:0.5rem;">YOUR GEAR BAG IS EMPTY</h3>
        <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:1.5rem;">Equip yourself with high-velocity wheels, bearings, and precision accessories.</p>
        <a href="shop.html" class="btn btn-primary btn-full" onclick="closeCartDrawer()">EXPLORE CATALOG</a>
      </div>
    `;
    footerContainer.innerHTML = '';
    return;
  }

  // 3. Render Cart Items
  itemsContainer.innerHTML = state.items.map(item => `
    <article class="cart-drawer-item" data-key="${item.itemKey}">
      <div class="cart-item-img-wrap">
        <img src="${item.image || 'assets/images/placeholder-gear.jpg'}" alt="${item.title}" class="cart-item-img" loading="lazy" />
      </div>
      <div class="cart-item-details" style="flex-grow:1;">
        <h4 class="cart-item-title">${item.title}</h4>
        <div style="font-size:0.75rem; color:var(--color-text-secondary); margin-bottom:0.35rem;">
          ${item.selectedSize ? `Size: ${item.selectedSize} ` : ''}${item.selectedColor ? `| Color: ${item.selectedColor}` : ''}
        </div>
        <div class="cart-item-price-row" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
          <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
        </div>
        <div class="cart-item-actions" style="display:flex; align-items:center; justify-content:space-between;">
          <div style="display:inline-flex; align-items:center; border:1px solid var(--glass-border); border-radius:var(--radius-pill); background:var(--color-surface);">
            <button style="background:none; border:none; color:var(--color-text-main); width:28px; height:28px; cursor:pointer; font-weight:800;" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
            <span style="font-size:0.8rem; font-weight:800; padding:0 0.4rem;">${item.quantity}</span>
            <button style="background:none; border:none; color:var(--color-text-main); width:28px; height:28px; cursor:pointer; font-weight:800;" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
          <button style="background:none; border:none; color:var(--color-text-secondary); cursor:pointer;" onclick="window.cartStore.removeItem('${item.itemKey}')" aria-label="Remove item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // 4. Render Footer Summary
  footerContainer.innerHTML = `
    <div class="cart-summary-row">
      <span>Subtotal</span>
      <span>₹${state.subtotal.toLocaleString('en-IN')}</span>
    </div>
    <div class="cart-summary-row">
      <span>Estimated Delivery</span>
      <span>${state.shippingFee === 0 ? 'FREE' : `₹${state.shippingFee}`}</span>
    </div>
    <div class="cart-summary-row total-row">
      <span>Estimated Total</span>
      <span class="summary-value-total">₹${state.total.toLocaleString('en-IN')}</span>
    </div>
    <div style="margin-top:1rem;">
      <a href="checkout.html" class="btn btn-primary btn-full btn-lg">PROCEED TO CHECKOUT</a>
    </div>
  `;
}