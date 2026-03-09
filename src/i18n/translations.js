/**
 * Internationalization (i18n) translations
 * Supported languages: en, es, fr, de
 */

export const translations = {
  en: {
    // Navigation
    nav: {
      currentSale: 'Current Sale',
      inventory: 'Inventory',
      pending: 'Pending',
      reports: 'Reports',
      settings: 'Settings'
    },
    // Current Sale
    currentSale: {
      title: 'Current Sale',
      searchPlaceholder: 'Scan or search by code, name or description',
      items: 'items',
      total: 'TOTAL',
      checkout: 'Checkout',
      empty: 'No items in cart',
      saveQuotation: 'Save as Quotation',
      savingQuotation: 'Saving...',
      quotationSaved: 'Quotation saved successfully',
      savePending: 'Save as Pending',
      savingPending: 'Saving...',
      pendingSaved: 'Sale saved as pending',
      quotationCode: 'Quotation Code',
      scanToLoad: 'Scan this code to load products quickly'
    },
    // Payment Modal
    payment: {
      title: 'Payment',
      totalToPay: 'Total to Pay',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Transfer',
      receiptType: 'Receipt Type',
      ticket: 'Ticket',
      invoice: 'Invoice',
      customerInfo: 'Customer Information',
      phone: 'Phone',
      name: 'Name',
      lastName: 'Last Name',
      email: 'Email',
      rfc: 'RFC',
      pendingCSF: 'Pending CSF Invoice',
      cancel: 'Cancel',
      confirm: 'Confirm Payment',
      processing: 'Processing...',
      arrowsHint: '← → to navigate',
      arrowsUpDownHint: '↑ ← → to navigate back'
    },
    // Pending Sales
    pendingSales: {
      title: 'Pending Sales',
      subtitle: 'Manage unfinished and unpaid transactions',
      loading: 'Loading pending sales...',
      retry: 'Retry',
      emptyTitle: 'No pending sales',
      emptySubtitle: 'All transactions are completed or there are no pending sales yet.',
      folio: 'Folio',
      dateTime: 'Date & Time',
      items: 'Items',
      total: 'Total',
      payment: 'Payment',
      status: 'Status',
      actions: 'Actions',
      itemsCount: 'items',
      notSet: 'Not set',
      statusPending: 'Pending',
      statusPaid: 'Paid',
      statusCancelled: 'Cancelled',
      resumeTitle: 'Resume sale',
      markAsPaidTitle: 'Mark as paid',
      cancelTitle: 'Cancel sale',
      confirmResume: 'There is an active sale. Resuming this sale will clear the current one. Continue?',
      markAsPaidModal: 'Mark as Paid',
      selectPaymentMethod: 'Select Payment Method',
      confirmPayment: 'Confirm Payment',
      cancelSaleModal: 'Cancel Sale',
      confirmCancelQuestion: 'Are you sure you want to cancel this sale?',
      cancelWarning: 'This action will restore product stock and mark the sale as cancelled.',
      goBack: 'Go Back',
      yesCancelSale: 'Yes, Cancel Sale',
      cancelling: 'Cancelling...'
    },
    // Print Modal
    print: {
      title: 'Print Ticket',
      completed: 'Sale completed successfully!',
      totalLabel: 'Total:',
      question: 'Would you like to print the ticket?',
      hint: 'Use ← → arrows to navigate',
      no: 'No',
      yes: 'Yes, Print',
      continue: 'Continue',
      printing: 'Printing...'
    },
    // Quotation
    quotation: {
      ticketTitle: 'Quotation',
      businessName: 'My Business',
      product: 'Product',
      qty: 'Qty',
      price: 'Price',
      subtotal: 'Subtotal',
      discount: 'Discount',
      subtotalAfterDiscount: 'Subtotal after discount',
      tax: 'Tax',
      total: 'TOTAL',
      scanHint: 'Scan this code to load the sale quickly',
      footerText: 'This quotation is valid for 30 days',
      instructions: 'Instructions:',
      instruction1: 'Save or print this code',
      instruction2: 'Scan the QR code on the sale screen to automatically load products',
      instruction3: 'Review products and complete the sale'
    },
    // Inventory
    inventory: {
      title: 'Inventory',
      subtitle: 'Product management',
      addProduct: 'Add Product',
      reports: 'Reports',
      import: 'Import (XML / CSV / PDF)',
      overview: 'Inventory Overview',
      requireAttention: 'products require attention',
      lastUpdate: 'Last update:',
      criticalStock: 'products with critical stock',
      runningOut: 'products running out in 7 days',
      noMovement: 'products without movement',
      viewCritical: 'View critical',
      viewLowStock: 'View low stock',
      viewNoMovement: 'View no movement',
      allGood: 'All products are in good standing',
      search: 'Search by code, name, barcode...',
      stockStatus: 'Stock Status',
      category: 'Category',
      supplier: 'Supplier',
      all: 'All',
      critical: 'Critical',
      low: 'Low',
      normal: 'Normal',
      inStock: 'In Stock',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      resetFilters: 'Reset filters',
      code: 'Code',
      barcode: 'Barcode',
      name: 'Name',
      description: 'Description',
      price: 'Price',
      stock: 'Stock',
      lastMovement: 'Last Movement',
      actions: 'Actions',
      operationalView: 'Operational view',
      listView: 'List view',
      empty: 'No products in inventory',
      noMatch: 'No products match the current filters',
      editProduct: 'Edit Product',
      saveChanges: 'Save Changes',
      purchasePrice: 'Purchase Price',
      adjustStock: 'Adjust Stock',
      currentStock: 'Current Stock',
      newStock: 'New Stock',
      justification: 'Justification',
      justificationPlaceholder: 'Explain the reason for this stock change (e.g., purchase, loss, correction, etc.)',
      confirmAdjustment: 'Confirm Adjustment',
      units: 'units',
      noChange: 'No change'
    },
    // Reports
    reports: {
      title: 'Reports',
      subtitle: 'Sales analytics and metrics',
      period: 'Period',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      custom: 'Custom Range',
      dateTo: 'to',
      loadingReports: 'Loading reports...',
      dailyTotal: 'Daily Total',
      monthlyTotal: 'Monthly Total',
      topProducts: 'Top Products',
      repeatCustomers: 'Repeat Customers',
      outOfStock: 'Out of Stock',
      outOfStockProducts: 'Out of Stock Products',
      monthlySummary: 'Monthly Summary',
      profitMargin: 'Profit Margin',
      leastSold: 'Least Sold Products',
      quantity: 'Quantity',
      purchases: 'Purchases',
      totalSpent: 'Total Spent',
      totalPurchases: 'Total Purchases',
      revenue: 'Revenue',
      salesTrend: 'Sales Trend',
      profitVsInvestment: 'Profit vs Investment',
      paymentMethods: 'Payment Methods',
      customer: 'Customer',
      phone: 'Phone',
      code: 'Code',
      name: 'Name',
      lastSale: 'Last Sale',
      stock: 'Stock',
      quantitySold: 'Quantity Sold',
      never: 'Never',
      noRepeatCustomers: 'No repeat customers found',
      allInStock: 'All products in stock',
      noDataAvailable: 'No data available'
    },
    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'System configuration and preferences',
      userAccount: 'User Account',
      email: 'Email',
      signOut: 'Sign Out',
      appearance: 'Appearance',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
      language: 'Language',
      displayLanguage: 'Display Language',
      currency: 'Currency',
      defaultCurrency: 'Default Currency',
      tax: 'Tax Configuration',
      taxRate: 'Tax Rate',
      taxRateHint: 'Tax percentage applied to sales (e.g., 16 for 16%)',
      printer: 'Printer Configuration',
      printerName: 'Printer Name',
      printerNamePlaceholder: 'e.g., EPSON TM-T20, Star TSP100',
      printerHint: 'Enter the name of your thermal printer',
      paperWidth: 'Paper Width',
      autoPrint: 'Automatically print ticket after sale',
      businessName: 'Business name',
      businessNamePlaceholder: 'e.g. My Store, Florería Central',
      ticketIcon: 'Ticket logo',
      ticketIconNone: 'None',
      ticketIconTools: 'Tools / Hardware',
      ticketIconFlorist: 'Florist',
      ticketIconBeauty: 'Beauty salon',
      ticketPreview: 'Ticket preview',
      ticketTemplate: 'Ticket style',
      ticketTemplateSimple: 'Standard (with borders)',
      ticketTemplateMinimal: 'Minimal (compact)',
      ticketTemplateFull: 'Full (with extra lines)',
      ticketFooter: 'Text at bottom of ticket',
      ticketFooterPlaceholder: 'One line per row, e.g.:\nGracias por su compra\nVisite nosotros de nuevo',
      ticketFooterHint: 'Each line will appear at the end of the ticket.',
      savePrinter: 'Save Printer Settings',
      saved: 'Saved!',
      systemInfo: 'System Information',
      version: 'Version',
      environment: 'Environment'
    },
    // Inventory New Page
    inventoryNewPage: {
      title: 'New Inventory',
      subtitle: 'Scan products to register them quickly.',
      backToInventory: '← Back to inventory',
      registeredProductsSession: 'Products registered in this session',
      lastScannedCode: 'Last scanned code',
      quickActions: 'Quick Actions',
      clearSession: 'Clear session',
      scanSection: 'Scanning',
      scanHint: 'Use a USB scanner or type a code and press Enter. The field stays ready for the next code.',
      existsModal: {
        title: 'Product already exists',
        description: 'This code is already registered. What would you like to do?',
        addStock: 'Add stock (quick entry)',
        editDetails: 'Edit details'
      },
      newProductWizard: {
        title: 'New product',
        scannedCode: 'Scanned code:',
        close: 'Close',
        step1: {
          label: 'Step 1 · Product name',
          dictate: 'Dictate',
          listening: 'Listening…',
          placeholder: 'E.g: Coca Cola 600ml',
          hint: 'Press 🎤 Dictate and say the product name.',
          listeningHint: 'Speaking to microphone… press \"Listening…\" again to stop.'
        },
        step2: {
          label: 'Step 2 · Initial stock'
        },
        step3: {
          label: 'Step 3 · Prices',
          purchasePrice: 'Purchase price',
          salePrice: 'Sale price',
          margin: 'Margin:'
        },
        cancel: 'Cancel',
        confirm: 'Confirm',
        saving: 'Saving…',
        voicePrompt: 'New product. Say the product name.'
      },
      sessionList: {
        title: 'Current session',
        subtitle: 'Products registered in this session:',
        saveAll: 'Save all',
        empty: 'No products in this session yet. Scan a code to start.',
        productLabel: {
          new: 'New',
          stock: 'Stock +'
        },
        code: 'Code:',
        stock: 'Stock:',
        purchase: 'Purchase:',
        sale: 'Sale:'
      },
      scanInput: {
        placeholder: 'Scan or type a code and press Enter…'
      },
      voiceToggle: {
        enabled: 'Voice enabled',
        disabled: 'Enable voice',
        title: 'Voice Mode (experimental)',
        notAvailable: 'Voice not available on this system'
      }
    },
    // Product Modal
    productModal: {
      stepIndicator: 'Step {current} of {total}',
      suggestedCode: 'Suggested code:',
      profitMargin: 'Profit margin: {margin}%',
      captura: 'Capture Photo',
      cancelar: 'Cancel',
      capturar: '📷 Capture',
      imagenDelProducto: 'PRODUCT IMAGE',
      sinImagen: 'No image',
      subirImagen: 'Upload Image',
      capturarFoto: 'Capture',
      quitarFondo: 'Remove Background',
      procesando: 'Processing...',
      productPreview: 'Product preview',
      eliminarImagen: 'Remove image',
      haModificadoPrecios: 'You have modified prices or stock. You must upload an invoice to justify the changes.',
      facturaPdf: 'Invoice PDF',
      facturaXml: 'Invoice XML (Optional)',
      margenDeGanancia: 'Profit Margin',
      steps: [
        { label: 'Product Code', placeholder: 'Enter product code', ariaLabel: 'Enter product code' },
        { label: 'Product Name', placeholder: 'Enter product name', ariaLabel: 'Enter product name' },
        { label: 'Product Image', placeholder: 'Upload or capture image', ariaLabel: 'Upload or capture product image' },
        { label: 'Barcode', placeholder: 'Enter barcode (optional)', ariaLabel: 'Enter barcode' },
        { label: 'Description', placeholder: 'Enter description (optional)', ariaLabel: 'Enter product description' },
        { label: 'Purchase Price', placeholder: '0.00', ariaLabel: 'Enter purchase price' },
        { label: 'Sale Price', placeholder: '0.00', ariaLabel: 'Enter sale price' },
        { label: 'Initial Stock', placeholder: '0', ariaLabel: 'Enter initial stock' }
      ]
    },
    // Quick Add Product Modal
    quickAddProductModal: {
      title: 'Product Not Found',
      barcodeNotFound: 'Barcode {barcode} not found.',
      createQuickly: 'Create a new product quickly:',
      code: 'Code',
      internalCode: 'Internal code',
      name: 'Name *',
      productName: 'Product name',
      description: 'Description',
      productDescription: 'Product description',
      price: 'Price *',
      stock: 'Stock',
      barcode: 'Barcode'
    },
    // Payment Modal Component
    paymentModal: {
      title: 'Payment',
      totalToPay: 'Total to Pay',
      items: 'item(s)',
      paymentMethod: 'Payment Method',
      navigateHint: '← → to navigate',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Transfer',
      receiptType: 'Receipt Type',
      ticket: 'Ticket',
      invoice: 'Invoice',
      customerInformation: 'Customer Information',
      customerFormHint: '↑ ← → to navigate back',
      phone: 'Phone *'
    },
    // Payment Modal
    paymentModalTexts: {
      enterPhoneNumber: 'Enter phone number',
      searching: 'Searching...',
      customerFound: 'Customer found',
      customerName: 'Customer name',
      customerLastName: 'Customer last name',
      customerEmail: 'customer@example.com'
    },
    // Scanner
    scannerInput: {
      placeholder: 'Scan barcode or type code, then press Enter'
    },
    // Items List UI
    itemsList: {
      decreaseQuantity: 'Decrease quantity (- or ←)',
      increaseQuantity: 'Increase quantity (+ or →)',
      removeItem: 'Remove item (Delete)',
      noStock: 'Out of stock'
    },
    // Layout
    layout: {
      toggleSidebar: 'Toggle sidebar width'
    },
    // Login/Register
    auth: {
      emailPlaceholder: 'user@example.com',
      passwordPlaceholder: 'Enter password',
      minCharacters: 'Min 6 characters',
      businessNamePlaceholder: 'My Business'
    },
    // Common UI
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      search: 'Search',
      filter: 'Filter',
      clear: 'Clear',
      copy: 'Copy'
    }
  },
  es: {
    // Navegación
    nav: {
      currentSale: 'Venta Actual',
      inventory: 'Inventario',
      pending: 'Pendientes',
      reports: 'Reportes',
      settings: 'Configuración'
    },
    // Venta Actual
    currentSale: {
      title: 'Venta Actual',
      searchPlaceholder: 'Escanear o buscar por código, nombre o descripción',
      items: 'artículos',
      total: 'TOTAL',
      checkout: 'Cobrar',
      empty: 'No hay artículos en el carrito',
      saveQuotation: 'Guardar Cotización',
      savingQuotation: 'Guardando...',
      quotationSaved: 'Cotización guardada exitosamente',
      savePending: 'Guardar como pendiente',
      savingPending: 'Guardando...',
      pendingSaved: 'Venta guardada como pendiente',
      quotationCode: 'Código de Cotización',
      scanToLoad: 'Escanee este código para cargar productos rápidamente'
    },
    // Modal de Pago
    payment: {
      title: 'Pago',
      totalToPay: 'Total a Pagar',
      paymentMethod: 'Método de Pago',
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      receiptType: 'Tipo de Comprobante',
      ticket: 'Ticket',
      invoice: 'Factura',
      customerInfo: 'Información del Cliente',
      phone: 'Teléfono',
      name: 'Nombre',
      lastName: 'Apellido',
      email: 'Correo',
      rfc: 'RFC',
      pendingCSF: 'Factura CSF Pendiente',
      cancel: 'Cancelar',
      confirm: 'Confirmar Pago',
      processing: 'Procesando...',
      arrowsHint: '← → para navegar',
      arrowsUpDownHint: '↑ ← → para navegar atrás'
    },
    // Ventas Pendientes
    pendingSales: {
      title: 'Ventas Pendientes',
      subtitle: 'Gestiona transacciones sin terminar o sin pagar',
      loading: 'Cargando ventas pendientes...',
      retry: 'Reintentar',
      emptyTitle: 'No hay ventas pendientes',
      emptySubtitle: 'Todas las transacciones están completadas o aún no hay ventas pendientes.',
      folio: 'Folio',
      dateTime: 'Fecha y hora',
      items: 'Artículos',
      total: 'Total',
      payment: 'Pago',
      status: 'Estado',
      actions: 'Acciones',
      itemsCount: 'artículos',
      notSet: 'Sin asignar',
      statusPending: 'Pendiente',
      statusPaid: 'Pagado',
      statusCancelled: 'Cancelado',
      resumeTitle: 'Reanudar venta',
      markAsPaidTitle: 'Marcar como pagado',
      cancelTitle: 'Cancelar venta',
      confirmResume: 'Hay una venta en curso. Reanudar esta venta borrará la actual. ¿Continuar?',
      markAsPaidModal: 'Marcar como Pagado',
      selectPaymentMethod: 'Seleccionar método de pago',
      confirmPayment: 'Confirmar Pago',
      cancelSaleModal: 'Cancelar Venta',
      confirmCancelQuestion: '¿Estás seguro de que quieres cancelar esta venta?',
      cancelWarning: 'Esta acción restaurará el stock de productos y marcará la venta como cancelada.',
      goBack: 'Volver',
      yesCancelSale: 'Sí, Cancelar Venta',
      cancelling: 'Cancelando...'
    },
    // Modal de Impresión
    print: {
      title: 'Imprimir Ticket',
      completed: '¡Venta completada exitosamente!',
      totalLabel: 'Total:',
      question: '¿Deseas imprimir el ticket?',
      hint: 'Usa las flechas ← → para navegar',
      no: 'No',
      yes: 'Sí, Imprimir',
      continue: 'Continuar',
      printing: 'Imprimiendo...'
    },
    // Cotización
    quotation: {
      ticketTitle: 'Cotización',
      businessName: 'Mi Negocio',
      product: 'Producto',
      qty: 'Cant',
      price: 'Precio',
      subtotal: 'Subtotal',
      discount: 'Descuento',
      subtotalAfterDiscount: 'Subtotal después de descuento',
      tax: 'Impuesto',
      total: 'TOTAL',
      scanHint: 'Escanee este código para cargar la venta rápidamente',
      footerText: 'Esta cotización es válida por 30 días',
      instructions: 'Instrucciones:',
      instruction1: 'Guarda o imprime este código',
      instruction2: 'Escanee el código QR en la pantalla de venta para cargar productos automáticamente',
      instruction3: 'Revisa los productos y completa la venta'
    },
    // Inventario
    inventory: {
      title: 'Inventario',
      subtitle: 'Gestión de productos',
      addProduct: 'Agregar Producto',
      reports: 'Reportes',
      import: 'Importar (XML / CSV / PDF)',
      overview: 'Resumen de Inventario',
      requireAttention: 'productos requieren atención',
      lastUpdate: 'Última actualización:',
      criticalStock: 'productos con stock crítico',
      runningOut: 'productos por agotarse en 7 días',
      noMovement: 'productos sin movimiento',
      viewCritical: 'Ver críticos',
      viewLowStock: 'Ver stock bajo',
      viewNoMovement: 'Ver sin movimiento',
      allGood: 'Todos los productos están en buen estado',
      search: 'Buscar por código, nombre, código de barras...',
      stockStatus: 'Estado de Stock',
      category: 'Categoría',
      supplier: 'Proveedor',
      all: 'Todos',
      critical: 'Crítico',
      low: 'Bajo',
      normal: 'Normal',
      inStock: 'En Stock',
      lowStock: 'Stock Bajo',
      outOfStock: 'Sin Stock',
      resetFilters: 'Restablecer filtros',
      code: 'Código',
      barcode: 'Código de Barras',
      name: 'Nombre',
      description: 'Descripción',
      price: 'Precio',
      stock: 'Stock',
      lastMovement: 'Último Movimiento',
      actions: 'Acciones',
      operationalView: 'Vista operativa',
      listView: 'Vista de lista',
      empty: 'No hay productos en inventario',
      noMatch: 'No hay productos que coincidan con los filtros actuales',
      editProduct: 'Editar Producto',
      saveChanges: 'Guardar Cambios',
      purchasePrice: 'Precio de Compra',
      adjustStock: 'Ajustar Stock',
      currentStock: 'Stock Actual',
      newStock: 'Nuevo Stock',
      justification: 'Justificación',
      justificationPlaceholder: 'Explica la razón de este cambio de stock (ej: compra, pérdida, corrección, etc.)',
      confirmAdjustment: 'Confirmar Ajuste',
      units: 'unidades',
      noChange: 'Sin cambios'
    },
    // Reportes
    reports: {
      title: 'Reportes',
      subtitle: 'Análisis y métricas de ventas',
      period: 'Período',
      today: 'Hoy',
      week: 'Esta Semana',
      month: 'Este Mes',
      custom: 'Rango Personalizado',
      dateTo: 'a',
      loadingReports: 'Cargando reportes...',
      dailyTotal: 'Total Diario',
      monthlyTotal: 'Total Mensual',
      topProducts: 'Productos Más Vendidos',
      repeatCustomers: 'Clientes Recurrentes',
      outOfStock: 'Sin Stock',
      outOfStockProducts: 'Productos sin stock',
      monthlySummary: 'Total Mensual',
      profitMargin: 'Margen de Ganancia',
      leastSold: 'Productos Menos Vendidos',
      quantity: 'Cantidad Vendida',
      purchases: 'Compras',
      totalSpent: 'Total Gastado',
      totalPurchases: 'Total Compras',
      revenue: 'Ingresos',
      salesTrend: 'Tendencia de Ventas',
      profitVsInvestment: 'Ganancia vs Inversión',
      paymentMethods: 'Métodos de Pago',
      customer: 'Cliente',
      phone: 'Teléfono',
      code: 'Código',
      name: 'Nombre',
      lastSale: 'Última Venta',
      stock: 'Stock',
      quantitySold: 'Cant. Vendida',
      never: 'Nunca',
      noRepeatCustomers: 'No se encontraron clientes recurrentes',
      allInStock: 'Todos los productos en stock',
      noDataAvailable: 'No hay datos disponibles'
    },
    // Configuración
    settings: {
      title: 'Configuración',
      subtitle: 'Configuración del sistema y preferencias',
      userAccount: 'Cuenta de Usuario',
      email: 'Correo',
      signOut: 'Cerrar Sesión',
      appearance: 'Apariencia',
      theme: 'Tema',
      darkMode: 'Modo Oscuro',
      lightMode: 'Modo Claro',
      language: 'Idioma',
      displayLanguage: 'Idioma de Visualización',
      currency: 'Moneda',
      defaultCurrency: 'Moneda Predeterminada',
      tax: 'Configuración de Impuestos',
      taxRate: 'Tasa de Impuesto',
      taxRateHint: 'Porcentaje de impuesto aplicado a las ventas (ej: 16 para 16%)',
      printer: 'Configuración de Impresora',
      printerName: 'Nombre de Impresora',
      printerNamePlaceholder: 'ej., EPSON TM-T20, Star TSP100',
      printerHint: 'Ingresa el nombre de tu impresora térmica',
      paperWidth: 'Ancho de Papel',
      autoPrint: 'Imprimir ticket automáticamente después de venta',
      businessName: 'Nombre comercial',
      businessNamePlaceholder: 'ej. Mi Tienda, Florería Central',
      ticketIcon: 'Logo del ticket',
      ticketIconNone: 'Ninguno',
      ticketIconTools: 'Herramientas / Ferretería',
      ticketIconFlorist: 'Florería',
      ticketIconBeauty: 'Salón de belleza',
      ticketPreview: 'Vista previa del ticket',
      ticketTemplate: 'Estilo de ticket',
      ticketTemplateSimple: 'Estándar (con bordes)',
      ticketTemplateMinimal: 'Mínimo (compacto)',
      ticketTemplateFull: 'Completo (con líneas extra)',
      ticketFooter: 'Texto al pie del ticket',
      ticketFooterPlaceholder: 'Una línea por renglón, ej.:\nGracias por su compra\nVisítenos de nuevo',
      ticketFooterHint: 'Cada línea aparecerá al final del ticket, antes del cierre.',
      savePrinter: 'Guardar Configuración de Impresora',
      saved: '¡Guardado!',
      systemInfo: 'Información del Sistema',
      version: 'Versión',
      environment: 'Entorno'
    },
    // Inventario Nuevo
    inventoryNewPage: {
      title: 'Inventario Nuevo',
      subtitle: 'Escanea productos para registrarlos rápido.',
      backToInventory: '← Volver al inventario',
      registeredProductsSession: 'Productos registrados en esta sesión',
      lastScannedCode: 'Último código leído',
      quickActions: 'Acciones rápidas',
      clearSession: 'Limpiar sesión',
      scanSection: 'Escaneo',
      scanHint: 'Usa un escáner USB o escribe el código y presiona Enter. El campo se mantiene siempre listo para el siguiente código.',
      existsModal: {
        title: 'Producto ya existe',
        description: 'Este código ya está registrado. ¿Qué deseas hacer?',
        addStock: 'Sumar stock (registrar entrada rápida)',
        editDetails: 'Editar detalles'
      },
      newProductWizard: {
        title: 'Nuevo producto',
        scannedCode: 'Código escaneado:',
        close: 'Cerrar',
        step1: {
          label: 'Paso 1 · Nombre del producto',
          dictate: 'Dictar',
          listening: 'Escuchando…',
          placeholder: 'Ej: Coca Cola 600ml',
          hint: 'Pulsa 🎤 Dictar y di el nombre del producto.',
          listeningHint: 'Hablando al micrófono… pulsa nuevamente \"Escuchando…\" para detener.'
        },
        step2: {
          label: 'Paso 2 · Stock inicial'
        },
        step3: {
          label: 'Paso 3 · Precios',
          purchasePrice: 'Precio de compra',
          salePrice: 'Precio de venta',
          margin: 'Margen:'
        },
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        saving: 'Guardando…',
        voicePrompt: 'Nuevo producto. Di el nombre del producto.'
      },
      sessionList: {
        title: 'Sesión actual',
        subtitle: 'Productos registrados en esta sesión:',
        saveAll: 'Guardar todos',
        empty: 'Aún no hay productos en esta sesión. Escanea un código para comenzar.',
        productLabel: {
          new: 'Nuevo',
          stock: 'Stock +'
        },
        code: 'Código:',
        stock: 'Stock:',
        purchase: 'Compra:',
        sale: 'Venta:'
      },
      scanInput: {
        placeholder: 'Escanea o escribe un código y presiona Enter…'
      },
      voiceToggle: {
        enabled: 'Voz habilitada',
        disabled: 'Habilitar voz',
        title: 'Modo voz (experimental)',
        notAvailable: 'Voz no disponible en este sistema'
      }
    },
    // Modal de Producto
    productModal: {
      stepIndicator: 'Paso {current} de {total}',
      suggestedCode: 'Código sugerido:',
      profitMargin: 'Margen de ganancia: {margin}%',
      captura: 'Capturar Foto',
      cancelar: 'Cancelar',
      capturar: '📷 Capturar',
      imagenDelProducto: 'IMAGEN DEL PRODUCTO',
      sinImagen: 'Sin imagen',
      subirImagen: 'Subir Imagen',
      capturarFoto: 'Capturar',
      quitarFondo: 'Quitar Fondo',
      procesando: 'Procesando...',
      productPreview: 'Vista previa del producto',
      eliminarImagen: 'Eliminar imagen',
      haModificadoPrecios: 'Has modificado precios o stock. Debe subir una factura para justificar los cambios.',
      facturaPdf: 'Factura PDF',
      facturaXml: 'Factura XML (Opcional)',
      margenDeGanancia: 'Margen de ganancia',
      steps: [
        { label: 'Código del Producto', placeholder: 'Ingresa el código del producto', ariaLabel: 'Ingresa el código del producto' },
        { label: 'Nombre del Producto', placeholder: 'Ingresa el nombre del producto', ariaLabel: 'Ingresa el nombre del producto' },
        { label: 'Imagen del Producto', placeholder: 'Sube o captura una imagen', ariaLabel: 'Sube o captura la imagen del producto' },
        { label: 'Código de Barras', placeholder: 'Ingresa código de barras (opcional)', ariaLabel: 'Ingresa código de barras' },
        { label: 'Descripción', placeholder: 'Ingresa descripción (opcional)', ariaLabel: 'Ingresa la descripción del producto' },
        { label: 'Precio de Compra', placeholder: '0.00', ariaLabel: 'Ingresa el precio de compra' },
        { label: 'Precio de Venta', placeholder: '0.00', ariaLabel: 'Ingresa el precio de venta' },
        { label: 'Stock Inicial', placeholder: '0', ariaLabel: 'Ingresa el stock inicial' }
      ]
    },
    // Modal Agregar Producto Rápido
    quickAddProductModal: {
      title: 'Producto No Encontrado',
      barcodeNotFound: 'Código de Barras {barcode} no encontrado.',
      createQuickly: 'Crea un nuevo producto rápidamente:',
      code: 'Código',
      internalCode: 'Código interno',
      name: 'Nombre *',
      productName: 'Nombre del producto',
      description: 'Descripción',
      productDescription: 'Descripción del producto',
      price: 'Precio *',
      stock: 'Stock',
      barcode: 'Código de Barras'
    },
    // Componente Modal de Pago
    paymentModal: {
      title: 'Pago',
      totalToPay: 'Total a Pagar',
      items: 'artículo(s)',
      paymentMethod: 'Método de Pago',
      navigateHint: '← → para navegar',
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      receiptType: 'Tipo de Comprobante',
      ticket: 'Ticket',
      invoice: 'Factura',
      customerInformation: 'Información del Cliente',
      customerFormHint: '↑ ← → para volver',
      phone: 'Teléfono *'
    },
    // Modal de Pago Textos
    paymentModalTexts: {
      enterPhoneNumber: 'Ingresa el teléfono',
      searching: 'Buscando...',
      customerFound: 'Cliente encontrado',
      customerName: 'Nombre del cliente',
      customerLastName: 'Apellido del cliente',
      customerEmail: 'cliente@ejemplo.com'
    },
    // Escáner
    scannerInput: {
      placeholder: 'Escanea código de barras o escribe el código, luego presiona Enter'
    },
    // Lista de Artículos UI
    itemsList: {
      decreaseQuantity: 'Disminuir cantidad (- o ←)',
      increaseQuantity: 'Aumentar cantidad (+ o →)',
      removeItem: 'Eliminar artículo (Eliminar)',
      noStock: 'Sin stock'
    },
    // Diseño
    layout: {
      toggleSidebar: 'Cambiar ancho de la barra lateral'
    },
    // Login/Registro
    auth: {
      emailPlaceholder: 'usuario@ejemplo.com',
      passwordPlaceholder: 'Ingresa la contraseña',
      minCharacters: 'Mínimo 6 caracteres',
      businessNamePlaceholder: 'Mi Negocio'
    },
    // Común
    common: {
      loading: 'Cargando...',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      search: 'Buscar',
      filter: 'Filtrar',
      clear: 'Limpiar',
      copy: 'Copiar'
    }
  },
  fr: {
    // Navigation (simplified for now)
    nav: {
      currentSale: 'Vente Actuelle',
      inventory: 'Inventaire',
      pending: 'En Attente',
      reports: 'Rapports',
      settings: 'Paramètres'
    },
    settings: {
      title: 'Paramètres',
      subtitle: 'Configuration du système',
      userAccount: 'Compte Utilisateur',
      email: 'E-mail',
      signOut: 'Déconnexion',
      appearance: 'Apparence',
      theme: 'Thème',
      darkMode: 'Mode Sombre',
      lightMode: 'Mode Clair',
      language: 'Langue',
      displayLanguage: 'Langue d\'Affichage',
      currency: 'Devise',
      defaultCurrency: 'Devise par Défaut',
      printer: 'Configuration Imprimante',
      printerName: 'Nom de l\'Imprimante',
      paperWidth: 'Largeur du Papier',
      autoPrint: 'Imprimer automatiquement après vente',
      businessName: 'Nom commercial',
      businessNamePlaceholder: 'ex. Ma boutique',
      ticketIcon: 'Logo du ticket',
      ticketIconNone: 'Aucun',
      ticketIconTools: 'Outillage',
      ticketIconFlorist: 'Fleuriste',
      ticketIconBeauty: 'Salon de coiffure',
      ticketPreview: 'Aperçu du ticket',
      ticketTemplate: 'Style du ticket',
      ticketTemplateSimple: 'Standard (avec bordures)',
      ticketTemplateMinimal: 'Minimal (compact)',
      ticketTemplateFull: 'Complet (avec lignes extra)',
      ticketFooter: 'Texte en bas du ticket',
      ticketFooterPlaceholder: 'Une ligne par rang, ex.:\nMerci pour votre achat',
      ticketFooterHint: 'Chaque ligne apparaîtra en bas du ticket.',
      savePrinter: 'Enregistrer Configuration',
      saved: 'Enregistré!',
      systemInfo: 'Informations Système',
      version: 'Version',
      environment: 'Environnement'
    },
    // Inventaire Nouveau
    inventoryNewPage: {
      title: 'Nouvel Inventaire',
      subtitle: 'Scannez les produits pour les enregistrer rapidement.',
      backToInventory: '← Retour à l\'inventaire',
      registeredProductsSession: 'Produits enregistrés dans cette session',
      lastScannedCode: 'Dernier code scanné',
      quickActions: 'Actions rapides',
      clearSession: 'Effacer la session',
      scanSection: 'Numérisation',
      scanHint: 'Utilisez un scanner USB ou tapez un code et appuyez sur Entrée. Le champ reste prêt pour le code suivant.',
      existsModal: {
        title: 'Le produit existe déjà',
        description: 'Ce code est déjà enregistré. Que souhaitez-vous faire?',
        addStock: 'Ajouter du stock (entrée rapide)',
        editDetails: 'Modifier les détails'
      },
      newProductWizard: {
        title: 'Nouveau produit',
        scannedCode: 'Code scanné:',
        close: 'Fermer',
        step1: {
          label: 'Étape 1 · Nom du produit',
          dictate: 'Dicter',
          listening: 'À l\'écoute…',
          placeholder: 'Ex: Coca Cola 600ml',
          hint: 'Appuyez sur 🎤 Dicter et dites le nom du produit.',
          listeningHint: 'En parlant au microphone… appuyez de nouveau sur \"À l\'écoute…\" pour arrêter.'
        },
        step2: {
          label: 'Étape 2 · Stock initial'
        },
        step3: {
          label: 'Étape 3 · Prix',
          purchasePrice: 'Prix d\'achat',
          salePrice: 'Prix de vente',
          margin: 'Marge:'
        },
        cancel: 'Annuler',
        confirm: 'Confirmer',
        saving: 'Enregistrement…',
        voicePrompt: 'Nouveau produit. Dites le nom du produit.'
      },
      sessionList: {
        title: 'Session actuelle',
        subtitle: 'Produits enregistrés dans cette session:',
        saveAll: 'Enregistrer tout',
        empty: 'Aucun produit dans cette session pour le moment. Scannez un code pour commencer.',
        productLabel: {
          new: 'Nouveau',
          stock: 'Stock +'
        },
        code: 'Code:',
        stock: 'Stock:',
        purchase: 'Achat:',
        sale: 'Vente:'
      },
      scanInput: {
        placeholder: 'Scannez ou tapez un code et appuyez sur Entrée…'
      },
      voiceToggle: {
        enabled: 'Voix activée',
        disabled: 'Activer la voix',
        title: 'Mode voix (expérimental)',
        notAvailable: 'Voix non disponible sur ce système'
      }
    },
    // Dialogue Produit
    productModal: {
      stepIndicator: 'Étape {current} sur {total}',
      suggestedCode: 'Code suggéré:',
      profitMargin: 'Marge bénéficiaire: {margin}%',
      captura: 'Prendre une photo',
      cancelar: 'Annuler',
      capturar: '📷 Capturer',
      imagenDelProducto: 'IMAGE DU PRODUIT',
      sinImagen: 'Pas d\'image',
      subirImagen: 'Télécharger une image',
      capturarFoto: 'Capturer',
      quitarFondo: 'Supprimer l\'arrière-plan',
      procesando: 'Traitement...',
      productPreview: 'Aperçu du produit',
      eliminarImagen: 'Supprimer l\'image',
      haModificadoPrecios: 'Vous avez modifié les prix ou le stock. Vous devez télécharger une facture pour justifier les modifications.',
      facturaPdf: 'Facture PDF',
      facturaXml: 'Facture XML (Optionnel)',
      margenDeGanancia: 'Marge bénéficiaire',
      steps: [
        { label: 'Code Produit', placeholder: 'Entrez le code du produit', ariaLabel: 'Entrez le code du produit' },
        { label: 'Nom du Produit', placeholder: 'Entrez le nom du produit', ariaLabel: 'Entrez le nom du produit' },
        { label: 'Image du produit', placeholder: 'Téléchargez ou capturez une image', ariaLabel: 'Téléchargez ou capturez l\'image du produit' },
        { label: 'Code-barres', placeholder: 'Entrez le code-barres (optionnel)', ariaLabel: 'Entrez le code-barres' },
        { label: 'Description', placeholder: 'Entrez la description (optionnel)', ariaLabel: 'Entrez la description du produit' },
        { label: 'Prix d\'achat', placeholder: '0.00', ariaLabel: 'Entrez le prix d\'achat' },
        { label: 'Prix de vente', placeholder: '0.00', ariaLabel: 'Entrez le prix de vente' },
        { label: 'Stock initial', placeholder: '0', ariaLabel: 'Entrez le stock initial' }
      ]
    },
    // Dialogue Ajouter Produit Rapide
    quickAddProductModal: {
      title: 'Produit Non Trouvé',
      barcodeNotFound: 'Code-barres {barcode} non trouvé.',
      createQuickly: 'Créez rapidement un nouveau produit:',
      code: 'Code',
      internalCode: 'Code interne',
      name: 'Nom *',
      productName: 'Nom du produit',
      description: 'Description',
      productDescription: 'Description du produit',
      price: 'Prix *',
      stock: 'Stock',
      barcode: 'Code-barres'
    },
    // Dialogue Composant Paiement
    paymentModal: {
      title: 'Paiement',
      totalToPay: 'Total à Payer',
      items: 'article(s)',
      paymentMethod: 'Méthode de Paiement',
      navigateHint: '← → pour naviguer',
      cash: 'Espèces',
      card: 'Carte',
      transfer: 'Virement',
      receiptType: 'Type de Reçu',
      ticket: 'Ticket',
      invoice: 'Facture',
      customerInformation: 'Informations Client',
      customerFormHint: '↑ ← → pour revenir',
      phone: 'Téléphone *'
    },
    // Dialogue Paiement Textes
    paymentModalTexts: {
      enterPhoneNumber: 'Entrez le numéro de téléphone',
      searching: 'Recherche...',
      customerFound: 'Client trouvé',
      customerName: 'Nom du client',
      customerLastName: 'Nom de famille du client',
      customerEmail: 'client@exemple.com'
    },
    // Lecteur
    scannerInput: {
      placeholder: 'Scannez le code-barres ou entrez le code, puis appuyez sur Entrée'
    },
    // Liste d\'articles Interface
    itemsList: {
      decreaseQuantity: 'Diminuer la quantité (- ou ←)',
      increaseQuantity: 'Augmenter la quantité (+ ou →)',
      removeItem: 'Supprimer l\'article (Supprimer)',
      noStock: 'Sans stock'
    },
    // Disposition
    layout: {
      toggleSidebar: 'Changer la largeur de la barre latérale'
    },
    // Connexion/Inscription
    auth: {
      emailPlaceholder: 'utilisateur@exemple.com',
      passwordPlaceholder: 'Entrez le mot de passe',
      minCharacters: 'Minimum 6 caractères',
      businessNamePlaceholder: 'Mon entreprise'
    },
    // Commun
    common: {
      loading: 'Chargement...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      search: 'Rechercher',
      filter: 'Filtrer',
      clear: 'Effacer',
      copy: 'Copier'
    }
  },
  de: {
    // Navigation (simplified for now)
    nav: {
      currentSale: 'Aktueller Verkauf',
      inventory: 'Inventar',
      pending: 'Ausstehend',
      reports: 'Berichte',
      settings: 'Einstellungen'
    },
    settings: {
      title: 'Einstellungen',
      subtitle: 'Systemkonfiguration',
      userAccount: 'Benutzerkonto',
      email: 'E-Mail',
      signOut: 'Abmelden',
      appearance: 'Aussehen',
      theme: 'Thema',
      darkMode: 'Dunkler Modus',
      lightMode: 'Heller Modus',
      language: 'Sprache',
      displayLanguage: 'Anzeigesprache',
      currency: 'Währung',
      defaultCurrency: 'Standardwährung',
      printer: 'Druckerkonfiguration',
      printerName: 'Druckername',
      paperWidth: 'Papierbreite',
      autoPrint: 'Automatisch nach Verkauf drucken',
      businessName: 'Firmenname',
      businessNamePlaceholder: 'z.B. Mein Laden',
      ticketIcon: 'Ticket-Logo',
      ticketIconNone: 'Keins',
      ticketIconTools: 'Werkzeuge / Baumarkt',
      ticketIconFlorist: 'Blumenladen',
      ticketIconBeauty: 'Friseur / Kosmetik',
      ticketPreview: 'Ticket-Vorschau',
      ticketTemplate: 'Ticket-Stil',
      ticketTemplateSimple: 'Standard (mit Rahmen)',
      ticketTemplateMinimal: 'Minimal (kompakt)',
      ticketTemplateFull: 'Voll (mit Zusatzzeilen)',
      ticketFooter: 'Text unten auf dem Ticket',
      ticketFooterPlaceholder: 'Eine Zeile pro Reihe',
      ticketFooterHint: 'Jede Zeile erscheint am Ende des Tickets.',
      savePrinter: 'Konfiguration Speichern',
      saved: 'Gespeichert!',
      systemInfo: 'Systeminformationen',
      version: 'Version',
      environment: 'Umgebung'
    },
    // Neues Inventar
    inventoryNewPage: {
      title: 'Neues Inventar',
      subtitle: 'Produkte schnell scannen und registrieren.',
      backToInventory: '← Zurück zur Bestandsverwaltung',
      registeredProductsSession: 'In dieser Sitzung registrierte Produkte',
      lastScannedCode: 'Zuletzt gescannter Code',
      quickActions: 'Schnellaktionen',
      clearSession: 'Sitzung löschen',
      scanSection: 'Gescannte Artikel',
      scanHint: 'Verwenden Sie einen USB-Scanner oder geben Sie einen Code ein und drücken Sie die Eingabetaste. Das Feld bleibt für den nächsten Code bereit.',
      existsModal: {
        title: 'Produkt existiert bereits',
        description: 'Dieser Code ist bereits registriert. Was möchten Sie tun?',
        addStock: 'Bestand hinzufügen (Schnelleingabe)',
        editDetails: 'Details bearbeiten'
      },
      newProductWizard: {
        title: 'Neues Produkt',
        scannedCode: 'Gescannter Code:',
        close: 'Schließen',
        step1: {
          label: 'Schritt 1 · Produktname',
          dictate: 'Diktieren',
          listening: 'Höre zu…',
          placeholder: 'Z.B: Coca Cola 600ml',
          hint: 'Drücken Sie 🎤 Diktieren und sagen Sie den Produktnamen.',
          listeningHint: 'Sprechen Sie ins Mikrofon… drücken Sie erneut \"Höre zu…\" zum Beenden.'
        },
        step2: {
          label: 'Schritt 2 · Anfangsbestand'
        },
        step3: {
          label: 'Schritt 3 · Preise',
          purchasePrice: 'Einkaufspreis',
          salePrice: 'Verkaufspreis',
          margin: 'Marge:'
        },
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        saving: 'Speichern…',
        voicePrompt: 'Neues Produkt. Sagen Sie den Produktnamen.'
      },
      sessionList: {
        title: 'Aktuelle Sitzung',
        subtitle: 'In dieser Sitzung registrierte Produkte:',
        saveAll: 'Alle speichern',
        empty: 'Noch keine Produkte in dieser Sitzung. Scannen Sie einen Code zum Starten.',
        productLabel: {
          new: 'Neu',
          stock: 'Bestand +'
        },
        code: 'Code:',
        stock: 'Bestand:',
        purchase: 'Kauf:',
        sale: 'Verkauf:'
      },
      scanInput: {
        placeholder: 'Code scannen oder eingeben und die Eingabetaste drücken…'
      },
      voiceToggle: {
        enabled: 'Sprache aktiviert',
        disabled: 'Sprache aktivieren',
        title: 'Sprachmodus (experimentell)',
        notAvailable: 'Sprache auf diesem System nicht verfügbar'
      }
    },
    // Produktdialog
    productModal: {
      stepIndicator: 'Schritt {current} von {total}',
      suggestedCode: 'Vorgeschlagener Code:',
      profitMargin: 'Gewinnmarge: {margin}%',
      captura: 'Foto aufnehmen',
      cancelar: 'Abbrechen',
      capturar: '📷 Aufnehmen',
      imagenDelProducto: 'PRODUKTBILD',
      sinImagen: 'Kein Bild',
      subirImagen: 'Bild hochladen',
      capturarFoto: 'Aufnehmen',
      quitarFondo: 'Hintergrund entfernen',
      procesando: 'Wird bearbeitet...',
      productPreview: 'Produktvorschau',
      eliminarImagen: 'Bild löschen',
      haModificadoPrecios: 'Sie haben Preise oder Bestände geändert. Sie müssen eine Rechnung hochladen, um die Änderungen zu rechtfertigen.',
      facturaPdf: 'Rechnungs-PDF',
      facturaXml: 'Rechnungs-XML (Optional)',
      margenDeGanancia: 'Gewinnmarge',
      steps: [
        { label: 'Produktcode', placeholder: 'Produktcode eingeben', ariaLabel: 'Produktcode eingeben' },
        { label: 'Produktname', placeholder: 'Produktname eingeben', ariaLabel: 'Produktname eingeben' },
        { label: 'Produktbild', placeholder: 'Bild hochladen oder aufnehmen', ariaLabel: 'Produktbild hochladen oder aufnehmen' },
        { label: 'Strichcode', placeholder: 'Strichcode eingeben (optional)', ariaLabel: 'Strichcode eingeben' },
        { label: 'Beschreibung', placeholder: 'Beschreibung eingeben (optional)', ariaLabel: 'Produktbeschreibung eingeben' },
        { label: 'Einkaufspreis', placeholder: '0.00', ariaLabel: 'Einkaufspreis eingeben' },
        { label: 'Verkaufspreis', placeholder: '0.00', ariaLabel: 'Verkaufspreis eingeben' },
        { label: 'Anfangsbestand', placeholder: '0', ariaLabel: 'Anfangsbestand eingeben' }
      ]
    },
    // Schnellprodukt hinzufügen Dialog
    quickAddProductModal: {
      title: 'Produkt Nicht Gefunden',
      barcodeNotFound: 'Strichcode {barcode} nicht gefunden.',
      createQuickly: 'Erstellen Sie schnell ein neues Produkt:',
      code: 'Code',
      internalCode: 'Interner Code',
      name: 'Name *',
      productName: 'Produktname',
      description: 'Beschreibung',
      productDescription: 'Produktbeschreibung',
      price: 'Preis *',
      stock: 'Bestand',
      barcode: 'Strichcode'
    },
    // Zahlungsdialog Komponente
    paymentModal: {
      title: 'Zahlung',
      totalToPay: 'Gesamtbetrag',
      items: 'Artikel',
      paymentMethod: 'Zahlungsmethode',
      navigateHint: '← → zum Navigieren',
      cash: 'Bargeld',
      card: 'Karte',
      transfer: 'Überweisung',
      receiptType: 'Belegtyp',
      ticket: 'Kassenbon',
      invoice: 'Rechnung',
      customerInformation: 'Kundeninformation',
      customerFormHint: '↑ ← → zum Zurückgehen',
      phone: 'Telefon *'
    },
    // Zahlungsdialog Texte
    paymentModalTexts: {
      enterPhoneNumber: 'Telefonnummer eingeben',
      searching: 'Wird gesucht...',
      customerFound: 'Kunde gefunden',
      customerName: 'Kundenname',
      customerLastName: 'Nachname des Kunden',
      customerEmail: 'kunde@beispiel.de'
    },
    // Scanner
    scannerInput: {
      placeholder: 'Strichcode scannen oder Code eingeben und dann Enter drücken'
    },
    // Artikelliste Benutzeroberfläche
    itemsList: {
      decreaseQuantity: 'Menge verringern (- oder ←)',
      increaseQuantity: 'Menge erhöhen (+ oder →)',
      removeItem: 'Artikel entfernen (Entfernen)',
      noStock: 'Kein Bestand'
    },
    // Layout
    layout: {
      toggleSidebar: 'Breite der Seitenleiste ändern'
    },
    // Anmeldung/Registrierung
    auth: {
      emailPlaceholder: 'benutzer@beispiel.de',
      passwordPlaceholder: 'Passwort eingeben',
      minCharacters: 'Mindestens 6 Zeichen',
      businessNamePlaceholder: 'Mein Geschäft'
    },
    // Gemeinsam
    common: {
      loading: 'Wird geladen...',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      close: 'Schließen',
      search: 'Suchen',
      filter: 'Filtern',
      clear: 'Löschen',
      copy: 'Kopieren'
    }
  }
}

/**
 * Get translation for a key path
 * @param {string} key - Dot notation path (e.g., 'nav.currentSale')
 * @param {string} lang - Language code
 * @returns {string} Translated text or key if not found
 */
export const t = (key, lang = 'en') => {
  const keys = key.split('.')
  let value = translations[lang]
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k]
    } else {
      return key // Return key if not found
    }
  }
  
  return value || key
}
