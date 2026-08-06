/**
 * Skate Go - Admin Products Controller
 * Module 7: Complete Product Management System (CRUD)
 */

let products = [];
let categories = [];
let currentImages = [];
let deleteTargetId = null;

// Pagination state
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

document.addEventListener('DOMContentLoaded', async () => {
  await window.adminAuthGuard.enforceAuth();
  await loadCategories();
  await loadProducts();
  bindFilterEvents();
  bindModalEvents();
  bindSlugGenerator();
  bindDiscountCalculator();
  bindImageManagementEvents();
  bindDeleteConfirmationModal();
});

/* ========================================================================
   1. DATA INITIALIZATION & LIVE REFRESH
   ======================================================================== */

async function loadCategories() {
  const result = await window.dbService.getCategories();
  if (result.success) {
    categories = result.data || [];
  } else {
    categories = [];
  }
  populateCategorySelects();
}

function populateCategorySelects() {
  const modalSelect = document.getElementById('prod-category');
  const filterSelect = document.getElementById('filter-category');

  if (modalSelect) {
    if (categories.length === 0) {
      modalSelect.innerHTML = '<option value="">No Categories Found</option>';
    } else {
      modalSelect.innerHTML = categories
        .map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
        .join('');
    }
  }

  if (filterSelect) {
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  }
}

async function loadProducts() {
  const result = await window.dbService.getAllProductsAdmin();
  if (result.success) {
    products = result.data || [];
  } else {
    products = [];
  }
  renderProductsTable();
}

/* ========================================================================
   2. FILTERS, SEARCH BY PRODUCT NAME, SORTING & PAGINATION
   ======================================================================== */

function bindFilterEvents() {
  const searchInput = document.getElementById('product-search-input');
  const catFilter = document.getElementById('filter-category');
  const stockFilter = document.getElementById('filter-stock');
  const visibilityFilter = document.getElementById('filter-visibility');
  const featuredFilter = document.getElementById('filter-featured');
  const sortFilter = document.getElementById('sort-products');

  const handleFilterChange = () => {
    currentPage = 1;
    renderProductsTable();
  };

  searchInput?.addEventListener('input', handleFilterChange);
  catFilter?.addEventListener('change', handleFilterChange);
  stockFilter?.addEventListener('change', handleFilterChange);
  visibilityFilter?.addEventListener('change', handleFilterChange);
  featuredFilter?.addEventListener('change', handleFilterChange);
  sortFilter?.addEventListener('change', handleFilterChange);
}

