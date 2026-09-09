import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileImage,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
  Building2,
  Receipt,
  Scan,
} from 'lucide-react';
import { SampleInvoice, SAMPLE_MANUFACTURING_INVOICES } from '../lib/sampleInvoices.js';
import { formatAmountWithCurrency } from '../lib/currency.js';

interface UploadSectionProps {
  onExtract: (imageBase64: string, mimeType: string, sampleInvoice?: SampleInvoice) => Promise<void>;
  isLoading: boolean;
  selectedFieldsCount: number;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onExtract,
  isLoading,
  selectedFieldsCount,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    dataUrl: string;
    mimeType: string;
    sample?: SampleInvoice;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, WebP, or TIFF scan).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds 20MB limit. Please provide an image under 20MB.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setSelectedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        dataUrl,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: SampleInvoice) => {
    setErrorMessage(null);
    setSelectedFile({
      name: `${sample.name}.svg`,
      size: 'Sample Invoice',
      dataUrl: sample.svgDataUrl,
      mimeType: 'image/svg+xml',
      sample,
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmitExtract = () => {
    if (!selectedFile) return;
    onExtract(selectedFile.dataUrl, selectedFile.mimeType, selectedFile.sample);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-100 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Scan className="w-5 h-5 text-blue-600" />
              <span>Upload Manufacturing Receipt or Invoice</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Supports supplier invoices, raw material delivery challans, bills of materials, and machinery repair receipts.
            </p>
          </div>

          <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1.5 self-start md:self-auto">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>OCR configured for {selectedFieldsCount} selected fields</span>
          </div>
        </div>

        {/* Dropzone & Preview */}
        <div className="mt-5">
          {!selectedFile ? (
            <div
              id="invoice-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag &amp; drop your invoice image
              </p>
              <p className="text-xs text-slate-500 mt-1">
                PNG, JPG, WebP, or high-res document photos up to 20MB
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-5">
              {/* Image Thumbnail */}
              <div className="relative w-full md:w-56 h-44 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-xs shrink-0">
                <img
                  src={selectedFile.dataUrl}
                  alt="Invoice Preview"
                  className="w-full h-full object-contain p-2"
                />
                <span className="absolute bottom-1 right-1 bg-slate-900/75 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {selectedFile.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'}
                </span>
              </div>

              {/* Details & Actions */}
              <div className="flex-1 w-full flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base line-clamp-1">
                        {selectedFile.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        File Size: <span className="font-medium text-slate-700">{selectedFile.size}</span>
                      </p>
                    </div>
                    <button
                      onClick={handleClear}
                      disabled={isLoading}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedFile.sample && (
                    <div className="mt-2 text-xs bg-blue-50 border border-blue-200 text-blue-800 p-2 rounded-md">
                      <span className="font-semibold">Test Sample:</span> {selectedFile.sample.supplier} (Est. Total: {formatAmountWithCurrency(selectedFile.sample.total, selectedFile.sample.currency)})
                    </div>
                  )}

                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <p className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>OCR will extract total costs, PO numbers, taxes, and itemized rows</span>
                    </p>
                    <p className="flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      <span>You will review and confirm all fields before saving to database</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    id="start-ocr-btn"
                    onClick={handleSubmitExtract}
                    disabled={isLoading}
                    className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing Receipt with OCR...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Extract Total Costs &amp; Fields</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleClear}
                    disabled={isLoading}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sample Invoices Carousel (for immediate 1-click test) */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Or Try With A Realistic Manufacturing Sample Invoice:</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Instant 1-click test without uploading
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_MANUFACTURING_INVOICES.map((sample) => (
              <div
                key={sample.id}
                id={`sample-card-${sample.id}`}
                onClick={() => handleSelectSample(sample)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                  selectedFile?.sample?.id === sample.id
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">
                    {sample.name}
                  </span>
                  <span className="text-xs font-bold text-blue-600 shrink-0 ml-2">
                    {formatAmountWithCurrency(sample.total, sample.currency)}
                  </span>
                </div>
                <div className="flex items-center space-x-1 mt-1 text-[11px] text-slate-500">
                  <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{sample.supplier}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="capitalize px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                    {sample.category.replace('_', ' ')}
                  </span>
                  <span className="text-blue-600 font-semibold hover:underline">
                    Use Sample &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
