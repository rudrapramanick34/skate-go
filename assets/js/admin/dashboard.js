/**
 * Skate Go - Admin Dashboard & BI Controller
 * Module 10: Complete Store Settings & Business Control Center
 */

let globalOrders = [];
let globalProducts = [];
let globalCategories = [];
let globalAnalytics = [];
let globalSettings = {};

// Chart instances for dynamic refresh
let salesChartInstance = null;
let ordersChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Enforce session security guard
  await window.adminAuthGuard.enforceAuth();

  // Load telemetry & store configuration
  await loadAllDashboardData();
  await runSystemDiagnostics();
});

/**
 * Sub-Navigation Tab Switcher
 */
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.sub-nav-btn').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add('active');
  if (btnElement) btnElement.classList.add('active');
}

/**
 * Fetch All Data & Render Telemetry
 */
async function loadAllDashboardData() {
  const client = window.supabaseClient || await window.dbService.getClient();

  if (!client) return;

  try {
    const [ordersRes, productsRes, categoriesRes, analyticsRes, settingsRes] = await Promise.all([
      client.from('orders').select('*').order('created_at', { ascending: false }),
      client.from('products').select('*, categories(name)').order('created_at', { ascending: false }),
      client.from('categories').select('*'),
      client.from('analytics').select('*').order('created_at', { ascending: false }).limit(200),
      window.dbService.getStoreSettings()
    ]);

    globalOrders = ordersRes.data || [];
    globalProducts = productsRes.data || [];
    globalCategories = categoriesRes.data || [];
    globalAnalytics = analyticsRes.data || [];
    globalSettings = settingsRes.data || {};

    renderBusinessAnalytics();
    renderCustomerAnalytics();
    renderProductAnalytics();
    renderSearchAnalytics();
    renderCharts();
    populateAllSettingsForms();

  } catch (err) {
    console.error('[Skate Go Control Center] Telemetry initialization error:', err);
  }
}

/**
 * SECTION 9: Business Analytics Computation
 */
function renderBusinessAnalytics() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let todayOrdersCount = 0;
  let todayRevenue = 0;
  let monthlyRevenue = 0;
  let lifetimeRevenue = 0;

  let pendingCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;

  globalOrders.forEach(o => {
    const created = new Date(o.created_at);
    const amount = Number(o.total_amount || 0);

    if (created >= startOfDay) {
      todayOrdersCount += 1;
      todayRevenue += amount;
    }

    if (created >= startOfMonth) {
      monthlyRevenue += amount;
    }

    lifetimeRevenue += amount;

    if (o.order_status === 'New' || o.order_status === 'Pending') pendingCount++;
    if (o.order_status === 'Delivered') deliveredCount++;
    if (o.order_status === 'Cancelled') cancelledCount++;
  });

  const lowStockCount = globalProducts.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.low_stock_threshold || 5)).length;
  const outOfStockCount = globalProducts.filter(p => (p.stock_quantity || 0) <= 0).length;

  document.getElementById('kpi-today-orders').textContent = todayOrdersCount;
  document.getElementById('kpi-today-revenue').textContent = `₹${todayRevenue.toLocaleString('en-IN')}`;
  document.getElementById('kpi-monthly-revenue').textContent = `₹${monthlyRevenue.toLocaleString('en-IN')}`;
  document.getElementById('kpi-lifetime-revenue').textContent = `₹${lifetimeRevenue.toLocaleString('en-IN')}`;
  document.getElementById('kpi-pending-orders').textContent = pendingCount;
  document.getElementById('kpi-delivered-orders').textContent = deliveredCount;
  document.getElementById('kpi-cancelled-orders').textContent = cancelledCount;
  document.getElementById('kpi-low-stock').textContent = lowStockCount;
  document.getElementById('kpi-out-stock').textContent = outOfStockCount;
}

/**
 * SECTION 11: Customer Analytics Computation
 */
function renderCustomerAnalytics() {
  const customerMap = {};

  globalOrders.forEach(o => {
    const phone = o.customer_phone ? o.customer_phone.trim() : 'Unknown';
    if (!customerMap[phone]) {
      customerMap[phone] = 0;
    }
    customerMap[phone] += 1;
  });

  const totalCustomers = Object.keys(customerMap).length;
  let returningCustomers = 0;
  let newCustomers = 0;

  Object.values(customerMap).forEach(count => {
    if (count > 1) returningCustomers++;
    else newCustomers++;
  });

  const opc = totalCustomers > 0 ? (globalOrders.length / totalCustomers).toFixed(1) : '0.0';

  document.getElementById('cust-total').textContent = totalCustomers;
  document.getElementById('cust-new').textContent = newCustomers;
  document.getElementById('cust-returning').textContent = returningCustomers;
  document.getElementById('cust-opc').textContent = opc;
}

