import crypto from 'crypto';

const SECTION_MAX_CHARS = 2800;
const CHILD_MAX_CHARS = 500;
const CHILD_MIN_CHARS = 60;

const THEMATIC_BOUNDARY_PATTERNS = [
  /^#{1,6}\s+.+$/,
  /^\d+(\.\d+)*\s+[A-Z].+$/,
  /^[A-Z][A-Z0-9\s\-:,]{4,}$/,
  /^(abstract|introduction|background|methods?|materials?|results?|discussion|conclusion|references|appendix|acknowledgments?)\b/i,
];

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function isThematicBoundary(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  return THEMATIC_BOUNDARY_PATTERNS.some((p) => p.test(trimmed));
}

/**
 * Splits raw text into paragraphs using blank lines and thematic header lines.
 */
export function splitIntoParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  const blocks = text.split(/\n\s*\n|\r\n\s*\r\n/);

  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    let current: string[] = [];
    for (const line of lines) {
      if (current.length > 0 && isThematicBoundary(line)) {
        paragraphs.push(current.join(' ').replace(/\s+/g, ' ').trim());
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) {
      paragraphs.push(current.join(' ').replace(/\s+/g, ' ').trim());
    }
  }

  return paragraphs.filter((p) => p.length > 0);
}

export interface SemanticSection {
  content: string;
  pageNumber: number;
  sectionKey: string;
}

/**
 * Groups paragraphs into parent sections at natural thematic boundaries.
 */
export function buildSemanticSections(
  paragraphs: { text: string; pageNumber: number }[],
  keyPrefix: string
): SemanticSection[] {
  const sections: SemanticSection[] = [];
  let buffer: string[] = [];
  let bufferPage = 1;
  let sectionIdx = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    const content = buffer.join('\n\n').trim();
    if (content.length >= CHILD_MIN_CHARS) {
      sections.push({
        content,
        pageNumber: bufferPage,
        sectionKey: `${keyPrefix}-s${sectionIdx++}`,
      });
    }
    buffer = [];
  };

  for (const { text, pageNumber } of paragraphs) {
    const startsNewTheme =
      isThematicBoundary(text) &&
      buffer.length > 0 &&
      buffer.join(' ').length >= CHILD_MIN_CHARS;

    const wouldExceed =
      buffer.length > 0 &&
      buffer.join('\n\n').length + text.length + 2 > SECTION_MAX_CHARS;

    if (startsNewTheme || wouldExceed) {
      flush();
    }

    if (buffer.length === 0) {
      bufferPage = pageNumber;
    }
    buffer.push(text);
  }

  flush();
  return sections;
}

/**
 * Splits a parent section into small child chunks at sentence boundaries.
 */
export function splitSectionIntoChildren(
  section: SemanticSection
): { content: string; childIndex: number; parentContent: string; sectionKey: string; contentHash: string }[] {
  const { content, sectionKey } = section;
  const parentContent = content;
  const children: { content: string; childIndex: number; parentContent: string; sectionKey: string; contentHash: string }[] = [];

  if (content.length <= CHILD_MAX_CHARS) {
    if (content.length >= CHILD_MIN_CHARS) {
      children.push({
        content,
        childIndex: 0,
        parentContent,
        sectionKey: `${sectionKey}-c0`,
        contentHash: hashContent(content),
      });
    }
    return children;
  }

  const sentences = content.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [content];
  let buffer = '';
  let childIdx = 0;

  const pushChild = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < CHILD_MIN_CHARS) return;
    children.push({
      content: trimmed,
      childIndex: childIdx++,
      parentContent,
      sectionKey: `${sectionKey}-c${childIdx - 1}`,
      contentHash: hashContent(trimmed),
    });
  };

  for (const sentence of sentences) {
    const candidate = buffer ? `${buffer} ${sentence}` : sentence;
    if (candidate.length > CHILD_MAX_CHARS && buffer.length >= CHILD_MIN_CHARS) {
      pushChild(buffer);
      buffer = sentence.trim();
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim().length >= CHILD_MIN_CHARS) {
    pushChild(buffer);
  }

  return children;
}

export interface SemanticChunkOutput {
  content: string;
  pageNumber: number;
  metadata: {
    contentType: 'text';
    chunkRole: 'child';
    sectionKey: string;
    parentKey: string;
    parentContent: string;
    childIndex: number;
    contentHash: string;
    semanticChunking: true;
    header?: string | null;
    footer?: string | null;
    isLayoutAware?: boolean;
  };
}

/**
 * Full pipeline: paragraphs → semantic sections → parent-child chunks.
 */
export function chunkTextSemantically(
  paragraphs: { text: string; pageNumber: number }[],
  keyPrefix: string,
  layoutMeta?: { header?: string | null; footer?: string | null; isLayoutAware?: boolean }
): SemanticChunkOutput[] {
  const sections = buildSemanticSections(paragraphs, keyPrefix);
  const outputs: SemanticChunkOutput[] = [];

  for (const section of sections) {
    const children = splitSectionIntoChildren(section);
    for (const child of children) {
      outputs.push({
        content: child.content,
        pageNumber: section.pageNumber,
        metadata: {
          contentType: 'text',
          chunkRole: 'child',
          sectionKey: child.sectionKey,
          parentKey: section.sectionKey,
          parentContent: child.parentContent,
          childIndex: child.childIndex,
          contentHash: child.contentHash,
          semanticChunking: true,
          header: layoutMeta?.header,
          footer: layoutMeta?.footer,
          isLayoutAware: layoutMeta?.isLayoutAware,
        },
      });
    }
  }

  return outputs;
}
