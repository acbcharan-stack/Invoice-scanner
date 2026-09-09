import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar.js';
import { FieldSelector } from './components/FieldSelector.js';
import { UploadSection } from './components/UploadSection.js';
import { InvoiceReviewModal } from './components/InvoiceReviewModal.js';
import { InvoiceList } from './components/InvoiceList.js';
import { RecentInvoicesPreview } from './components/RecentInvoicesPreview.js';
import { VendorProfilesView } from './components/VendorProfilesView.js';
import { AnalyticsSummary } from './components/AnalyticsSummary.js';
import {
  InvoiceData,
  VendorProfile,
  AVAILABLE_FIELDS,
} from './types/invoice.js';
import {
  fetchInvoices,
  saveInvoiceToDb,
  deleteInvoiceFromDb,
  fetchVendorProfiles,
  saveVendorProfileToDb,
  deleteVendorProfileFromDb,
  subscribeToInvoices,
  subscribeToVendorProfiles,
  INITIAL_VENDOR_PROFILES,
} from './lib/firebase.js';
import { extractInvoiceFromImage } from './services/geminiOcr.js';
import { exportInvoiceBatchToExcel, exportSingleInvoiceToExcel } from './lib/excelExport.js';
import { SampleInvoice, SAMPLE_MANUFACTURING_INVOICES } from './lib/sampleInvoices.js';
import { formatAmountWithCurrency } from './lib/currency.js';
import { ConfirmDialog } from './components/ConfirmDialog.js';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Eye,
  Trash2,
  Save,
  Download,
  Calendar,
  Building,
  DollarSign,
  Package,
  Layers,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('extract');
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>(
    AVAILABLE_FIELDS.filter((f) => f.defaultEnabled).map((f) => f.id)
  );

  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Review Modal state (for newly scanned or editing invoice)
  const [reviewModalData, setReviewModalData] = useState<{
    data: Partial<InvoiceData>;
    previewUrl: string;
    confidence?: number;
  } | null>(null);

  // Read-only inspection modal for existing invoice
  const [inspectingInvoice, setInspectingInvoice] = useState<InvoiceData | null>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<InvoiceData | null>(null);
  const [isDeletingInspecting, setIsDeletingInspecting] = useState(false);

  const handleConfirmDeleteInspecting = async () => {
    if (!deleteConfirmInvoice) return;
    try {
      setIsDeletingInspecting(true);
      await handleDeleteInvoice(deleteConfirmInvoice.id);
      setDeleteConfirmInvoice(null);
      setInspectingInvoice(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    } finally {
      setIsDeletingInspecting(false);
    }
  };

  // Subscribe to real-time Firestore database updates on mount
  useEffect(() => {
    setIsLoadingDb(true);

    const unsubInvoices = subscribeToInvoices(
      (loadedInvoices) => {
        setInvoices(loadedInvoices);
        setIsLoadingDb(false);
      },
      (err) => {
        console.warn('Realtime invoices subscription error:', err);
        setIsLoadingDb(false);
      }
    );

    const unsubVendors = subscribeToVendorProfiles(
      (loadedVendors) => {
        setVendors(loadedVendors);
      },
      (err) => {
        console.warn('Realtime vendors subscription error:', err);
      }
    );

    return () => {
      unsubInvoices();
      unsubVendors();
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  // Handle OCR Extraction Trigger
  const handleExtractInvoice = async (
    imageBase64: string,
    mimeType: string,
    sampleInvoice?: SampleInvoice
  ) => {
    try {
      setIsExtracting(true);

      // If a preset sample invoice was chosen, we can either call the OCR endpoint or use preparsed data
      let extractedResult: Partial<InvoiceData> & { confidenceScore?: number };

      if (sampleInvoice && sampleInvoice.preparsedData) {
        // Quick high-confidence result from sample
        extractedResult = {
          ...sampleInvoice.preparsedData,
          confidenceScore: 98,
        };
      } else {
        // Real OCR via Gemini API on the server
        extractedResult = await extractInvoiceFromImage(
          imageBase64,
          mimeType,
          selectedFieldIds
        );
      }

      // Filter or tag with selected fields
      extractedResult.selectedFields = selectedFieldIds;

      setReviewModalData({
        data: extractedResult,
        previewUrl: imageBase64,
        confidence: extractedResult.confidenceScore || 94,
      });

      showToast('OCR extraction completed! Review and confirm fields before saving.', 'info');
    } catch (err: any) {
      console.error('Extraction error:', err);
      let errMsg = err?.message || 'Failed to extract text using OCR.';
      try {
        const parsed = JSON.parse(errMsg);
        if (parsed?.error?.message) errMsg = parsed.error.message;
      } catch {
        // not JSON
      }
      showToast(errMsg, 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  // Save invoice to database (and optionally export to Excel)
  const handleSaveInvoiceRecord = async (
    invoice: InvoiceData,
    andExportExcel: boolean
  ) => {
    try {
      await saveInvoiceToDb(invoice);

      // Update state
      setInvoices((prev) => {
        const idx = prev.findIndex((i) => i.id === invoice.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = invoice;
          return next;
        }
        return [invoice, ...prev];
      });

      // Update vendor total spend
      if (invoice.vendorName) {
        setVendors((prevVendors) => {
          const target = prevVendors.find(
            (v) => v.name.toLowerCase() === invoice.vendorName.toLowerCase()
          );
          if (target) {
            const updatedVendor: VendorProfile = {
              ...target,
              totalSpend: (target.totalSpend || 0) + invoice.grandTotal,
              invoiceCount: (target.invoiceCount || 0) + 1,
            };
            saveVendorProfileToDb(updatedVendor);
            return prevVendors.map((v) => (v.id === target.id ? updatedVendor : v));
          } else {
            // Create new vendor profile automatically
            const newVendor: VendorProfile = {
              id: `vend-${Date.now()}`,
              name: invoice.vendorName,
              taxId: invoice.vendorTaxId,
              category: invoice.manufacturingCategory,
              defaultPaymentTerms: invoice.paymentTerms || 'Net 30',
              currency: invoice.currency || 'USD',
              address: invoice.vendorAddress,
              totalSpend: invoice.grandTotal,
              invoiceCount: 1,
              createdAt: new Date().toISOString(),
            };
            saveVendorProfileToDb(newVendor);
            return [...prevVendors, newVendor];
          }
        });
      }

      if (andExportExcel) {
        showToast(
          `Invoice ${invoice.invoiceNumber} saved to database & exported to Excel (.xlsx)!`,
          'success'
        );
      } else {
        showToast(`Invoice ${invoice.invoiceNumber} successfully saved to database!`, 'success');
      }

      // Switch to database list view so user can see it
      setActiveTab('invoices');
    } catch (err: any) {
      console.error('Error saving invoice to DB:', err);
      showToast('Failed to save to database: ' + (err?.message || 'Unknown database error'), 'error');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    try {
      await deleteInvoiceFromDb(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      showToast('Invoice removed from database.', 'info');
    } catch (err: any) {
      console.error('Error deleting invoice:', err);
      showToast('Failed to delete invoice: ' + (err?.message || 'Error'), 'error');
    }
  };

  const handleSaveVendor = async (vendor: VendorProfile) => {
    await saveVendorProfileToDb(vendor);
    setVendors((prev) => {
      const idx = prev.findIndex((v) => v.id === vendor.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = vendor;
        return next;
      }
      return [...prev, vendor];
    });
    showToast(`Supplier profile "${vendor.name}" saved.`, 'success');
  };

  const handleDeleteVendor = async (id: string) => {
    await deleteVendorProfileFromDb(id);
    setVendors((prev) => prev.filter((v) => v.id !== id));
    showToast('Supplier profile removed.', 'info');
  };

  const handleBatchExportExcel = () => {
    if (invoices.length === 0) {
      showToast('No invoices available in database to export.', 'error');
      return;
    }
    exportInvoiceBatchToExcel(invoices, 'Manufacturing_All_Invoices_Register');
    showToast(`Exported ${invoices.length} invoices to Excel (.xlsx)!`, 'success');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center space-x-3 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : toastMessage.type === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-2 hover:opacity-75"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* App Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        invoiceCount={invoices.length}
        vendorCount={vendors.length}
        onBatchExportExcel={handleBatchExportExcel}
        isDbConnected={!isLoadingDb}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Tab 1: OCR Scan & Extraction Workflow */}
        {activeTab === 'extract' && (
          <div className="space-y-6">
            {/* Step 1: Field Selection Controls */}
            <FieldSelector
              selectedFieldIds={selectedFieldIds}
              onChange={setSelectedFieldIds}
            />

            {/* Step 2: Upload Zone & OCR Engine */}
            <UploadSection
              onExtract={handleExtractInvoice}
              isLoading={isExtracting}
              selectedFieldsCount={selectedFieldIds.length}
            />

            {/* Step 3: Live Saved Invoices Repository Preview */}
            <RecentInvoicesPreview
              invoices={invoices}
              onViewInvoice={(inv) => setInspectingInvoice(inv)}
              onDeleteInvoice={handleDeleteInvoice}
              onViewAll={() => setActiveTab('invoices')}
              onNewScan={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {/* Tab 2: Database Invoices Repository */}
        {activeTab === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            onDeleteInvoice={handleDeleteInvoice}
            onViewInvoice={(inv) => setInspectingInvoice(inv)}
            onNewScan={() => setActiveTab('extract')}
          />
        )}

        {/* Tab 3: Manufacturing Supplier Profiles */}
        {activeTab === 'vendors' && (
          <VendorProfilesView
            vendors={vendors}
            onSaveVendor={handleSaveVendor}
            onDeleteVendor={handleDeleteVendor}
          />
        )}

        {/* Tab 4: Spend Analytics */}
        {activeTab === 'analytics' && (
          <AnalyticsSummary
            invoices={invoices}
            vendors={vendors}
            onNavigateToInvoices={() => setActiveTab('invoices')}
          />
        )}
      </main>

      {/* Verification & Field Customization Modal (Triggered after OCR or edit) */}
      {reviewModalData && (
        <InvoiceReviewModal
          initialData={reviewModalData.data}
          imagePreviewUrl={reviewModalData.previewUrl}
          vendorProfiles={vendors}
          confidenceScore={reviewModalData.confidence}
          onSave={handleSaveInvoiceRecord}
          onClose={() => setReviewModalData(null)}
        />
      )}

      {/* Read-Only Details / Inspection Modal */}
      {inspectingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-slate-400">Invoice Record</span>
                <h3 className="text-lg font-bold text-slate-900">
                  {inspectingInvoice.invoiceNumber} — {inspectingInvoice.vendorName}
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  id="inspect-excel-btn"
                  onClick={() => exportSingleInvoiceToExcel(inspectingInvoice)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => setInspectingInvoice(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              {/* Cost Highlight */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Total Cost</span>
                  <div className="text-2xl font-extrabold">
                    {formatAmountWithCurrency(inspectingInvoice.grandTotal, inspectingInvoice.currency)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-300 space-y-0.5">
                  <div>Subtotal: {formatAmountWithCurrency(inspectingInvoice.subtotal, inspectingInvoice.currency)}</div>
                  <div>Freight: {formatAmountWithCurrency(inspectingInvoice.freightCharge, inspectingInvoice.currency)}</div>
                  <div>Tax: {formatAmountWithCurrency(inspectingInvoice.taxAmount, inspectingInvoice.currency)}</div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Invoice Date</span>
                  <span className="font-bold text-slate-800">{inspectingInvoice.invoiceDate}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">PO Number</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {inspectingInvoice.poNumber || 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Delivery Challan</span>
                  <span className="font-bold text-slate-800">
                    {inspectingInvoice.deliveryChallan || 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block mb-0.5">Tax ID / GSTIN</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {inspectingInvoice.vendorTaxId || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Line Items Table */}
              {inspectingInvoice.lineItems && inspectingInvoice.lineItems.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Itemized Materials</h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Part #</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right">Qty</th>
                          <th className="p-2.5">Unit</th>
                          <th className="p-2.5 text-right">Rate</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inspectingInvoice.lineItems.map((it, idx) => (
                          <tr key={it.id || idx}>
                            <td className="p-2.5 font-mono text-slate-700">{it.itemCode || '—'}</td>
                            <td className="p-2.5 font-medium text-slate-900">{it.description}</td>
                            <td className="p-2.5 text-right">{it.quantity}</td>
                            <td className="p-2.5">{it.unit}</td>
                            <td className="p-2.5 text-right">
                              {formatAmountWithCurrency(it.unitPrice, inspectingInvoice.currency)}
                            </td>
                            <td className="p-2.5 text-right font-bold">
                              {formatAmountWithCurrency(it.totalPrice, inspectingInvoice.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Image Preview if available */}
              {inspectingInvoice.imageUrl && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Invoice Document Visual</h4>
                  <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-80 overflow-auto flex justify-center">
                    <img
                      src={inspectingInvoice.imageUrl}
                      alt="Receipt Document"
                      className="max-h-72 object-contain rounded shadow-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDeleteConfirmInvoice(inspectingInvoice)}
                className="text-xs text-red-600 hover:text-red-700 hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Invoice Record</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectingInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting in Inspector */}
      <ConfirmDialog
        isOpen={!!deleteConfirmInvoice}
        title="Delete Invoice Record"
        message={`Are you sure you want to delete invoice "${deleteConfirmInvoice?.invoiceNumber || 'this record'}" from ${deleteConfirmInvoice?.vendorName || 'the database'}? This action cannot be undone.`}
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingInspecting}
        onConfirm={handleConfirmDeleteInspecting}
        onCancel={() => setDeleteConfirmInvoice(null)}
      />
    </div>
  );
}
