# PROJECT_MASTER.md

===========================================
PROJECT STATUS
===========================================

Project Name          : Skate Go
Version               : 1.0
Current Module        : Module 02
Completed             : 20%
Status                : In Development
Last Updated          : Module 02 Completed
Next Module           : Module 03 - Home & Categories Showcase Pages
Total Planned Modules : 10
Current Phase         : Phase 1 - Architecture & Data Infrastructure

===========================================

> **CRITICAL INSTRUCTION FOR ALL AI SESSIONS:**  
> This file is the **SINGLE SOURCE OF TRUTH** for the **Skate Go** project.  
> Before generating any code, modifying any files, or planning any features, you **MUST READ THIS FILE FIRST**.  
> Never continue coding without referencing and updating `PROJECT_MASTER.md`.

---

## 1. PROJECT VISION & OVERVIEW

**Skate Go** is a high-end, luxury, minimal, dark-themed e-commerce experience dedicated exclusively to **Inline Skating Accessories** in India. The design aesthetic draws heavy inspiration from premium modern brands like Apple and Nike—focused on precision, dark elegance, high contrast, clean micro-interactions, and mobile-first ergonomics.

---

## 2. BUSINESS INFORMATION

- **Business Name:** Skate Go
- **Niche / Focus:** Premium Inline Skating Accessories ONLY.
  - ❌ NOT Skateboards
  - ❌ NOT Shoes / Sneakers
  - ❌ NOT Bicycles
  - ❌ NOT Gaming
  - ✅ Inline Skating Wheels, Bearings, Frames, Buckles, Axles, Protective Gear, Precision Tools, Maintenance Kits, Laces, and Carrying Bags.
- **Target Market:** India (Domestic Shipping Only)
- **Deployment Platform:** GitHub Pages (Static Hosting)
- **Backend / Database:** Supabase (Database, Auth, Storage, RLS)
- **Tech Stack Constraints:**
  - Standard HTML5
  - Modern Vanilla CSS3 (Custom Properties, Flexbox, CSS Grid)
  - Modular Vanilla JavaScript (ES6+)
  - ❌ NO React / Vue / Angular
  - ❌ NO Bootstrap / Tailwind CSS
  - ❌ NO jQuery or external UI libraries

---

## 3. DESIGN SYSTEM & STYLE GUIDE

### Aesthetic Direction
- **Style:** Premium, Luxury, Minimalist, Modern, Dark Mode.
- **Vibe:** High-performance engineering, high contrast, Apple-inspired clarity, Nike-inspired bold athleticism.
- **Anti-Patterns:** No bright/colorful e-commerce presets, no cartoon imagery, no gaming aesthetics, no cheap gradients, no bloated UI kits.

