import React from 'react';
import {
  BarChart3,
  IndianRupee,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  Package,
  Building,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { InvoiceData, VendorProfile } from '../types/invoice.js';
import { exportInvoiceBatchToExcel } from '../lib/excelExport.js';
import { formatIndianCurrency } from '../lib/currency.js';

interface AnalyticsSummaryProps {
  invoices: InvoiceData[];
  vendors: VendorProfile[];
  onNavigateToInvoices: () => void;
}

export const AnalyticsSummary: React.FC<AnalyticsSummaryProps> = ({
  invoices,
  vendors,
  onNavigateToInvoices,
}) => {
  const totalSpend = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
  const totalSubtotal = invoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalTaxes = invoices.reduce((sum, inv) => sum + (inv.taxAmount || 0), 0);
  const totalFreight = invoices.reduce((sum, inv) => sum + (inv.freightCharge || 0), 0);

  const pendingAmount = invoices
    .filter((i) => i.paymentStatus === 'pending')
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const paidAmount = invoices
    .filter((i) => i.paymentStatus === 'paid')
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  invoices.forEach((inv) => {
    const cat = inv.manufacturingCategory || 'other';
    categoryMap[cat] = (categoryMap[cat] || 0) + (inv.grandTotal || 0);
  });

  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // Vendor spend ranking
  const vendorSpendMap: Record<string, { count: number; total: number }> = {};
  invoices.forEach((inv) => {
    const name = inv.vendorName || 'Unknown Vendor';
    if (!vendorSpendMap[name]) {
      vendorSpendMap[name] = { count: 0, total: 0 };
    }
    vendorSpendMap[name].count += 1;
    vendorSpendMap[name].total += inv.grandTotal || 0;
  });

  const topVendors = Object.entries(vendorSpendMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Manufacturing Procurement &amp; Cost Intelligence
          </span>
          <h2 className="text-2xl font-extrabold mt-1">
            {formatIndianCurrency(totalSpend)}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Total verified invoices in database across {invoices.length} transactions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportInvoiceBatchToExcel(invoices, 'Full_Manufacturing_Procurement_Audit')}
          disabled={invoices.length === 0}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-colors disabled:opacity-50 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Complete Procurement Audit (.xlsx)</span>
        </button>
      </div>

      {/* 4-Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Material Net Cost</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalSubtotal)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Base BOM material expenditure</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Input Tax / GST</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalTaxes)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Recoverable tax credit pool</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Logistics &amp; Freight</span>
          <div className="text-xl font-extrabold text-slate-900 mt-1">
            {formatIndianCurrency(totalFreight)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Transport and shipping landed costs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase">Pending Payable</span>
          <div className="text-xl font-extrabold text-amber-700 mt-1">
            {formatIndianCurrency(pendingAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {formatIndianCurrency(paidAmount)} already settled
          </span>
        </div>
      </div>

      {/* Grid: Category Breakdown & Top Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Expenditure by Material Category</span>
            </h3>
            <span className="text-xs text-slate-400">{categoryEntries.length} Categories</span>
          </div>

          <div className="mt-4 space-y-3">
            {categoryEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No invoice categories to display.</p>
            ) : (
              categoryEntries.map(([cat, amount]) => {
                const percent = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 capitalize">
                        {cat.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatIndianCurrency(amount)} ({percent.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Suppliers by Spend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Top Manufacturing Suppliers by Spend</span>
            </h3>
            <button
              type="button"
              onClick={onNavigateToInvoices}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>View Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {topVendors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No supplier transactions yet.</p>
            ) : (
              topVendors.map((vendor, index) => (
                <div
                  key={vendor.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 text-xs line-clamp-1">
                        {vendor.name}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {vendor.count} {vendor.count === 1 ? 'Invoice' : 'Invoices'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900 text-xs block">
                      {formatIndianCurrency(vendor.total)}
                    </span>
                    <span className="text-[10px] text-slate-400">Total volume</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
