import 'server-only';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { amountInWordsINR, formatINRAscii } from '@fpm/api';

export type ReceiptData = {
  number: string;
  issuedAt: string;
  cancelled: boolean;
  tenantName: string;
  house: string;
  property: string;
  propertyAddress: string;
  towards: string;
  amountPaise: number;
  method: string;
  reference: string | null;
  paidOn: string;
  receivedBy: string | null;
  ownerName: string;
};

const d = (iso: string) => {
  const x = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(x);
};

/**
 * A4 receipt with built-in PDF fonts (no font files → small bundle, works on Cloudflare Workers).
 * Labels are English: the standard PDF fonts cannot shape Tamil/Hindi/Malayalam script.
 * Tenants see the same receipt translated in the app.
 */
export async function renderReceiptPdf(r: ReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Receipt ${r.number}`);
  pdf.setProducer('Family Property Manager');
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.12, 0.37, 0.29);
  const grey = rgb(0.4, 0.4, 0.4);
  const ascii = (s: string) => s.replace(/[^\x20-\x7E]/g, '?');
  let y = 780;

  page.drawRectangle({ x: 40, y: 740, width: 515.28, height: 70, color: green });
  page.drawText('RENT RECEIPT', { x: 60, y: 775, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText(ascii(r.ownerName), { x: 60, y: 752, size: 11, font, color: rgb(1, 1, 1) });
  page.drawText(`No. ${r.number}`, { x: 380, y: 775, size: 13, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`Date: ${d(r.issuedAt)}`, { x: 380, y: 752, size: 11, font, color: rgb(1, 1, 1) });
  y = 700;

  const row = (label: string, value: string) => {
    page.drawText(label, { x: 60, y, size: 11, font, color: grey });
    page.drawText(ascii(value), { x: 210, y, size: 12, font: bold, maxWidth: 330 });
    y -= 30;
  };
  row('Received from', r.tenantName);
  row('House', `${r.house}, ${r.property}`);
  if (r.propertyAddress) row('Address', r.propertyAddress);
  row('Towards', r.towards);
  row('Payment method', r.method);
  if (r.reference) row('UTR / Reference', r.reference);
  row('Paid on', d(r.paidOn));
  if (r.receivedBy) row('Received by', r.receivedBy);

  y -= 10;
  page.drawRectangle({ x: 40, y: y - 50, width: 515.28, height: 70, borderColor: green, borderWidth: 1.5 });
  page.drawText('Amount', { x: 60, y: y - 5, size: 11, font, color: grey });
  page.drawText(formatINRAscii(r.amountPaise), { x: 210, y: y - 8, size: 22, font: bold, color: green });
  page.drawText(amountInWordsINR(r.amountPaise), { x: 60, y: y - 38, size: 10, font, maxWidth: 480 });
  y -= 110;

  page.drawText(ascii(r.ownerName), { x: 380, y, size: 12, font: bold });
  page.drawText('Owner', { x: 380, y: y - 16, size: 10, font, color: grey });

  page.drawText('Computer-generated receipt. Cancelled receipts are reissued with a new number.', {
    x: 60, y: 60, size: 9, font, color: grey,
  });

  if (r.cancelled) {
    page.drawText('CANCELLED', { x: 150, y: 400, size: 80, font: bold, color: rgb(0.8, 0.1, 0.1), opacity: 0.25, rotate: degrees(30) });
  }
  return pdf.save();
}
