# POS System - Current Sale Screen

Modern Point of Sale (POS) system designed for high-speed keyboard and barcode scanner input. Built with React, Vite, and featuring a cyberpunk glassmorphism design.

## Features

### 🎯 Main Features

- **Scanner Input**: Real-time barcode/keyboard input with F2 hotkey to focus
- **Product Search**: Autocomplete search with keyboard navigation (↑ ↓ Enter)
- **Virtualized Items List**: Efficient rendering of sale items with inline editing
- **Floating Total Bar**: Always-visible totals with F9 checkout hotkey
- **Payment Modal**: Multiple payment methods (Cash, Card, Transfer) and receipt types (Ticket, Invoice)
- **Invoice Flow**: Customer lookup by phone with automatic form fill
- **Print Confirmation**: Optional ticket printing after sale completion
- **Quick Product Add**: Fast product creation when barcode not found

### ⌨️ Keyboard Shortcuts

- **F2**: Focus/refocus scanner input
- **F9** or **Ctrl+Enter**: Open payment modal
- **↑ ↓**: Navigate items list / product search results
- **+ / -**: Increment/decrement item quantity
- **Delete**: Remove selected item
- **Enter**: Confirm/add (context-dependent)
- **Esc**: Cancel/close modals

### 🎨 Design

- **Glassmorphism**: Modern frosted glass effects with blur
- **Cyberpunk Theme**: Dark background with neon accents
- **Liquid Glass**: Smooth animations and transitions
- **High Contrast**: Optimized for readability

## Project Structure

```
POS/
├── src/
│   ├── components/
│   │   ├── CurrentSale/          # Main POS screen
│   │   ├── ScannerInput/         # Barcode/keyboard input
│   │   ├── ProductSearch/        # Autocomplete product search
│   │   ├── ItemsList/            # Virtualized sale items list
│   │   ├── FloatingBar/          # Bottom totals bar
│   │   ├── PaymentModal/         # Payment processing
│   │   ├── PrintModal/           # Print confirmation
│   │   ├── QuickAddProductModal/ # Quick product creation
│   │   └── Modal/                # Shared modal styles
│   ├── store/
│   │   └── saleStore.js          # Global state (Zustand)
│   ├── services/
│   │   ├── productService.js     # Product data/service
│   │   └── saleService.js        # Sale processing
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

### Adding Products to Sale

1. **Via Scanner**: Focus scanner input (F2), scan barcode, press Enter
2. **Via Search**: Type in product search field, navigate with arrows, press Enter
3. **Manual Entry**: Type barcode/code in scanner input, press Enter

### Managing Sale Items

- **Edit Quantity**: Click quantity, or use + / - buttons
- **Select Item**: Click item or use ↑ ↓ arrows
- **Remove Item**: Select item and press Delete, or click × button
- **Inline Edit**: Select item and press Enter to edit quantity directly

### Processing Payment

1. Press **F9** or click **TOTAL** button
2. Select payment method (Cash/Card/Transfer)
3. Select receipt type (Ticket/Invoice)
4. If Invoice:
   - Enter phone number (auto-searches customer)
   - If found: Customer data auto-filled
   - If not found: Fill customer form (Name, Last Name, RFC required)
5. Press **Enter** to confirm payment

### Printing Tickets

After payment, modal asks if you want to print:
- **No (Enter)**: Continue without printing (default)
- **Yes, Print**: Print ticket to configured printer

## State Management

Uses **Zustand** for global state management:

- **saleStore**: Manages current sale items, totals, and sale operations
- **Services**: Mock data services for products and sales (replace with API calls in production)

## Mock Data

The system includes mock products for testing:

- Various snacks and beverages
- Services (Internet time, printing, photos)
- Sample customer data (phone: 5551234567)

Replace `productService.js` and `saleService.js` with actual API integration for production use.

## Technical Requirements

- **React 18+**
- **Vite** (build tool)
- **Zustand** (state management)
- **react-window** (virtualization)
- **Modern browser** with CSS backdrop-filter support

## Production Considerations

1. **Replace Mock Services**: Implement real API calls in `productService.js` and `saleService.js`
2. **Add Authentication**: Protect routes and API calls
3. **Error Handling**: Add comprehensive error handling and user feedback
4. **Offline Support**: Implement service workers for offline functionality
5. **Printer Integration**: Connect to actual receipt printer API
6. **Database**: Replace localStorage with proper database
7. **Security**: Validate all inputs and sanitize data
8. **Testing**: Add unit and integration tests
9. **Performance**: Profile and optimize rendering
10. **Accessibility**: Ensure keyboard navigation and screen reader support

## Architecture Highlights

- **Modular Components**: Each feature is self-contained
- **Keyboard-First**: Optimized for keyboard and scanner input
- **Virtualized Rendering**: Efficient handling of large item lists
- **Real-time Calculations**: Totals update instantly on changes
- **Clean State**: Clear separation of UI and business logic

## License

MIT

---

Built with ❤️ for fast, efficient retail operations.