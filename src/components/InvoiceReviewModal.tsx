import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Building,
  IndianRupee,
  DollarSign,
  Tag,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Sparkles,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  InvoiceData,
  LineItem,
  ManufacturingCategory,
  PaymentStatus,
  VendorProfile,
  AVAILABLE_FIELDS,
} from '../types/invoice.js';
import { exportSingleInvoiceToExcel } from '../lib/excelExport.js';
import {
  formatAmountWithCurrency,
  getCurrencySymbol,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
} from '../lib/currency.js';

interface InvoiceReviewModalProps {
  initialData: Partial<InvoiceData>;
  imagePreviewUrl: string;
  vendorProfiles: VendorProfile[];
  onSave: (invoice: InvoiceData, andExportExcel: boolean) => Promise<void>;
  onClose: () => void;
  confidenceScore?: number;
}

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  initialData,
  imagePreviewUrl,
  vendorProfiles,
  onSave,
  onClose,
  confidenceScore = 95,
}) => {
  // Form State
  const [formData, setFormData] = useState<Partial<InvoiceData>>({
    id: initialData.id || `inv-${Date.now()}`,
    invoiceNumber: initialData.invoiceNumber || '',
    invoiceDate: initialData.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: initialData.dueDate || '',
    poNumber: initialData.poNumber || '',
    deliveryChallan: initialData.deliveryChallan || '',
    paymentTerms: initialData.paymentTerms || 'Net 30',
    currency: initialData.currency || DEFAULT_CURRENCY,
    vendorName: initialData.vendorName || '',
    vendorTaxId: initialData.vendorTaxId || '',
    vendorAddress: initialData.vendorAddress || '',
    customerName: initialData.customerName || 'Manufacturing Plant',
    customerAddress: initialData.customerAddress || '',
    subtotal: initialData.subtotal || 0,
    freightCharge: initialData.freightCharge || 0,
    taxAmount: initialData.taxAmount || 0,
    discount: initialData.discount || 0,
    grandTotal: initialData.grandTotal || 0,
    manufacturingCategory: (initialData.manufacturingCategory || 'raw_materials') as ManufacturingCategory,
    paymentStatus: (initialData.paymentStatus || 'pending') as PaymentStatus,
    notes: initialData.notes || '',
    lineItems: initialData.lineItems || [],
    selectedFields: initialData.selectedFields || AVAILABLE_FIELDS.filter((f) => f.defaultEnabled).map((f) => f.id),
    imageUrl: imagePreviewUrl,
    createdAt: initialData.createdAt || new Date().toISOString(),
  });

  const [activeFields, setActiveFields] = useState<string[]>(
    initialData.selectedFields && initialData.selectedFields.length > 0
      ? initialData.selectedFields
      : AVAILABLE_FIELDS.filter((f) => f.defaultEnabled).map((f) => f.id)
  );

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [matchedVendor, setMatchedVendor] = useState<VendorProfile | null>(null);

  // Match existing supplier
  useEffect(() => {
    if (formData.vendorName) {
      const match = vendorProfiles.find(
        (v) =>
          v.name.toLowerCase().includes(formData.vendorName!.toLowerCase()) ||
          formData.vendorName!.toLowerCase().includes(v.name.toLowerCase()) ||
          (formData.vendorTaxId && v.taxId === formData.vendorTaxId)
      );
      setMatchedVendor(match || null);
    }
  }, [formData.vendorName, formData.vendorTaxId, vendorProfiles]);

  // Recalculate financial totals when line items or charges change
  const handleRecalculateTotals = (
    items: LineItem[],
    freight: number,
    tax: number,
    discount: number
  ) => {
    const computedSubtotal = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
    const finalTotal = computedSubtotal + freight + tax - discount;
    setFormData((prev) => ({
      ...prev,
      subtotal: Math.round(computedSubtotal * 100) / 100,
      freightCharge: freight,
      taxAmount: tax,
      discount: discount,
      grandTotal: Math.round(finalTotal * 100) / 100,
    }));
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updatedItems = [...(formData.lineItems || [])];
    const current = { ...updatedItems[index], [field]: value };

    // Auto-calculate line total
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = field === 'quantity' ? parseFloat(value) || 0 : current.quantity || 0;
      const rate = field === 'unitPrice' ? parseFloat(value) || 0 : current.unitPrice || 0;
      current.totalPrice = Math.round(qty * rate * 100) / 100;
    }

    updatedItems[index] = current;
    setFormData((prev) => ({ ...prev, lineItems: updatedItems }));
    handleRecalculateTotals(
      updatedItems,
      formData.freightCharge || 0,
      formData.taxAmount || 0,
      formData.discount || 0
    );
  };

  const handleAddLineItem = () => {
    if (!activeFields.includes('lineItems')) {
      setActiveFields((prev) => [...prev, 'lineItems']);
    }
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      itemCode: '',
      description: 'New Material / Component',
      quantity: 1,
      unit: 'pcs',
      unitPrice: 0,
      totalPrice: 0,
    };
    const updated = [...(formData.lineItems || []), newItem];
    setFormData((prev) => ({ ...prev, lineItems: updated }));
  };

  const handleRemoveLineItem = (index: number) => {
    const updated = (formData.lineItems || []).filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, lineItems: updated }));
    handleRecalculateTotals(
      updated,
      formData.freightCharge || 0,
      formData.taxAmount || 0,
      formData.discount || 0
    );
  };

  const toggleFieldActive = (fieldId: string) => {
    if (fieldId === 'grandTotal') return;
    setActiveFields((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const handleSaveInvoice = async (andExportExcel: boolean) => {
    try {
      setIsSaving(true);
      const completeRecord: InvoiceData = {
        id: formData.id || `inv-${Date.now()}`,
        invoiceNumber: formData.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
        invoiceDate: formData.invoiceDate || new Date().toISOString().slice(0, 10),
        dueDate: formData.dueDate,
        poNumber: formData.poNumber,
        deliveryChallan: formData.deliveryChallan,
        paymentTerms: formData.paymentTerms || 'Net 30',
        currency: formData.currency || DEFAULT_CURRENCY,
        vendorId: matchedVendor?.id,
        vendorName: formData.vendorName || 'Unknown Vendor',
        vendorTaxId: formData.vendorTaxId,
        vendorAddress: formData.vendorAddress,
        customerName: formData.customerName,
        customerAddress: formData.customerAddress,
        subtotal: formData.subtotal || 0,
        freightCharge: formData.freightCharge || 0,
        taxAmount: formData.taxAmount || 0,
        taxRate: formData.taxRate,
        discount: formData.discount || 0,
        grandTotal: formData.grandTotal || 0,
        manufacturingCategory: (formData.manufacturingCategory || 'raw_materials') as ManufacturingCategory,
        paymentStatus: (formData.paymentStatus || 'pending') as PaymentStatus,
        notes: formData.notes,
        lineItems: formData.lineItems || [],
        selectedFields: activeFields,
        imageUrl: imagePreviewUrl,
        createdAt: formData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(completeRecord, andExportExcel);
      if (andExportExcel) {
        exportSingleInvoiceToExcel(completeRecord);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save invoice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-lg">
                  Verify &amp; Choose Fields to Save
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>{confidenceScore}% OCR Confidence</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Compare extracted fields against the receipt image on the left. Toggle any fields on/off, adjust values, and save to database.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split View (Image on left, Extracted Fields on right) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT: Image Visual Inspection Panel (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden relative">
            <div className="p-2.5 bg-slate-950 text-white flex items-center justify-between text-xs px-4">
              <span className="font-medium text-slate-300">Original Invoice Image</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
                  title="Reset Zoom"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Canvas / Image Container */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/90">
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-w-full shadow-2xl rounded-sm overflow-hidden bg-white"
              >
                <img
                  src={imagePreviewUrl}
                  alt="Invoice Receipt"
                  className="max-h-[70vh] object-contain select-none"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Editable Form & Field Picker (7 cols) */}
          <div className="lg:col-span-7 bg-white overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Top Cost Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Cost Payable (Grand Total)
                </span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">
                    {formatAmountWithCurrency(formData.grandTotal, formData.currency)}
                  </span>
                  <span className="text-xs text-slate-400">
                    (Subtotal: {formatAmountWithCurrency(formData.subtotal, formData.currency)})
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400">Currency:</span>
                  <select
                    id="modal-currency-select"
                    value={formData.currency || 'INR'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400">Status:</span>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentStatus: e.target.value as PaymentStatus,
                      }))
                    }
                    className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="under_review">Under Review</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Field Choice Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <span className="font-medium">
                Tip: Click the checkbox next to any field title to include or exclude it from database saving and Excel export.
              </span>
              <span className="text-[11px] font-bold text-blue-700 ml-2">
                {activeFields.length} active
              </span>
            </div>

            {/* 1. Supplier & PO Information Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>Supplier &amp; PO Tracking</span>
                </h4>
                {matchedVendor && (
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-md">
                    Matched Profile: {matchedVendor.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vendor Name */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('vendorName')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('vendorName') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Vendor / Supplier Name</span>
                  </div>
                  <input
                    type="text"
                    value={formData.vendorName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vendorName: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Vendor Tax ID */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('vendorTaxId')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('vendorTaxId') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Vendor Tax ID / GSTIN</span>
                  </div>
                  <input
                    type="text"
                    value={formData.vendorTaxId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, vendorTaxId: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                {/* PO Number (Manufacturing Critical) */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('poNumber')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('poNumber') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Purchase Order (PO) #</span>
                  </div>
                  <input
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, poNumber: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    placeholder="e.g. PO-MFG-8821"
                  />
                </div>

                {/* Delivery Challan / GRN */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('deliveryChallan')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('deliveryChallan') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Delivery Challan / GRN</span>
                  </div>
                  <input
                    type="text"
                    value={formData.deliveryChallan}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, deliveryChallan: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="e.g. DC-9901"
                  />
                </div>
              </div>
            </div>

            {/* 2. Invoice Meta & Category */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Invoice Metadata &amp; Expense Category</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Invoice Number */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('invoiceNumber')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('invoiceNumber') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Invoice Number</span>
                  </div>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, invoiceNumber: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                  />
                </div>

                {/* Invoice Date */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('invoiceDate')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('invoiceDate') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Invoice Date</span>
                  </div>
                  <input
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, invoiceDate: e.target.value }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Manufacturing Category */}
                <div className="space-y-1">
                  <div
                    onClick={() => toggleFieldActive('manufacturingCategory')}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none"
                  >
                    {activeFields.includes('manufacturingCategory') ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>Material Category</span>
                  </div>
                  <select
                    value={formData.manufacturingCategory}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        manufacturingCategory: e.target.value as ManufacturingCategory,
                      }))
                    }
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
                  >
                    <option value="raw_materials">Raw Materials</option>
                    <option value="machinery_parts">Machinery &amp; Tooling</option>
                    <option value="chemicals">Chemicals &amp; Lubricants</option>
                    <option value="consumables">Consumables &amp; Hardware</option>
                    <option value="packaging">Packaging &amp; Pallets</option>
                    <option value="logistics">Logistics &amp; Transport</option>
                    <option value="other">Other Supplies</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Itemized Line Items Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div
                  onClick={() => toggleFieldActive('lineItems')}
                  className="flex items-center space-x-2 cursor-pointer select-none"
                >
                  {activeFields.includes('lineItems') ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Line Items &amp; Material Breakdown ({formData.lineItems?.length || 0})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Line Item</span>
                </button>
              </div>

              {activeFields.includes('lineItems') && (
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2 w-24">Part #</th>
                        <th className="p-2">Description / Material</th>
                        <th className="p-2 w-16 text-right">Qty</th>
                        <th className="p-2 w-16">Unit</th>
                        <th className="p-2 w-20 text-right">Rate</th>
                        <th className="p-2 w-24 text-right">Total</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(formData.lineItems || []).map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.itemCode || ''}
                              onChange={(e) =>
                                handleLineItemChange(idx, 'itemCode', e.target.value)
                              }
                              placeholder="Part #"
                              className="w-full p-1 border border-slate-200 rounded font-mono text-slate-800"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                handleLineItemChange(idx, 'description', e.target.value)
                              }
                              className="w-full p-1 border border-slate-200 rounded text-slate-900"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(idx, 'quantity', e.target.value)
                              }
                              className="w-full p-1 border border-slate-200 rounded text-right"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) =>
                                handleLineItemChange(idx, 'unit', e.target.value)
                              }
                              className="w-full p-1 border border-slate-200 rounded"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleLineItemChange(idx, 'unitPrice', e.target.value)
                              }
                              className="w-full p-1 border border-slate-200 rounded text-right"
                            />
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-800">
                            {formatAmountWithCurrency(item.totalPrice, formData.currency)}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleRemoveLineItem(idx)}
                              className="text-slate-400 hover:text-red-600 p-1"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. Financial Cost Summary Grid */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <IndianRupee className="w-4 h-4 text-blue-600" />
                <span>Cost Breakdown &amp; Financial Totals</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Subtotal */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Subtotal (Net)</span>
                  <div className="mt-1 font-bold text-slate-800 text-sm">
                    {formatAmountWithCurrency(formData.subtotal, formData.currency)}
                  </div>
                </div>

                {/* Freight */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Freight &amp; Transport</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.freightCharge || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleRecalculateTotals(
                        formData.lineItems || [],
                        val,
                        formData.taxAmount || 0,
                        formData.discount || 0
                      );
                    }}
                    className="w-full mt-1 p-1 font-bold text-slate-800 border border-slate-200 rounded"
                  />
                </div>

                {/* Tax */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 font-medium">Tax / GST Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.taxAmount || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      handleRecalculateTotals(
                        formData.lineItems || [],
                        formData.freightCharge || 0,
                        val,
                        formData.discount || 0
                      );
                    }}
                    className="w-full mt-1 p-1 font-bold text-slate-800 border border-slate-200 rounded"
                  />
                </div>

                {/* Grand Total */}
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                  <span className="text-blue-700 font-bold">Grand Total Cost</span>
                  <div className="mt-1 font-extrabold text-blue-900 text-base">
                    {formatAmountWithCurrency(formData.grandTotal, formData.currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-2 border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel / Discard
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <button
              id="save-invoice-only-btn"
              onClick={() => handleSaveInvoice(false)}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save to Database</span>
                </>
              )}
            </button>

            <button
              id="save-and-export-excel-btn"
              onClick={() => handleSaveInvoice(true)}
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving & Exporting...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Save &amp; Export to Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
