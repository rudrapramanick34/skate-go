/**
 * Skate Go - Admin Auth Guard
 * Centralized Supabase Auth helper for checking active sessions, route protection, login & logout execution.
 */

class AdminAuthGuard {
  constructor() {
    this.initPromise = this.init();
  }

  /**
   * Resolves the Supabase client safely
   */
  async getClient() {
    if (window.dbService) {
      return await window.dbService.getClient();
    }
    if (window.supabaseClient) {
      return window.supabaseClient;
    }
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (window.supabaseClient) {
          clearInterval(interval);
          resolve(window.supabaseClient);
        } else if (window.dbService && window.dbService.client) {
          clearInterval(interval);
          resolve(window.dbService.client);
        }
      }, 50);
    });
  }

  /**
   * Auto-run on initialization to inspect route and enforce access rules
   */
  async init() {
    const client = await this.getClient();

    // Attach real-time session state listener
    if (client && client.auth) {
      client.auth.onAuthStateChange((event) => {
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('index.html') || path.endsWith('/admin/') || path.endsWith('/admin');

        if (event === 'SIGNED_OUT' && !isLoginPage) {
          window.location.href = 'index.html';
        }
      });
    }

    const path = window.location.pathname;
    const isLoginPage = path.endsWith('index.html') || path.endsWith('/admin/') || path.endsWith('/admin');

    if (isLoginPage) {
      await this.redirectIfAuthenticated();
    } else {
      await this.enforceAuth();
    }
  }

  /**
   * Get Current Supabase Auth Session
   */
  async getSession() {
    try {
      const client = await this.getClient();
      if (!client) return null;
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) return null;
      return data.session;
    } catch (e) {
      console.error('[AdminAuthGuard] Session evaluation exception:', e);
      return null;
    }
  }

  /**
   * Enforces protection on private admin routes: dashboard, products, orders, categories
   */
  async enforceAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'index.html';
    }
    return session;
  }

  /**
   * Redirects authenticated admin away from login page to dashboard
   */
  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) {
      window.location.href = 'dashboard.html';
    }
  }

  /**
   * Executes Email + Password Login via Supabase Auth
   */
  async login(email, password) {
    try {
      const client = await this.getClient();
      if (!client) {
        return { success: false, error: 'Supabase authentication service unavailable.' };
      }

      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      return { success: false, error: 'Unexpected login network failure.' };
    }
  }

  /**
   * Clears Supabase session and redirects to login
   */
  async logout() {
    try {
      const client = await this.getClient();
      if (client && client.auth) {
        await client.auth.signOut();
      }
    } catch (err) {
      console.error('[AdminAuthGuard] Logout exception:', err);
    } finally {
      window.location.href = 'index.html';
    }
  }
}

// Global Singleton Instance
window.adminAuthGuard = new AdminAuthGuard();