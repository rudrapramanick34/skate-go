/**
 * Skate Go - Global Search & Multi-Faceted Filter Controller
 * Handles URL query parameters, Supabase product fetching, filtering, sorting, and analytics logging.
 */

class SearchEngine {
  constructor() {
    this.catalog = [];
    this.filteredResults = [];
    this.currentQuery = '';
    this.selectedCategories = [];
    this.selectedDiameters = [];
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'relevance';

    this.init();
  }

  async init() {
    await this.loadCatalog();
    this.bindEvents();
    this.checkUrlParams();
    this.executeSearch();
  }

  async loadCatalog() {
    try {
      // Resolve the Supabase client via existing window.dbService or window.supabaseClient
      let client = window.supabaseClient;
      if (!client && window.dbService && typeof window.dbService.getClient === 'function') {
        client = await window.dbService.getClient();
      }

      if (client) {
        const { data, error } = await client
          .from('products')
          .select(`
            *,
            categories:category_id (
              id,
              name,
              slug
            )
          `)
          .eq('is_active', true);

        if (error) {
          console.error('[Skate Go Search] Supabase fetch error:', error);
          this.catalog = [];
        } else {
          this.catalog = data || [];
        }
      } else {
        console.warn('[Skate Go Search] Supabase client could not be initialized.');
        this.catalog = [];
      }
    } catch (e) {
      console.error('[Skate Go Search] Unexpected error during catalog fetch:', e);
      this.catalog = [];
    }
  }

  bindEvents() {
    const input = document.getElementById('global-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const sortSelect = document.getElementById('sort-select');

    // Live search input
    input?.addEventListener('input', (e) => {
      this.currentQuery = e.target.value.trim();
      if (clearBtn) clearBtn.style.display = this.currentQuery.length > 0 ? 'flex' : 'none';
      this.executeSearch();
    });

    // Clear search button
    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      this.currentQuery = '';
      clearBtn.style.display = 'none';
      this.executeSearch();
    });

