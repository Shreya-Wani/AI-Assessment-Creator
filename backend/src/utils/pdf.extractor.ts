import pdfParse from 'pdf-parse';
import logger from './logger';

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

    // Download the PDF file using fetch
    const response = await fetch(fileUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Parse PDF and extract text
    const pdfData = await pdfParse(pdfBuffer);
    
    const extractedText = pdfData.text || '';
    logger.info({ textLength: extractedText.length }, '[PDF] Successfully extracted content');

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
