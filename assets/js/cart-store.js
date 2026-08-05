/**
 * Skate Lab - Cart Store Manager
 * Single source of truth for client-side shopping cart persistence.
 * Uses localStorage key: 'skate_lab_cart'
 */

const STORAGE_KEY = 'skate_lab_cart';
const FREE_SHIPPING_THRESHOLD = 500; // INR
const STANDARD_SHIPPING_FEE = 60;   // INR

class CartStore {
  constructor() {
    this.items = this.loadCart();
    this.initListeners();
  }

  /**
   * Loads cart from localStorage
   */
  loadCart() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
      return [];
    }
  }

  /**
   * Saves current state to localStorage and dispatches global event
   */
  saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items));
      this.dispatchUpdate();
    } catch (e) {
      console.error('Failed to save cart to localStorage:', e);
    }
  }

  /**
   * Unique Key Generator based on Product ID and Selected Variants
   */
  generateItemKey(id, color, size) {
    const c = (color || 'default').toLowerCase().trim();
    const s = (size || 'default').toLowerCase().trim();
    return `${id}_${c}_${s}`;
  }

  /**
   * Adds an item to the cart or increments its quantity if variant exists
   */
  addItem(product) {
    const {
      id,
      title,
      slug,
      price,
      selectedColor = null,
      selectedSize = null,
      weight = 0,
      image = '',
      stock_quantity = 99,
      quantity = 1
    } = product;

    const itemKey = this.generateItemKey(id, selectedColor, selectedSize);
    const existingIndex = this.items.findIndex(item => item.itemKey === itemKey);

    if (existingIndex > -1) {
      const currentQty = this.items[existingIndex].quantity;
      const newQty = Math.min(currentQty + quantity, stock_quantity);
      this.items[existingIndex].quantity = newQty;
    } else {
      this.items.push({
        itemKey,
        id,
        title,
        slug,
        price: Number(price),
        selectedColor,
        selectedSize,
        weight: Number(weight),
        image,
        stock_quantity,
        quantity: Math.min(quantity, stock_quantity)
      });
    }

    this.saveCart();
  }

  /**
   * Updates item quantity directly
   */
  updateQuantity(itemKey, newQuantity) {
    const index = this.items.findIndex(item => item.itemKey === itemKey);
    if (index === -1) return;

    if (newQuantity <= 0) {
      this.removeItem(itemKey);
      return;
    }

    const maxStock = this.items[index].stock_quantity || 99;
    this.items[index].quantity = Math.min(newQuantity, maxStock);
    this.saveCart();
  }

  /**
   * Removes item by its unique key
   */
  removeItem(itemKey) {
    this.items = this.items.filter(item => item.itemKey !== itemKey);
    this.saveCart();
  }

  /**
   * Clears the entire cart
   */
  clearCart() {
    this.items = [];
    this.saveCart();
  }

  /**
   * Calculate Total Subtotal Price
   */
  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  /**
   * Calculate Total Combined Weight (in grams)
   */
  getTotalWeight() {
    return this.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  }

  /**
   * Calculate Total Item Count
   */
  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get Shipping Fee based on ₹500 Threshold Policy
   */
  getShippingFee() {
    const subtotal = this.getSubtotal();
    if (subtotal === 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  }

  /**
   * Get Free Shipping Progress Information
   */
  getFreeShippingProgress() {
    const subtotal = this.getSubtotal();
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
    const percentage = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
    const isUnlocked = subtotal >= FREE_SHIPPING_THRESHOLD;

    return {
      subtotal,
      threshold: FREE_SHIPPING_THRESHOLD,
      remaining,
      percentage,
      isUnlocked
    };
  }

  /**
   * Calculate Grand Total (Subtotal + Shipping)
   */
  getTotal() {
    return this.getSubtotal() + this.getShippingFee();
  }

  /**
   * Return complete cart snapshot state
   */
  getCartState() {
    return {
      items: [...this.items],
      itemCount: this.getItemCount(),
      subtotal: this.getSubtotal(),
      shippingFee: this.getShippingFee(),
      total: this.getTotal(),
      totalWeight: this.getTotalWeight(),
      shippingProgress: this.getFreeShippingProgress()
    };
  }

  /**
   * Dispatches window event for dynamic UI updates across components
   */
  dispatchUpdate() {
    const event = new CustomEvent('skate_lab_cart_updated', {
      detail: this.getCartState()
    });
    window.dispatchEvent(event);
  }

  initListeners() {
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) {
        this.items = this.loadCart();
        this.dispatchUpdate();
      }
    });
  }
}

// Global Singleton Instance
window.cartStore = new CartStore();