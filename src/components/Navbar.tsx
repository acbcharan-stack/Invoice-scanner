import React from 'react';
import {
  FileScan,
  Database,
  Users,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  Factory,
} from 'lucide-react';

export type ActiveTab = 'extract' | 'invoices' | 'vendors' | 'analytics';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  invoiceCount: number;
  vendorCount: number;
  onBatchExportExcel: () => void;
  isDbConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  invoiceCount,
  vendorCount,
  onBatchExportExcel,
  isDbConnected,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-inner">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">FabriCost</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-medium border border-blue-500/30">
                  OCR Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Manufacturing Invoice OCR &amp; Cost Auditor
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              id="tab-btn-extract"
              onClick={() => setActiveTab('extract')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'extract'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <FileScan className="w-4 h-4" />
              <span>Scan &amp; Extract</span>
            </button>

            <button
              id="tab-btn-invoices"
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'invoices'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Saved Invoices</span>
              <span
                className={`ml-1.5 px-2 py-0.5 text-xs rounded-full font-bold ${
                  activeTab === 'invoices'
                    ? 'bg-blue-900/80 text-white'
                    : 'bg-slate-800 text-blue-300 border border-slate-700'
                }`}
              >
                {invoiceCount}
              </span>
            </button>

            <button
              id="tab-btn-vendors"
              onClick={() => setActiveTab('vendors')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vendors'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Suppliers</span>
              {vendorCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-slate-700 text-slate-200">
                  {vendorCount}
                </span>
              )}
            </button>

            <button
              id="tab-btn-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden md:inline">Spend Analytics</span>
            </button>
          </nav>

          {/* Right Action & Database Status */}
          <div className="flex items-center space-x-3">
            {invoiceCount > 0 && (
              <button
                id="header-batch-export-btn"
                onClick={onBatchExportExcel}
                title="Export all invoices to Excel register"
                className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export All to Excel</span>
              </button>
            )}

            <div
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-slate-300"
              title="Real-time Google Cloud Firestore Synchronization"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">Firestore Live</span>
              <span className="text-emerald-400 font-bold font-mono">({invoiceCount})</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