    // Quick Tag Pills
    document.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        if (input && tag) {
          input.value = tag;
          this.currentQuery = tag;
          if (clearBtn) clearBtn.style.display = 'flex';
          this.executeSearch();
        }
      });
    });

    // Sort Dropdown
    sortSelect?.addEventListener('change', (e) => {
      this.sortBy = e.target.value;
      this.executeSearch();
    });

    // Sidebar Drawer Toggles
    const toggleBtn = document.getElementById('toggle-filter-btn');
    const closeBtn = document.getElementById('close-filter-btn');
    const sidebar = document.getElementById('filter-sidebar');

    toggleBtn?.addEventListener('click', () => sidebar?.classList.add('active'));
    closeBtn?.addEventListener('click', () => sidebar?.classList.remove('active'));

    // Category Checkboxes
    document.querySelectorAll('#category-filters input').forEach(cb => {
      cb.addEventListener('change', () => {
        this.selectedCategories = Array.from(document.querySelectorAll('#category-filters input:checked')).map(c => c.value);
        this.executeSearch();
      });
    });

    // Diameter Checkboxes
    document.querySelectorAll('#diameter-filters input').forEach(cb => {
      cb.addEventListener('change', () => {
        this.selectedDiameters = Array.from(document.querySelectorAll('#diameter-filters input:checked')).map(c => c.value);
        this.executeSearch();
      });
    });

    // Price Inputs
    document.getElementById('min-price-input')?.addEventListener('input', (e) => {
      this.minPrice = e.target.value !== '' ? Number(e.target.value) : null;
      this.executeSearch();
    });

    document.getElementById('max-price-input')?.addEventListener('input', (e) => {
      this.maxPrice = e.target.value !== '' ? Number(e.target.value) : null;
      this.executeSearch();
    });

    // Reset All Filters
    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
      this.resetAllFilters();
    });
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      this.currentQuery = query.trim();
      const input = document.getElementById('global-search-input');
      const clearBtn = document.getElementById('clear-search-btn');
      if (input) input.value = this.currentQuery;
      if (clearBtn) clearBtn.style.display = 'flex';
    }
  }

  executeSearch() {
    let results = [...this.catalog];

    // 1. Text Search Matching (Title, Description, Category Name, Slug)
    if (this.currentQuery) {
      const q = this.currentQuery.toLowerCase();
      results = results.filter(item => {
        const titleMatch = item.title && item.title.toLowerCase().includes(q);
        const descMatch = item.description && item.description.toLowerCase().includes(q);
        const catMatch = item.categories?.name && item.categories.name.toLowerCase().includes(q);
        const catSlugMatch = item.categories?.slug && item.categories.slug.toLowerCase().includes(q);
        const directCatMatch = item.category && item.category.toLowerCase().includes(q);
        const slugMatch = item.slug && item.slug.toLowerCase().includes(q);

        return titleMatch || descMatch || catMatch || catSlugMatch || directCatMatch || slugMatch;
      });

      this.logSearchAnalytics(this.currentQuery, results.length);
    }

    // 2. Category Filter
    if (this.selectedCategories.length > 0) {
      results = results.filter(item => {
        const itemCatSlug = (item.categories?.slug || item.category || '').toLowerCase();
        const itemCatName = (item.categories?.name || item.category_name || '').toLowerCase();
        return this.selectedCategories.some(sc => {
          const target = sc.toLowerCase();
          return itemCatSlug.includes(target) || itemCatName.includes(target);
        });
      });
    }

    // 3. Diameter Filter
    if (this.selectedDiameters.length > 0) {
      results = results.filter(item => {
        const diam = item.diameter ? String(item.diameter).toLowerCase() : '';
        const title = (item.title || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();

        return this.selectedDiameters.some(d => {
          const cleanD = d.toLowerCase().replace('mm', '');
          return diam.includes(cleanD) || title.includes(d.toLowerCase()) || title.includes(cleanD + 'mm') || desc.includes(d.toLowerCase());
        });
      });
    }

    // 4. Price Filter
    if (this.minPrice !== null && !isNaN(this.minPrice)) {
      results = results.filter(item => typeof item.price === 'number' && item.price >= this.minPrice);
    }
    if (this.maxPrice !== null && !isNaN(this.maxPrice)) {
      results = results.filter(item => typeof item.price === 'number' && item.price <= this.maxPrice);
    }

    // 5. Sorting
    if (this.sortBy === 'price-asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortBy === 'price-desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (this.sortBy === 'newest') {
      results.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    this.filteredResults = results;
    this.renderResults();
  }

  renderResults() {
    const grid = document.getElementById('search-results-grid');
    const emptyState = document.getElementById('no-results-state');
    const countEl = document.getElementById('results-count');

    if (countEl) countEl.textContent = this.filteredResults.length;

    if (this.filteredResults.length === 0) {
      if (grid) grid.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (grid) grid.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = this.filteredResults.map(product => {
      let mainImg = 'assets/images/placeholder-gear.jpg';
      if (Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
        mainImg = product.images[0];
      } else if (typeof product.image === 'string' && product.image.trim() !== '') {
        mainImg = product.image;
      }

      const categoryLabel = product.categories?.name || product.category_name || product.category || '';
      const productLink = product.slug ? `product.html?slug=${product.slug}` : `product.html?id=${product.id}`;

      return `
        <article class="search-card">
          <div class="search-card-img-wrap">
            <img src="${mainImg}" alt="${product.title || 'Product'}" class="search-card-img" loading="lazy" />
          </div>
          <div class="search-card-content">
            <div>
              <span class="search-card-cat">${categoryLabel}</span>
              <h3 class="search-card-title">${product.title || ''}</h3>
            </div>
            <div>
              <div class="search-card-price">₹${Number(product.price || 0).toLocaleString('en-IN')}</div>
              <a href="${productLink}" class="btn btn-primary btn-full btn-sm">VIEW GEAR</a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  resetAllFilters() {
    document.querySelectorAll('#category-filters input, #diameter-filters input').forEach(cb => cb.checked = false);
    const minInput = document.getElementById('min-price-input');
    const maxInput = document.getElementById('max-price-input');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';

    this.selectedCategories = [];
    this.selectedDiameters = [];
    this.minPrice = null;
    this.maxPrice = null;

    this.executeSearch();
  }

  async logSearchAnalytics(query, resultCount) {
    if (!query) return;
    try {
      let client = window.supabaseClient;
      if (!client && window.dbService && typeof window.dbService.getClient === 'function') {
        client = await window.dbService.getClient();
      }
      if (client) {
        await client.from('analytics').insert([{
          event_type: 'search_query',
          metadata: { query, result_count: resultCount },
          created_at: new Date().toISOString()
        }]);
      }
    } catch (err) {
      // Non-blocking background analytics
    }
  }
}

window.resetSearchEngine = function() {
  const input = document.getElementById('global-search-input');
  if (input) input.value = '';
  if (window.searchEngine) {
    window.searchEngine.currentQuery = '';
    window.searchEngine.resetAllFilters();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.searchEngine = new SearchEngine();
});