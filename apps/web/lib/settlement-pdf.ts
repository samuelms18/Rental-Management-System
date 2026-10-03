import 'server-only';
import { rgb } from 'pdf-lib';
import { formatDate, formatINR } from '@fpm/api';
import { PdfWriter, pdfSafe } from '@/lib/pdf-text';

export type SettlementData = {
  tenantName: string;
  house: string;
  property: string;
  code: string;
  moveOutDate: string;
  ownerName: string;
  lines: Array<{ label: string; amount: number; sign: 1 | -1 }>;
  refund: number;
  status: string;
  refundDate?: string | null;
  refundMethod?: string | null;
  refundReference?: string | null;
};

/** Itemised deposit settlement statement (English; standard PDF fonts cannot shape Indic scripts). */
export async function renderSettlementPdf(d: SettlementData): Promise<Uint8Array> {
  const w = await PdfWriter.create('Deposit settlement');
  w.text('DEPOSIT SETTLEMENT STATEMENT', { size: 18, bold: true, gap: 12 });
  w.text(`Tenant: **${d.tenantName}**`);
  w.text(`House: ${d.house}, ${d.property}   ·   Tenancy ${d.code}`);
  w.text(`Move-out date: ${formatDate(d.moveOutDate)}`, { gap: 14 });

  const right = w.width - w.margin;
  for (const l of d.lines) {
    w.ensure(22);
    const amount = pdfSafe(`${l.sign < 0 ? '- ' : ''}${formatINR(l.amount)}`);
    w.page.drawText(pdfSafe(l.label), { x: w.margin, y: w.y - 11, size: 11, font: w.font, maxWidth: 360 });
    w.page.drawText(amount, { x: right - w.font.widthOfTextAtSize(amount, 11), y: w.y - 11, size: 11, font: w.font });
    w.y -= 20;
  }
  w.page.drawLine({ start: { x: w.margin, y: w.y }, end: { x: right, y: w.y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
  w.y -= 8;
  const total = pdfSafe(formatINR(d.refund));
  w.page.drawText('Refund to tenant', { x: w.margin, y: w.y - 13, size: 13, font: w.bold });
  w.page.drawText(total, { x: right - w.bold.widthOfTextAtSize(total, 13), y: w.y - 13, size: 13, font: w.bold });
  w.y -= 34;
  if (d.refundDate) {
    w.text(`Refunded on ${formatDate(d.refundDate)} by ${d.refundMethod ?? ''} ${d.refundReference ? `(ref ${d.refundReference})` : ''}`);
  }
  w.y -= 20;
  w.text(`${d.ownerName}`, { bold: true, gap: 0 });
  w.text('Owner', { size: 9, color: rgb(0.4, 0.4, 0.4) });
  w.footer(`Status: ${d.status}. Repair costs are deducted only when listed above with a reason.`);
  return w.doc.save();
}
