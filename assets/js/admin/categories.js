/**
 * Skate Lab - Category & Inventory Management Controller
 * Module 8: Category CRUD with Delete Guard, Stock Control, Badges & Bulk Updates
 */

let allCategories = [];
let allProducts = [];
let activeTab = 'categories';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.adminAuthGuard) {
    await window.adminAuthGuard.enforceAuth();
  }

  bindTabEvents();
  bindModalEvents();
  bindSearchAndFilters();
  bindAutoSlug();

  await loadAllData();
});

async function loadAllData() {
  await Promise.all([loadCategories(), loadInventory()]);
  updateModuleMetrics();
}

async function loadCategories() {
  if (window.dbService && typeof window.dbService.getCategories === 'function') {
    const res = await window.dbService.getCategories({ includeHidden: true });
    if (res.success) {
      allCategories = res.data;
    } else {
      showToast(res.error || 'Failed to load categories', 'error');
    }
  }
  renderCategoriesTable();
  populateCategoryDropdowns();
}

async function loadInventory() {
  if (window.dbService && typeof window.dbService.getInventoryProducts === 'function') {
    const res = await window.dbService.getInventoryProducts();
    if (res.success) {
      allProducts = res.data;
    } else {
      showToast(res.error || 'Failed to load inventory', 'error');
    }
  }
  renderInventoryTable();
}

/**
 * MODULE 8 STOCK METRICS CALCULATIONS:
 * 0      -> Out of Stock
 * 1–5    -> Low Stock
 * 6+     -> In Stock
 */
function updateModuleMetrics() {
  const lowStockCount = allProducts.filter(p => {
    const stock = p.stock_quantity || 0;
    return stock >= 1 && stock <= 5;
  }).length;

  const outOfStockCount = allProducts.filter(p => {
    const stock = p.stock_quantity || 0;
    return stock === 0;
  }).length;

  const catCountEl = document.getElementById('metric-total-cats');
  const prodCountEl = document.getElementById('metric-total-prods');
  const lowStockEl = document.getElementById('metric-low-stock');
  const outOfStockEl = document.getElementById('metric-out-of-stock');

  if (catCountEl) catCountEl.textContent = allCategories.length;
  if (prodCountEl) prodCountEl.textContent = allProducts.length;
  if (lowStockEl) lowStockEl.textContent = lowStockCount;
  if (outOfStockEl) outOfStockEl.textContent = outOfStockCount;
}

/* ========================================================================
   TAB SWITCHING
   ======================================================================== */

function bindTabEvents() {
  window.switchTab = function(tabName) {
    activeTab = tabName;
    const catTabBtn = document.getElementById('tab-btn-categories');
    const invTabBtn = document.getElementById('tab-btn-inventory');
    const catSection = document.getElementById('tab-section-categories');
    const invSection = document.getElementById('tab-section-inventory');

    if (tabName === 'categories') {
      catTabBtn.classList.add('active');
      invTabBtn.classList.remove('active');
      catSection.style.display = 'block';
      invSection.style.display = 'none';
    } else {
      catTabBtn.classList.remove('active');
      invTabBtn.classList.add('active');
      catSection.style.display = 'none';
      invSection.style.display = 'block';
    }
  };
}

/* ========================================================================
   CATEGORY MANAGEMENT LOGIC
   ======================================================================== */