/**
 * SECTION 10: Product Analytics Rendering
 */
function renderProductAnalytics() {
  const tbody = document.getElementById('table-product-analytics');
  if (!tbody) return;

  if (globalProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No products registered.</td></tr>`;
    return;
  }

  // Sort by order count and lowest stock
  const sortedProds = [...globalProducts].sort((a, b) => (b.order_count || 0) - (a.order_count || 0));

  tbody.innerHTML = sortedProds.slice(0, 10).map(p => `
    <tr>
      <td><strong>${p.title}</strong></td>
      <td>₹${Number(p.price).toLocaleString('en-IN')}</td>
      <td>
        <span class="status-pill ${p.stock_quantity > 5 ? 'online' : 'offline'}">
          ${p.stock_quantity} units
        </span>
      </td>
      <td>${p.view_count || 0}</td>
      <td>${p.order_count || 0}</td>
    </tr>
  `).join('');
}

/**
 * Search Telemetry Insights
 */
function renderSearchAnalytics() {
  const container = document.getElementById('list-search-analytics');
  if (!container) return;

  const searchEvents = globalAnalytics.filter(a => a.event_type === 'search_query');
  if (searchEvents.length === 0) {
    container.innerHTML = `<div style="padding: 1rem; color: var(--color-text-secondary); text-align:center;">No search logs available yet.</div>`;
    return;
  }

  const queryFreq = {};
  searchEvents.forEach(e => {
    const q = e.metadata?.query?.toLowerCase().trim();
    if (q) queryFreq[q] = (queryFreq[q] || 0) + 1;
  });

  const sortedQueries = Object.entries(queryFreq).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sortedQueries.slice(0, 8).map(([query, count]) => `
    <div style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
      <span>"${query}"</span>
      <span style="color:var(--color-primary); font-weight:600;">${count} searches</span>
    </div>
  `).join('');
}

/**
 * Chart Engine
 */
function renderCharts() {
  if (typeof Chart === 'undefined') return;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenue = new Array(12).fill(0);
  const monthlyOrders = new Array(12).fill(0);

  globalOrders.forEach(o => {
    const monthIndex = new Date(o.created_at).getMonth();
    monthlyRevenue[monthIndex] += Number(o.total_amount || 0);
    monthlyOrders[monthIndex] += 1;
  });

  const ctxSales = document.getElementById('chart-sales');
  if (ctxSales) {
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctxSales, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (₹)',
          data: monthlyRevenue,
          borderColor: '#e63946',
          backgroundColor: 'rgba(230, 57, 70, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  const ctxOrders = document.getElementById('chart-orders');
  if (ctxOrders) {
    if (ordersChartInstance) ordersChartInstance.destroy();
    ordersChartInstance = new Chart(ctxOrders, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Orders',
          data: monthlyOrders,
          backgroundColor: '#457b9d'
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

/**
 * Populate All Forms with Store Settings Data
 */
function populateAllSettingsForms() {
  const s = globalSettings;
  if (!s) return;

  // Section 1: Store Information
  document.getElementById('setting-store-name').value = s.store_name || '';
  document.getElementById('setting-store-description').value = s.store_description || '';
  document.getElementById('setting-business-address').value = s.business_address || '';
  document.getElementById('setting-whatsapp-number').value = s.whatsapp_number || '';
  document.getElementById('setting-support-email').value = s.support_email || '';
  document.getElementById('setting-store-logo').value = s.store_logo || '';
  document.getElementById('setting-favicon').value = s.favicon || '';
  document.getElementById('setting-instagram-url').value = s.instagram_url || '';
  document.getElementById('setting-facebook-url').value = s.facebook_url || '';
  document.getElementById('setting-youtube-url').value = s.youtube_url || '';
  document.getElementById('setting-website-url').value = s.website_url || '';

  // Section 2: Payment Settings
  document.getElementById('setting-upi-id').value = s.upi_id || '';
  document.getElementById('setting-upi-qr').value = s.upi_qr_image || '';
  document.getElementById('setting-min-advance-pct').value = s.min_advance_pct || 60;
  document.getElementById('toggle-allow-cod').checked = s.enable_cod ?? true;

  // Section 3: Shipping Settings
  document.getElementById('setting-free-shipping-amount').value = s.free_shipping_amount || 2999;
  document.getElementById('setting-flat-shipping-charge').value = s.flat_shipping_charge || 99;
  document.getElementById('setting-delivery-days').value = s.estimated_delivery_days || '3 - 5 Business Days';
  document.getElementById('setting-default-courier').value = s.default_courier || 'BlueDart / Delhivery';

  // Section 4: Store Policies
  document.getElementById('policy-privacy').value = s.privacy_policy || '';
  document.getElementById('policy-refund').value = s.refund_policy || '';
  document.getElementById('policy-shipping').value = s.shipping_policy || '';
  document.getElementById('policy-terms').value = s.terms_conditions || '';
  document.getElementById('policy-about').value = s.about_us || '';
  document.getElementById('policy-support').value = s.support_page || '';

  // Section 5: Homepage Settings
  document.getElementById('toggle-announcement').checked = s.announcement_bar_enabled ?? true;
  document.getElementById('setting-announcement-text').value = s.announcement_bar_text || '';
  document.getElementById('setting-hero-title').value = s.hero_banner_title || '';
  document.getElementById('setting-hero-subtitle').value = s.hero_banner_subtitle || '';
  document.getElementById('setting-hero-image').value = s.hero_banner_image || '';
  document.getElementById('setting-hero-cta-text').value = s.hero_banner_cta_text || '';
  document.getElementById('setting-hero-cta-link').value = s.hero_banner_cta_link || '';

  // Section 6: SEO Settings
  document.getElementById('setting-seo-title').value = s.seo_default_title || '';
  document.getElementById('setting-meta-keywords').value = s.meta_keywords || '';
  document.getElementById('setting-seo-description').value = s.seo_default_description || '';
  document.getElementById('setting-og-image').value = s.og_image || '';
  document.getElementById('setting-twitter-card').value = s.twitter_card_image || '';
  document.getElementById('setting-google-verification').value = s.google_verification || '';

  // Section 7: Maintenance Mode Toggle
  document.getElementById('toggle-maintenance-mode').checked = s.maintenance_mode ?? false;
}

/**
 * Save Section 1 & Section 6 (Store Info & SEO)
 */
async function saveStoreInfo(e) {
  e.preventDefault();
  const payload = {
    store_name: document.getElementById('setting-store-name').value,
    store_description: document.getElementById('setting-store-description').value,
    business_address: document.getElementById('setting-business-address').value,
    whatsapp_number: document.getElementById('setting-whatsapp-number').value,
    support_email: document.getElementById('setting-support-email').value,
    store_logo: document.getElementById('setting-store-logo').value,
    favicon: document.getElementById('setting-favicon').value,
    instagram_url: document.getElementById('setting-instagram-url').value,
    facebook_url: document.getElementById('setting-facebook-url').value,
    youtube_url: document.getElementById('setting-youtube-url').value,
    website_url: document.getElementById('setting-website-url').value,
    seo_default_title: document.getElementById('setting-seo-title').value,
    meta_keywords: document.getElementById('setting-meta-keywords').value,
    seo_default_description: document.getElementById('setting-seo-description').value,
    og_image: document.getElementById('setting-og-image').value,
    twitter_card_image: document.getElementById('setting-twitter-card').value,
    google_verification: document.getElementById('setting-google-verification').value
  };

  const res = await window.dbService.updateStoreSettings(payload);
  if (res.success) {
    alert('Store Information & SEO Settings successfully saved!');
  } else {
    alert(`Save failed: ${res.error}`);
  }
}

/**
 * Save Section 2 & Section 3 (Payment & Shipping)
 */
async function savePaymentShipping(e) {
  e.preventDefault();
  const payload = {
    upi_id: document.getElementById('setting-upi-id').value,
    upi_qr_image: document.getElementById('setting-upi-qr').value,
    min_advance_pct: parseFloat(document.getElementById('setting-min-advance-pct').value),
    enable_cod: document.getElementById('toggle-allow-cod').checked,
    free_shipping_amount: parseFloat(document.getElementById('setting-free-shipping-amount').value),
    flat_shipping_charge: parseFloat(document.getElementById('setting-flat-shipping-charge').value),
    estimated_delivery_days: document.getElementById('setting-delivery-days').value,
    default_courier: document.getElementById('setting-default-courier').value
  };

  const res = await window.dbService.updateStoreSettings(payload);
  if (res.success) {
    alert('Payment & Shipping settings successfully saved!');
  } else {
    alert(`Save failed: ${res.error}`);
  }
}

/**
 * Save Section 4 (Store Policies)
 */
async function saveStorePolicies(e) {
  e.preventDefault();
  const payload = {
    privacy_policy: document.getElementById('policy-privacy').value,
    refund_policy: document.getElementById('policy-refund').value,
    shipping_policy: document.getElementById('policy-shipping').value,
    terms_conditions: document.getElementById('policy-terms').value,
    about_us: document.getElementById('policy-about').value,
    support_page: document.getElementById('policy-support').value
  };

  const res = await window.dbService.updateStoreSettings(payload);
  if (res.success) {
    alert('Store Policies saved! Frontend pages will update automatically.');
  } else {
    alert(`Save failed: ${res.error}`);
  }
}

/**
 * Save Section 5 (Homepage Settings)
 */
async function saveHomepageSettings(e) {
  e.preventDefault();
  const payload = {
    announcement_bar_enabled: document.getElementById('toggle-announcement').checked,
    announcement_bar_text: document.getElementById('setting-announcement-text').value,
    hero_banner_title: document.getElementById('setting-hero-title').value,
    hero_banner_subtitle: document.getElementById('setting-hero-subtitle').value,
    hero_banner_image: document.getElementById('setting-hero-image').value,
    hero_banner_cta_text: document.getElementById('setting-hero-cta-text').value,
    hero_banner_cta_link: document.getElementById('setting-hero-cta-link').value
  };

  const res = await window.dbService.updateStoreSettings(payload);
  if (res.success) {
    alert('Homepage settings saved successfully!');
  } else {
    alert(`Save failed: ${res.error}`);
  }
}

/**
 * Section 7: Maintenance Mode Toggle
 */
async function toggleMaintenanceMode() {
  const isChecked = document.getElementById('toggle-maintenance-mode').checked;
  const res = await window.dbService.updateStoreSettings({ maintenance_mode: isChecked });
  if (res.success) {
    alert(`Maintenance Mode is now ${isChecked ? 'ENABLED 🔴' : 'DISABLED 🟢'}`);
  } else {
    alert(`Toggle failed: ${res.error}`);
  }
}

/**
 * Asset Uploader Helper
 */
async function uploadAsset(inputEl, targetFieldId) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];

  const res = await window.dbService.uploadStoreAsset(file, file.name);
  if (res.success) {
    document.getElementById(targetFieldId).value = res.url;
    alert('Asset uploaded successfully!');
  } else {
    alert(`Asset upload failed: ${res.error}`);
  }
}

/**
 * SECTION 8: BACKUP CENTER (Export & Import Settings JSON)
 */
async function exportStoreSettingsJSON() {
  const settingsRes = await window.dbService.getStoreSettings();
  if (!settingsRes.success || !settingsRes.data) return alert('Failed to fetch store settings for backup.');

  // Update last backup timestamp
  await window.dbService.updateStoreSettings({ last_backup_at: new Date().toISOString() });

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settingsRes.data, null, 2));
  const link = document.createElement('a');
  link.setAttribute("href", dataStr);
  link.setAttribute("download", `skate_lab_store_settings_backup_${Date.now()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function importStoreSettingsJSON(inputEl) {
  if (!inputEl.files || inputEl.files.length === 0) return;
  const file = inputEl.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const parsedSettings = JSON.parse(e.target.result);
      // Remove auto-generated ID if present
      delete parsedSettings.id;
      delete parsedSettings.updated_at;

      const res = await window.dbService.updateStoreSettings(parsedSettings);
      if (res.success) {
        alert('Store Settings successfully restored from backup!');
        window.location.reload();
      } else {
        alert(`Restore failed: ${res.error}`);
      }
    } catch (err) {
      alert('Invalid JSON file format.');
    }
  };

  reader.readAsText(file);
}

/**
 * CSV Exporters
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function exportOrdersCSV() {
  if (globalOrders.length === 0) return alert('No order records to export.');
  const headers = ['Order Number', 'Customer Name', 'Phone', 'City', 'State', 'Total Amount', 'Payment Status', 'Order Status', 'Created At'];
  const rows = globalOrders.map(o => [
    `"${o.order_number}"`,
    `"${o.customer_name}"`,
    `"${o.customer_phone}"`,
    `"${o.city}"`,
    `"${o.state}"`,
    o.total_amount,
    `"${o.payment_status}"`,
    `"${o.order_status}"`,
    `"${o.created_at}"`
  ]);
  downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `skate_lab_orders_${Date.now()}.csv`);
}

function exportProductsCSV() {
  if (globalProducts.length === 0) return alert('No product records to export.');
  const headers = ['ID', 'Title', 'Slug', 'Price', 'Stock Quantity', 'Category', 'Views', 'Orders', 'Is Active'];
  const rows = globalProducts.map(p => [
    `"${p.id}"`,
    `"${p.title.replace(/"/g, '""')}"`,
    `"${p.slug}"`,
    p.price,
    p.stock_quantity,
    `"${p.categories?.name || 'Uncategorized'}"`,
    p.view_count || 0,
    p.order_count || 0,
    p.is_active
  ]);
  downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `skate_lab_products_${Date.now()}.csv`);
}

function exportAnalyticsCSV() {
  if (globalAnalytics.length === 0) return alert('No analytics events recorded.');
  const headers = ['Event ID', 'Event Type', 'Metadata JSON', 'Timestamp'];
  const rows = globalAnalytics.map(a => [
    `"${a.id}"`,
    `"${a.event_type}"`,
    `"${JSON.stringify(a.metadata || {}).replace(/"/g, '""')}"`,
    `"${a.created_at}"`
  ]);
  downloadCSV([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `skate_lab_analytics_${Date.now()}.csv`);
}

/**
 * SECTION 12: SITE HEALTH PANEL (🟢 Healthy, 🟡 Warning, 🔴 Error)
 */
async function runSystemDiagnostics() {
  const health = await window.dbService.checkSystemHealth();

  const setBadge = (elementId, statusText, statusType) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let icon = '🟢';
    let color = '#2ecc71';
    if (statusType === 'warning') { icon = '🟡'; color = '#f1c40f'; }
    if (statusType === 'error') { icon = '🔴'; color = '#e74c3c'; }

    el.innerHTML = `${icon} ${statusText}`;
    el.style.color = color;
  };

  setBadge('sh-supabase', health.supabaseConnection ? 'Healthy' : 'Disconnected', health.supabaseConnection ? 'healthy' : 'error');
  setBadge('sh-storage', health.storageStatus, health.storageStatus === 'Healthy' ? 'healthy' : 'warning');
  setBadge('sh-realtime', health.realtimeStatus, health.realtimeStatus === 'Active' ? 'healthy' : 'warning');
  setBadge('sh-auth', health.authStatus ? 'Authenticated' : 'Unauthenticated', health.authStatus ? 'healthy' : 'warning');

  setBadge('sh-whatsapp', health.whatsappConfigured ? 'Configured' : 'Missing', health.whatsappConfigured ? 'healthy' : 'error');
  setBadge('sh-upi', health.upiConfigured ? 'Configured' : 'Missing', health.upiConfigured ? 'healthy' : 'error');
  setBadge('sh-logo', health.storeLogoAvailable ? 'Available' : 'Missing', health.storeLogoAvailable ? 'healthy' : 'warning');
  setBadge('sh-hero', health.heroBannerAvailable ? 'Available' : 'Missing', health.heroBannerAvailable ? 'healthy' : 'warning');
  setBadge('sh-policies', health.policiesAvailable ? 'Configured' : 'Incomplete', health.policiesAvailable ? 'healthy' : 'warning');

  setBadge('sh-products', `${globalProducts.length} Active`, globalProducts.length > 0 ? 'healthy' : 'warning');
  setBadge('sh-categories', `${globalCategories.length} Categories`, globalCategories.length > 0 ? 'healthy' : 'warning');

  const syncEl = document.getElementById('sh-sync');
  if (syncEl) syncEl.textContent = new Date().toLocaleTimeString();

  const backupEl = document.getElementById('sh-backup');
  if (backupEl && globalSettings.last_backup_at) {
    backupEl.textContent = new Date(globalSettings.last_backup_at).toLocaleString();
  }
}