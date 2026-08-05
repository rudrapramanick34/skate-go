/**
 * Skate Lab - Global Search & Multi-Faceted Filter Controller
 * Handles query URL params, dynamic full-text search, filter execution, and analytics logging.
 */

// Fallback high-performance catalog items if Supabase is initializing or offline
const MOCK_SEARCH_CATALOG = [
  {
    id: "p1",
    title: "Atom Matrix 80mm/86A Inline Wheels (8 Pack)",
    slug: "atom-matrix-80mm-wheels",
    category: "wheels",
    category_name: "Inline Wheels",
    price: 3499,
    diameter: "80mm",
    images: ["assets/images/placeholder-gear.jpg"],
    description: "High rebound premium urethane wheels engineered for indoor and outdoor velocity."
  },
  {
    id: "p2",
    title: "Wicked Swiss Ceramic Precision Bearings (16 Pack)",
    slug: "wicked-swiss-ceramic-bearings",
    category: "bearings",
    category_name: "Bearings & Speed Kits",
    price: 4999,
    diameter: null,
    images: ["assets/images/placeholder-gear.jpg"],
    description: "Ultra-low friction ceramic balls in silicon-treated cages for maximum speed durability."
  },
  {
    id: "p3",
    title: "Powerslide Trinity 3x110 CNC Aluminium Frame",
    slug: "powerslide-trinity-3x110-frame",
    category: "frames",
    category_name: "Frames & Chassis",
    price: 8999,
    diameter: "110mm",
    images: ["assets/images/placeholder-gear.jpg"],
    description: "Aircraft-grade extruded aluminium frame with 3-point Trinity mounting system."
  },
  {
    id: "p4",
    title: "Ennui City Brace Anatomic Wrist Guard",
    slug: "ennui-city-brace-wrist-guard",
    category: "protective",
    category_name: "Protective Gear",
    price: 2799,
    diameter: null,
    images: ["assets/images/placeholder-gear.jpg"],
    description: "Full leather palm with dual aluminum splints for elite wrist protection."
  },
  {
    id: "p5",
    title: "Sonic Pro Inline Skate Tool Kit",
    slug: "sonic-pro-inline-skate-tool",
    category: "maintenance",
    category_name: "Maintenance & Tools",
    price: 1299,
    diameter: null,
    images: ["assets/images/placeholder-gear.jpg"],
    description: "Precision 4mm Allen key, bearing pusher, axle extractor, and spacer aligner."
  }
];

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
      if (window.supabaseClient) {
        const { data, error } = await window.supabaseClient.from('products').select('*');
        if (!error && data && data.length > 0) {
          this.catalog = data;
          return;
        }
      }
    } catch (e) {
      console.warn('Supabase search fetch warning:', e);
    }
    // Fallback if DB empty or initializing
    this.catalog = MOCK_SEARCH_CATALOG;
  }

  bindEvents() {
    const input = document.getElementById('global-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const sortSelect = document.getElementById('sort-select');

    // Live search input
    input?.addEventListener('input', (e) => {
      this.currentQuery = e.target.value.trim();
      clearBtn.style.display = this.currentQuery.length > 0 ? 'flex' : 'none';
      this.executeSearch();
    });

    // Clear search button
    clearBtn?.addEventListener('click', () => {
      input.value = '';
      this.currentQuery = '';
      clearBtn.style.display = 'none';
      this.executeSearch();
    });

    // Quick Tag Pills
    document.querySelectorAll('.tag-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const tag = pill.getAttribute('data-tag');
        if (input) {
          input.value = tag;
          this.currentQuery = tag;
          clearBtn.style.display = 'flex';
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
      this.minPrice = e.target.value ? Number(e.target.value) : null;
      this.executeSearch();
    });

    document.getElementById('max-price-input')?.addEventListener('input', (e) => {
      this.maxPrice = e.target.value ? Number(e.target.value) : null;
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
      this.currentQuery = query;
      const input = document.getElementById('global-search-input');
      const clearBtn = document.getElementById('clear-search-btn');
      if (input) input.value = query;
      if (clearBtn) clearBtn.style.display = 'flex';
    }
  }

  executeSearch() {
    let results = [...this.catalog];

    // 1. Query Matching
    if (this.currentQuery) {
      const q = this.currentQuery.toLowerCase();
      results = results.filter(item => 
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
      );

      // Dispatch search analytics event
      this.logSearchAnalytics(this.currentQuery, results.length);
    }

    // 2. Category Filter
    if (this.selectedCategories.length > 0) {
      results = results.filter(item => this.selectedCategories.includes(item.category));
    }

    // 3. Diameter Filter
    if (this.selectedDiameters.length > 0) {
      results = results.filter(item => item.diameter && this.selectedDiameters.includes(item.diameter));
    }

    // 4. Price Filter
    if (this.minPrice !== null) {
      results = results.filter(item => item.price >= this.minPrice);
    }
    if (this.maxPrice !== null) {
      results = results.filter(item => item.price <= this.maxPrice);
    }

    // 5. Sorting
    if (this.sortBy === 'price-asc') {
      results.sort((a, b) => a.price - b.price);
    } else if (this.sortBy === 'price-desc') {
      results.sort((a, b) => b.price - a.price);
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

    grid.innerHTML = this.filteredResults.map(product => `
      <article class="search-card">
        <div class="search-card-img-wrap">
          <img src="${product.images?.[0] || 'assets/images/placeholder-gear.jpg'}" alt="${product.title}" class="search-card-img" loading="lazy" />
        </div>
        <div class="search-card-content">
          <div>
            <span class="search-card-cat">${product.category_name || product.category}</span>
            <h3 class="search-card-title">${product.title}</h3>
          </div>
          <div>
            <div class="search-card-price">₹${product.price.toLocaleString('en-IN')}</div>
            <a href="product.html?id=${product.id}" class="btn btn-primary btn-full btn-sm">VIEW GEAR</a>
          </div>
        </div>
      </article>
    `).join('');
  }

  resetAllFilters() {
    document.querySelectorAll('#category-filters input, #diameter-filters input').forEach(cb => cb.checked = false);
    document.getElementById('min-price-input').value = '';
    document.getElementById('max-price-input').value = '';
    
    this.selectedCategories = [];
    this.selectedDiameters = [];
    this.minPrice = null;
    this.maxPrice = null;
    
    this.executeSearch();
  }

  async logSearchAnalytics(query, resultCount) {
    if (!window.supabaseClient || !query) return;
    try {
      await window.supabaseClient.from('analytics').insert([{
        event_type: 'search_query',
        metadata: { query, result_count: resultCount },
        created_at: new Date().toISOString()
      }]);
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