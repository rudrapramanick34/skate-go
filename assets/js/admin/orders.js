/**
 * Skate Go - Admin Order Processing & Fulfillment Controller
 * Module 9: Realtime Updates, Timeline, PDF/Print Labels & Packing Slips, Search, Filters
 */

let allOrders = [];
let filteredOrders = [];
let realtimeSubscription = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (window.adminAuthGuard) {
    await window.adminAuthGuard.enforceAuth();
  }
  
  bindFilters();
  await loadOrders();
  setupRealtimeListener();
});

function setupRealtimeListener() {
  if (!window.supabaseClient) return;

  try {
    realtimeSubscription = window.supabaseClient
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          loadOrders(true);
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

async function loadOrders(silent = false) {
  let ordersData = [];

  if (window.dbService && typeof window.dbService.getOrders === 'function') {
    const res = await window.dbService.getOrders();
    if (res.success) ordersData = res.data;
  } else if (window.supabaseClient) {
    try {
      const { data } = await window.supabaseClient
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) ordersData = data;
    } catch (e) {
      console.warn('Orders load error:', e);
    }
  }

  allOrders = ordersData;
  updateMetrics();
  applyFiltersAndRender();
}

function updateMetrics() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayOrders = allOrders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
  const pendingOrders = allOrders.filter(o => ['Pending', 'New', 'Confirmed', 'Packed'].includes(o.order_status));
  const deliveredOrders = allOrders.filter(o => o.order_status === 'Delivered');
  
  const totalRevenue = allOrders
    .filter(o => ['Fully Paid', 'Paid'].includes(o.payment_status))
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const pendingPaymentsAmount = allOrders
    .filter(o => o.payment_status === 'Pending')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  document.getElementById('metric-todays-orders').textContent = todayOrders.length;
  document.getElementById('metric-total-orders').textContent = allOrders.length;
  document.getElementById('metric-pending-orders').textContent = pendingOrders.length;
  document.getElementById('metric-delivered-orders').textContent = deliveredOrders.length;
  document.getElementById('metric-revenue').textContent = `₹${totalRevenue.toLocaleString('en-IN')}`;
  document.getElementById('metric-pending-payments').textContent = `₹${pendingPaymentsAmount.toLocaleString('en-IN')}`;

  const unreadCount = allOrders.filter(o => o.order_status === 'Pending' || o.order_status === 'New').length;
  const badge = document.getElementById('unread-order-badge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function bindFilters() {
  const searchInput = document.getElementById('order-search');
  const orderStatusFilter = document.getElementById('filter-order-status');
  const paymentStatusFilter = document.getElementById('filter-payment-status');
  const sortSelect = document.getElementById('sort-orders');

  if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
  if (orderStatusFilter) orderStatusFilter.addEventListener('change', applyFiltersAndRender);
  if (paymentStatusFilter) paymentStatusFilter.addEventListener('change', applyFiltersAndRender);
  if (sortSelect) sortSelect.addEventListener('change', applyFiltersAndRender);
}

function applyFiltersAndRender() {
  const searchVal = (document.getElementById('order-search')?.value || '').toLowerCase().trim();
  const orderStatusVal = document.getElementById('filter-order-status')?.value || 'ALL';
  const paymentStatusVal = document.getElementById('filter-payment-status')?.value || 'ALL';
  const sortVal = document.getElementById('sort-orders')?.value || 'newest';

  filteredOrders = allOrders.filter(o => {
    const matchesSearch = !searchVal || 
      (o.order_number && o.order_number.toLowerCase().includes(searchVal)) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchVal)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(searchVal));

    const matchesOrderStatus = (orderStatusVal === 'ALL') || (o.order_status === orderStatusVal);
    const matchesPaymentStatus = (paymentStatusVal === 'ALL') || (o.payment_status === paymentStatusVal);

    return matchesSearch && matchesOrderStatus && matchesPaymentStatus;
  });

  filteredOrders.sort((a, b) => {
    if (sortVal === 'oldest') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortVal === 'highest') {
      return (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0);
    } else if (sortVal === 'lowest') {
      return (Number(a.total_amount) || 0) - (Number(b.total_amount) || 0);
    } else {
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  renderOrdersTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (filteredOrders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 2rem; color: #888;">No orders match the current search or filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filteredOrders.map(o => {
    const formattedDate = o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
    const cleanPhone = o.customer_phone ? o.customer_phone.replace(/\D/g, '') : '';

    return `
      <tr>
        <td><strong>${o.order_number}</strong></td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td>
          <code>${escapeHtml(o.customer_phone)}</code>
          <button class="btn btn-outline btn-sm" style="padding: 0.1rem 0.3rem; font-size: 0.65rem;" onclick="copyPhone('${escapeHtml(o.customer_phone)}')" title="Copy Phone">📋</button>
        </td>
        <td style="font-size:0.75rem; color:#CCC; max-width: 150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          ${escapeHtml(o.city)}, ${escapeHtml(o.state)} - ${escapeHtml(o.pin_code)}
        </td>
        <td><strong>₹${(Number(o.total_amount) || 0).toLocaleString('en-IN')}</strong></td>
        <td>
          <span class="pay-badge ${getPayClass(o.payment_status)}">
            ${o.payment_status || 'Pending'}
          </span>
        </td>
        <td>
          <span class="status-badge ${getStatusClass(o.order_status)}">
            ${o.order_status || 'Pending'}
          </span>
        </td>
        <td style="font-size: 0.75rem; color:#AAA;">${formattedDate}</td>
        <td>
          <div class="table-action-group">
            <button class="btn btn-outline btn-sm" onclick="viewOrderDetails('${o.id}')" title="View Details">👁️</button>
            <button class="btn btn-outline btn-sm" onclick="copyShiprocketAddress('${o.id}')" title="Copy Address for Shiprocket">📦 Address</button>
            <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn btn-outline btn-sm" style="color:#00E676; border-color:#00E676;" title="Open WhatsApp Chat">💬 WA</a>

            <select class="select-sm" onchange="updateOrderStatus('${o.id}', this.value)" title="Change Order Status">
              <option disabled>-- Order Status --</option>
              ${['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map(st => 
                `<option value="${st}" ${o.order_status === st ? 'selected' : ''}>${st}</option>`
              ).join('')}
            </select>

            <select class="select-sm" onchange="updatePaymentStatus('${o.id}', this.value)" title="Change Payment Status">
              <option disabled>-- Payment Status --</option>
              ${['Pending', '60% Advance Paid', 'Fully Paid', 'Refunded'].map(pst => 
                `<option value="${pst}" ${o.payment_status === pst ? 'selected' : ''}>${pst}</option>`
              ).join('')}
            </select>

            <button class="btn btn-outline btn-sm" onclick="printShippingLabel('${o.id}')" title="Print Shipping Label">🏷️ Label</button>
            <button class="btn btn-outline btn-sm" onclick="printPackingSlip('${o.id}')" title="Print Packing Slip">📄 Slip</button>
            <button class="btn btn-outline btn-sm" style="color:#FF5252; border-color:#FF5252;" onclick="deleteOrder('${o.id}')" title="Delete Order">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending': return 'pending';
    case 'confirmed': return 'confirmed';
    case 'packed': return 'packed';
    case 'shipped': return 'shipped';
    case 'delivered': return 'delivered';
    case 'cancelled': return 'cancelled';
    default: return 'new';
  }
}

function getPayClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending': return 'pending';
    case '60% advance paid': return 'advance';
    case 'fully paid':
    case 'paid': return 'paid';
    case 'refunded': return 'refunded';
    default: return 'pending';
  }
}

// Quick Actions
window.copyPhone = function(phone) {
  navigator.clipboard.writeText(phone);
  alert(`Phone number copied: ${phone}`);
};

window.copyShiprocketAddress = function(orderId) {
  const o = allOrders.find(item => item.id === orderId);
  if (!o) return;

  const addressBlock = 
`Name: ${o.customer_name}
Phone: ${o.customer_phone}
Address: ${o.address}
Landmark: ${o.landmark || 'N/A'}
City: ${o.city}
State: ${o.state}
PIN: ${o.pin_code}`;

  navigator.clipboard.writeText(addressBlock);
  alert(`Shiprocket Formatted Address Copied:\n\n${addressBlock}`);
};

// Order View Modal
window.viewOrderDetails = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const modalOverlay = document.getElementById('order-modal-overlay');
  const modalTitle = document.getElementById('modal-order-number');
  const modalBody = document.getElementById('modal-order-body');

  modalTitle.textContent = `ORDER: ${order.order_number}`;

  const itemsListHtml = Array.isArray(order.items) ? order.items.map(item => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding: 0.6rem 0; border-bottom: 1px solid #282828;">
      <div style="display:flex; gap:0.75rem; align-items:center;">
        <img src="${item.image || '../assets/images/placeholder-gear.jpg'}" alt="${escapeHtml(item.title)}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#222;" />
        <div>
          <strong style="color:#FFF;">${escapeHtml(item.title)}</strong>
          <div style="font-size:0.8rem; color:#888;">
            Qty: ${item.quantity || 1} 
            ${item.selectedSize ? `| Size: ${item.selectedSize}` : ''}
            ${item.selectedColor ? `| Color: ${item.selectedColor}` : ''}
          </div>
        </div>
      </div>
      <div style="color:#FFF; font-weight:600;">
        ₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
      </div>
    </div>
  `).join('') : '<p style="color:#888;">No items logged.</p>';

  const timelineHtml = Array.isArray(order.timeline) && order.timeline.length > 0 ? order.timeline.map(t => `
    <li class="timeline-item">
      <div class="timeline-status">${escapeHtml(t.status)}</div>
      <div class="timeline-time">${new Date(t.timestamp).toLocaleString('en-IN')}</div>
    </li>
  `).join('') : '<li class="timeline-item"><div class="timeline-status">Order Received</div></li>';

  modalBody.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">Customer & Shipping Details</div>
      <div class="detail-grid">
        <div class="detail-item"><span>Customer Name</span><strong>${escapeHtml(order.customer_name)}</strong></div>
        <div class="detail-item"><span>Phone Number</span><strong>${escapeHtml(order.customer_phone)}</strong></div>
      </div>
      <p style="color:#FFF; margin-top:0.5rem; line-height:1.4;">
        ${escapeHtml(order.address)}<br/>
        ${order.landmark && order.landmark !== 'N/A' ? `Landmark: ${escapeHtml(order.landmark)}<br/>` : ''}
        ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - <strong>${escapeHtml(order.pin_code)}</strong>
      </p>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Ordered Products</div>
      ${itemsListHtml}
    </div>

    <div class="modal-section" style="background:#0A0A0A; padding:0.75rem; border-radius:6px;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#AAA; margin-bottom:0.25rem;">
        <span>Subtotal:</span><span>₹${(Number(order.subtotal) || Number(order.total_amount) || 0).toLocaleString('en-IN')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#AAA; margin-bottom:0.25rem;">
        <span>Shipping Charge:</span><span>₹${(Number(order.shipping_charge) || 0).toLocaleString('en-IN')}</span>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:1.1rem; font-weight:bold; color:#00E676; margin-top:0.5rem; border-top:1px solid #222; padding-top:0.5rem;">
        <span>Grand Total:</span><span>₹${(Number(order.total_amount) || 0).toLocaleString('en-IN')}</span>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Order Timeline</div>
      <ul class="timeline-list">
        ${timelineHtml}
      </ul>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Internal Admin Notes</div>
      <textarea id="modal-order-notes" class="filter-input" style="width:100%; height:70px;" placeholder="Add private operational notes for this order...">${escapeHtml(order.notes || '')}</textarea>
      <button class="btn btn-outline btn-sm" style="margin-top:0.4rem;" onclick="saveOrderNotes('${order.id}')">💾 Save Notes</button>
    </div>

    <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem; flex-wrap:wrap;">
      <button class="btn btn-outline" onclick="printShippingLabel('${order.id}')">🏷️ Shipping Label</button>
      <button class="btn btn-outline" onclick="printPackingSlip('${order.id}')">📄 Packing Slip</button>
      <button class="btn btn-primary" onclick="closeOrderModal()">Close</button>
    </div>
  `;

  modalOverlay.classList.add('active');
};

window.closeOrderModal = function() {
  document.getElementById('order-modal-overlay').classList.remove('active');
};

window.saveOrderNotes = async function(id) {
  const notes = document.getElementById('modal-order-notes')?.value || '';
  if (window.dbService && typeof window.dbService.updateOrderNotes === 'function') {
    await window.dbService.updateOrderNotes(id, notes);
  } else if (window.supabaseClient) {
    await window.supabaseClient.from('orders').update({ notes }).eq('id', id);
  }
  alert('Notes saved successfully.');
  await loadOrders(true);
};

// Update Order Status
window.updateOrderStatus = async function(id, newStatus) {
  if (window.dbService && typeof window.dbService.updateOrderStatus === 'function') {
    await window.dbService.updateOrderStatus(id, newStatus);
  } else if (window.supabaseClient) {
    await window.supabaseClient.from('orders').update({ order_status: newStatus }).eq('id', id);
  }
  await loadOrders(true);
};

// Update Payment Status
window.updatePaymentStatus = async function(id, newPaymentStatus) {
  if (window.dbService && typeof window.dbService.updatePaymentStatus === 'function') {
    await window.dbService.updatePaymentStatus(id, newPaymentStatus);
  } else if (window.supabaseClient) {
    await window.supabaseClient.from('orders').update({ payment_status: newPaymentStatus }).eq('id', id);
  }
  await loadOrders(true);
};

// Delete Order
window.deleteOrder = async function(id) {
  if (!confirm('Are you sure you want to permanently delete this order record?')) return;

  if (window.dbService && typeof window.dbService.deleteOrder === 'function') {
    await window.dbService.deleteOrder(id);
  } else if (window.supabaseClient) {
    await window.supabaseClient.from('orders').delete().eq('id', id);
  }
  await loadOrders();
};

// Print Shipping Label PDF
window.printShippingLabel = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const doc = document.getElementById('printable-document');
  const itemsText = Array.isArray(order.items) ? order.items.map(i => `${i.title} (x${i.quantity || 1})`).join(', ') : 'Inline Gear';

  doc.innerHTML = `
    <div style="font-family: Arial, sans-serif; width: 100%; max-width: 500px; border: 3px solid #000; padding: 20px; box-sizing: border-box; margin: 0 auto;">
      <div style="border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin:0; font-size: 22px; font-weight: bold;">Skate Go INDIA</h2>
          <p style="margin:0; font-size: 11px;">PREMIUM SPEED & INLINE ACCESSORIES</p>
        </div>
        <div style="text-align: right;">
          <strong style="font-size: 16px;">${order.payment_method || 'UPI'}</strong><br/>
          <span style="font-size: 12px; border: 1px solid #000; padding: 2px 5px;">${order.payment_status || 'PENDING'}</span>
        </div>
      </div>

      <div style="border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px;">
        <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">SHIP TO:</span>
        <h3 style="margin: 5px 0 3px 0; font-size: 18px;">${escapeHtml(order.customer_name)}</h3>
        <p style="margin: 0; font-size: 14px; font-weight: bold;">PH: ${escapeHtml(order.customer_phone)}</p>
        <p style="margin: 5px 0 0 0; font-size: 13px; line-height: 1.3;">
          ${escapeHtml(order.address)}<br/>
          ${order.landmark && order.landmark !== 'N/A' ? `Landmark: ${escapeHtml(order.landmark)}<br/>` : ''}
          <strong>${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pin_code)}</strong>
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 10px;">
        <div><strong>ORDER ID:</strong> ${order.order_number}</div>
        <div><strong>DATE:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}</div>
      </div>

      <div style="font-size: 12px; border-top: 1px solid #000; padding-top: 8px;">
        <strong>ITEMS:</strong> ${escapeHtml(itemsText)}
      </div>
    </div>
  `;

  doc.style.display = 'block';
  window.print();
  doc.style.display = 'none';
};

// Print Packing Slip PDF
window.printPackingSlip = function(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const doc = document.getElementById('printable-document');
  const itemsRows = Array.isArray(order.items) ? order.items.map((item, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        <strong>${escapeHtml(item.title)}</strong><br/>
        <small>${item.selectedSize ? `Size: ${item.selectedSize} ` : ''}${item.selectedColor ? `Color: ${item.selectedColor}` : ''}</small>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity || 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${(item.price || 0).toLocaleString('en-IN')}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">₹${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}</td>
    </tr>
  `).join('') : '';

  doc.innerHTML = `
    <div style="font-family: sans-serif; color: #000; padding: 20px; max-width: 800px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        <div>
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">Skate Go INDIA</h1>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #555;">PACKING SLIP & OFFICIAL INVOICE</p>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 18px;">${order.order_number}</h2>
          <p style="margin: 3px 0 0 0; font-size: 12px;">Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px;">CUSTOMER DETAILS</h3>
        <p style="margin: 3px 0; font-size: 14px; font-weight: bold;">${escapeHtml(order.customer_name)}</p>
        <p style="margin: 3px 0; font-size: 13px;">Phone: ${escapeHtml(order.customer_phone)}</p>
        <p style="margin: 3px 0; font-size: 13px;">${escapeHtml(order.address)}, ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - ${escapeHtml(order.pin_code)}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: #f4f4f4; text-align: left;">
            <th style="padding: 8px; border-bottom: 2px solid #ddd;">#</th>
            <th style="padding: 8px; border-bottom: 2px solid #ddd;">Item</th>
            <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: center;">Qty</th>
            <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Price</th>
            <th style="padding: 8px; border-bottom: 2px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <div style="width: 250px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>Subtotal:</span><span>₹${(Number(order.subtotal) || Number(order.total_amount) || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span>Shipping:</span><span>₹${(Number(order.shipping_charge) || 0).toLocaleString('en-IN')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 2px solid #000; font-weight: bold; font-size: 15px;">
            <span>Grand Total:</span><span>₹${(Number(order.total_amount) || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; border-top: 1px dashed #ccc; padding-top: 15px; font-size: 12px;">
        🛹 Thank you for skating with Skate Go India! Tag @skatelab on Instagram.
      </div>
    </div>
  `;

  doc.style.display = 'block';
  window.print();
  doc.style.display = 'none';
};

