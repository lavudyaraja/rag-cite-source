import mammoth from 'mammoth';
import { extractPdfEmbeddedImages, extractPdfTables, extractPdfText } from './pdf-extract';
import {
  detectTextTables,
  extractTablesFromHtml,
  formatTableChunkContent,
  segmentTextWithTables,
  stripDetectedTablesFromText,
  tableToJson,
  tableToMarkdown,
  type TableData,
} from './table-extraction';
import {
  captionImage,
  captionImagesBatch,
  detectImageMimeType,
  formatImageCaptionContent,
  limitImages,
  type ExtractedImage,
} from './image-captioning';
import {
  chunkTextSemantically,
  hashContent,
  splitIntoParagraphs,
} from './semantic-chunking';
import { repairPdfText } from './pdf-text-repair';

export interface FileChunkMetadata {
  header?: string | null;
  footer?: string | null;
  isLayoutAware?: boolean;
  contentType?: 'text' | 'table' | 'image_caption';
  chunkRole?: 'child';
  sectionKey?: string;
  parentKey?: string;
  parentContent?: string;
  childIndex?: number;
  contentHash?: string;
  semanticChunking?: boolean;
  tableIndex?: number;
  tableMarkdown?: string;
  tableJson?: string;
  sectionTitle?: string;
  imageIndex?: number;
  imageMimeType?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface FileChunk {
  content: string;
  pageNumber: number;
  chunkIndex: number;
  metadata?: FileChunkMetadata;
}

export interface ParseResult {
  chunks: FileChunk[];
  tablesExtracted: number;
  imagesCaptioned: number;
  extractedImages: ExtractedImage[];
}

/**
 * Main orchestrator to parse and chunk files based on their extension.
 */
export async function parseAndChunkFile(
  fileBuffer: Buffer,
  filename: string
): Promise<ParseResult> {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return parsePdf(fileBuffer);
    case 'docx':
      return parseDocx(fileBuffer);
    case 'txt':
    case 'md':
      return parseText(fileBuffer);
    case 'csv':
      return parseCsv(fileBuffer);
    case 'json':
      return parseJson(fileBuffer);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
}

function buildTableChunks(
  tables: { table: TableData; pageNumber: number }[],
  startChunkIndex: number
): { chunks: FileChunk[]; nextIndex: number } {
  const chunks: FileChunk[] = [];
  let chunkIndex = startChunkIndex;
  const pageTableCounts = new Map<number, number>();

  for (const { table, pageNumber } of tables) {
    const tableIndex = pageTableCounts.get(pageNumber) ?? 0;
    pageTableCounts.set(pageNumber, tableIndex + 1);

    const markdown = tableToMarkdown(table);
    const json = tableToJson(table);
    const content = formatTableChunkContent(table, pageNumber, tableIndex);

    chunks.push({
      content,
      pageNumber,
      chunkIndex: chunkIndex++,
      metadata: {
        contentType: 'table',
        chunkRole: 'child',
        sectionKey: `table-p${pageNumber}-t${tableIndex}`,
        contentHash: hashContent(content),
        tableIndex,
        tableMarkdown: markdown,
        tableJson: json,
        isLayoutAware: true,
      },
    });
  }

  return { chunks, nextIndex: chunkIndex };
}

async function buildImageCaptionChunks(
  images: ExtractedImage[],
  startChunkIndex: number
): Promise<{ chunks: FileChunk[]; nextIndex: number }> {
  const chunks: FileChunk[] = [];
  let chunkIndex = startChunkIndex;
  const limited = limitImages(images);

  const captions = await captionImagesBatch(limited, (image) =>
    captionImage(image.buffer, image.mimeType, { pageNumber: image.pageNumber })
  );

  limited.forEach((image, i) => {
    const content = formatImageCaptionContent(captions[i], image.pageNumber, image.imageIndex, {
      width: image.width,
      height: image.height,
      name: image.name,
    });

    chunks.push({
      content,
      pageNumber: image.pageNumber,
      chunkIndex: chunkIndex++,
      metadata: {
        contentType: 'image_caption',
        chunkRole: 'child',
        sectionKey: `image-p${image.pageNumber}-i${image.imageIndex}`,
        contentHash: hashContent(content),
        imageIndex: image.imageIndex,
        imageMimeType: image.mimeType,
        imageWidth: image.width,
        imageHeight: image.height,
        isLayoutAware: true,
      },
    });
  });

  return { chunks, nextIndex: chunkIndex };
}

/**
 * Parses PDF documents with layout-aware text, table, and image extraction.
 */
async function parsePdf(fileBuffer: Buffer): Promise<ParseResult> {
  let textResult;
  try {
    textResult = await extractPdfText(fileBuffer);
    textResult = {
      ...textResult,
      pages: textResult.pages.map((page) => ({
        ...page,
        text: repairPdfText(page.text),
      })),
      text: repairPdfText(textResult.text),
    };
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to read PDF text (${detail}). Scanned/image-only PDFs need OCR. On Vercel, keep files under 4 MB.`
    );
  }

  const tableResult = await extractPdfTables(fileBuffer).catch((err) => {
    console.warn('PDF table extraction failed:', err);
    return null;
  });

  const embeddedImages = await extractPdfEmbeddedImages(fileBuffer).catch((err) => {
    console.warn('PDF image extraction failed:', err);
    return [] as ExtractedImage[];
  });

  const textChunks = extractPdfTextChunks(textResult.pages);

  const tableEntries: { table: TableData; pageNumber: number }[] = [];
  const seenTableHashes = new Set<string>();

  const addTable = (table: TableData, pageNumber: number) => {
    if (table.length === 0) return;
    const key = hashContent(JSON.stringify(table));
    if (seenTableHashes.has(key)) return;
    seenTableHashes.add(key);
    tableEntries.push({ table, pageNumber });
  };

  if (tableResult?.pages) {
    for (const page of tableResult.pages) {
      for (const table of page.tables) {
        addTable(table, page.num);
      }
    }
  }

  // Fallback: detect tables from page text (confusion matrices, numeric grids, aligned columns)
  for (const page of textResult.pages) {
    for (const segment of segmentTextWithTables(page.text)) {
      if (segment.kind === 'table') addTable(segment.table, page.num);
    }
    const lines = page.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const table of detectTextTables(lines)) {
      addTable(table, page.num);
    }
  }

  const extractedImages: ExtractedImage[] = embeddedImages;

  let nextIndex = textChunks.length;
  const { chunks: tableChunks } = buildTableChunks(tableEntries, nextIndex);
  nextIndex += tableChunks.length;

  const { chunks: imageChunks } = await buildImageCaptionChunks(extractedImages, nextIndex);

  const limitedImages = limitImages(extractedImages);

  return {
    chunks: [...textChunks, ...tableChunks, ...imageChunks],
    tablesExtracted: tableEntries.length,
    imagesCaptioned: Math.min(extractedImages.length, limitedImages.length),
    extractedImages: limitedImages,
  };
}

function extractPdfTextChunks(
  pages: { text: string; num: number }[]
): FileChunk[] {
  const chunks: FileChunk[] = [];
  const pageLineDataList: { pageNum: number; lines: string[] }[] = [];

  for (const page of pages) {
    const lines = page.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    pageLineDataList.push({ pageNum: page.num, lines });
  }

  const topHeaderCounts = new Map<string, number>();
  const bottomFooterCounts = new Map<string, number>();

  pageLineDataList.forEach(({ lines }) => {
    if (lines.length > 0) {
      const firstLine = lines[0];
      topHeaderCounts.set(firstLine, (topHeaderCounts.get(firstLine) || 0) + 1);
    }
    if (lines.length > 1) {
      const lastLine = lines[lines.length - 1];
      bottomFooterCounts.set(lastLine, (bottomFooterCounts.get(lastLine) || 0) + 1);
    }
  });

  const totalPages = pageLineDataList.length;

  const isHeader = (line: string): boolean => {
    const count = topHeaderCounts.get(line) || 0;
    return count >= 2 && (totalPages <= 5 || count / totalPages >= 0.2);
  };

  const isFooter = (line: string): boolean => {
    const count = bottomFooterCounts.get(line) || 0;
    const isPageNum = /^(page\s+\d+|\d+\s+of\s+\d+|\d+)$/i.test(line);
    return isPageNum || (count >= 2 && (totalPages <= 5 || count / totalPages >= 0.2));
  };

  let globalChunkIndex = 0;

  pageLineDataList.forEach(({ pageNum, lines }) => {
    let headerText = '';
    let footerText = '';
    let filteredLines = [...lines];

    if (filteredLines.length > 0 && isHeader(filteredLines[0])) {
      headerText = filteredLines[0];
      filteredLines = filteredLines.slice(1);
    }

    if (filteredLines.length > 0 && isFooter(filteredLines[filteredLines.length - 1])) {
      footerText = filteredLines[filteredLines.length - 1];
      filteredLines = filteredLines.slice(0, -1);
    }

    const rawPageText = filteredLines.join('\n').trim();
    const pageText = stripDetectedTablesFromText(rawPageText);
    if (!pageText) return;

    const paragraphs = splitIntoParagraphs(pageText).map((text) => ({
      text,
      pageNumber: pageNum,
    }));

    const semanticChunks = chunkTextSemantically(paragraphs, `pdf-p${pageNum}`, {
      header: headerText || null,
      footer: footerText || null,
      isLayoutAware: true,
    });

    for (const sc of semanticChunks) {
      chunks.push({
        content: sc.content,
        pageNumber: sc.pageNumber,
        chunkIndex: globalChunkIndex++,
        metadata: sc.metadata,
      });
    }
  });

  return chunks;
}

/**
 * Extracts raw text, HTML tables, and embedded images from DOCX.
 */
async function parseDocx(fileBuffer: Buffer): Promise<ParseResult> {
  const extractedImages: ExtractedImage[] = [];
  let imageCounter = 0;

  const htmlResult = await mammoth.convertToHtml(
    { buffer: fileBuffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.readAsBuffer();
        extractedImages.push({
          buffer,
          mimeType: image.contentType || detectImageMimeType(buffer),
          pageNumber: 1,
          imageIndex: imageCounter++,
        });
        return { src: '' };
      }),
    }
  );

  const textChunks = chunkGenericText(htmlResult.value.replace(/<[^>]+>/g, ' '));

  const htmlTables = extractTablesFromHtml(htmlResult.value);
  const tableEntries = htmlTables.map((table, i) => ({
    table,
    pageNumber: Math.floor(i / 2) + 1,
  }));

  let nextIndex = textChunks.length;
  const { chunks: tableChunks } = buildTableChunks(tableEntries, nextIndex);
  nextIndex += tableChunks.length;

  const { chunks: imageChunks } = await buildImageCaptionChunks(extractedImages, nextIndex);

  const limitedImages = limitImages(extractedImages);

  return {
    chunks: [...textChunks, ...tableChunks, ...imageChunks],
    tablesExtracted: htmlTables.length,
    imagesCaptioned: Math.min(extractedImages.length, limitedImages.length),
    extractedImages: limitedImages,
  };
}

/**
 * Reads plain text or markdown, detecting inline tabular blocks.
 */
async function parseText(fileBuffer: Buffer): Promise<ParseResult> {
  const text = fileBuffer.toString('utf-8');
  const lines = text.split(/\r?\n/);
  const detectedTables = detectTextTables(lines);

  const tableLineSet = new Set<string>();
  for (const table of detectedTables) {
    for (const row of table) {
      tableLineSet.add(row.join('\t'));
    }
  }

  const nonTableLines = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return !tableLineSet.has(trimmed) && !tableLineSet.has(trimmed.split(/\s{2,}/).join('\t'));
  });

  const textChunks = chunkGenericText(nonTableLines.join('\n'));

  const tableEntries = detectedTables.map((table, i) => ({
    table,
    pageNumber: Math.floor(i / 2) + 1,
  }));

  const { chunks: tableChunks } = buildTableChunks(tableEntries, textChunks.length);

  return {
    chunks: [...textChunks, ...tableChunks],
    tablesExtracted: detectedTables.length,
    imagesCaptioned: 0,
    extractedImages: [],
  };
}

/**
 * Parses CSV as a structured table with Markdown/JSON output.
 */
async function parseCsv(fileBuffer: Buffer): Promise<ParseResult> {
  const csvText = fileBuffer.toString('utf-8');
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    return { chunks: [], tablesExtracted: 0, imagesCaptioned: 0, extractedImages: [] };
  }

  const table: TableData = lines.map((line) =>
    line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
  );

  const tableContent = formatTableChunkContent(table, 1, 0);
  const tableChunk: FileChunk = {
    content: tableContent,
    pageNumber: 1,
    chunkIndex: 0,
    metadata: {
      contentType: 'table',
      chunkRole: 'child',
      sectionKey: 'table-p1-t0',
      contentHash: hashContent(tableContent),
      tableIndex: 0,
      tableMarkdown: tableToMarkdown(table),
      tableJson: tableToJson(table),
    },
  };

  const rowChunks = chunkGenericText(
    table
      .slice(1)
      .map((row, i) => {
        const headers = table[0];
        const desc = headers
          .map((h, idx) => `${h}: ${row[idx] !== undefined ? row[idx] : ''}`)
          .join(', ');
        return `Record ${i + 1}: ${desc}`;
      })
      .join('\n'),
    1
  );

  rowChunks.forEach((c, i) => {
    c.chunkIndex = i + 1;
  });

  return {
    chunks: [tableChunk, ...rowChunks],
    tablesExtracted: 1,
    imagesCaptioned: 0,
    extractedImages: [],
  };
}

/**
 * Parses JSON and formats it cleanly.
 */
async function parseJson(fileBuffer: Buffer): Promise<ParseResult> {
  const jsonText = fileBuffer.toString('utf-8');
  let formattedText = '';

  try {
    const obj = JSON.parse(jsonText);
    if (Array.isArray(obj)) {
      formattedText = obj
        .map((item, idx) => `Item ${idx + 1}: ${JSON.stringify(item)}`)
        .join('\n');
    } else {
      formattedText = JSON.stringify(obj, null, 2);
    }
  } catch {
    formattedText = jsonText;
  }

  return {
    chunks: chunkGenericText(formattedText),
    tablesExtracted: 0,
    imagesCaptioned: 0,
    extractedImages: [],
  };
}

/**
 * Chunks generic continuous text using semantic paragraph boundaries.
 */
function chunkGenericText(text: string, startChunkIndex = 0): FileChunk[] {
  const paragraphs = splitIntoParagraphs(text);
  if (paragraphs.length === 0) return [];

  const paragraphInputs = paragraphs.map((p, i) => ({
    text: p,
    pageNumber: Math.floor(i / 4) + 1,
  }));

  const semanticChunks = chunkTextSemantically(paragraphInputs, 'text');
  return semanticChunks.map((sc, i) => ({
    content: sc.content,
    pageNumber: sc.pageNumber,
    chunkIndex: startChunkIndex + i,
    metadata: sc.metadata,
  }));
}