function getFilteredProducts() {
  const query = (document.getElementById('product-search-input')?.value || '').trim().toLowerCase();
  const selectedCat = document.getElementById('filter-category')?.value || '';
  const selectedStock = document.getElementById('filter-stock')?.value || '';
  const selectedVisibility = document.getElementById('filter-visibility')?.value || '';
  const selectedFeatured = document.getElementById('filter-featured')?.value || '';
  const selectedSort = document.getElementById('sort-products')?.value || 'newest';

  let list = [...products];

  // Search by Product Name, Category, or Brand
  if (query) {
    list = list.filter(p => {
      const nameMatch = (p.title || '').toLowerCase().includes(query);
      const catMatch = (p.categories?.name || '').toLowerCase().includes(query);
      const brandMatch = (p.brand || '').toLowerCase().includes(query);
      return nameMatch || catMatch || brandMatch;
    });
  }

  // Category Filter
  if (selectedCat) {
    list = list.filter(p => p.category_id === selectedCat);
  }

  // Stock Filter (In Stock > 5, Low Stock 1-5, Out of Stock 0)
  if (selectedStock === 'in_stock') {
    list = list.filter(p => (Number(p.stock_quantity) || 0) > 5);
  } else if (selectedStock === 'low_stock') {
    const stockVal = Number(p.stock_quantity) || 0;
    list = list.filter(p => (Number(p.stock_quantity) || 0) > 0 && (Number(p.stock_quantity) || 0) <= 5);
  } else if (selectedStock === 'out_of_stock') {
    list = list.filter(p => (Number(p.stock_quantity) || 0) <= 0);
  }

  // Active / Inactive Visibility Filter
  if (selectedVisibility === 'visible') {
    list = list.filter(p => p.is_active !== false);
  } else if (selectedVisibility === 'hidden') {
    list = list.filter(p => p.is_active === false);
  }

  // Featured Filter
  if (selectedFeatured === 'featured') {
    list = list.filter(p => Boolean(p.is_featured));
  } else if (selectedFeatured === 'standard') {
    list = list.filter(p => !p.is_featured);
  }

  // Sorting
  if (selectedSort === 'oldest') {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  } else if (selectedSort === 'price_asc') {
    list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  } else if (selectedSort === 'price_desc') {
    list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
  } else {
    // Newest first
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return list;
}

function renderProductsTable() {
  const tbody = document.getElementById('admin-products-tbody');
  const infoEl = document.getElementById('pagination-info');
  const controlsEl = document.getElementById('pagination-controls');

  if (!tbody) return;

  const filtered = getFilteredProducts();
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (totalItems === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 2.5rem; color: var(--color-text-secondary);">
          No products found matching filters. Click <strong>"+ ADD NEW GEAR"</strong> to add items.
        </td>
      </tr>`;
    if (infoEl) infoEl.textContent = 'Showing 0 products';
    if (controlsEl) controlsEl.innerHTML = '';
    return;
  }

  tbody.innerHTML = pageItems.map(p => {
    const primaryImg = (p.images && p.images.length > 0 && p.images[0]) ? p.images[0] : '../assets/images/placeholder-gear.jpg';
    const categoryName = p.categories?.name || 'Uncategorized';
    
    // Price & Discount Calculations
    const currentPrice = Number(p.price || 0);
    const origPriceVal = Number(p.original_price || 0);
    const sellingPriceFormatted = `₹${currentPrice.toLocaleString('en-IN')}`;
    
    let discountPriceFormatted = '-';
    if (origPriceVal > currentPrice) {
      const discountPct = Math.round(((origPriceVal - currentPrice) / origPriceVal) * 100);
      discountPriceFormatted = `<span style="text-decoration: line-through; color: var(--color-text-secondary);">₹${origPriceVal.toLocaleString('en-IN')}</span> <span class="discount-tag">${discountPct}% OFF</span>`;
    }

    // Stock Badge Calculation
    const stock = Number(p.stock_quantity || 0);
    let stockBadge = '';
    if (stock <= 0) {
      stockBadge = '<span class="status-badge out-of-stock">Out of Stock</span>';
    } else if (stock <= 5) {
      stockBadge = `<span class="status-badge low-stock">${stock} left (Low Stock)</span>`;
    } else {
      stockBadge = `<span class="status-badge in-stock">${stock} in stock</span>`;
    }

    // Active/Inactive Visibility Status
    const isVisible = p.is_active !== false;
    const statusBadge = isVisible
      ? '<span class="status-badge paid">Active</span>'
      : '<span class="status-badge hidden-badge">Inactive</span>';

    const isFeatured = Boolean(p.is_featured);
    const createdDate = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';

    return `
      <tr>
        <td>
          <img src="${primaryImg}" alt="${escapeHtml(p.title)}" style="width: 44px; height: 44px; border-radius: 6px; object-fit: cover; border: 1px solid var(--color-card-border);" />
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong>
          ${p.brand ? `<br><small style="color: var(--color-text-secondary);">${escapeHtml(p.brand)}</small>` : ''}
        </td>
        <td>${escapeHtml(categoryName)}</td>
        <td><strong>${sellingPriceFormatted}</strong></td>
        <td>${discountPriceFormatted}</td>
        <td>${stockBadge}</td>
        <td>${statusBadge}</td>
        <td><small style="color: var(--color-text-secondary);">${createdDate}</small></td>
        <td>
          <div class="action-btn-group">
            <button class="btn-icon-action" onclick="editProduct('${p.id}')" title="Edit Product">Edit</button>
            <button class="btn-icon-action" onclick="duplicateProduct('${p.id}')" title="Duplicate Product">Copy</button>
            <button class="btn-icon-action ${isFeatured ? 'featured-active' : ''}" onclick="toggleFeatured('${p.id}')" title="Toggle Featured">★</button>
            <button class="btn-icon-action ${!isVisible ? 'visibility-hidden' : ''}" onclick="toggleVisibility('${p.id}')" title="Toggle Status">${isVisible ? 'Hide' : 'Show'}</button>
            <button class="btn-logout" style="padding: 0.3rem 0.5rem; font-size: 0.75rem;" onclick="promptDeleteProduct('${p.id}')" title="Delete Product">Del</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Update Pagination Info
  const startNum = startIndex + 1;
  const endNum = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  if (infoEl) infoEl.textContent = `Showing ${startNum}-${endNum} of ${totalItems} products`;

  // Render Page Numbers
  if (controlsEl) {
    let paginationHtml = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">&laquo; Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    paginationHtml += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next &raquo;</button>`;
    controlsEl.innerHTML = paginationHtml;
  }
}

window.changePage = function(newPage) {
  currentPage = newPage;
  renderProductsTable();
};

/* ========================================================================
   3. AUTO SLUG GENERATOR & DISCOUNT CALCULATOR
   ======================================================================== */

function bindSlugGenerator() {
  const titleInput = document.getElementById('prod-title');
  const slugInput = document.getElementById('prod-slug');

  titleInput?.addEventListener('input', () => {
    const id = document.getElementById('prod-id').value;
    if (!id) {
      slugInput.value = slugify(titleInput.value);
    }
  });
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-');
}

function bindDiscountCalculator() {
  const priceInput = document.getElementById('prod-price');
  const origPriceInput = document.getElementById('prod-orig-price');
  const badge = document.getElementById('discount-calc-badge');

  const calculateDiscount = () => {
    const sale = parseFloat(priceInput.value);
    const orig = parseFloat(origPriceInput.value);

    if (!isNaN(sale) && !isNaN(orig) && orig > sale && orig > 0) {
      const discountPct = Math.round(((orig - sale) / orig) * 100);
      badge.textContent = `${discountPct}% OFF`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  };

  priceInput?.addEventListener('input', calculateDiscount);
  origPriceInput?.addEventListener('input', calculateDiscount);
}

/* ========================================================================
   4. IMAGE MANAGEMENT (SUPABASE STORAGE UPLOAD, REORDER & REMOVE)
   ======================================================================== */

function bindImageManagementEvents() {
  const fileInput = document.getElementById('prod-file-input');
  const addUrlBtn = document.getElementById('add-url-btn');
  const urlInput = document.getElementById('prod-url-input');

  fileInput?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    if (currentImages.length + files.length > 7) {
      showModalAlert('Maximum limit of 7 images allowed per product.');
      fileInput.value = '';
      return;
    }

    const progressText = document.getElementById('upload-progress-text');
    if (progressText) progressText.style.display = 'block';

    for (const file of files) {
      if (currentImages.length >= 7) break;
      const result = await window.dbService.uploadProductImage(file);
      if (result.success && result.url) {
        currentImages.push(result.url);
      } else {
        showModalAlert(`Image upload failed: ${result.error || 'Unknown error'}`);
      }
    }

    if (progressText) progressText.style.display = 'none';
    fileInput.value = '';
    renderImageGallery();
  });

  addUrlBtn?.addEventListener('click', () => {
    const url = (urlInput.value || '').trim();
    if (!url) return;

    if (currentImages.length >= 7) {
      showModalAlert('Maximum limit of 7 images reached.');
      return;
    }

    currentImages.push(url);
    urlInput.value = '';
    renderImageGallery();
  });
}

function renderImageGallery() {
  const container = document.getElementById('image-gallery-grid');
  if (!container) return;

  if (currentImages.length === 0) {
    container.innerHTML = `<span style="font-size: 0.75rem; color: var(--color-text-secondary); grid-column: 1 / -1;">No images added yet. (Minimum 1 image recommended)</span>`;
    return;
  }

  container.innerHTML = currentImages.map((url, idx) => `
    <div class="gallery-card ${idx === 0 ? 'primary-card' : ''}">
      <img src="${url}" alt="Product Image ${idx + 1}" />
      ${idx === 0 ? '<span class="gallery-primary-badge">PRIMARY</span>' : ''}
      <div class="gallery-controls-overlay">
        ${idx > 0 ? `<button type="button" class="gallery-ctrl-btn" onclick="makePrimaryImage(${idx})" title="Make Primary">★</button>` : '<span></span>'}
        ${idx > 0 ? `<button type="button" class="gallery-ctrl-btn" onclick="moveImageLeft(${idx})" title="Move Left">&larr;</button>` : ''}
        ${idx < currentImages.length - 1 ? `<button type="button" class="gallery-ctrl-btn" onclick="moveImageRight(${idx})" title="Move Right">&rarr;</button>` : ''}
        <button type="button" class="gallery-ctrl-btn danger" onclick="removeGalleryImage(${idx})" title="Remove Image">&times;</button>
      </div>
    </div>
  `).join('');
}

window.makePrimaryImage = function(idx) {
  if (idx <= 0 || idx >= currentImages.length) return;
  const [target] = currentImages.splice(idx, 1);
  currentImages.unshift(target);
  renderImageGallery();
};

window.moveImageLeft = function(idx) {
  if (idx <= 0) return;
  const temp = currentImages[idx - 1];
  currentImages[idx - 1] = currentImages[idx];
  currentImages[idx] = temp;
  renderImageGallery();
};

window.moveImageRight = function(idx) {
  if (idx >= currentImages.length - 1) return;
  const temp = currentImages[idx + 1];
  currentImages[idx + 1] = currentImages[idx];
  currentImages[idx] = temp;
  renderImageGallery();
};

window.removeGalleryImage = function(idx) {
  const removedUrl = currentImages[idx];
  currentImages.splice(idx, 1);
  renderImageGallery();
  if (removedUrl) {
    window.dbService.deleteStorageImage(removedUrl);
  }
};

/* ========================================================================
   5. MODAL FORM BINDINGS & SAVE / LIVE REFRESH ROUTINE
   ======================================================================== */

function bindModalEvents() {
  const overlay = document.getElementById('product-modal-overlay');
  const modal = document.getElementById('product-modal');
  const openBtn = document.getElementById('open-add-product-btn');
  const closeBtn = document.getElementById('close-product-modal');
  const form = document.getElementById('product-form');

  openBtn?.addEventListener('click', () => {
    resetForm();
    document.getElementById('modal-product-title').textContent = 'ADD NEW PRODUCT';
    overlay.classList.add('active');
    modal.classList.add('active');
  });

  closeBtn?.addEventListener('click', closeModal);
  overlay?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProduct();
  });
}

