import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Eye,
  Calendar,
  Building,
  IndianRupee,
  DollarSign,
  Package,
  Layers,
  ArrowUpDown,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { InvoiceData, ManufacturingCategory, PaymentStatus } from '../types/invoice.js';
import { exportSingleInvoiceToExcel, exportInvoiceBatchToExcel } from '../lib/excelExport.js';
import { formatAmountWithCurrency, formatIndianCurrency } from '../lib/currency.js';
import { ConfirmDialog } from './ConfirmDialog.js';

interface InvoiceListProps {
  invoices: InvoiceData[];
  onDeleteInvoice: (id: string) => Promise<void>;
  onViewInvoice: (invoice: InvoiceData) => void;
  onNewScan: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  onDeleteInvoice,
  onViewInvoice,
  onNewScan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const filteredInvoices = invoices.filter((inv) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (inv.invoiceNumber || '').toLowerCase().includes(term) ||
      (inv.vendorName || '').toLowerCase().includes(term) ||
      (inv.poNumber && inv.poNumber.toLowerCase().includes(term)) ||
      (inv.deliveryChallan && inv.deliveryChallan.toLowerCase().includes(term)) ||
      inv.lineItems?.some((it) => (it?.description || '').toLowerCase().includes(term));

    const matchesCategory = categoryFilter === 'all' || inv.manufacturingCategory === categoryFilter;
    const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalSpend = filteredInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalFreight = filteredInvoices.reduce((sum, inv) => sum + (inv.freightCharge || 0), 0);
  const totalTax = filteredInvoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);

  const handleExportFiltered = () => {
    if (filteredInvoices.length === 0) return;
    exportInvoiceBatchToExcel(filteredInvoices, 'Filtered_Manufacturing_Invoices');
  };

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

  const getCategoryLabel = (cat: ManufacturingCategory) => {
    switch (cat) {
      case 'raw_materials':
        return 'Raw Materials';
      case 'machinery_parts':
        return 'Machinery & Tools';
      case 'chemicals':
        return 'Chemicals & Fluids';
      case 'consumables':
        return 'Consumables';
      case 'packaging':
        return 'Packaging';
      case 'logistics':
        return 'Logistics';
      default:
        return 'Other';
    }
  };

  return (
    <div className="space-y-5">
      {/* Financial Overview Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Spend (DB)</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalSpend)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {filteredInvoices.length} matching invoices
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Freight &amp; Transport</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalFreight)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Logistics landed costs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Tax / GST</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalTax)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Total input tax credit pool</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Excel Integration</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <button
            onClick={handleExportFiltered}
            disabled={filteredInvoices.length === 0}
            className="w-full mt-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Filtered ({filteredInvoices.length}) to Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search invoice #, vendor, PO #, items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="raw_materials">Raw Materials</option>
            <option value="machinery_parts">Machinery &amp; Tools</option>
            <option value="chemicals">Chemicals &amp; Lubricants</option>
            <option value="consumables">Consumables</option>
            <option value="packaging">Packaging</option>
            <option value="logistics">Logistics</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Payment Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="under_review">Under Review</option>
          </select>

          <button
            onClick={onNewScan}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors ml-auto md:ml-0"
          >
            + Scan New Receipt
          </button>
        </div>
      </div>

      {/* Invoices List / Table */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No Invoices Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all'
              ? 'No records match your active search and filter criteria. Try resetting filters.'
              : 'You have not saved any invoices to the database yet. Upload a receipt or try a sample to start extracting!'}
          </p>
          <div className="mt-4">
            <button
              onClick={onNewScan}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-500 shadow-sm"
            >
              Scan &amp; Extract First Invoice
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice # &amp; Date</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">PO &amp; Challan</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Items</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Excel &amp; Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => onViewInvoice(inv)}
                  >
                    {/* Invoice # & Date */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{inv.invoiceDate}</span>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 line-clamp-1">
                        {inv.vendorName}
                      </div>
                      {inv.vendorTaxId && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {inv.vendorTaxId}
                        </div>
                      )}
                    </td>

                    {/* PO & Challan */}
                    <td className="py-3 px-4">
                      {inv.poNumber ? (
                        <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                          {inv.poNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      {inv.deliveryChallan && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          DC: {inv.deliveryChallan}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded text-[11px]">
                        {getCategoryLabel(inv.manufacturingCategory)}
                      </span>
                    </td>

                    {/* Item count */}
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      {inv.lineItems?.length || 0} items
                    </td>

                    {/* Grand Total Cost */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatAmountWithCurrency(inv.grandTotal, inv.currency)}
                      </div>
                      {inv.freightCharge > 0 && (
                        <div className="text-[10px] text-slate-400">
                          +{formatAmountWithCurrency(inv.freightCharge, inv.currency)} freight
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {getStatusBadge(inv.paymentStatus)}
                    </td>

                    {/* Excel Download & Actions */}
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1">
                        {/* Excel Export Button */}
                        <button
                          type="button"
                          id={`excel-btn-${inv.id}`}
                          onClick={() => exportSingleInvoiceToExcel(inv)}
                          title="Export this invoice to Excel (.xlsx)"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-200 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">.XLSX</span>
                        </button>

                        {/* View details */}
                        <button
                          type="button"
                          onClick={() => onViewInvoice(inv)}
                          title="View Invoice Verification"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setInvoiceToDelete(inv)}
                          title="Delete from database"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for deletion */}
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
