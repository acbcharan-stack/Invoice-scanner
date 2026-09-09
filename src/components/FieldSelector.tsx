import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  SlidersHorizontal,
  Search,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { AVAILABLE_FIELDS, ExtractionFieldConfig } from '../types/invoice.js';

interface FieldSelectorProps {
  selectedFieldIds: string[];
  onChange: (newSelectedIds: string[]) => void;
  className?: string;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  selectedFieldIds,
  onChange,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'All Fields' },
    { id: 'cost', label: 'Cost & Totals' },
    { id: 'core', label: 'Invoice Meta' },
    { id: 'manufacturing', label: 'Manufacturing & PO' },
    { id: 'vendor', label: 'Supplier Info' },
    { id: 'details', label: 'Line Items & Details' },
  ];

  const handleToggle = (id: string, required?: boolean) => {
    if (required) return; // Grand Total is required
    if (selectedFieldIds.includes(id)) {
      onChange(selectedFieldIds.filter((item) => item !== id));
    } else {
      onChange([...selectedFieldIds, id]);
    }
  };

  const handleSelectPreset = (preset: 'standard' | 'bom' | 'finance' | 'all') => {
    if (preset === 'all') {
      onChange(AVAILABLE_FIELDS.map((f) => f.id));
    } else if (preset === 'standard') {
      onChange(AVAILABLE_FIELDS.filter((f) => f.defaultEnabled).map((f) => f.id));
    } else if (preset === 'bom') {
      onChange([
        'grandTotal',
        'subtotal',
        'lineItems',
        'poNumber',
        'deliveryChallan',
        'vendorName',
        'manufacturingCategory',
        'freightCharge',
      ]);
    } else if (preset === 'finance') {
      onChange([
        'grandTotal',
        'subtotal',
        'taxAmount',
        'freightCharge',
        'discount',
        'invoiceNumber',
        'invoiceDate',
        'vendorName',
        'vendorTaxId',
        'currency',
      ]);
    }
  };

  const filteredFields = AVAILABLE_FIELDS.filter((f) => {
    const matchesSearch =
      f.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'all' || f.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">Select Invoice Fields Needed</h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {selectedFieldIds.length} of {AVAILABLE_FIELDS.length} Selected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Choose which manufacturing, financial, and supplier fields should be extracted by OCR and saved to your database.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium mr-1 hidden md:inline">Presets:</span>
            <button
              type="button"
              id="preset-btn-standard"
              onClick={() => handleSelectPreset('standard')}
              className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Standard MFG
            </button>
            <button
              type="button"
              id="preset-btn-bom"
              onClick={() => handleSelectPreset('bom')}
              className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Line Items / BOM
            </button>
            <button
              type="button"
              id="preset-btn-finance"
              onClick={() => handleSelectPreset('finance')}
              className="text-xs px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cost &amp; Taxes
            </button>
            <button
              type="button"
              id="preset-btn-all"
              onClick={() => handleSelectPreset('all')}
              className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold transition-colors"
            >
              Select All
            </button>
          </div>
        </div>

        {/* Filter / Search Row */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-md whitespace-nowrap font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fields Grid */}
      <div className="p-4 sm:p-5 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredFields.map((field) => {
            const isSelected = selectedFieldIds.includes(field.id);
            return (
              <div
                key={field.id}
                id={`field-toggle-${field.id}`}
                onClick={() => handleToggle(field.id, field.required)}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                } ${field.required ? 'cursor-not-allowed opacity-90' : ''}`}
              >
                <div className="mt-0.5 text-blue-600 shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {field.label}
                    </span>
                    {field.required && (
                      <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {field.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
