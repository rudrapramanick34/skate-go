/**
 * Skate Go - Express Checkout & WhatsApp Routing Controller
 * Module 9: Order Management & Fulfillment Integration
 */

const WHATSAPP_BUSINESS_NUMBER = '917063062326';

document.addEventListener('DOMContentLoaded', () => {
  verifyCartNotEmpty();
  renderCheckoutSummary();
  bindCheckoutForm();
});

function verifyCartNotEmpty() {
  const count = window.cartStore ? window.cartStore.getItemCount() : 0;
  if (count === 0) {
    alert('Your gear bag is empty. Redirecting to Categories...');
    window.location.href = 'shop.html';
  }
}

function renderCheckoutSummary() {
  if (!window.cartStore) return;
  const state = window.cartStore.getCartState();
  const itemsContainer = document.getElementById('checkout-items-list');
  const countBadge = document.getElementById('summary-item-count');

  if (countBadge) countBadge.textContent = state.itemCount;

  if (itemsContainer) {
    itemsContainer.innerHTML = state.items.map(item => `
      <div class="checkout-item-row">
        <img src="${item.image || 'assets/images/placeholder-gear.jpg'}" alt="${item.title}" class="checkout-item-thumb" />
        <div class="checkout-item-info">
          <h4 class="checkout-item-title">${item.title}</h4>
          <span class="checkout-item-sub">
            Qty: ${item.quantity} 
            ${item.selectedSize ? `| Size: ${item.selectedSize}` : ''}
            ${item.selectedColor ? `| Color: ${item.selectedColor}` : ''}
          </span>
        </div>
        <span class="checkout-item-price">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
      </div>
    `).join('');
  }

  document.getElementById('checkout-subtotal').textContent = `₹${state.subtotal.toLocaleString('en-IN')}`;
  document.getElementById('checkout-weight').textContent = `${state.totalWeight || 0} g`;
  
  const shippingEl = document.getElementById('checkout-shipping');
  shippingEl.textContent = state.shippingFee === 0 ? 'FREE' : `₹${state.shippingFee}`;
  if (state.shippingFee === 0) shippingEl.style.color = '#00E676';

  document.getElementById('checkout-total').textContent = `₹${state.total.toLocaleString('en-IN')}`;
}

