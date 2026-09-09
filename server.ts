import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processInvoiceImageWithGemini } from './src/server/ocrService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// High limit to handle high-resolution receipt and invoice scans
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// OCR API Endpoint
app.post('/api/ocr-extract', async (req, res) => {
  try {
    const { imageBase64, mimeType, requestedFields } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided.' });
    }

    const extractedData = await processInvoiceImageWithGemini(
      imageBase64,
      mimeType || 'image/jpeg',
      requestedFields || []
    );

    return res.json({
      success: true,
      data: extractedData,
    });
  } catch (error: any) {
    console.error('OCR Extraction Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process receipt image with OCR.',
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Serve production static assets
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port}`);
});
