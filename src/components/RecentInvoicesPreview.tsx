import React, { useState } from 'react';
import {
  Database,
  FileSpreadsheet,
  Eye,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  Building,
  IndianRupee,
  DollarSign,
  PlusCircle,
} from 'lucide-react';
import { InvoiceData, PaymentStatus } from '../types/invoice.js';
import { exportSingleInvoiceToExcel } from '../lib/excelExport.js';
import { formatAmountWithCurrency } from '../lib/currency.js';
import { ConfirmDialog } from './ConfirmDialog.js';

interface RecentInvoicesPreviewProps {
  invoices: InvoiceData[];
  onViewInvoice: (invoice: InvoiceData) => void;
  onDeleteInvoice: (id: string) => Promise<void>;
  onViewAll: () => void;
  onNewScan: () => void;
}

export const RecentInvoicesPreview: React.FC<RecentInvoicesPreviewProps> = ({
  invoices,
  onViewInvoice,
  onDeleteInvoice,
  onViewAll,
  onNewScan,
}) => {
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!invoiceToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteInvoice(invoiceToDelete.id);
      setInvoiceToDelete(null);
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const recentList = invoices.slice(0, 5);

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            Approved
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-base">
                Saved Database Invoices
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                {invoices.length} Saved in Cloud
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Permanently synced with Google Cloud Firestore database.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {invoices.length > 0 && (
            <button
              id="view-all-invoices-btn"
              onClick={onViewAll}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <span>View All ({invoices.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {invoices.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Database className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No Invoices Saved Yet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Upload a manufacturing receipt image above or select a realistic sample invoice to run the OCR extraction and save your first record.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Supplier / Vendor</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentList.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-slate-50/80 transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <button
                      onClick={() => onViewInvoice(invoice)}
                      className="text-blue-600 hover:underline text-left font-mono font-bold"
                    >
                      {invoice.invoiceNumber}
                    </button>
                    {invoice.poNumber && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        PO: {invoice.poNumber}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 line-clamp-1">
                      {invoice.vendorName}
                    </div>
                    {invoice.vendorTaxId && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        {invoice.vendorTaxId}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {invoice.invoiceDate}
                  </td>
                  <td className="py-3 px-4">
                    <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-[11px]">
                      {invoice.manufacturingCategory?.replace('_', ' ') || 'General'}
                    </span>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {getStatusBadge(invoice.paymentStatus)}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap text-sm">
                    {formatAmountWithCurrency(invoice.grandTotal, invoice.currency)}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(invoice)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="View Full Invoice Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => exportSingleInvoiceToExcel(invoice)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Download Excel (.xlsx)"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvoiceToDelete(invoice)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {invoices.length > 5 && (
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
              >
                Showing 5 of {invoices.length} invoices. Click to view all invoices in repository &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Recent Invoices Deletion */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        title="Delete Invoice Record"
        message={`Are you sure you want to delete invoice "${invoiceToDelete?.invoiceNumber || 'this record'}" from ${invoiceToDelete?.vendorName || 'the database'}? This action cannot be undone.`}
        confirmText="Delete Invoice"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setInvoiceToDelete(null)}
      />
    </div>
  );
};
