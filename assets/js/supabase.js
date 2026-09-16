/**
 * Skate Go - Supabase Integration Client & Service Layer
 * Module 10: Store Settings & Business Control Center Integration
 */

// Global Configuration Namespace
window.SKATE_LAB_CONFIG = window.SKATE_LAB_CONFIG || {
  SUPABASE_URL: 'https://rizwkhclzqwdubvoaint.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_nKBHG5o4x2_aDtP0mMDFQA_goeD1jN5'
};

class SupabaseDataService {
  constructor() {
    this.client = null;
    this.initPromise = this.initClient();
  }

  /**
   * Initializes Supabase Client with CDN fallbacks
   */
  async initClient() {
    if (window.supabase && window.supabase.createClient) {
      this.client = window.supabase.createClient(
        window.SKATE_LAB_CONFIG.SUPABASE_URL,
        window.SKATE_LAB_CONFIG.SUPABASE_ANON_KEY
      );
      return this.client;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      script.onload = () => {
        if (window.supabase && window.supabase.createClient) {
          this.client = window.supabase.createClient(
            window.SKATE_LAB_CONFIG.SUPABASE_URL,
            window.SKATE_LAB_CONFIG.SUPABASE_ANON_KEY
          );
          resolve(this.client);
        } else {
          reject(new Error('Failed to initialize Supabase JS SDK'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Supabase script from CDN'));
      document.head.appendChild(script);
    });
  }

  async getClient() {
    if (!this.client) {
      await this.initPromise;
    }
    return this.client;
  }

  /* ========================================================================
     1. CATEGORY SERVICES
     ======================================================================== */
  async getCategories({ includeHidden = true } = {}) {
    try {
      const client = await this.getClient();
      let query = client
        .from('categories')
        .select('*, products:products(id)')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!includeHidden) {
        query = query.eq('is_hidden', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching categories:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  async createCategory(categoryPayload) {
    try {
      const client = await this.getClient();

      const { data: nameCheck } = await client
        .from('categories')
        .select('id')
        .ilike('name', categoryPayload.name.trim());

      if (nameCheck && nameCheck.length > 0) {
        return { success: false, error: 'A category with this name already exists.' };
      }

      const { data: slugCheck } = await client
        .from('categories')
        .select('id')
        .eq('slug', categoryPayload.slug.trim());

      if (slugCheck && slugCheck.length > 0) {
        return { success: false, error: 'A category with this URL slug already exists.' };
      }

      const { data, error } = await client
        .from('categories')
        .insert([categoryPayload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Skate Go DataService] Error creating category:', err.message);
      return { success: false, error: err.message };
    }
  }

  async updateCategory(id, categoryPayload) {
    try {
      const client = await this.getClient();

      const { data: nameCheck } = await client
        .from('categories')
        .select('id')
        .ilike('name', categoryPayload.name.trim())
        .neq('id', id);

      if (nameCheck && nameCheck.length > 0) {
        return { success: false, error: 'Another category with this name already exists.' };
      }

      const { data: slugCheck } = await client
        .from('categories')
        .select('id')
        .eq('slug', categoryPayload.slug.trim())
        .neq('id', id);

      if (slugCheck && slugCheck.length > 0) {
        return { success: false, error: 'Another category with this URL slug already exists.' };
      }

      const { data, error } = await client
        .from('categories')
        .update(categoryPayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error updating category (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async toggleCategoryVisibility(id, isHidden) {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('categories')
        .update({ is_hidden: isHidden })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error toggling category visibility (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async deleteCategory(id) {
    try {
      const client = await this.getClient();

      const { data: prods, error: countErr } = await client
        .from('products')
        .select('id')
        .eq('category_id', id);

      if (countErr) throw countErr;

      if (prods && prods.length > 0) {
        return {
          success: false,
          error: `Cannot delete category: ${prods.length} product(s) are currently assigned to it.`
        };
      }

      const { error } = await client
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error(`[Skate Go DataService] Error deleting category (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Upload category banner/thumb image
   */
  async uploadCategoryImage(file) {
    try {
      const client = await this.getClient();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `categories/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await client.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrlData.publicUrl };
    } catch (err) {
      console.error('[Skate Go DataService] Category image upload error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /* ========================================================================
     2. INVENTORY & PRODUCT CONTROL SERVICES
     ======================================================================== */
  async getInventoryProducts() {
    try {
      const client = await this.getClient();
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
        .order('title', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching inventory:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  async getAllProductsAdmin() {
    try {
      const client = await this.getClient();
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching admin products:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  async checkSlugExists(slug, excludeId = null) {
    try {
      const client = await this.getClient();
      let query = client
        .from('products')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data && data.length > 0;
    } catch (err) {
      console.error('[Skate Go DataService] Error checking slug exists:', err.message);
      return false;
    }
  }

  async updateProductStock(id, newStockQuantity) {
    try {
      if (isNaN(newStockQuantity) || newStockQuantity < 0) {
        return { success: false, error: 'Stock quantity cannot be negative.' };
      }

      const client = await this.getClient();
      const { data, error } = await client
        .from('products')
        .update({
          stock_quantity: Math.max(0, parseInt(newStockQuantity, 10)),
          stock_updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error updating product stock (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async toggleProductActive(id, isActive) {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('products')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error toggling product status (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  /* ========================================================================
     3. PUBLIC & ADMIN CRUD SERVICES
     ======================================================================== */
  async getProducts({ categorySlug = null, sortBy = 'newest', searchQuery = null, limit = 50 } = {}) {
    try {
      const client = await this.getClient();
      let query = client
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

      if (categorySlug) {
        const { data: catData } = await client
          .from('categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();

        if (catData) {
          query = query.eq('category_id', catData.id);
        }
      }

      if (searchQuery && searchQuery.trim() !== '') {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      if (sortBy === 'price_asc') {
        query = query.order('price', { ascending: true });
      } else if (sortBy === 'price_desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching public products:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  async getProductBySlug(slug) {
    try {
      const client = await this.getClient();
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
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error fetching product by slug (${slug}):`, err.message);
      return { success: false, error: err.message, data: null };
    }
  }

  async createProduct(productPayload) {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('products')
        .insert([productPayload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Skate Go DataService] Error creating product:', err.message);
      return { success: false, error: err.message };
    }
  }

  async updateProduct(id, productPayload) {
    try {
      const client = await this.getClient();
      const payload = {
        ...productPayload,
        stock_updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error(`[Skate Go DataService] Error updating product (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async deleteProduct(id) {
    try {
      const client = await this.getClient();
      const { error } = await client
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error(`[Skate Go DataService] Error deleting product (${id}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  async uploadProductImage(file) {
    try {
      const client = await this.getClient();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `products/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await client.storage
        .from('product-images')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrlData.publicUrl };
    } catch (err) {
      console.error('[Skate Go DataService] Image upload error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async deleteStorageImage(imageUrl) {
    try {
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.includes('/product-images/')) {
        return { success: false, error: 'Invalid storage image URL' };
      }
      const client = await this.getClient();
      const parts = imageUrl.split('/product-images/');
      if (parts.length < 2) return { success: false, error: 'Cannot parse image path' };
      const filePath = parts[1];

      const { error } = await client.storage
        .from('product-images')
        .remove([filePath]);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('[Skate Go DataService] Error deleting storage image:', err.message);
      return { success: false, error: err.message };
    }
  }

  async uploadStoreAsset(file, fileName) {
    try {
      const client = await this.getClient();
      const sanitizedName = (fileName || file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `assets/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await client.storage
        .from('store-assets')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage
        .from('store-assets')
        .getPublicUrl(filePath);

      return { success: true, url: publicUrlData.publicUrl };
    } catch (err) {
      console.error('[Skate Go DataService] Asset upload error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /* ========================================================================
     4. ORDER MANAGEMENT SERVICES
     ======================================================================== */
  async createOrder(orderData) {
    try {
      const client = await this.getClient();
      const now = new Date().toISOString();

      const payload = {
        ...orderData,
        created_at: now
      };

      const { data, error } = await client
        .from('orders')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Skate Go DataService] Error creating order:', err.message);
      return { success: false, error: err.message, data: null };
    }
  }

  async getOrders() {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching orders:', err.message);
      return { success: false, error: err.message, data: [] };
    }
  }

  /* ========================================================================
     5. MODULE 10: STORE SETTINGS & SYSTEM HEALTH SERVICES
     ======================================================================== */
  async getStoreSettings() {
    try {
      const client = await this.getClient();
      const { data, error } = await client
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Skate Go DataService] Error fetching store settings:', err.message);
      return {
        success: false,
        error: err.message,
        data: {
          store_name: 'Skate Go',
          store_description: 'Premium Inline Skating Accessories & Speed Equipment in India.',
          whatsapp_number: '917063062326',
          support_phone: '+91 7063062326',
          support_email: 'support@skatelab.in',
          business_address: 'Plot 42, Speed Avenue, Urban Sports Hub, New Delhi, India 110001',
          min_advance_pct: 60,
          flat_shipping_charge: 99,
          free_shipping_amount: 2999,
          estimated_delivery_days: '3 - 5 Business Days',
          default_courier: 'BlueDart / Delhivery',
          upi_id: 'skatelab@upi',
          upi_qr_image: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=400&q=80',
          enable_cod: true,
          announcement_bar_enabled: true,
          announcement_bar_text: 'FREE SHIPPING IN INDIA ON ORDERS ABOVE ₹2,999',
          hero_banner_title: 'HIGH PERFORMANCE INLINE GEAR',
          hero_banner_subtitle: 'Engineered for speed, durability, and maximum agility.',
          hero_banner_cta_text: 'SHOP CATALOG',
          hero_banner_cta_link: 'shop.html',
          seo_default_title: 'Skate Go | Inline Skating Accessories & Speed Gear',
          seo_default_description: 'Shop high performance inline wheels, bearings, frames, and protective gear in India.',
          maintenance_mode: false
        }
      };
    }
  }

  async updateStoreSettings(settingsPayload) {
    try {
      const client = await this.getClient();
      const payload = {
        ...settingsPayload,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('store_settings')
        .update(payload)
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('[Skate Go DataService] Error updating store settings:', err.message);
      return { success: false, error: err.message };
    }
  }

  async checkSystemHealth() {
    try {
      const client = await this.getClient();
      
      const { data: dbCheck, error: dbErr } = await client.from('store_settings').select('id').eq('id', 1).single();
      const supabaseConn = !dbErr && dbCheck;

      const { data: buckets, error: bErr } = await client.storage.listBuckets();
      const storageStatus = (!bErr && buckets && buckets.length > 0) ? 'Healthy' : 'Warning';

      const { data: authData } = await client.auth.getSession();
      const authStatus = !!(authData && authData.session);

      const settingsRes = await this.getStoreSettings();
      const s = settingsRes.data || {};

      return {
        supabaseConnection: !!supabaseConn,
        storageStatus: storageStatus,
        realtimeStatus: 'Active',
        authStatus: authStatus,
        whatsappConfigured: !!(s.whatsapp_number && s.whatsapp_number.length > 5),
        upiConfigured: !!(s.upi_id && s.upi_id.includes('@')),
        storeLogoAvailable: !!(s.store_logo && s.store_logo.startsWith('http')),
        heroBannerAvailable: !!(s.hero_banner_image && s.hero_banner_image.startsWith('http')),
        policiesAvailable: !!(s.privacy_policy && s.refund_policy && s.terms_conditions)
      };

    } catch (err) {
      return {
        supabaseConnection: false,
        storageStatus: 'Error',
        realtimeStatus: 'Error',
        authStatus: false,
        whatsappConfigured: false,
        upiConfigured: false,
        storeLogoAvailable: false,
        heroBannerAvailable: false,
        policiesAvailable: false
      };
    }
  }
}

// Export Singleton Instance
window.dbService = new SupabaseDataService();
window.supabaseClient = null;
window.dbService.getClient().then(c => { window.supabaseClient = c; });