import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { InvoiceData, LineItem } from '../types/invoice.js';

export async function processInvoiceImageWithGemini(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  requestedFields: string[] = []
): Promise<Partial<InvoiceData> & { confidenceScore?: number; rawNotes?: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }

  // Sanitize base64 data (strip data:image/xxx;base64, if present)
  let cleanBase64 = imageBase64;
  if (imageBase64.includes(',')) {
    cleanBase64 = imageBase64.split(',')[1];
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const fieldsInstruction = requestedFields.length > 0
    ? `Pay special attention to extracting and validating the following user-selected fields: ${requestedFields.join(', ')}.`
    : 'Extract all available manufacturing invoice fields.';

  const prompt = `You are a high-precision OCR and document understanding engine specialized in industrial and manufacturing invoices, material bills, vendor receipts, and delivery challans.

Analyze this image and extract structured data according to these instructions:
${fieldsInstruction}

Crucial requirements:
1. Extract the TOTAL COSTS accurately:
   - "grandTotal": The final total amount payable on the invoice (numeric).
   - "subtotal": Pre-tax net total amount of materials/goods (numeric).
   - "taxAmount": Total tax/VAT/GST amount (numeric).
   - "freightCharge": Freight, shipping, transport, or cartage charges (numeric, 0 if none).
   - "discount": Any cash/trade discount or rounding off (numeric, 0 if none).
2. Extract Metadata:
   - "invoiceNumber": Bill/Invoice reference number.
   - "invoiceDate": Date of invoice formatted as YYYY-MM-DD if possible.
   - "dueDate": Payment due date formatted as YYYY-MM-DD if found.
   - "poNumber": Purchase Order / PO number (crucial for manufacturing).
   - "deliveryChallan": Delivery challan, GRN, or waybill number if present.
   - "paymentTerms": Terms like "Net 30", "Net 60", "Immediate", "50% Advance", etc.
   - "currency": Standard 3-letter currency code (e.g., INR, USD, EUR, GBP). Default to INR (₹ / Rupees) unless another currency symbol (like $, €, £) is explicitly specified on the document.
3. Extract Vendor/Supplier:
   - "vendorName": Supplier / Company / Fabricator name.
   - "vendorTaxId": GSTIN, VAT number, EIN, or Tax ID.
   - "vendorAddress": Supplier's physical address.
   - "vendorPhone": Phone number if printed.
   - "vendorEmail": Email address if printed.
4. Extract Buyer/Plant:
   - "customerName": Buyer company / factory unit name.
   - "customerAddress": Destination plant address.
5. Material Classification:
   - "manufacturingCategory": Best match from: "raw_materials", "machinery_parts", "consumables", "chemicals", "packaging", "logistics", "other".
6. Itemized Table ("lineItems"):
   Extract each row in the invoice's line item / materials table:
   - "description": Description of raw material, component, or item.
   - "itemCode": Part number, material grade, SKU, or HSN/SAC code.
   - "quantity": Number of units (numeric).
   - "unit": Unit of measure (e.g. kg, MT, pcs, bags, drums, m, sets).
   - "unitPrice": Rate per unit (numeric).
   - "taxPercent": Tax percentage for this item if stated (numeric).
   - "totalPrice": Line item total amount (quantity * unitPrice or as printed, numeric).
7. Confidence:
   - "confidenceScore": Integer from 0 to 100 reflecting overall OCR image clarity and completeness.
   - "notes": Any warranty, terms of delivery, bank details, or remarks.

Return ONLY a valid JSON object strictly matching this schema:
{
  "invoiceNumber": string,
  "invoiceDate": string,
  "dueDate": string,
  "poNumber": string,
  "deliveryChallan": string,
  "paymentTerms": string,
  "currency": string,
  "vendorName": string,
  "vendorTaxId": string,
  "vendorAddress": string,
  "vendorPhone": string,
  "vendorEmail": string,
  "customerName": string,
  "customerAddress": string,
  "subtotal": number,
  "freightCharge": number,
  "taxRate": number,
  "taxAmount": number,
  "discount": number,
  "grandTotal": number,
  "manufacturingCategory": string,
  "notes": string,
  "confidenceScore": number,
  "lineItems": [
    {
      "itemCode": string,
      "description": string,
      "quantity": number,
      "unit": string,
      "unitPrice": number,
      "taxPercent": number,
      "totalPrice": number
    }
  ]
}`;

  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.6-flash',
    'gemini-flash-latest',
  ];
  let response: any = null;
  let lastError: any = null;

  for (const modelName of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      if (response?.text) {
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini OCR attempt with model ${modelName} failed:`, err?.message || err);
    }
  }

  if (!response?.text) {
    let cleanMessage = lastError?.message || 'Failed to extract invoice data using Gemini OCR.';
    try {
      // If error message is serialized JSON, extract the readable message
      const parsedErr = JSON.parse(cleanMessage);
      if (parsedErr?.error?.message) {
        cleanMessage = parsedErr.error.message;
      }
    } catch {
      // not JSON, keep cleanMessage
    }
    throw new Error(cleanMessage);
  }

  const rawText = response.text || '{}';
  let parsed: any = {};
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    // Attempt fallback json extraction if wrapped in code blocks
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Failed to parse structured JSON from OCR response.');
    }
  }

  // Format and validate line items
  const lineItems: LineItem[] = Array.isArray(parsed.lineItems)
    ? parsed.lineItems.map((item: any, idx: number) => ({
        id: `item-${Date.now()}-${idx}`,
        itemCode: item.itemCode || '',
        description: item.description || `Item #${idx + 1}`,
        quantity: typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 1),
        unit: item.unit || 'pcs',
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : (parseFloat(item.unitPrice) || 0),
        taxPercent: typeof item.taxPercent === 'number' ? item.taxPercent : (parseFloat(item.taxPercent) || 0),
        totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : (parseFloat(item.totalPrice) || 0),
      }))
    : [];

  const subtotal = typeof parsed.subtotal === 'number' ? parsed.subtotal : (parseFloat(parsed.subtotal) || 0);
  const taxAmount = typeof parsed.taxAmount === 'number' ? parsed.taxAmount : (parseFloat(parsed.taxAmount) || 0);
  const freightCharge = typeof parsed.freightCharge === 'number' ? parsed.freightCharge : (parseFloat(parsed.freightCharge) || 0);
  const discount = typeof parsed.discount === 'number' ? parsed.discount : (parseFloat(parsed.discount) || 0);
  
  let grandTotal = typeof parsed.grandTotal === 'number' ? parsed.grandTotal : (parseFloat(parsed.grandTotal) || 0);
  // Sanity fallback: if grandTotal is 0 but subtotal exists
  if (grandTotal === 0 && subtotal > 0) {
    grandTotal = subtotal + taxAmount + freightCharge - discount;
  }

  return {
    invoiceNumber: parsed.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    invoiceDate: parsed.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: parsed.dueDate || '',
    poNumber: parsed.poNumber || '',
    deliveryChallan: parsed.deliveryChallan || '',
    paymentTerms: parsed.paymentTerms || 'Net 30',
    currency: parsed.currency || 'INR',
    vendorName: parsed.vendorName || 'Unknown Vendor',
    vendorTaxId: parsed.vendorTaxId || '',
    vendorAddress: parsed.vendorAddress || '',
    vendorPhone: parsed.vendorPhone || '',
    vendorEmail: parsed.vendorEmail || '',
    customerName: parsed.customerName || '',
    customerAddress: parsed.customerAddress || '',
    subtotal,
    taxAmount,
    taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : undefined,
    freightCharge,
    discount,
    grandTotal,
    manufacturingCategory: (['raw_materials', 'machinery_parts', 'consumables', 'chemicals', 'packaging', 'logistics', 'other'].includes(parsed.manufacturingCategory)
      ? parsed.manufacturingCategory
      : 'raw_materials') as any,
    notes: parsed.notes || '',
    lineItems,
    confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 92,
  };
}