### Color Palette
```css
:root {
  --color-primary:        #EE0039; /* High-octane Accent Red */
  --color-secondary:      #54091B; /* Deep Burgundy Highlight */
  --color-background:     #0B0B0B; /* Jet Black Base Background */
  --color-card:           #151515; /* Obsidian Surface Element */
  --color-card-border:    #222222; /* Subtle Surface Border */
  --color-text-main:      #FFFFFF; /* Pure White Primary Text */
  --color-text-secondary: #BDBDBD; /* Cool Grey Muted Text */
}
Typography & Layout Rules
Font Stack: Clean, modern sans-serif stack (system-ui, -apple-system, BlinkMacSystemFont, Inter, Segoe UI, Roboto, sans-serif).
Target Device / Methodology: MOBILE FIRST ALWAYS.
Every view and interface component must be designed and optimized for mobile screens (320px–430px viewport width) first.
Responsive layouts scaling up gracefully to desktop via CSS Media Queries (min-width: 768px, min-width: 1024px).
Touch targets must be at least 44x44px.
4. BUSINESS LOGIC & POLICIES
Shipping & Delivery
Logistics Provider: Shiprocket Integration Blueprint (Manual/Automated dispatch setup).
Coverage: India Only.
Free Shipping Threshold: Free delivery on orders above ₹500. Charges apply below ₹500.
Delivery Timeline: 7 – 10 Business Days.
Payment & Order Flow (WhatsApp Manual UPI Flow)
No Automated Payment Gateways: No Razorpay, Stripe, Cashfree, or PhonePe SDKs.
Payment Method: Manual UPI Transfer.
Cash on Delivery (COD) Rule: COD is available ONLY after 60% advance payment via UPI.
Customer Checkout Sequence:
Customer browses products and adds items to cart.
Customer proceeds to Checkout.
Customer fills Checkout Form (Name, Phone, State, City, PIN, Address, Landmark - NO Email).
Customer clicks "Confirm Order via WhatsApp".
System generates formatted order summary & opens WhatsApp targeting official Skate Go WhatsApp Business Number.
Admin reviews order details on WhatsApp and sends UPI Payment QR / UPI ID.
Customer executes UPI payment and sends screenshot/transaction reference.
Admin manually verifies payment and updates order status in Admin Panel.
Return Policy
Accepted strictly under the following mandatory conditions:
Customer must record a complete, unedited Unboxing Video showing package label and damage.
Return request must be submitted within 5 days of delivery.
Buyer pays return shipping costs.
Refunds are processed within 6 business days following physical inspection at the warehouse.
5. DATABASE ARCHITECTURE (SUPABASE BLUEPRINT)
Database Tables Blueprint
categories: id, name, slug, description, created_at
products: id, title, slug, description, price, weight, stock_quantity, colors, sizes, category_id, images, is_active, created_at
orders: id, order_number, customer_name, customer_phone, address, landmark, city, state, pin_code, items, total_amount, payment_method, payment_status, order_status, created_at
analytics: id, event_type, metadata, created_at
Storage Buckets
product-images (Public bucket with authenticated write access for Admin)
6. PROJECT FOLDER STRUCTURE
code
Code
skate-lab/
├── PROJECT_MASTER.md
├── supabase-schema.sql
├── index.html
├── shop.html
├── product.html
├── cart.html
├── checkout.html
├── search.html
├── admin/
│   ├── index.html
│   ├── dashboard.html
│   ├── products.html
│   ├── categories.html
│   ├── orders.html
│   └── analytics.html
├── legal/
│   ├── privacy-policy.html
│   ├── refund-policy.html
│   ├── shipping-policy.html
│   ├── terms.html
│   ├── about.html
│   └── contact.html
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   ├── header-footer.css
│   │   └── pages/
│   ├── js/
│   │   ├── supabase.js
│   │   ├── cart-store.js
│   │   ├── app.js
│   │   ├── search.js
│   │   └── admin/
│   └── images/
│       └── logo.svg
7. MODULE LIST & DEVELOPMENT PLAN

Module 01: Core System Architecture & Base Styles
Project directory structure setup.
Base CSS with design variables, standard resets, typography, dark theme utility classes, responsive grid layout helpers.
Global Header, Navigation Drawer (Mobile-first), and Footer components.

Module 02: Supabase Integration & Data Layer
Supabase client initialization wrapper (assets/js/supabase.js).
Database table schemas setup & RLS policies verification scripts (supabase-schema.sql).
Product, Category, Order, and Analytics fetch services.

Module 03: Home & Categories Showcase Pages
Mobile-first Home Page (index.html) featuring hero section, curated categories, high-velocity collection grid.
Shop/Catalog Page (shop.html) with category filters, sorting options (Price, Newest), and responsive product grid.

Module 04: Product Detail Page (PDP) 
Mobile-first PDP (product.html) with gallery viewer, variant selectors (Size/Color), live stock indicator, weight info, specs table, return policy popup/accordion, share utility, and direct "Order via WhatsApp" button.

Module 05: Cart System & Local Storage Manager
Client-side persistent cart engine (cart-store.js).
Dynamic slide-over/modal cart overlay & standalone Cart page (cart.html).
Quantity controls, weight/price subtotal calculators, and free shipping progress bar (₹500 threshold tracker).

Module 06: Mobile-First Checkout & WhatsApp Routing
Mobile-optimized Checkout Form (checkout.html) capturing Name, Phone, Address, City, State, PIN, Landmark (No Email).
WhatsApp payload formatter generating itemized list, total price, address summary, and advance COD notice.
Direct redirect engine to WhatsApp web/app.
Synchronous write to Supabase orders table.

Module 07: Global Search & Filter Engine
Search view (search.html) supporting full-text query matching across Product Name and Categories.
Multi-faceted filter system (Price range, Brand, Color, Size, Category).
Analytics event dispatching for top search tracking.

Module 08: Admin Authentication & Dashboard Control Panel
Admin login panel (admin/index.html) using Supabase Auth.
Protected Dashboard (admin/dashboard.html) showing order metrics, sales counters, top searches, and product views.

Module 09: Admin Inventory & Order Management
Product management module (Add/Edit/Delete products, image upload to Supabase storage, manual stock overrides).
Category manager (Create/Edit categories).
Order processing center (View orders, manual payment status toggle, tracking info update).

Module 10: Legal Pages & Compliance
Mobile-responsive, dark-themed static compliance pages: Privacy Policy, Refund Policy, Shipping Policy, Terms & Conditions, About Us, Contact Us.
8. PROJECT STATE & CHECKPOINT TRACKER
Current Checkpoint: Module 02 Executed successfully.
Completed Modules:
Module 01: Core System Architecture & Base Styles
Module 02: Supabase Integration & Data Layer
Pending Modules:
Module 03 through Module 10
Files Created:
PROJECT_MASTER.md
assets/css/main.css
assets/css/components.css
assets/css/header-footer.css
assets/js/app.js
assets/js/supabase.js
supabase-schema.sql
index.html
Files Modified:
PROJECT_MASTER.md
index.html
Next Module:
Module 03: Home & Categories Showcase Pages
9. AI RULES & ABSOLUTE CONSTRAINTS
Fundamental Directives
Always Read First: Read PROJECT_MASTER.md before generating any file or writing any block of code.
Strict Tech Stack Discipline: Never suggest, generate, or introduce React, Vue, Angular, Bootstrap, Tailwind, jQuery, or any third-party framework/UI library.
Mobile First Architecture: Always write CSS targeting mobile screens first, using @media (min-width: ...) queries for larger tablet and desktop viewport enhancements.
No Placeholders / Fake Data: Never use fake placeholder content, generic e-commerce templates, random UI mockups, or non-inline-skating placeholder imagery.
No Payment Gateways: Never attempt to integrate automated gateway SDKs (Razorpay, Stripe, etc.). Stick strictly to the WhatsApp + Manual UPI workflow.
Code Quality: Write clean, modular, fully commented vanilla JS, CSS, and HTML code. Keep file responsibilities separated.
Things Never To Do
❌ NEVER build a skateboard, bicycle, shoe, or generic store website.
❌ NEVER generate fake products or dummy businesses.
❌ NEVER redesign or modify completed modules without explicit user instruction.
❌ NEVER overwrite existing completed files blindly.
❌ NEVER hardcode products directly in HTML (all products must be dynamically fetched or state-driven via Supabase).
❌ NEVER use Lorem Ipsum placeholder text.
❌ NEVER use fake testimonials or fake customer reviews.
❌ NEVER ignore mobile-first responsive design rules.
code
Code
check my vscode terminal is this right structure ?
Model 6:25 PM
ThinkingThoughts
Expand to view model thoughts

chevron_right
Looking at your VS Code Explorer, there is a structure error with the js folder location:
⚠️ The Problem:
js is currently nested inside assets/css (Path: assets/css/js/app.js).
PROJECT_CHECKPOINT.md is named differently from the expected PROJECT_MASTER.md.
✅ Correct Folder Structure:
js and css should be side-by-side inside assets/ (siblings, not nested):
code
Text
SKATE-LAB/
├── assets/
│   ├── css/
│   │   ├── components.css
│   │   ├── header-footer.css
│   │   └── main.css
│   └── js/                  <-- Should be here (under assets, NOT inside css)
│       ├── app.js
│       └── supabase.js
├── index.html
├── supabase-schema.sql
└── PROJECT_MASTER.md        <-- Rename PROJECT_CHECKPOINT.md to this