// CSV Export Logic
window.exportOrdersCSV = function() {
  exportToCSV(filteredOrders, `skate_lab_orders_${new Date().toISOString().slice(0, 10)}.csv`);
};

window.exportTodayOrdersCSV = function() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaysList = allOrders.filter(o => o.created_at && o.created_at.startsWith(todayStr));
  exportToCSV(todaysList, `skate_lab_orders_today_${todayStr}.csv`);
};

function exportToCSV(ordersList, filename) {
  if (!ordersList || ordersList.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = ['Order ID', 'Customer Name', 'Phone', 'Address', 'Landmark', 'City', 'State', 'PIN Code', 'Subtotal', 'Shipping', 'Grand Total', 'Payment Method', 'Payment Status', 'Order Status', 'Created At'];
  
  const csvRows = [headers.join(',')];

  ordersList.forEach(o => {
    const row = [
      `"${o.order_number || ''}"`,
      `"${(o.customer_name || '').replace(/"/g, '""')}"`,
      `"${o.customer_phone || ''}"`,
      `"${(o.address || '').replace(/"/g, '""')}"`,
      `"${(o.landmark || '').replace(/"/g, '""')}"`,
      `"${(o.city || '').replace(/"/g, '""')}"`,
      `"${(o.state || '').replace(/"/g, '""')}"`,
      `"${o.pin_code || ''}"`,
      o.subtotal || 0,
      o.shipping_charge || 0,
      o.total_amount || 0,
      `"${o.payment_method || ''}"`,
      `"${o.payment_status || ''}"`,
      `"${o.order_status || ''}"`,
      `"${o.created_at || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.click();
  window.URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}