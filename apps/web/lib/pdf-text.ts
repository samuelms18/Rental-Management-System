import 'server-only';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/** Standard PDF fonts only cover Latin-1: replace ₹ and drop anything else they cannot draw. */
export function pdfSafe(s: string): string {
  return s
    .replace(/₹\s?/g, 'Rs. ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '?');
}

/** A tiny flowing-text writer with page breaks, for agreements and statements. */
export class PdfWriter {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  readonly margin = 56;
  readonly width = 595.28;
  readonly height = 841.89;

  static async create(title: string) {
    const w = new PdfWriter();
    w.doc = await PDFDocument.create();
    w.doc.setTitle(title);
    w.doc.setProducer('Family Property Manager');
    w.font = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.newPage();
    return w;
  }

  newPage() {
    this.page = this.doc.addPage([this.width, this.height]);
    this.y = this.height - this.margin;
  }

  ensure(space: number) {
    if (this.y - space < this.margin) this.newPage();
  }

  /** Write a paragraph; **bold** segments are supported. */
  text(raw: string, { size = 11, bold = false, gap = 6, indent = 0, color = rgb(0.1, 0.1, 0.1) } = {}) {
    const maxWidth = this.width - this.margin * 2 - indent;
    const tokens: Array<{ word: string; bold: boolean }> = [];
    pdfSafe(raw)
      .split(/(\*\*[^*]+\*\*)/g)
      .forEach((part) => {
        const isBold = bold || /^\*\*[^*]+\*\*$/.test(part);
        part.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).forEach((word) => tokens.push({ word, bold: isBold }));
      });
    const lineHeight = size * 1.4;
    let line: typeof tokens = [];
    const flush = () => {
      if (!line.length) return;
      this.ensure(lineHeight);
      let x = this.margin + indent;
      for (const t of line) {
        const f = t.bold ? this.bold : this.font;
        this.page.drawText(t.word, { x, y: this.y - size, size, font: f, color });
        x += f.widthOfTextAtSize(`${t.word} `, size);
      }
      this.y -= lineHeight;
      line = [];
    };
    for (const t of tokens) {
      const candidate = [...line, t];
      const w = candidate.reduce((n, c) => n + (c.bold ? this.bold : this.font).widthOfTextAtSize(`${c.word} `, size), 0);
      if (w > maxWidth && line.length) flush();
      line.push(t);
    }
    flush();
    this.y -= gap;
  }

  /** Very small Markdown subset: #/## headings, - bullets, paragraphs. */
  markdown(md: string) {
    for (const block of md.split(/\n{2,}/)) {
      const b = block.trim();
      if (!b) continue;
      if (b.startsWith('# ')) {
        this.ensure(40);
        this.text(b.slice(2), { size: 18, bold: true, gap: 10 });
      } else if (b.startsWith('## ')) {
        this.ensure(30);
        this.text(b.slice(3), { size: 13, bold: true, gap: 4 });
      } else if (b.split('\n').every((l) => l.trim().startsWith('- '))) {
        for (const l of b.split('\n')) this.text(`•  ${l.trim().slice(2)}`, { indent: 10, gap: 2 });
        this.y -= 4;
      } else {
        this.text(b.replace(/\n/g, ' '));
      }
    }
  }

  footer(note: string) {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      p.drawText(pdfSafe(`${note}   ·   Page ${i + 1} of ${pages.length}`), {
        x: this.margin, y: 28, size: 8, font: this.font, color: rgb(0.45, 0.45, 0.45),
      });
    });
  }
}
