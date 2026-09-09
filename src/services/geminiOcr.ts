import { InvoiceData } from '../types/invoice.js';

export interface OcrExtractResponse {
  success: boolean;
  data: Partial<InvoiceData> & { confidenceScore?: number; notes?: string };
  error?: string;
}

export async function extractInvoiceFromImage(
  imageBase64: string,
  mimeType: string,
  requestedFields: string[]
): Promise<Partial<InvoiceData> & { confidenceScore?: number }> {
  const response = await fetch('/api/ocr-extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageBase64,
      mimeType,
      requestedFields,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(errorData.error || `Server returned ${response.status}`);
  }

  const result: OcrExtractResponse = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to extract data from image.');
  }

  return result.data;
}