function closeModal() {
  document.getElementById('product-modal-overlay')?.classList.remove('active');
  document.getElementById('product-modal')?.classList.remove('active');
  hideModalAlert();
}

function resetForm() {
  const form = document.getElementById('product-form');
  form?.reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-active').checked = true;
  document.getElementById('prod-featured').checked = false;
  document.getElementById('discount-calc-badge').style.display = 'none';
  currentImages = [];
  renderImageGallery();
  hideModalAlert();
}

function showModalAlert(msg) {
  const alertBox = document.getElementById('modal-alert-box');
  if (alertBox) {
    alertBox.textContent = msg;
    alertBox.style.display = 'block';
  }
}

function hideModalAlert() {
  const alertBox = document.getElementById('modal-alert-box');
  if (alertBox) alertBox.style.display = 'none';
}

async function saveProduct() {
  hideModalAlert();

  const id = document.getElementById('prod-id').value;
  const title = document.getElementById('prod-title').value.trim();
  const rawSlug = document.getElementById('prod-slug').value.trim();
  const slug = slugify(rawSlug || title);
  const categoryId = document.getElementById('prod-category').value;
  const brand = document.getElementById('prod-brand').value.trim();
  const price = parseFloat(document.getElementById('prod-price').value);
  const origPrice = parseFloat(document.getElementById('prod-orig-price').value);
  const stock = parseInt(document.getElementById('prod-stock').value, 10);
  const weight = document.getElementById('prod-weight').value.trim();
  const sizesRaw = document.getElementById('prod-sizes').value;
  const colorsRaw = document.getElementById('prod-colors').value;
  const isActive = document.getElementById('prod-active').checked;
  const isFeatured = document.getElementById('prod-featured').checked;
  const shortDesc = document.getElementById('prod-short-desc').value.trim();
  const description = document.getElementById('prod-desc').value.trim();
  const seoTitle = document.getElementById('prod-seo-title').value.trim();
  const seoDesc = document.getElementById('prod-seo-desc').value.trim();

  // Strict Validation Rules
  if (!title) {
    showModalAlert('Product Name is required.');
    return;
  }
  if (!categoryId) {
    showModalAlert('Please select a Category.');
    return;
  }
  if (isNaN(price) || price <= 0) {
    showModalAlert('Price must be greater than 0.');
    return;
  }
  if (!isNaN(origPrice) && origPrice < 0) {
    showModalAlert('Discount Price cannot be negative.');
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showModalAlert('Stock Quantity cannot be negative.');
    return;
  }

  // Check unique SEO slug in DB
  const isDuplicateSlug = await window.dbService.checkSlugExists(slug, id || null);
  if (isDuplicateSlug) {
    showModalAlert(`SEO Slug "${slug}" is already in use by another product. Please modify the slug.`);
    return;
  }

  const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const colors = colorsRaw ? colorsRaw.split(',').map(c => c.trim()).filter(Boolean) : [];

  const finalImages = currentImages.length > 0
    ? currentImages
    : ['assets/images/placeholder-gear.jpg'];

  const payload = {
    title,
    slug,
    category_id: categoryId,
    brand: brand || null,
    price: price,
    original_price: !isNaN(origPrice) && origPrice > 0 ? origPrice : null,
    stock_quantity: stock,
    weight: weight || null,
    sizes,
    colors,
    is_active: isActive,
    is_featured: isFeatured,
    short_description: shortDesc || null,
    description: description || title,
    seo_title: seoTitle || null,
    seo_description: seoDesc || null,
    images: finalImages
  };

  const saveBtn = document.getElementById('save-product-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'SAVING PRODUCT...';

  let result;
  if (id) {
    result = await window.dbService.updateProduct(id, payload);
  } else {
    result = await window.dbService.createProduct(payload);
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'SAVE PRODUCT';

  if (result.success) {
    closeModal();
    // Live Refresh without full page reload
    await loadProducts();
  } else {
    showModalAlert(`Failed to save product: ${result.error || 'Database rejected operation'}`);
  }
}

/* ========================================================================
   6. ACTIONS: EDIT, COPY, TOGGLES & DELETE
   ======================================================================== */

window.editProduct = function(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  resetForm();

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-title').value = p.title || '';
  document.getElementById('prod-slug').value = p.slug || slugify(p.title || '');
  document.getElementById('prod-category').value = p.category_id || '';
  document.getElementById('prod-brand').value = p.brand || '';
  document.getElementById('prod-price').value = p.price || '';
  document.getElementById('prod-orig-price').value = p.original_price || '';
  document.getElementById('prod-stock').value = p.stock_quantity ?? 0;
  document.getElementById('prod-weight').value = p.weight || '';
  document.getElementById('prod-sizes').value = Array.isArray(p.sizes) ? p.sizes.join(', ') : '';
  document.getElementById('prod-colors').value = Array.isArray(p.colors) ? p.colors.join(', ') : '';
  document.getElementById('prod-active').checked = p.is_active !== false;
  document.getElementById('prod-featured').checked = Boolean(p.is_featured);
  document.getElementById('prod-short-desc').value = p.short_description || '';
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-seo-title').value = p.seo_title || '';
  document.getElementById('prod-seo-desc').value = p.seo_description || '';

  currentImages = Array.isArray(p.images) ? [...p.images] : [];
  renderImageGallery();

  document.getElementById('modal-product-title').textContent = 'EDIT PRODUCT';
  document.getElementById('product-modal-overlay').classList.add('active');
  document.getElementById('product-modal').classList.add('active');

  // Trigger discount calculator to update badge if applicable
  const origPriceInput = document.getElementById('prod-orig-price');
  if (origPriceInput) origPriceInput.dispatchEvent(new Event('input'));
};

window.duplicateProduct = async function(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  const duplicatedPayload = {
    title: `${p.title} (Copy)`,
    slug: `${p.slug}-copy-${Math.floor(100 + Math.random() * 900)}`,
    category_id: p.category_id,
    brand: p.brand,
    price: p.price,
    original_price: p.original_price,
    stock_quantity: p.stock_quantity,
    weight: p.weight,
    sizes: p.sizes,
    colors: p.colors,
    is_active: false, // Default duplicated item to inactive/draft
    is_featured: false,
    short_description: p.short_description,
    description: p.description,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    images: Array.isArray(p.images) ? [...p.images] : []
  };

  const result = await window.dbService.createProduct(duplicatedPayload);
  if (result.success) {
    await loadProducts();
  } else {
    alert(`Failed to duplicate product: ${result.error}`);
  }
};

window.toggleVisibility = async function(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  const newStatus = !(p.is_active !== false);
  const result = await window.dbService.updateProduct(id, { is_active: newStatus });
  if (result.success) {
    p.is_active = newStatus;
    renderProductsTable();
  }
};

window.toggleFeatured = async function(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  const newFeatured = !Boolean(p.is_featured);
  const result = await window.dbService.updateProduct(id, { is_featured: newFeatured });
  if (result.success) {
    p.is_featured = newFeatured;
    renderProductsTable();
  }
};

/* ========================================================================
   7. DELETE CONFIRMATION POPUP HANDLERS & LIVE REFRESH
   ======================================================================== */

function bindDeleteConfirmationModal() {
  const overlay = document.getElementById('confirm-delete-overlay');
  const modal = document.getElementById('confirm-delete-modal');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  const closeBtn = document.getElementById('close-delete-modal');
  const confirmBtn = document.getElementById('confirm-delete-btn');

  const closeDeleteModal = () => {
    overlay?.classList.remove('active');
    modal?.classList.remove('active');
    deleteTargetId = null;
  };

  cancelBtn?.addEventListener('click', closeDeleteModal);
  closeBtn?.addEventListener('click', closeDeleteModal);
  overlay?.addEventListener('click', closeDeleteModal);

  confirmBtn?.addEventListener('click', async () => {
    if (!deleteTargetId) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'DELETING...';

    const p = products.find(prod => prod.id === deleteTargetId);
    const result = await window.dbService.deleteProduct(deleteTargetId);

    confirmBtn.disabled = false;
    confirmBtn.textContent = 'DELETE PERMANENTLY';

    if (result.success) {
      if (p && Array.isArray(p.images)) {
        for (const imgUrl of p.images) {
          await window.dbService.deleteStorageImage(imgUrl);
        }
      }
      closeDeleteModal();
      // Live Refresh product list
      await loadProducts();
    } else {
      alert(`Failed to delete product: ${result.error}`);
    }
  });
}

window.promptDeleteProduct = function(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  deleteTargetId = id;
  const titleEl = document.getElementById('delete-prod-title');
  if (titleEl) titleEl.textContent = `"${p.title}"`;

  document.getElementById('confirm-delete-overlay')?.classList.add('active');
  document.getElementById('confirm-delete-modal')?.classList.add('active');
};

/**
 * Utility: HTML String Sanitizer
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}