async function generateFormattedOrderId() {
  if (window.dbService && typeof window.dbService.generateNextOrderId === 'function') {
    return await window.dbService.generateNextOrderId();
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `SL-${year}${month}${day}-${randomDigits}`;
}

function bindCheckoutForm() {
  const form = document.getElementById('checkout-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitBtn = document.getElementById('submit-order-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'PROCESSING & SAVING ORDER...';

    const rawPhone = document.getElementById('customer_phone').value.trim();
    const formattedPhone = rawPhone.startsWith('+91') ? rawPhone : `+91${rawPhone}`;

    const formData = {
      customer_name: document.getElementById('customer_name').value.trim(),
      customer_phone: formattedPhone,
      address: document.getElementById('address').value.trim(),
      landmark: document.getElementById('landmark').value.trim() || 'N/A',
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value,
      pin_code: document.getElementById('pin_code').value.trim()
    };

    const cartState = window.cartStore.getCartState();
    let orderNumber;
    try {
      orderNumber = await generateFormattedOrderId();
    } catch (e) {
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      orderNumber = `SL-${nowStr}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const formattedItems = cartState.items.map(item => ({
      id: item.id || null,
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      selectedColor: item.selectedColor || 'Standard',
      selectedSize: item.selectedSize || 'Standard',
      image: item.image || '',
      weight: item.weight || 'N/A',
      subtotal: item.price * item.quantity
    }));

    const now = new Date().toISOString();
    const orderRecord = {
      order_number: orderNumber,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      address: formData.address,
      landmark: formData.landmark,
      city: formData.city,
      state: formData.state,
      pin_code: formData.pin_code,
      items: formattedItems,
      subtotal: cartState.subtotal,
      shipping_charge: cartState.shippingFee,
      total_amount: cartState.total,
      payment_method: 'UPI Direct',
      payment_status: 'Pending',
      order_status: 'Pending',
      whatsapp_number: WHATSAPP_BUSINESS_NUMBER,
      notes: '',
      timeline: [
        { status: 'Order Received', timestamp: now }
      ]
    };

    // SAVE TO SUPABASE WITH MANDATORY ERROR CHECK
    let saveSuccess = false;
    let saveErrorMessage = '';

    try {
      if (window.dbService && typeof window.dbService.createOrder === 'function') {
        const res = await window.dbService.createOrder(orderRecord);
        if (res && res.success) {
          saveSuccess = true;
        } else {
          saveErrorMessage = res?.error || 'Database save failed.';
        }
      } else if (window.supabaseClient) {
        const { error } = await window.supabaseClient.from('orders').insert([orderRecord]);
        if (!error) {
          saveSuccess = true;
        } else {
          saveErrorMessage = error.message;
        }
      } else {
        saveErrorMessage = 'Database service not connected.';
      }
    } catch (err) {
      saveErrorMessage = err.message || 'Unexpected error while creating order.';
    }

    // IF SAVING FAILS -> DO NOT OPEN WHATSAPP
    if (!saveSuccess) {
      alert(`⚠️ Order Creation Error: ${saveErrorMessage}\n\nYour order could not be processed. Please try again.`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'CONFIRM ORDER VIA WHATSAPP';
      return;
    }

    // Format & Build WhatsApp URL
    const whatsappUrl = buildWhatsAppUrl(orderNumber, formData, cartState);
    
    // Clear local cart
    if (window.cartStore && typeof window.cartStore.clearCart === 'function') {
      window.cartStore.clearCart();
    }

    // Redirect to WhatsApp
    window.location.href = whatsappUrl;
  });
}

function validateForm() {
  let isValid = true;

  const fields = [
    { id: 'customer_name', check: val => val.length >= 2, errorId: 'error-customer_name' },
    { id: 'customer_phone', check: val => /^[6-9]\d{9}$/.test(val.replace(/\D/g, '')), errorId: 'error-customer_phone' },
    { id: 'address', check: val => val.length >= 5, errorId: 'error-address' },
    { id: 'city', check: val => val.length >= 2, errorId: 'error-city' },
    { id: 'pin_code', check: val => /^\d{6}$/.test(val), errorId: 'error-pin_code' },
    { id: 'state', check: val => val !== '', errorId: 'error-state' }
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const errEl = document.getElementById(f.errorId);
    const val = el ? el.value.trim() : '';

    if (!f.check(val)) {
      isValid = false;
      el?.classList.add('has-error');
      if (errEl) errEl.classList.add('visible');
    } else {
      el?.classList.remove('has-error');
      if (errEl) errEl.classList.remove('visible');
    }
  });

  return isValid;
}

function buildWhatsAppUrl(orderNumber, formData, cartState) {
  let text = `⚡ *Skate Go - NEW DIRECT ORDER*\n`;
  text += `------------------------------------\n`;
  text += `*Order ID:* ${orderNumber}\n`;
  text += `*Customer:* ${formData.customer_name}\n`;
  text += `*Phone:* ${formData.customer_phone}\n\n`;

  text += `*📦 ORDERED GEAR ITEMS:*\n`;
  cartState.items.forEach((item, index) => {
    const sizeStr = item.selectedSize ? ` (${item.selectedSize})` : '';
    const colorStr = item.selectedColor ? ` [${item.selectedColor}]` : '';
    text += `${index + 1}. *${item.title}*${sizeStr}${colorStr}\n`;
    text += `   Qty: ${item.quantity} x ₹${item.price.toLocaleString('en-IN')} = ₹${(item.price * item.quantity).toLocaleString('en-IN')}\n`;
  });

  text += `\n*BILLING SUMMARY:*`;
  text += `\nSubtotal: ₹${cartState.subtotal.toLocaleString('en-IN')}`;
  text += `\nShipping Fee: ${cartState.shippingFee === 0 ? 'FREE' : `₹${cartState.shippingFee}`}`;
  text += `\n*GRAND TOTAL: ₹${cartState.total.toLocaleString('en-IN')}*\n`;

  text += `\n------------------------------------`;
  text += `\n*📍 DISPATCH ADDRESS:*\n`;
  text += `${formData.address}\n`;
  if (formData.landmark && formData.landmark !== 'N/A') {
    text += `Landmark: ${formData.landmark}\n`;
  }
  text += `${formData.city}, ${formData.state} - ${formData.pin_code}\n`;

  text += `\n------------------------------------`;
  text += `\n*PAYMENT METHOD:* UPI Direct`;
  text += `\n*Please share official UPI QR / UPI ID to complete payment.*`;

  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedText}`;
}