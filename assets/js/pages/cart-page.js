/**
 * SKATE GO V2 - Standalone Shopping Bag Page Controller
 * File: assets/js/pages/cart-page.js
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();

  // Listen to unified skate_go_cart_updated event
  window.addEventListener('skate_go_cart_updated', () => {
    renderCartPage();
  });
});

function renderCartPage() {
  if (!window.cartStore) return;
  const state = window.cartStore.getCartState();
  const bannerContainer = document.getElementById('cart-page-shipping-banner');
  const itemsContainer = document.getElementById('cart-page-items-list');
  
  const subtotalEl = document.getElementById('page-summary-subtotal');
  const weightEl = document.getElementById('page-summary-weight');
  const shippingEl = document.getElementById('page-summary-shipping');
  const totalEl = document.getElementById('page-summary-total');
  const checkoutBtn = document.getElementById('checkout-cta-btn');

  if (!itemsContainer) return;

  // 1. Update Breakdown Values
  if (subtotalEl) subtotalEl.textContent = `₹${state.subtotal.toLocaleString('en-IN')}`;
  if (weightEl) weightEl.textContent = `${state.totalWeight || 0} g`;
  if (shippingEl) shippingEl.textContent = state.shippingFee === 0 ? 'FREE' : `₹${state.shippingFee}`;
  if (totalEl) totalEl.textContent = `₹${state.total.toLocaleString('en-IN')}`;

  if (checkoutBtn) {
    if (state.items.length === 0) {
      checkoutBtn.style.pointerEvents = 'none';
      checkoutBtn.style.opacity = '0.5';
    } else {
      checkoutBtn.style.pointerEvents = 'auto';
      checkoutBtn.style.opacity = '1';
    }
  }

  // 2. Free Shipping Tracker Bar
  const prog = state.shippingProgress;
  if (bannerContainer) {
    if (state.items.length === 0) {
      bannerContainer.style.display = 'none';
    } else {
      bannerContainer.style.display = 'block';
      bannerContainer.innerHTML = `
        <div style="font-size:0.85rem; font-weight:700; margin-bottom:0.4rem;">
          ${prog.isUnlocked 
            ? '<span style="color:var(--color-success)">⚡ FREE SHIPPING UNLOCKED ACROSS INDIA!</span>' 
            : `Add <span style="color:var(--color-primary)">₹${prog.remaining}</span> more to unlock <strong>FREE Shipping</strong>`
          }
        </div>
        <div class="shipping-progress-bar-bg">
          <div class="shipping-progress-bar-fill" style="width: ${prog.percentage}%"></div>
        </div>
      `;
    }
  }

  // 3. Render Empty State vs. Bag Items
  if (state.items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state" style="background: var(--glass-bg); border-radius: var(--radius-md); border: 1px solid var(--glass-border); padding: 3rem 1.5rem; text-align: center;">
        <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 0.5rem;">YOUR GEAR BAG IS EMPTY</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">No inline components selected. Explore high-performance wheels and ceramic bearings.</p>
        <a href="shop.html" class="btn btn-primary">EXPLORE CATALOG</a>
      </div>
    `;
    return;
  }

  itemsContainer.innerHTML = state.items.map(item => `
    <article class="cart-page-card" data-key="${item.itemKey}" style="background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:1.25rem; display:flex; gap:1rem; align-items:center; margin-bottom:1rem;">
      <img src="${item.image || 'assets/images/placeholder-gear.jpg'}" alt="${item.title}" style="width:80px; height:80px; border-radius:var(--radius-sm); object-fit:cover;" />
      <div style="flex:1;">
        <h3 style="font-size:1rem; font-weight:700; margin-bottom:0.25rem;">${item.title}</h3>
        <div style="font-size:0.8rem; color:var(--color-text-secondary); margin-bottom:0.5rem;">
          ${item.selectedSize ? `Size: ${item.selectedSize} ` : ''}${item.selectedColor ? `| Color: ${item.selectedColor}` : ''}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:inline-flex; align-items:center; border:1px solid var(--glass-border); border-radius:var(--radius-pill); background:var(--color-surface);">
            <button style="background:none; border:none; width:30px; height:30px; cursor:pointer; font-weight:800; color:var(--color-text-main);" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity - 1})">-</button>
            <span style="font-size:0.85rem; font-weight:800; padding:0 0.5rem;">${item.quantity}</span>
            <button style="background:none; border:none; width:30px; height:30px; cursor:pointer; font-weight:800; color:var(--color-text-main);" onclick="window.cartStore.updateQuantity('${item.itemKey}', ${item.quantity + 1})">+</button>
          </div>
          <span style="font-size:1.1rem; font-weight:900; color:var(--color-primary);">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
          <button style="background:none; border:none; color:var(--color-danger); cursor:pointer;" onclick="window.cartStore.removeItem('${item.itemKey}')">Remove</button>
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