import { InvoiceData } from '../types/invoice.js';

export interface SampleInvoice {
  id: string;
  name: string;
  category: string;
  supplier: string;
  total: number;
  currency: string;
  svgDataUrl: string;
  preparsedData: Partial<InvoiceData>;
}

// Generates crisp SVG invoices encoded as Data URLs
function createInvoiceSvg(
  invoiceNo: string,
  vendor: string,
  vendorTax: string,
  poNo: string,
  date: string,
  items: Array<{ code: string; desc: string; qty: number; unit: string; rate: number; total: number }>,
  subtotal: number,
  freight: number,
  tax: number,
  total: number,
  currency: string = '₹'
): string {
  const rows = items
    .map(
      (it, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 13px;">
      <td style="padding: 10px 8px; color: #64748b;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${it.code}</td>
      <td style="padding: 10px 8px; color: #334155;">${it.desc}</td>
      <td style="padding: 10px 8px; text-align: right; color: #334155;">${it.qty} ${it.unit}</td>
      <td style="padding: 10px 8px; text-align: right; color: #334155;">${currency}${it.rate.toFixed(2)}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #0f172a;">${currency}${it.total.toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="920" viewBox="0 0 800 920">
      <defs>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&amp;display=swap');
          text, div, table { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; }
        </style>
      </defs>
      <rect width="800" height="920" fill="#ffffff" rx="12"/>
      <rect width="800" height="12" fill="#0f172a"/>
      
      <foreignObject x="0" y="20" width="800" height="880">
        <div xmlns="http://www.w3.org/1999/xhtml" style="padding: 36px 44px; color: #0f172a; box-sizing: border-box;">
          
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0f172a; padding-bottom: 20px;">
            <div>
              <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a;">${vendor.toUpperCase()}</div>
              <div style="font-size: 13px; color: #475569; margin-top: 4px;">Industrial Metal Fabrication &amp; Engineering Solutions</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Tax ID / GSTIN: <span style="font-weight: 600; color: #0f172a;">${vendorTax}</span></div>
              <div style="font-size: 12px; color: #64748b;">Phone: +1 (555) 234-8901 | Email: accounts@manufacturing-supply.com</div>
            </div>
            <div style="text-align: right;">
              <div style="background: #0f172a; color: #ffffff; padding: 6px 14px; font-size: 14px; font-weight: 700; letter-spacing: 1px; display: inline-block; border-radius: 4px;">TAX INVOICE</div>
              <div style="font-size: 15px; font-weight: 700; margin-top: 8px; color: #0f172a;">${invoiceNo}</div>
              <div style="font-size: 12px; color: #64748b;">Date: <strong>${date}</strong></div>
              <div style="font-size: 12px; color: #64748b;">PO Number: <strong>${poNo}</strong></div>
            </div>
          </div>

          <!-- Parties -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; background: #f8fafc; padding: 16px 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Billed To / Delivery Destination:</div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a;">Advanced Manufacturing Plant #4</div>
              <div style="font-size: 12px; color: #475569;">700 Industrial Belt Parkway, Unit 12B</div>
              <div style="font-size: 12px; color: #475569;">Plant GSTIN/EIN: US-M4-992100</div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Dispatch &amp; Terms:</div>
              <div style="font-size: 12px; color: #475569;">Delivery Challan: <strong style="color: #0f172a;">DC-${poNo.slice(-4)}-2026</strong></div>
              <div style="font-size: 12px; color: #475569;">Payment Terms: <strong style="color: #0f172a;">Net 30 Days</strong></div>
              <div style="font-size: 12px; color: #475569;">Vehicle / Freight No: <strong>MH-04-TX-8821</strong></div>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 2px solid #cbd5e1;">
                <th style="padding: 10px 8px; width: 36px;">#</th>
                <th style="padding: 10px 8px; width: 110px;">Part / Code</th>
                <th style="padding: 10px 8px;">Description &amp; Specifications</th>
                <th style="padding: 10px 8px; text-align: right; width: 100px;">Qty</th>
                <th style="padding: 10px 8px; text-align: right; width: 90px;">Rate</th>
                <th style="padding: 10px 8px; text-align: right; width: 100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <!-- Totals Calculation Block -->
          <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
            <div style="width: 320px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px;">
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
                <span>Material Subtotal:</span>
                <span style="font-weight: 600; color: #1e293b;">${currency}${subtotal.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 6px;">
                <span>Freight &amp; Handling:</span>
                <span style="font-weight: 600; color: #1e293b;">${currency}${freight.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #475569; margin-bottom: 8px;">
                <span>Tax / GST (18%):</span>
                <span style="font-weight: 600; color: #1e293b;">${currency}${tax.toFixed(2)}</span>
              </div>
              <div style="border-top: 2px solid #0f172a; padding-top: 10px; display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #0f172a;">
                <span>TOTAL PAYABLE:</span>
                <span style="color: #0f172a;">${currency}${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <!-- Footer Stamp & Notice -->
          <div style="margin-top: 28px; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
            <div>All goods inspected as per ISO 9001:2015 Manufacturing Standards. Quality Certificate attached.</div>
            <div style="text-align: right; font-weight: 600; color: #64748b;">Authorised Signatory - Manufacturing Accounts</div>
          </div>

        </div>
      </foreignObject>
    </svg>
  `;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

export const SAMPLE_MANUFACTURING_INVOICES: SampleInvoice[] = [
  {
    id: 'sample-steel',
    name: 'Raw Steel Coils & Structural Rods',
    category: 'raw_materials',
    supplier: 'Apex Industrial Steel & Alloys',
    total: 785400.0,
    currency: 'INR',
    svgDataUrl: createInvoiceSvg(
      'INV-2026-ST-088',
      'Apex Industrial Steel & Alloys',
      '27AABCA1234F1Z8',
      'PO-MFG-8841',
      '2026-09-02',
      [
        { code: 'STL-CR-304', desc: 'Cold-Rolled Stainless Steel Coil (Grade 304, 2.5mm)', qty: 4, unit: 'MT', rate: 135000.0, total: 540000.0 },
        { code: 'ALU-BAR-6061', desc: 'Structural Aluminum Round Bar 6061-T6 (50mm Dia)', qty: 350, unit: 'kg', rate: 350.0, total: 122500.0 },
      ],
      662500.0,
      18000.0,
      104900.0,
      785400.0,
      '₹'
    ),
    preparsedData: {
      invoiceNumber: 'INV-2026-ST-088',
      invoiceDate: '2026-09-02',
      dueDate: '2026-10-02',
      poNumber: 'PO-MFG-8841',
      deliveryChallan: 'DC-8841-2026',
      paymentTerms: 'Net 30 Days',
      currency: 'INR',
      vendorName: 'Apex Industrial Steel & Alloys',
      vendorTaxId: '27AABCA1234F1Z8',
      vendorAddress: 'Plot 42, MIDC Industrial Area, Pune, Maharashtra 411018',
      customerName: 'Advanced Manufacturing Plant #4',
      customerAddress: '700 Industrial Belt Parkway, Unit 12B',
      subtotal: 662500.0,
      freightCharge: 18000.0,
      taxRate: 18.0,
      taxAmount: 104900.0,
      discount: 0,
      grandTotal: 785400.0,
      manufacturingCategory: 'raw_materials',
      paymentStatus: 'pending',
      notes: 'All goods inspected as per ISO 9001:2015 Manufacturing Standards. E-Way Bill Attached.',
      lineItems: [
        {
          id: 'item-sample-1',
          itemCode: 'STL-CR-304',
          description: 'Cold-Rolled Stainless Steel Coil (Grade 304, 2.5mm)',
          quantity: 4,
          unit: 'MT',
          unitPrice: 135000.0,
          taxPercent: 18,
          totalPrice: 540000.0,
        },
        {
          id: 'item-sample-2',
          itemCode: 'ALU-BAR-6061',
          description: 'Structural Aluminum Round Bar 6061-T6 (50mm Dia)',
          quantity: 350,
          unit: 'kg',
          unitPrice: 350.0,
          taxPercent: 18,
          totalPrice: 122500.0,
        },
      ],
      selectedFields: ['grandTotal', 'invoiceNumber', 'invoiceDate', 'vendorName', 'vendorTaxId', 'poNumber', 'deliveryChallan', 'subtotal', 'freightCharge', 'taxAmount', 'lineItems'],
    },
  },
  {
    id: 'sample-cnc',
    name: 'Precision CNC Machined Gear Shafts',
    category: 'machinery_parts',
    supplier: 'Precision Dynamics CNC Machining',
    total: 425000.0,
    currency: 'INR',
    svgDataUrl: createInvoiceSvg(
      'INV-CNC-9942',
      'Precision Dynamics CNC Machining',
      '29AABCP5678Q1ZA',
      'PO-MFG-9102',
      '2026-09-05',
      [
        { code: 'CNC-SFT-M12', desc: 'Case Hardened Pinion Gear Shaft (M12 Threaded)', qty: 120, unit: 'pcs', rate: 2350.0, total: 282000.0 },
        { code: 'BRS-BSH-45', desc: 'Self-Lubricating Bronze Flanged Bushing (45mm OD)', qty: 80, unit: 'pcs', rate: 950.0, total: 76000.0 },
      ],
      358000.0,
      9500.0,
      57500.0,
      425000.0,
      '₹'
    ),
    preparsedData: {
      invoiceNumber: 'INV-CNC-9942',
      invoiceDate: '2026-09-05',
      dueDate: '2026-10-20',
      poNumber: 'PO-MFG-9102',
      deliveryChallan: 'DC-9102-2026',
      paymentTerms: 'Net 45 Days',
      currency: 'INR',
      vendorName: 'Precision Dynamics CNC Machining',
      vendorTaxId: '29AABCP5678Q1ZA',
      vendorAddress: 'Peenya Industrial Estate, Bengaluru, Karnataka 560058',
      customerName: 'Advanced Manufacturing Plant #4',
      customerAddress: '700 Industrial Belt Parkway, Unit 12B',
      subtotal: 358000.0,
      freightCharge: 9500.0,
      taxAmount: 57500.0,
      discount: 0,
      grandTotal: 425000.0,
      manufacturingCategory: 'machinery_parts',
      paymentStatus: 'approved',
      notes: 'Batch hardened to 58 HRC. Certificate of Conformity enclosed.',
      lineItems: [
        {
          id: 'item-sample-3',
          itemCode: 'CNC-SFT-M12',
          description: 'Case Hardened Pinion Gear Shaft (M12 Threaded)',
          quantity: 120,
          unit: 'pcs',
          unitPrice: 2350.0,
          taxPercent: 18,
          totalPrice: 282000.0,
        },
        {
          id: 'item-sample-4',
          itemCode: 'BRS-BSH-45',
          description: 'Self-Lubricating Bronze Flanged Bushing (45mm OD)',
          quantity: 80,
          unit: 'pcs',
          unitPrice: 950.0,
          taxPercent: 18,
          totalPrice: 76000.0,
        },
      ],
      selectedFields: ['grandTotal', 'invoiceNumber', 'invoiceDate', 'vendorName', 'vendorTaxId', 'poNumber', 'subtotal', 'freightCharge', 'taxAmount', 'lineItems'],
    },
  },
  {
    id: 'sample-chemicals',
    name: 'Industrial Cutting Coolant & Lubricants',
    category: 'chemicals',
    supplier: 'Synthetix Industrial Fluids & Polymers',
    total: 261500.0,
    currency: 'INR',
    svgDataUrl: createInvoiceSvg(
      'INV-FL-5510',
      'Synthetix Industrial Fluids & Polymers',
      '24AAACT9988K1ZM',
      'PO-MFG-9400',
      '2026-09-07',
      [
        { code: 'COOL-SYN-200', desc: 'Semi-Synthetic Water-Soluble CNC Cutting Coolant', qty: 6, unit: 'drums', rate: 31500.0, total: 189000.0 },
        { code: 'HYD-ISO-68', desc: 'Anti-Wear Hydraulic Oil ISO 68 (High Temp)', qty: 2, unit: 'drums', rate: 16500.0, total: 33000.0 },
      ],
      222000.0,
      7500.0,
      32000.0,
      261500.0,
      '₹'
    ),
    preparsedData: {
      invoiceNumber: 'INV-FL-5510',
      invoiceDate: '2026-09-07',
      dueDate: '2026-10-07',
      poNumber: 'PO-MFG-9400',
      deliveryChallan: 'DC-9400-2026',
      paymentTerms: 'Net 30 Days',
      currency: 'INR',
      vendorName: 'Synthetix Industrial Fluids & Polymers',
      vendorTaxId: '24AAACT9988K1ZM',
      vendorAddress: 'GIDC Estate, Ankleshwar, Gujarat 393002',
      customerName: 'Advanced Manufacturing Plant #4',
      customerAddress: '700 Industrial Belt Parkway, Unit 12B',
      subtotal: 222000.0,
      freightCharge: 7500.0,
      taxAmount: 32000.0,
      discount: 0,
      grandTotal: 261500.0,
      manufacturingCategory: 'chemicals',
      paymentStatus: 'paid',
      notes: 'MSDS documentation and safety transport declaration delivered with consignment.',
      lineItems: [
        {
          id: 'item-sample-5',
          itemCode: 'COOL-SYN-200',
          description: 'Semi-Synthetic Water-Soluble CNC Cutting Coolant',
          quantity: 6,
          unit: 'drums',
          unitPrice: 31500.0,
          taxPercent: 18,
          totalPrice: 189000.0,
        },
        {
          id: 'item-sample-6',
          itemCode: 'HYD-ISO-68',
          description: 'Anti-Wear Hydraulic Oil ISO 68 (High Temp)',
          quantity: 2,
          unit: 'drums',
          unitPrice: 16500.0,
          taxPercent: 18,
          totalPrice: 33000.0,
        },
      ],
      selectedFields: ['grandTotal', 'invoiceNumber', 'invoiceDate', 'vendorName', 'vendorTaxId', 'poNumber', 'subtotal', 'freightCharge', 'taxAmount', 'lineItems'],
    },
  },
];
