import mammoth from "mammoth";
import { db } from "../db/index.js";
import { fileInformation } from "../db/schema.js";

// ✅ Use pdf.js instead of pdf-parse
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
    });
    
    const pdf = await loadingTask.promise;
    let fullText = "";

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error: any) {
    console.error("PDF parsing error:", error);
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
}

// Helper function to fetch file from URL
export async function fetchFileBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Helper function to extract text based on file type
export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  switch (mimeType) {
    case "application/pdf":
      return await parsePDF(buffer);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      const result = await mammoth.extractRawText({ buffer });
      return result.value;

    case "image/png":
    case "image/jpeg":
    case "image/webp":
      return `[Image File: ${mimeType}]\nThis is an image file. Text extraction from images requires OCR processing.\nImage URL can be used for visual analysis or manual review.`;

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

// Helper function to chunk text
export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
    if (start >= text.length) break;
  }
  
  return chunks;
}

// Main extraction function
export async function extractAndStore(
  file_id: string, 
  publicUrl: string, 
  fileType: string
) {
  try {
    console.log("🔍 Fetching file from:", publicUrl);
    const fileBuffer = await fetchFileBuffer(publicUrl);
    
    console.log("📝 Extracting text...");
    const extractedText = await extractText(fileBuffer, fileType);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("No text could be extracted from the file");
    }

    console.log(`✂️ Chunking text (${extractedText.length} characters)...`);
    const textChunks = chunkText(extractedText);
    
    const metadata = {
      totalChunks: textChunks.length,
      totalCharacters: extractedText.length,
      fileType: fileType,
      extractedAt: new Date().toISOString(),
    };

    console.log("💾 Saving to database...");
    const [savedFileInfo] = await db
      .insert(fileInformation)
      .values({
        file_id: file_id,
        full_content: extractedText,  // ✅ Store complete text
        chunks: textChunks,            // ✅ Store chunks
        metadata: metadata,
      })
      .returning();

    if (!savedFileInfo) {
      throw new Error("Failed to save file information to database");
    }

    console.log("✅ Successfully saved to DB with ID:", savedFileInfo.id);

    return {
      success: true,
      data: {
        id: savedFileInfo.id,
        file_id: savedFileInfo.file_id,
        totalChunks: textChunks.length,
        totalCharacters: extractedText.length,
        metadata: metadata,
      },
    };

  } catch (err: any) {
    console.error("❌ Extraction error:", err);
    throw new Error(err.message || "Failed to extract text from file");
  }
}