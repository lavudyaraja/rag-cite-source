declare module 'pdf-parse' {
  export interface PageData {
    text: string;
    num: number;
  }

  export interface ParseResult {
    total: number;
    text: string;
    pages: PageData[];
  }

  export type TableArray = string[][];

  export interface PageTableResult {
    num: number;
    tables: TableArray[];
  }

  export interface TableResult {
    pages: PageTableResult[];
    mergedTables: TableArray[];
    total: number;
  }

  export interface EmbeddedImage {
    data: Uint8Array;
    dataUrl: string;
    name: string;
    width: number;
    height: number;
    kind: number;
  }

  export interface PageImages {
    pageNumber: number;
    images: EmbeddedImage[];
  }

  export interface ImageResult {
    pages: PageImages[];
    total: number;
  }

  export interface ParseParameters {
    imageBuffer?: boolean;
    imageDataUrl?: boolean;
    imageThreshold?: number;
  }

  export interface LoadParameters {
    data?: Uint8Array | Buffer | ArrayBuffer;
  }

  export class PDFParse {
    constructor(options: LoadParameters | Uint8Array | Buffer);
    destroy(): Promise<void>;
    getText(options?: ParseParameters): Promise<ParseResult>;
    getTable(params?: ParseParameters): Promise<TableResult>;
    getImage(params?: ParseParameters): Promise<ImageResult>;
  }
}

declare module 'mammoth' {
  export interface ExtractResult {
    value: string;
    messages: unknown[];
  }

  export interface Image {
    contentType: string;
    readAsBuffer(): Promise<Buffer>;
  }

  export interface ImageConverter {
    __mammothBrand: 'ImageConverter';
  }

  export interface Images {
    imgElement(
      f: (image: Image) => Promise<{ src: string }>
    ): ImageConverter;
  }

  export interface ConvertOptions {
    convertImage?: ImageConverter;
  }

  export const images: Images;

  export function extractRawText(options: { buffer: Buffer }): Promise<ExtractResult>;
  export function convertToHtml(
    input: { buffer: Buffer },
    options?: ConvertOptions
  ): Promise<ExtractResult>;
}
