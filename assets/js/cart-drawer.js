/**
 * Skate Go - Dynamic Cart Drawer & Navigation Controller
 * Handles cart overlay injection, slide-over navigation, dynamic rendering, and event bindings.
 */

document.addEventListener('DOMContentLoaded', () => {
  injectCartDrawerMarkup();
  bindCartDrawerEvents();
  bindMobileNavEvents();
  renderCartDrawer();

  // Global event listener for cart updates
  window.addEventListener('skate_lab_cart_updated', () => {
    renderCartDrawer();
    updateHeaderCartBadge();
  });

  updateHeaderCartBadge();
});

function injectCartDrawerMarkup() {
  if (document.getElementById('cart-drawer-overlay')) return;

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

function updateHeaderCartBadge() {
  if (!window.cartStore) return;
  const count = window.cartStore.getItemCount();
  document.querySelectorAll('.cart-count-badge, #cart-count').forEach(badge => {
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

  // 1. Shipping Tracker
  const prog = state.shippingProgress;
  if (trackerContainer) {
    if (state.items.length === 0) {
      trackerContainer.innerHTML = '';
    } else {
      trackerContainer.innerHTML = `
        <div class="shipping-progress-info">
          ${prog.isUnlocked 
            ? '<span class="shipping-status unlocked">⚡ FREE SHIPPING UNLOCKED!</span>' 
            : `<span class="shipping-status">Add <strong class="highlight">₹${prog.remaining}</strong> more for <strong>FREE Shipping</strong></span>`
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
      <div class="cart-empty-state">
        <div class="cart-empty-icon">
          <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <h3 class="cart-empty-title">YOUR GEAR BAG IS EMPTY</h3>
        <p class="cart-empty-text">Equip yourself with high-velocity inline wheels, ceramic bearings, and precision accessories.</p>
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
      <div class="cart-item-details">
        <h4 class="cart-item-title">${item.title}</h4>
        <div class="cart-item-price-row">
          <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
          <span class="cart-item-unit-price">(₹${item.price.toLocaleString('en-IN')} each)</span>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-control-sm">
            <button class="qty-btn-sm" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
            <span class="qty-val-sm">${item.quantity}</span>
            <button class="qty-btn-sm" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
          <button class="cart-item-remove-btn" onclick="window.cartStore.removeItem('${item.itemKey}')" aria-label="Remove item">
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
      <span class="summary-label">Subtotal</span>
      <span class="summary-value">₹${state.subtotal.toLocaleString('en-IN')}</span>
    </div>
    <div class="cart-summary-row">
      <span class="summary-label">Estimated Delivery</span>
      <span class="summary-value ${state.shippingFee === 0 ? 'text-accent' : ''}">
        ${state.shippingFee === 0 ? 'FREE' : `₹${state.shippingFee}`}
      </span>
    </div>
    <div class="cart-summary-row total-row">
      <span class="summary-label">Estimated Total</span>
      <span class="summary-value-total">₹${state.total.toLocaleString('en-IN')}</span>
    </div>
    <p class="cart-drawer-tax-note">Includes India delivery. Advance WhatsApp order routing.</p>
    <div class="cart-drawer-cta-group">
      <a href="checkout.html" class="btn btn-primary btn-full btn-lg">PROCEED TO CHECKOUT</a>
    </div>
  `;
}