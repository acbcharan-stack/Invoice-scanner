export interface LineItem {
  id: string;
  itemCode?: string; // Part number, SKU, or HSN/SAC code
  description: string;
  quantity: number;
  unit: string; // e.g., kg, MT, pcs, units, sets, hours, liters, drums
  unitPrice: number;
  taxPercent?: number;
  totalPrice: number;
}

export type ManufacturingCategory =
  | 'raw_materials'
  | 'machinery_parts'
  | 'consumables'
  | 'chemicals'
  | 'packaging'
  | 'logistics'
  | 'other';

export type PaymentStatus = 'pending' | 'approved' | 'paid' | 'under_review';

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  poNumber?: string; // Purchase Order #
  deliveryChallan?: string; // GRN / Delivery Challan / Waybill #
  paymentTerms?: string; // e.g., Net 30, Net 60, Advance
  currency: string;

  // Vendor Information
  vendorId?: string;
  vendorName: string;
  vendorTaxId?: string; // GSTIN / VAT / EIN / Tax ID
  vendorAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;

  // Customer / Plant Information
  customerName?: string;
  customerAddress?: string;
  customerTaxId?: string;

  // Financials & Cost Breakdown
  subtotal: number;
  freightCharge: number;
  taxRate?: number;
  taxAmount: number;
  discount: number;
  grandTotal: number; // Final Total Cost

  // Classification & Tracking
  manufacturingCategory: ManufacturingCategory;
  paymentStatus: PaymentStatus;
  notes?: string;
  
  // Line items
  lineItems: LineItem[];

  // User Field Selections (which fields the user decided to keep/enable)
  selectedFields: string[];

  // Media
  imageFileName?: string;
  imageUrl?: string; // base64 preview or thumbnail
  
  createdAt: string;
  updatedAt?: string;
}

export interface VendorProfile {
  id: string;
  name: string;
  taxId?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  category: ManufacturingCategory;
  defaultPaymentTerms?: string;
  currency: string;
  notes?: string;
  totalSpend?: number;
  invoiceCount?: number;
  createdAt: string;
}

export interface ExtractionFieldConfig {
  id: string;
  label: string;
  category: 'core' | 'vendor' | 'cost' | 'manufacturing' | 'details';
  description: string;
  required?: boolean;
  defaultEnabled: boolean;
}

export const AVAILABLE_FIELDS: ExtractionFieldConfig[] = [
  {
    id: 'grandTotal',
    label: 'Total Cost / Payable',
    category: 'cost',
    description: 'Final grand total amount payable including all taxes and charges',
    required: true,
    defaultEnabled: true,
  },
  {
    id: 'invoiceNumber',
    label: 'Invoice Number',
    category: 'core',
    description: 'Unique bill or tax invoice reference number',
    defaultEnabled: true,
  },
  {
    id: 'invoiceDate',
    label: 'Invoice Date',
    category: 'core',
    description: 'Date the invoice was issued',
    defaultEnabled: true,
  },
  {
    id: 'dueDate',
    label: 'Due Date',
    category: 'core',
    description: 'Payment due deadline date',
    defaultEnabled: true,
  },
  {
    id: 'vendorName',
    label: 'Vendor / Supplier Name',
    category: 'vendor',
    description: 'Name of the manufacturing supplier or service provider',
    defaultEnabled: true,
  },
  {
    id: 'vendorTaxId',
    label: 'Vendor Tax ID / GSTIN',
    category: 'vendor',
    description: 'Tax identification number (GSTIN, VAT, EIN, TIN)',
    defaultEnabled: true,
  },
  {
    id: 'poNumber',
    label: 'PO (Purchase Order) Number',
    category: 'manufacturing',
    description: 'Internal manufacturing Purchase Order number',
    defaultEnabled: true,
  },
  {
    id: 'deliveryChallan',
    label: 'Delivery Challan / GRN',
    category: 'manufacturing',
    description: 'Goods Receipt Note, Challan, or Waybill tracking number',
    defaultEnabled: true,
  },
  {
    id: 'manufacturingCategory',
    label: 'Material / Expense Category',
    category: 'manufacturing',
    description: 'Raw materials, machinery parts, chemicals, packaging, etc.',
    defaultEnabled: true,
  },
  {
    id: 'currency',
    label: 'Currency',
    category: 'cost',
    description: 'Billing currency (USD, EUR, INR, GBP, etc.)',
    defaultEnabled: true,
  },
  {
    id: 'subtotal',
    label: 'Subtotal (Net Amount)',
    category: 'cost',
    description: 'Pre-tax total cost of items',
    defaultEnabled: true,
  },
  {
    id: 'taxAmount',
    label: 'Tax / GST / VAT Amount',
    category: 'cost',
    description: 'Total calculated tax liability',
    defaultEnabled: true,
  },
  {
    id: 'freightCharge',
    label: 'Freight / Transport Charge',
    category: 'cost',
    description: 'Logistics, delivery, and handling charges',
    defaultEnabled: true,
  },
  {
    id: 'discount',
    label: 'Discount / Round-off',
    category: 'cost',
    description: 'Deductions, trade discounts, or rounding off adjustments',
    defaultEnabled: false,
  },
  {
    id: 'lineItems',
    label: 'Itemized Line Items Table',
    category: 'details',
    description: 'Part numbers, item descriptions, quantities, units, and rates',
    defaultEnabled: true,
  },
  {
    id: 'paymentTerms',
    label: 'Payment Terms',
    category: 'details',
    description: 'Credit terms (Net 30, Net 60, Advance, COD)',
    defaultEnabled: true,
  },
  {
    id: 'vendorAddress',
    label: 'Vendor Address & Contact',
    category: 'vendor',
    description: 'Supplier location, phone, and contact email',
    defaultEnabled: false,
  },
  {
    id: 'customerName',
    label: 'Buyer / Plant Entity',
    category: 'details',
    description: 'Receiving manufacturing plant, factory, or corporate unit',
    defaultEnabled: false,
  },
  {
    id: 'notes',
    label: 'Terms & Remarks',
    category: 'details',
    description: 'Special specifications, warranty notes, or delivery terms',
    defaultEnabled: false,
  },
];
