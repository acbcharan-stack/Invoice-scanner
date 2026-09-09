import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Mail,
  Phone,
  MapPin,
  FileText,
  IndianRupee,
  DollarSign,
  Tag,
  Trash2,
  Edit2,
  Check,
  X,
  Calendar,
  Users,
} from 'lucide-react';
import { VendorProfile, ManufacturingCategory } from '../types/invoice.js';
import { formatAmountWithCurrency, formatIndianCurrency, SUPPORTED_CURRENCIES } from '../lib/currency.js';
import { ConfirmDialog } from './ConfirmDialog.js';

interface VendorProfilesViewProps {
  vendors: VendorProfile[];
  onSaveVendor: (vendor: VendorProfile) => Promise<void>;
  onDeleteVendor: (id: string) => Promise<void>;
  onSelectVendorInvoices?: (vendorName: string) => void;
}

export const VendorProfilesView: React.FC<VendorProfilesViewProps> = ({
  vendors,
  onSaveVendor,
  onDeleteVendor,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorProfile>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorToDelete, setVendorToDelete] = useState<VendorProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    try {
      setIsDeleting(true);
      await onDeleteVendor(vendorToDelete.id);
      setVendorToDelete(null);
    } catch (err) {
      console.error('Failed to delete vendor:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingVendor({
      id: `vend-${Date.now()}`,
      name: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      category: 'raw_materials',
      defaultPaymentTerms: 'Net 30',
      currency: 'INR',
      notes: '',
      totalSpend: 0,
      invoiceCount: 0,
      createdAt: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (v: VendorProfile) => {
    setEditingVendor({ ...v });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor.name) return;

    await onSaveVendor(editingVendor as VendorProfile);
    setIsModalOpen(false);
  };

  const filteredVendors = vendors.filter((v) => {
    const term = searchTerm.toLowerCase();
    return (
      v.name.toLowerCase().includes(term) ||
      (v.taxId && v.taxId.toLowerCase().includes(term)) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(term)) ||
      v.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manufacturing Supplier &amp; Vendor Profiles</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Database of approved raw material mills, parts fabricators, tooling shops, and chemical vendors.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
          />

          <button
            id="add-supplier-btn"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">
                    {vendor.name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Tax ID: {vendor.taxId || 'Not specified'}
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {vendor.category.replace('_', ' ')}
                </span>
              </div>

              {/* Details List */}
              <div className="mt-4 space-y-2 text-xs text-slate-600">
                {vendor.contactPerson && (
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-medium">Contact:</span>
                    <span className="text-slate-800 font-semibold">{vendor.contactPerson}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{vendor.address}</span>
                  </div>
                )}
              </div>

              {/* Terms & Spend Stats */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-400 text-[10px] block">Payment Terms</span>
                  <span className="font-bold text-slate-800">{vendor.defaultPaymentTerms || 'Net 30'}</span>
                </div>
                <div className="bg-blue-50/60 p-2 rounded-lg">
                  <span className="text-blue-600 text-[10px] block">Invoiced Spend</span>
                  <span className="font-bold text-blue-950">
                    {formatAmountWithCurrency(vendor.totalSpend || 0, vendor.currency || 'INR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {vendor.invoiceCount || 0} Invoices logged
              </span>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(vendor)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                  title="Edit Supplier"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setVendorToDelete(vendor)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                  title="Delete Supplier"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for Add / Edit Vendor */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>{editingVendor.name ? 'Edit Supplier Profile' : 'New Supplier Profile'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={editingVendor.name || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, name: e.target.value })}
                  placeholder="e.g. Apex Industrial Steel & Alloys"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    value={editingVendor.taxId || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, taxId: e.target.value })}
                    placeholder="27AABCA1234F1Z8"
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Manufacturing Category</label>
                  <select
                    value={editingVendor.category || 'raw_materials'}
                    onChange={(e) =>
                      setEditingVendor({
                        ...editingVendor,
                        category: e.target.value as ManufacturingCategory,
                      })
                    }
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="raw_materials">Raw Materials</option>
                    <option value="machinery_parts">Machinery &amp; Tooling</option>
                    <option value="chemicals">Chemicals &amp; Fluids</option>
                    <option value="consumables">Consumables</option>
                    <option value="packaging">Packaging</option>
                    <option value="logistics">Logistics</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editingVendor.contactPerson || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, contactPerson: e.target.value })}
                    placeholder="Marcus Vance"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Currency</label>
                  <select
                    value={editingVendor.currency || 'INR'}
                    onChange={(e) => setEditingVendor({ ...editingVendor, currency: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {SUPPORTED_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingVendor.email || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingVendor.phone || ''}
                    onChange={(e) => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                    placeholder="+91 98230 45678"
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Factory / Office Address</label>
                <input
                  type="text"
                  value={editingVendor.address || ''}
                  onChange={(e) => setEditingVendor({ ...editingVendor, address: e.target.value })}
                  placeholder="Plot 42, MIDC Industrial Area, Pune"
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Vendor Deletion */}
      <ConfirmDialog
        isOpen={!!vendorToDelete}
        title="Delete Supplier Profile"
        message={`Are you sure you want to delete profile for "${vendorToDelete?.name || 'this supplier'}"? All supplier metadata will be permanently removed.`}
        confirmText="Delete Supplier"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setVendorToDelete(null)}
      />
    </div>
  );
};
