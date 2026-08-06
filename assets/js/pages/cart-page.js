/**
 * Skate Go - Standalone Cart Page Script
 * Renders full cart page breakdown and synchronizes actions.
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();

  window.addEventListener('skate_lab_cart_updated', () => {
    renderCartPage();
  });
});

function renderCartPage() {
  const state = window.cartStore.getCartState();
  const bannerContainer = document.getElementById('cart-page-shipping-banner');
  const itemsContainer = document.getElementById('cart-page-items-list');
  
  const subtotalEl = document.getElementById('page-summary-subtotal');
  const weightEl = document.getElementById('page-summary-weight');
  const shippingEl = document.getElementById('page-summary-shipping');
  const totalEl = document.getElementById('page-summary-total');
  const checkoutBtn = document.getElementById('checkout-cta-btn');

  if (!itemsContainer) return;

  // 1. Update Summary Sidebar
  if (subtotalEl) subtotalEl.textContent = `₹${state.subtotal.toLocaleString('en-IN')}`;
  if (weightEl) weightEl.textContent = `${state.totalWeight} g`;
  if (shippingEl) {
    shippingEl.textContent = state.shippingFee === 0 ? 'FREE' : `₹${state.shippingFee}`;
    shippingEl.className = state.shippingFee === 0 ? 'detail-value text-accent' : 'detail-value';
  }
  if (totalEl) totalEl.textContent = `₹${state.total.toLocaleString('en-IN')}`;

  if (checkoutBtn) {
    if (state.items.length === 0) {
      checkoutBtn.classList.add('disabled');
      checkoutBtn.setAttribute('tabindex', '-1');
      checkoutBtn.style.pointerEvents = 'none';
      checkoutBtn.style.opacity = '0.5';
    } else {
      checkoutBtn.classList.remove('disabled');
      checkoutBtn.removeAttribute('tabindex');
      checkoutBtn.style.pointerEvents = 'auto';
      checkoutBtn.style.opacity = '1';
    }
  }

  // 2. Shipping Progress Banner
  const prog = state.shippingProgress;
  if (bannerContainer) {
    if (state.items.length === 0) {
      bannerContainer.style.display = 'none';
    } else {
      bannerContainer.style.display = 'block';
      bannerContainer.innerHTML = `
        <div class="shipping-progress-info" style="text-align: left; margin-bottom: 0.5rem;">
          ${prog.isUnlocked 
            ? '<span class="shipping-status unlocked">⚡ FREE SHIPPING UNLOCKED ACROSS INDIA!</span>' 
            : `<span class="shipping-status">Add <strong class="highlight">₹${prog.remaining}</strong> more to unlock <strong>FREE Shipping</strong></span>`
          }
        </div>
        <div class="shipping-progress-bar-bg">
          <div class="shipping-progress-bar-fill" style="width: ${prog.percentage}%"></div>
        </div>
      `;
    }
  }

  // 3. Render Empty State or Cards
  if (state.items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state" style="background: var(--color-card); border-radius: 12px; border: 1px solid var(--color-card-border); padding: 3rem 1.5rem;">
        <div class="cart-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <h3 class="cart-empty-title">YOUR GEAR BAG IS EMPTY</h3>
        <p class="cart-empty-text">No accessories selected yet. Check our high-speed wheels, bearings, and protection gear.</p>
        <a href="shop.html" class="btn btn-primary">GO TO CATALOG</a>
      </div>
    `;
    return;
  }

  itemsContainer.innerHTML = state.items.map(item => `
    <article class="cart-page-card" data-key="${item.itemKey}">
      <img src="${item.image || 'assets/images/placeholder-gear.jpg'}" alt="${item.title}" class="cart-page-card-img" />
      <div class="cart-page-card-info">
        <h3 class="cart-page-card-title">${item.title}</h3>
        <div class="cart-page-card-meta">
          ${item.selectedSize ? `<span class="variant-tag">Size: ${item.selectedSize}</span>` : ''}
          ${item.selectedColor ? `<span class="variant-tag">Color: ${item.selectedColor}</span>` : ''}
        </div>
        <span class="cart-page-card-weight">Weight: ${item.weight * item.quantity}g (${item.weight}g unit)</span>
        <div class="cart-page-card-actions">
          <div class="quantity-control-sm">
            <button class="qty-btn-sm" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity - 1})" aria-label="Decrease quantity">-</button>
            <span class="qty-val-sm">${item.quantity}</span>
            <button class="qty-btn-sm" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
          <span class="cart-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
          <button class="cart-item-remove-btn" onclick="window.cartStore.removeItem('${item.itemKey}')" aria-label="Remove item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

window.confirmClearCart = function() {
  if (window.cartStore.getItemCount() === 0) return;
  if (confirm('Are you sure you want to clear your entire gear bag?')) {
    window.cartStore.clearCart();
  }
};