function renderCategoriesTable() {
  const tbody = document.getElementById('admin-categories-tbody');
  if (!tbody) return;

  const searchVal = (document.getElementById('search-cats')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filter-cat-status')?.value || 'ALL';
  const sortVal = document.getElementById('sort-cats')?.value || 'order';

  let filtered = allCategories.filter(c => {
    const matchesSearch = !searchVal || c.name.toLowerCase().includes(searchVal) || c.slug.toLowerCase().includes(searchVal);
    const matchesStatus = (statusFilter === 'ALL') || 
                          (statusFilter === 'ACTIVE' && !c.is_hidden) || 
                          (statusFilter === 'INACTIVE' && c.is_hidden);
    return matchesSearch && matchesStatus;
  });

  filtered.sort((a, b) => {
    if (sortVal === 'alpha') return a.name.localeCompare(b.name);
    if (sortVal === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    return (a.display_order || 0) - (b.display_order || 0);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #888;">No categories found. Click "+ Create Category" to add one.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    // Calculate accurate product count
    const productCount = Array.isArray(c.products) 
      ? c.products.length 
      : allProducts.filter(p => p.category_id === c.id).length;

    const imgUrl = c.image_url || 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&w=100&q=80';

    return `
      <tr>
        <td><img src="${imgUrl}" class="cat-thumb" alt="${escapeHtml(c.name)}" /></td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><code>${escapeHtml(c.slug)}</code></td>
        <td><strong>${productCount}</strong> Product(s)</td>
        <td>${c.display_order || 0}</td>
        <td>
          <span class="badge-status ${c.is_hidden ? 'inactive' : 'active'}">
            ${c.is_hidden ? 'Inactive' : 'Active'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="editCategory('${c.id}')">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="toggleCategoryVisibility('${c.id}', ${!c.is_hidden})">
              ${c.is_hidden ? 'Activate' : 'Deactivate'}
            </button>
            <button class="btn btn-outline btn-sm" style="color:#FF5252; border-color:#FF5252;" onclick="deleteCategory('${c.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindAutoSlug() {
  const nameInput = document.getElementById('cat-name');
  const slugInput = document.getElementById('cat-slug');

  nameInput?.addEventListener('input', () => {
    const catId = document.getElementById('cat-id').value;
    if (!catId) {
      slugInput.value = nameInput.value
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });
}

function bindModalEvents() {
  const openAddBtn = document.getElementById('open-add-cat-btn');
  const catForm = document.getElementById('cat-form');

  openAddBtn?.addEventListener('click', () => {
    catForm.reset();
    document.getElementById('cat-id').value = '';
    document.getElementById('modal-cat-title').textContent = 'CREATE CATEGORY';
    document.getElementById('cat-modal-overlay').classList.add('active');
  });

  catForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveCategory();
  });

  // Bulk Stock Modal Trigger
  document.getElementById('open-bulk-stock-btn')?.addEventListener('click', () => {
    openBulkStockModal();
  });

  document.getElementById('bulk-stock-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await executeBulkStockUpdate();
  });
}

window.closeCategoryModal = function() {
  document.getElementById('cat-modal-overlay').classList.remove('active');
};

async function saveCategory() {
  const submitBtn = document.getElementById('cat-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const id = document.getElementById('cat-id').value;
  const name = document.getElementById('cat-name').value.trim();
  const slug = document.getElementById('cat-slug').value.trim();

  if (!name || !slug) {
    showToast('Name and Slug are required fields.', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'SAVE CATEGORY';
    return;
  }

  const fileInput = document.getElementById('cat-image-file');
  let imageUrl = document.getElementById('cat-image-url').value.trim();

  // Upload file if selected
  if (fileInput && fileInput.files.length > 0) {
    const uploadRes = await window.dbService.uploadCategoryImage(fileInput.files[0]);
    if (uploadRes.success) {
      imageUrl = uploadRes.url;
    } else {
      showToast(`Image upload failed: ${uploadRes.error}`, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'SAVE CATEGORY';
      return;
    }
  }

  const payload = {
    name,
    slug,
    description: document.getElementById('cat-desc').value.trim(),
    image_url: imageUrl,
    display_order: parseInt(document.getElementById('cat-order').value, 10) || 0,
    is_hidden: document.getElementById('cat-status').value === 'inactive',
    seo_title: document.getElementById('cat-seo-title').value.trim(),
    seo_description: document.getElementById('cat-seo-desc').value.trim()
  };

  let res;
  if (id) {
    res = await window.dbService.updateCategory(id, payload);
  } else {
    res = await window.dbService.createCategory(payload);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'SAVE CATEGORY';

  if (res.success) {
    showToast(`Category "${name}" saved successfully!`, 'success');
    closeCategoryModal();
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to save category.', 'error');
  }
}

window.editCategory = function(id) {
  const c = allCategories.find(cat => cat.id === id);
  if (!c) return;

  document.getElementById('cat-id').value = c.id;
  document.getElementById('cat-name').value = c.name;
  document.getElementById('cat-slug').value = c.slug;
  document.getElementById('cat-desc').value = c.description || '';
  document.getElementById('cat-image-url').value = c.image_url || '';
  document.getElementById('cat-order').value = c.display_order || 0;
  document.getElementById('cat-status').value = c.is_hidden ? 'inactive' : 'active';
  document.getElementById('cat-seo-title').value = c.seo_title || '';
  document.getElementById('cat-seo-desc').value = c.seo_description || '';

  document.getElementById('modal-cat-title').textContent = 'EDIT CATEGORY';
  document.getElementById('cat-modal-overlay').classList.add('active');
};

window.toggleCategoryVisibility = async function(id, isHidden) {
  const res = await window.dbService.toggleCategoryVisibility(id, isHidden);
  if (res.success) {
    showToast(`Category status updated to ${isHidden ? 'Inactive' : 'Active'}.`, 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to update category status.', 'error');
  }
};

/**
 * DELETE RULE ENFORCEMENT:
 * If products exist inside a category, do NOT allow deleting it.
 * Show a proper warning message.
 */
window.deleteCategory = async function(id) {
  const c = allCategories.find(cat => cat.id === id);
  const catName = c ? c.name : 'this category';

  // Local check first
  const assignedProducts = allProducts.filter(p => p.category_id === id);
  if (assignedProducts.length > 0) {
    showToast(`Cannot delete "${catName}": ${assignedProducts.length} product(s) exist inside this category. Please reassign or delete them first.`, 'warning');
    alert(`⚠️ CANNOT DELETE CATEGORY\n\nThe category "${catName}" contains ${assignedProducts.length} product(s).\n\nPlease reassign or delete those products before deleting this category.`);
    return;
  }

  if (!confirm(`Are you sure you want to permanently delete the category "${catName}"?`)) {
    return;
  }

  const res = await window.dbService.deleteCategory(id);
  if (res.success) {
    showToast(`Category "${catName}" deleted successfully.`, 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to delete category.', 'error');
    alert(`⚠️ CANNOT DELETE CATEGORY\n\n${res.error}`);
  }
};

/* ========================================================================
   INVENTORY & STOCK LOGIC
   ======================================================================== */

function populateCategoryDropdowns() {
  const dropdown = document.getElementById('filter-inventory-category');
  if (!dropdown) return;

  dropdown.innerHTML = '<option value="ALL">All Categories</option>' + 
    allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
}

/**
 * MODULE 8 INVENTORY TABLE RENDERING
 * Exact Stock Status Rules:
 * 0     -> Out of Stock
 * 1–5   -> Low Stock
 * 6+    -> In Stock
 */
function renderInventoryTable() {
  const tbody = document.getElementById('admin-inventory-tbody');
  if (!tbody) return;

  const searchVal = (document.getElementById('search-inventory')?.value || '').toLowerCase().trim();
  const stockFilter = document.getElementById('filter-stock-status')?.value || 'ALL';
  const catFilter = document.getElementById('filter-inventory-category')?.value || 'ALL';

  let filtered = allProducts.filter(p => {
    const matchesSearch = !searchVal || p.title.toLowerCase().includes(searchVal);
    const matchesCat = (catFilter === 'ALL') || (p.category_id === catFilter);

    const stock = p.stock_quantity || 0;
    const isOut = stock === 0;
    const isLow = stock >= 1 && stock <= 5;
    const isIn = stock >= 6;

    let matchesStock = true;
    if (stockFilter === 'OUT') matchesStock = isOut;
    if (stockFilter === 'LOW') matchesStock = isLow;
    if (stockFilter === 'IN') matchesStock = isIn;

    return matchesSearch && matchesCat && matchesStock;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #888;">No products found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const stock = p.stock_quantity || 0;
    
    // Primary product image extraction
    let imgUrl = 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&w=100&q=80';
    if (Array.isArray(p.images) && p.images.length > 0 && p.images[0]) {
      imgUrl = p.images[0];
    }

    // Status Badge Logic (Exact Module 8 Requirements)
    let statusBadge = `<span class="badge-status instock">In Stock (${stock})</span>`;
    if (stock === 0) {
      statusBadge = `<span class="badge-status outofstock">Out of Stock</span>`;
    } else if (stock >= 1 && stock <= 5) {
      statusBadge = `<span class="badge-status lowstock">Low Stock (${stock})</span>`;
    }

    const lastUpdated = p.stock_updated_at 
      ? new Date(p.stock_updated_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) 
      : 'N/A';

    const categoryName = p.categories ? p.categories.name : 'Unassigned';

    return `
      <tr>
        <td><img src="${imgUrl}" class="prod-thumb" alt="${escapeHtml(p.title)}" /></td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
          <div style="font-size:0.75rem; color:#888;">ID: ${p.id.slice(0, 8)}...</div>
        </td>
        <td><span class="badge-status inactive">${escapeHtml(categoryName)}</span></td>
        <td><strong style="font-size:1.1rem; color:#FFF;">${stock}</strong></td>
        <td>${statusBadge}</td>
        <td style="font-size:0.8rem; color:#AAA;">${lastUpdated}</td>
        <td>
          <div style="display:flex; gap:0.4rem; align-items:center;">
            <input type="number" id="stock-input-${p.id}" value="${stock}" min="0" style="width: 70px;" class="filter-input" />
            <button class="btn btn-primary btn-sm" onclick="saveIndividualStock('${p.id}')">Update</button>
            <button class="btn btn-outline btn-sm" onclick="toggleProductActive('${p.id}', ${!p.is_active})">
              ${p.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.saveIndividualStock = async function(productId) {
  const input = document.getElementById(`stock-input-${productId}`);
  if (!input) return;

  const newStock = parseInt(input.value, 10);
  if (isNaN(newStock) || newStock < 0) {
    showToast('Stock quantity cannot be negative.', 'error');
    return;
  }

  const res = await window.dbService.updateProductStock(productId, newStock);
  if (res.success) {
    showToast('Stock level updated successfully.', 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to update stock.', 'error');
  }
};

window.toggleProductActive = async function(productId, isActive) {
  const res = await window.dbService.toggleProductActive(productId, isActive);
  if (res.success) {
    showToast(`Product set to ${isActive ? 'Active' : 'Inactive'}.`, 'success');
    await loadAllData();
  } else {
    showToast(res.error || 'Failed to update product status.', 'error');
  }
};

/* ========================================================================
   BULK STOCK UPDATE LOGIC
   ======================================================================== */

function openBulkStockModal() {
  const listContainer = document.getElementById('bulk-products-list');
  if (!listContainer) return;

  if (allProducts.length === 0) {
    listContainer.innerHTML = '<div style="color:#888; font-size:0.85rem;">No products available for bulk update.</div>';
  } else {
    listContainer.innerHTML = allProducts.map(p => `
      <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem; color:#FFF; margin-bottom:0.4rem; cursor:pointer;">
        <input type="checkbox" class="bulk-prod-checkbox" value="${p.id}" onchange="updateBulkCount()" />
        <span>${escapeHtml(p.title)} (Current: ${p.stock_quantity || 0})</span>
      </label>
    `).join('');
  }

  updateBulkCount();
  document.getElementById('bulk-stock-modal-overlay').classList.add('active');
}

window.closeBulkStockModal = function() {
  document.getElementById('bulk-stock-modal-overlay').classList.remove('active');
};

window.toggleSelectAllBulk = function() {
  const checkboxes = document.querySelectorAll('.bulk-prod-checkbox');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => { cb.checked = !allChecked; });
  updateBulkCount();
};

window.updateBulkCount = function() {
  const selected = document.querySelectorAll('.bulk-prod-checkbox:checked').length;
  const countEl = document.getElementById('bulk-selected-count');
  if (countEl) countEl.textContent = selected;
};

async function executeBulkStockUpdate() {
  const selectedCheckboxes = document.querySelectorAll('.bulk-prod-checkbox:checked');
  const productIds = Array.from(selectedCheckboxes).map(cb => cb.value);

  if (productIds.length === 0) {
    showToast('Please select at least one product for bulk update.', 'warning');
    return;
  }

  const mode = document.getElementById('bulk-mode').value;
  const amount = parseInt(document.getElementById('bulk-amount').value, 10);

  if (isNaN(amount) || amount < 0) {
    showToast('Please enter a valid non-negative amount.', 'error');
    return;
  }

  const submitBtn = document.getElementById('bulk-submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';

  const res = await window.dbService.bulkUpdateStock(productIds, mode, amount);
  
  submitBtn.disabled = false;
  submitBtn.textContent = 'APPLY BULK UPDATE';

  if (res.success) {
    showToast(`Successfully updated stock for ${res.count} product(s).`, 'success');
    closeBulkStockModal();
    await loadAllData();
  } else {
    showToast(res.error || 'Bulk stock update failed.', 'error');
  }
}

/* ========================================================================
   HELPERS & TOAST NOTIFICATIONS
   ======================================================================== */

function bindSearchAndFilters() {
  document.getElementById('search-cats')?.addEventListener('input', renderCategoriesTable);
  document.getElementById('filter-cat-status')?.addEventListener('change', renderCategoriesTable);
  document.getElementById('sort-cats')?.addEventListener('change', renderCategoriesTable);

  document.getElementById('search-inventory')?.addEventListener('input', renderInventoryTable);
  document.getElementById('filter-stock-status')?.addEventListener('change', renderInventoryTable);
  document.getElementById('filter-inventory-category')?.addEventListener('change', renderInventoryTable);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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