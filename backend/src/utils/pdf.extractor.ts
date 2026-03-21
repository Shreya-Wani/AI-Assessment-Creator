import pdfParse from 'pdf-parse';
import logger from './logger';

const PDF_FETCH_TIMEOUT_MS = 15000;
const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB
const PDF_MAX_PAGES = 18;
const PDF_MAX_TEXT_CHARS = 24000;

/**
 * Downloads a PDF from URL and extracts text content
 * @param fileUrl - URL to the PDF file
 * @returns Extracted text content from PDF
 */
export const extractPdfContent = async (fileUrl: string): Promise<string> => {
  try {
    if (!fileUrl) {
      return '';
    }

    logger.info({ fileUrl }, '[PDF] Extracting content from PDF');

    // Download the PDF file using fetch with timeout and size guard.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);
    const response = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength && contentLength > PDF_MAX_BYTES) {
      logger.warn({ contentLength, maxBytes: PDF_MAX_BYTES }, '[PDF] File too large, skipping extraction');
      return '';
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > PDF_MAX_BYTES) {
      logger.warn({ byteLength: arrayBuffer.byteLength, maxBytes: PDF_MAX_BYTES }, '[PDF] Downloaded PDF exceeds limit, skipping extraction');
      return '';
    }
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Parse only first N pages for faster response on large PDFs.
    const pdfData = await pdfParse(pdfBuffer, { max: PDF_MAX_PAGES });
    
    const compact = (pdfData.text || '').replace(/\s+/g, ' ').trim();
    const extractedText = compact.slice(0, PDF_MAX_TEXT_CHARS);
    logger.info(
      { textLength: extractedText.length, pagesParsed: PDF_MAX_PAGES },
      '[PDF] Successfully extracted content'
    );

    return extractedText;
  } catch (error: any) {
    logger.error(
      { error: error.message, fileUrl },
      '[PDF] Failed to extract PDF content'
    );
    // Return empty string if extraction fails - assignment can still generate with title and config only
    return '';
  }
};
