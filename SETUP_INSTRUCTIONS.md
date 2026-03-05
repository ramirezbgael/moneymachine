# POS System - Setup Instructions

## Quick Start

This is a complete Point of Sale system with pending sales management, reports, inventory, and more.

---

## 1. Install Dependencies

```bash
npm install
```

---

## 2. Database Setup (Optional - Works with Mock Data)

The system works **without a database** using mock data. For production use with Supabase:

### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Get your **Project URL** and **Anon Key**

### Run Database Schema

Execute these SQL files in order in Supabase SQL Editor:

1. **`supabase_schema.sql`** - Main tables (products, sales, customers, etc.)
2. **`supabase_reports_views.sql`** - Views for reports
3. **`supabase_pending_sales_schema.sql`** - Pending sales support

### Configure Environment

Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **IMPORTANT**: Use the **`anon`** key, NOT the `service_role` key!

---

## 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 4. Features Overview

### ✅ Current Sale (MVP)
- Barcode scanner support (keyboard input)
- Product search with autocomplete
- Quantity controls (+/- buttons)
- Real-time totals with discount
- Stock validation
- **Save as Pending** button
- Fast checkout (Cash/Card/Transfer)

### ✅ Pending Sales (NEW)
- View all pending/unpaid sales
- **Resume Sale**: Load back to Current Sale
- **Mark as Paid**: Select payment method and complete
- **Cancel Sale**: Restore stock automatically
- Status tracking (Pending, Paid, Cancelled)

### ✅ Inventory
- Product management
- Stock alerts
- Quick actions (edit, adjust stock, delete)
- Low stock warnings
- Operational view toggle

### ✅ Reports
- Daily/weekly/monthly sales
- Top products (bar chart)
- Sales trend (line chart)
- Payment methods distribution (donut chart)
- Profit analysis
- Customer insights

### ✅ Settings
- Dark/Light mode
- Multi-language (EN, ES, FR, DE)
- Currency selection (USD, EUR, MXN, GBP, JPY)
- Printer configuration
- User profile

---

## 5. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F2** | Open checkout |
| **Enter** | Add product / Confirm |
| **Esc** | Cancel / Close |
| **↑↓** | Navigate list |
| **←→** | Adjust quantity |
| **+/-** | Inc/Dec quantity |
| **Delete** | Remove item |

---

## 6. Design System

### Premium Glassmorphism
- Soft electric blue (#60A5FA)
- Subtle blur effects (12-24px)
- No harsh shadows
- Calm, professional aesthetic
- Inspired by Stripe, Linear, Raycast

### Colors
```css
--bg-primary: #0B0B0F (near black)
--bg-gradient: charcoal gradient
--accent-primary: #60A5FA (soft blue)
--glass-bg: rgba(255, 255, 255, 0.04)
```

---

## 7. Data Flow

### Sale Lifecycle

```
Create Sale (Current Sale)
    ↓
[Save as Pending] → Pending (status: pending)
    ↓                      ↓
    |              [Resume] → Back to Current Sale
    |                      ↓
    |              [Mark as Paid] → Completed (status: completed)
    |                      ↓
    |              [Cancel] → Cancelled (status: cancelled, stock restored)
    ↓
[Checkout] → Completed (status: completed)
    ↓
Print Ticket (optional)
```

### Stock Management

- **Pending**: No stock change
- **Completed**: Stock decremented
- **Cancelled**: Stock restored

---

## 8. Mock Mode (No Database)

If no Supabase credentials are provided:

1. **Products**: Uses in-memory mock data
2. **Sales**: Saved to `localStorage`
3. **Reports**: Mock data for testing
4. **Pending**: Works with `localStorage`

Perfect for:
- Development
- Testing
- Demo purposes

---

## 9. File Structure

```
src/
├── components/
│   ├── CurrentSale/      # Main POS screen
│   ├── Pending/          # Pending sales management (NEW)
│   ├── Inventory/        # Product management
│   ├── Reports/          # Analytics dashboard
│   ├── Settings/         # Configuration
│   └── ...
├── store/
│   ├── saleStore.js      # Current sale state
│   ├── pendingStore.js   # Pending sales (NEW)
│   ├── inventoryStore.js # Products
│   ├── reportsStore.js   # Analytics
│   └── settingsStore.js  # User preferences
├── services/
│   ├── saleService.js    # Sale operations (with pending support)
│   ├── productService.js # Product operations
│   └── ...
└── i18n/
    └── translations.js   # Multi-language support
```

---

## 10. Production Deployment

### Build for Production

```bash
npm run build
```

Output in `dist/` folder.

### Deploy to Vercel/Netlify

1. Connect your Git repository
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy!

### Important: Security

- ✅ Use **`anon`** key (public, safe)
- ❌ Never use **`service_role`** key in frontend
- ✅ Configure RLS policies in Supabase
- ✅ Use authentication for production

---

## 11. Troubleshooting

### Supabase RLS Errors

If you see "access control" errors:

1. Check you're using the **`anon`** key
2. Disable RLS for development (see `SUPABASE_RLS_FIX.md`)
3. Or configure proper RLS policies

### Mock Mode

System automatically falls back to mock data if:
- No `.env` file
- Invalid Supabase credentials
- Network errors

---

## 12. Documentation

- **`PREMIUM_DESIGN.md`**: Design system and styling guide
- **`POS_MVP_README.md`**: Current Sale feature documentation
- **`PENDING_SALES_MVP.md`**: Pending sales feature guide
- **`SUPABASE_RLS_FIX.md`**: Database troubleshooting

---

## Support

For issues or questions:
1. Check documentation files
2. Review console for errors
3. Verify database schema is up to date

---

**Status**: ✅ **PRODUCTION READY**

The POS system is feature-complete for small business use with pending sales management, inventory tracking, and comprehensive reporting.
